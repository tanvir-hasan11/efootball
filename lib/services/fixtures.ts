import { prisma } from "@/lib/prisma";
import { generateSingleElimination, generateDoubleElimination, emptyBracket, roundRobinPairs, generateSwissRound } from "@/lib/fixtures";
import { BracketType, MatchStatus, RegistrationStatus, RoundType, TournamentFormat, TournamentStatus, type Tournament } from "@/lib/generated/prisma";

type TournamentWithRegistrations = Tournament & { registrations: { id: string }[] };

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function snakeGroups(registrationIds: string[], groupSize: number): string[][] {
  const groupCount = Math.max(1, Math.ceil(registrationIds.length / groupSize));
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  registrationIds.forEach((id, idx) => {
    const row = Math.floor(idx / groupCount);
    const col = idx % groupCount;
    const groupIndex = row % 2 === 0 ? col : groupCount - 1 - col;
    groups[groupIndex].push(id);
  });
  return groups;
}

async function createGroupMatches(tournament: Tournament, group: string[], groupName: string, groupSort: number, deadline: Date | null) {
  const groupRow = await prisma.group.create({
    data: {
      tournamentId: tournament.id,
      name: groupName,
      sortOrder: groupSort,
      participants: {
        create: group.map((registrationId, i) => ({ registrationId, position: i })),
      },
    },
  });

  const pairs = roundRobinPairs(group);
  const matchesPerRound = Math.floor(group.length / 2);
  for (let i = 0; i < pairs.length; i++) {
    const [home, away] = pairs[i];
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        roundType: RoundType.GROUP,
        roundNumber: Math.floor(i / Math.max(matchesPerRound, 1)) + 1,
        groupId: groupRow.id,
        homeRegistrationId: home,
        awayRegistrationId: away,
        status: MatchStatus.SCHEDULED,
        deadline,
      },
    });
  }
}

async function createKnockoutSkeleton(tournament: Tournament, bracketSize: number, thirdPlace: boolean) {
  const bracket = emptyBracket(bracketSize, thirdPlace);
  for (const round of bracket.rounds) {
    for (const slot of round.slots) {
      await prisma.match.create({
        data: {
          tournamentId: tournament.id,
          roundType: RoundType.KNOCKOUT,
          roundNumber: round.round,
          bracketPosition: slot.position,
          homeRegistrationId: slot.home,
          awayRegistrationId: slot.away,
          status: MatchStatus.SCHEDULED,
        },
      });
    }
  }
  if (thirdPlace && bracket.rounds.length >= 2) {
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        roundType: RoundType.KNOCKOUT,
        roundNumber: bracket.rounds.length + 1,
        bracketPosition: 0,
        status: MatchStatus.SCHEDULED,
      },
    });
  }
}

async function generateGroupKnockout(tournament: TournamentWithRegistrations) {
  const groupSize = (tournament.groupConfig as { groupSize?: number } | null)?.groupSize ?? 4;
  const qualifiersPerGroup = (tournament.groupConfig as { qualifiersPerGroup?: number } | null)?.qualifiersPerGroup ?? 2;
  const thirdPlace = (tournament.scoringConfig as { thirdPlaceMatch?: boolean } | null)?.thirdPlaceMatch ?? true;
  const deadline = tournament.matchDeadlineDays ? new Date(Date.now() + tournament.matchDeadlineDays * 24 * 60 * 60 * 1000) : null;

  const registrations = tournament.registrations;
  const groups = snakeGroups(registrations.map((r) => r.id), groupSize);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < groups.length; i++) {
    await createGroupMatches(tournament, groups[i], `Group ${letters[i]}`, i, deadline);
  }

  const qualifierCount = groups.length * qualifiersPerGroup;
  await createKnockoutSkeleton(tournament, nextPowerOfTwo(qualifierCount), thirdPlace);
}

async function generateSingleElim(tournament: TournamentWithRegistrations) {
  const thirdPlace = (tournament.scoringConfig as { thirdPlaceMatch?: boolean } | null)?.thirdPlaceMatch ?? true;
  const bracket = generateSingleElimination(tournament.registrations.map((r) => r.id), thirdPlace);

  for (const round of bracket.rounds) {
    for (const slot of round.slots) {
      if (!slot.home && !slot.away) continue;
      await prisma.match.create({
        data: {
          tournamentId: tournament.id,
          roundType: RoundType.KNOCKOUT,
          roundNumber: round.round,
          bracketPosition: slot.position,
          homeRegistrationId: slot.home,
          awayRegistrationId: slot.away,
          status: MatchStatus.SCHEDULED,
        },
      });
    }
  }
  if (thirdPlace && bracket.rounds.length >= 2) {
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        roundType: RoundType.KNOCKOUT,
        roundNumber: bracket.rounds.length + 1,
        bracketPosition: 0,
        status: MatchStatus.SCHEDULED,
      },
    });
  }
}

async function generateDoubleElim(tournament: TournamentWithRegistrations) {
  const bracket = generateDoubleElimination(tournament.registrations.map((r) => r.id));

  for (const slot of bracket.slots) {
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        roundType: RoundType.KNOCKOUT,
        roundNumber: slot.round,
        bracketPosition: slot.position,
        bracketType: slot.bracketType as BracketType,
        homeRegistrationId: slot.home,
        awayRegistrationId: slot.away,
        status: MatchStatus.SCHEDULED,
      },
    });
  }
}

async function generateSwiss(tournament: TournamentWithRegistrations) {
  const players = tournament.registrations.map((r) => ({ id: r.id, points: 0 }));
  const pairs = generateSwissRound(players, new Set<string>());
  const deadline = tournament.matchDeadlineDays ? new Date(Date.now() + tournament.matchDeadlineDays * 24 * 60 * 60 * 1000) : null;

  for (const [home, away] of pairs) {
    await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        roundType: RoundType.SWISS,
        roundNumber: 1,
        homeRegistrationId: home,
        awayRegistrationId: away,
        status: MatchStatus.SCHEDULED,
        deadline,
      },
    });
  }
}

/**
 * Generates and persists all fixtures for a tournament. Callers must verify
 * authorization (organizer) beforehand.
 */
export async function generateFixturesForTournament(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      registrations: {
        where: { status: RegistrationStatus.APPROVED },
        orderBy: [{ seed: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!tournament) throw new Error("Tournament not found.");

  switch (tournament.format) {
    case TournamentFormat.GROUP_KNOCKOUT:
      await generateGroupKnockout(tournament);
      break;
    case TournamentFormat.SINGLE_ELIMINATION:
      await generateSingleElim(tournament);
      break;
    case TournamentFormat.DOUBLE_ELIMINATION:
      await generateDoubleElim(tournament);
      break;
    case TournamentFormat.SWISS:
      await generateSwiss(tournament);
      break;
  }

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: TournamentStatus.ACTIVE },
  });
}
