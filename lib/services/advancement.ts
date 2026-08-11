import { prisma } from "@/lib/prisma";
import { nextPowerOfTwo, seedOrder } from "@/lib/fixtures";
import {
  BracketType,
  MatchStatus,
  RegistrationStatus,
  RoundType,
  TournamentFormat,
  TournamentStatus,
  type Match,
  type Tournament,
} from "@/lib/generated/prisma";
import { getGroupStandings } from "./standings";
import { notifyTournamentPlayers } from "./notifications";

const DECIDED: MatchStatus[] = [MatchStatus.CONFIRMED, MatchStatus.WALKOVER];

/**
 * Applies the bracket advancement rules for a match that has just been
 * finalized (confirmed, overridden, or declared a walkover). Idempotent for
 * already-decided matches; safe to call after any resolution.
 */
export async function handleMatchResolution(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { tournament: true, winner: { select: { playerId: true } } },
  });
  if (!match) return;
  if (match.status !== MatchStatus.CONFIRMED && match.status !== MatchStatus.WALKOVER) return;
  if (!match.winnerId) return;

  if (match.roundType === RoundType.GROUP) {
    await promoteGroupQualifiers(match);
  } else if (match.roundType === RoundType.KNOCKOUT) {
    if (match.bracketType) {
      await advanceDoubleElim(match);
    } else {
      await advanceSingleElim(match);
    }
  }
}

/** Number of rounds in a single-elimination bracket for the tournament. */
async function knockoutRounds(tournament: Pick<Tournament, "id" | "format" | "groupConfig">): Promise<number> {
  const approved = await prisma.tournamentPlayer.count({
    where: { tournamentId: tournament.id, status: RegistrationStatus.APPROVED },
  });
  let size: number;
  if (tournament.format === TournamentFormat.GROUP_KNOCKOUT) {
    const cfg = (tournament.groupConfig ?? {}) as { groupSize?: number; qualifiersPerGroup?: number };
    const groups = Math.ceil(approved / (cfg.groupSize ?? 4));
    size = nextPowerOfTwo(groups * (cfg.qualifiersPerGroup ?? 2));
  } else {
    size = nextPowerOfTwo(approved);
  }
  return size > 1 ? Math.log2(size) : 0;
}

async function thirdPlaceMatch(tournamentId: string, totalRounds: number) {
  return prisma.match.findFirst({
    where: {
      tournamentId,
      roundType: RoundType.KNOCKOUT,
      roundNumber: totalRounds + 1,
      bracketPosition: 0,
      bracketType: null,
    },
  });
}

async function crownChampion(
  match: Match & { tournament: Tournament; winner?: { playerId: string } | null },
): Promise<void> {
  if (!match.winner?.playerId) return;
  const existing = await prisma.trophy.findFirst({
    where: { tournamentId: match.tournamentId, playerId: match.winner.playerId },
  });
  if (existing) return;
  const winner = await prisma.user.findUnique({ where: { id: match.winner.playerId } });
  await prisma.$transaction([
    prisma.tournament.update({
      where: { id: match.tournamentId },
      data: { status: TournamentStatus.COMPLETED },
    }),
    prisma.trophy.create({
      data: { tournamentId: match.tournamentId, playerId: match.winner.playerId },
    }),
  ]);
  await notifyTournamentPlayers(
    match.tournamentId,
    "Tournament complete",
    `${winner?.name ?? "A player"} won ${match.tournament.name}.`,
  );
}

/**
 * Once a group has all its matches decided, promotes the top qualifiers into
 * the knockout round-1 slots using the standard interleaved seed assignment.
 */
async function promoteGroupQualifiers(match: Match & { tournament: Tournament }): Promise<void> {
  if (!match.groupId) return;

  const groupMatches = await prisma.match.findMany({
    where: { groupId: match.groupId, roundType: RoundType.GROUP },
  });
  if (groupMatches.length === 0) return;
  if (!groupMatches.every((m) => DECIDED.includes(m.status))) return;

  const standings = await getGroupStandings(match.tournament, match.groupId);
  const qualifiersPerGroup = ((match.tournament.groupConfig ?? {}) as { qualifiersPerGroup?: number })
    .qualifiersPerGroup ?? 2;
  const qualifiers = standings.slice(0, qualifiersPerGroup).map((r) => r.participantId);
  if (qualifiers.length === 0) return;

  const groups = await prisma.group.findMany({
    where: { tournamentId: match.tournamentId },
    orderBy: { sortOrder: "asc" },
  });
  const groupIndex = groups.findIndex((g) => g.id === match.groupId);
  if (groupIndex < 0) return;

  const numGroups = groups.length;
  const size = nextPowerOfTwo(numGroups * qualifiersPerGroup);
  const positionOfSeed = new Map(seedOrder(size).map((seed, idx) => [seed, idx]));

  for (let rank = 0; rank < qualifiers.length; rank++) {
    // Interleaved seeds: winners get 1..G, runners-up G+1..2G, etc.
    const seed = rank * numGroups + groupIndex + 1;
    const idx = positionOfSeed.get(seed);
    if (idx === undefined) continue;
    const slotPosition = Math.floor(idx / 2);
    const ko = await prisma.match.findFirst({
      where: {
        tournamentId: match.tournamentId,
        roundType: RoundType.KNOCKOUT,
        roundNumber: 1,
        bracketPosition: slotPosition,
        bracketType: null,
      },
    });
    if (!ko) continue;
    const isHome = idx % 2 === 0;
    await prisma.match.update({
      where: { id: ko.id },
      data: isHome ? { homeRegistrationId: qualifiers[rank] } : { awayRegistrationId: qualifiers[rank] },
    });
  }
}

