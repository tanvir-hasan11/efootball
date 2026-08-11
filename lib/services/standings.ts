import { prisma } from "@/lib/prisma";
import { computeStandings, type ScoringConfig } from "@/lib/fixtures";
import { MatchStatus, RoundType, type Tournament } from "@/lib/generated/prisma";

const DECIDED = [MatchStatus.CONFIRMED, MatchStatus.WALKOVER] as const;

function scoringConfig(tournament: Pick<Tournament, "scoringConfig">): Partial<ScoringConfig> {
  const cfg = (tournament.scoringConfig ?? {}) as { win?: number; draw?: number; loss?: number };
  return { win: cfg.win ?? 3, draw: cfg.draw ?? 1, loss: cfg.loss ?? 0 };
}

/**
 * Returns the standings for a group, computed from confirmed/walkover matches.
 */
export async function getGroupStandings(tournament: Pick<Tournament, "scoringConfig">, groupId: string) {
  const matches = await prisma.match.findMany({
    where: { groupId, status: { in: [...DECIDED] } },
    select: { homeRegistrationId: true, awayRegistrationId: true, homeScore: true, awayScore: true },
  });
  return computeStandings(
    matches.map((m) => ({
      home: m.homeRegistrationId!,
      away: m.awayRegistrationId!,
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
    })),
    scoringConfig(tournament),
  );
}

/**
 * Returns the overall standings across all groups of a group-stage
 * tournament, keyed by registration id.
 */
export async function getTournamentStandings(tournament: Pick<Tournament, "id" | "scoringConfig">, groups: { id: string }[]) {
  const matches = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      groupId: { in: groups.map((g) => g.id) },
      status: { in: [...DECIDED] },
    },
    select: { homeRegistrationId: true, awayRegistrationId: true, homeScore: true, awayScore: true },
  });
  return computeStandings(
    matches.map((m) => ({
      home: m.homeRegistrationId!,
      away: m.awayRegistrationId!,
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
    })),
    scoringConfig(tournament),
  );
}

/**
 * Returns standings for a Swiss tournament up to a given round.
 */
export async function getSwissStandings(tournament: Pick<Tournament, "id" | "scoringConfig">, upToRound: number) {
  const matches = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      roundType: RoundType.SWISS,
      roundNumber: { lte: upToRound },
      status: { in: [...DECIDED] },
    },
    select: { homeRegistrationId: true, awayRegistrationId: true, homeScore: true, awayScore: true },
  });
  return computeStandings(
    matches.map((m) => ({
      home: m.homeRegistrationId!,
      away: m.awayRegistrationId!,
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
    })),
    scoringConfig(tournament),
  );
}