async function advanceSingleElim(match: Match & { tournament: Tournament }): Promise<void> {
  const totalRounds = await knockoutRounds(match.tournament);
  const position = match.bracketPosition ?? 0;

  if (totalRounds >= 2 && match.roundNumber === totalRounds - 1 && position <= 1) {
    const loserId =
      match.winnerId === match.homeRegistrationId ? match.awayRegistrationId : match.homeRegistrationId;
    const third = await thirdPlaceMatch(match.tournamentId, totalRounds);
    if (third && loserId) {
      await prisma.match.update({
        where: { id: third.id },
        data: position === 0 ? { homeRegistrationId: loserId } : { awayRegistrationId: loserId },
      });
    }
  }

  if (match.roundNumber === totalRounds) {
    await crownChampion(match);
    return;
  }

  const next = await prisma.match.findFirst({
    where: {
      tournamentId: match.tournamentId,
      roundType: RoundType.KNOCKOUT,
      roundNumber: match.roundNumber + 1,
      bracketPosition: Math.floor(position / 2),
      bracketType: null,
    },
  });
  if (!next) return;
  await prisma.match.update({
    where: { id: next.id },
    data: position % 2 === 0 ? { homeRegistrationId: match.winnerId } : { awayRegistrationId: match.winnerId },
  });
}

async function losersRoundSizes(tournamentId: string): Promise<number[]> {
  const rounds = await prisma.match.findMany({
    where: { tournamentId, bracketType: BracketType.LOSERS },
    select: { roundNumber: true },
    distinct: ["roundNumber"],
    orderBy: { roundNumber: "asc" },
  });
  const sizes: number[] = [];
  for (const r of rounds) {
    sizes.push(
      await prisma.match.count({
        where: { tournamentId, bracketType: BracketType.LOSERS, roundNumber: r.roundNumber },
      }),
    );
  }
  return sizes;
}

/**
 * Maps a position in LB round `round` to the position in LB round `round + 1`
 * (handles rounds that halve in size).
 */
async function losersAdvancePosition(tournamentId: string, round: number, position: number): Promise<number> {
  const sizes = await losersRoundSizes(tournamentId);
  const i = sizes.length === 0 ? -1 : round - 1;
  if (i < 0 || i + 1 >= sizes.length) return position;
  const ratio = sizes[i] / sizes[i + 1];
  return Math.floor(position / ratio);
}

async function advanceDoubleElim(match: Match & { tournament: Tournament }): Promise<void> {
  const { tournamentId } = match;
  const position = match.bracketPosition ?? 0;
  const loserId =
    match.winnerId === match.homeRegistrationId ? match.awayRegistrationId : match.homeRegistrationId;

  if (match.bracketType === BracketType.GRAND) {
    await crownChampion(match);
    return;
  }

  if (match.bracketType === BracketType.WINNERS) {
    const nextWb = await prisma.match.findFirst({
      where: {
        tournamentId,
        bracketType: BracketType.WINNERS,
        roundNumber: match.roundNumber + 1,
        bracketPosition: Math.floor(position / 2),
      },
    });
    if (nextWb) {
      await prisma.match.update({
        where: { id: nextWb.id },
        data: position % 2 === 0 ? { homeRegistrationId: match.winnerId } : { awayRegistrationId: match.winnerId },
      });
    } else {
      const grand = await prisma.match.findFirst({
        where: { tournamentId, bracketType: BracketType.GRAND, roundNumber: 1, bracketPosition: 0 },
      });
      if (grand && match.winnerId) {
        await prisma.match.update({ where: { id: grand.id }, data: { homeRegistrationId: match.winnerId } });
      }
    }

    if (loserId) {
      const lbRound = match.roundNumber === 1 ? 1 : 2 * match.roundNumber - 2;
      let lbPosition = position;
      if (match.roundNumber === 1) {
        const sizes = await losersRoundSizes(tournamentId);
        const wbRound1 = await prisma.match.count({
          where: { tournamentId, bracketType: BracketType.WINNERS, roundNumber: 1 },
        });
        if (sizes.length > 0 && wbRound1 > 0) {
          lbPosition = Math.floor((position * sizes[0]) / wbRound1);
        }
      }
      const lb = await prisma.match.findFirst({
        where: { tournamentId, bracketType: BracketType.LOSERS, roundNumber: lbRound, bracketPosition: lbPosition },
      });
      if (lb) {
        await prisma.match.update({
          where: { id: lb.id },
          data: position % 2 === 0 ? { homeRegistrationId: loserId } : { awayRegistrationId: loserId },
        });
      }
    }
    return;
  }

  if (match.bracketType === BracketType.LOSERS && match.winnerId) {
    const nextLb = await prisma.match.findFirst({
      where: { tournamentId, bracketType: BracketType.LOSERS, roundNumber: match.roundNumber + 1 },
    });
    if (nextLb) {
      const target = await losersAdvancePosition(tournamentId, match.roundNumber, position);
      const lb = await prisma.match.findFirst({
        where: {
          tournamentId,
          bracketType: BracketType.LOSERS,
          roundNumber: match.roundNumber + 1,
          bracketPosition: target,
        },
      });
      if (lb) {
        // LB winners fill the opposite side from the WB loser feeding.
        await prisma.match.update({
          where: { id: lb.id },
          data: position % 2 === 0 ? { awayRegistrationId: match.winnerId } : { homeRegistrationId: match.winnerId },
        });
      }
    } else {
      const grand = await prisma.match.findFirst({
        where: { tournamentId, bracketType: BracketType.GRAND, roundNumber: 1, bracketPosition: 0 },
      });
      if (grand) {
        await prisma.match.update({ where: { id: grand.id }, data: { awayRegistrationId: match.winnerId } });
      }
    }
  }
}
