import { prisma } from "@/lib/prisma";
import { MatchStatus } from "@/lib/generated/prisma";

const DECIDED: MatchStatus[] = [MatchStatus.CONFIRMED, MatchStatus.WALKOVER];

export type PlayerStats = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  championships: number;
};

/**
 * Aggregates a player's record across every decided match they appeared in
 * (all tournaments). Scores are counted from the confirmed scores; walkovers
 * count as 3-0 wins for the awarded side.
 */
export async function getPlayerStats(playerId: string): Promise<PlayerStats> {
  const registrations = await prisma.tournamentPlayer.findMany({
    where: { playerId },
    select: { id: true },
  });
  const ids = registrations.map((r) => r.id);

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ homeRegistrationId: { in: ids } }, { awayRegistrationId: { in: ids } }],
      status: { in: [...DECIDED] },
    },
    select: {
      homeRegistrationId: true,
      awayRegistrationId: true,
      homeScore: true,
      awayScore: true,
      winnerId: true,
    },
  });

  const stats: PlayerStats = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, championships: 0 };

  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const isHome = m.homeRegistrationId != null && ids.includes(m.homeRegistrationId);
    const isAway = m.awayRegistrationId != null && ids.includes(m.awayRegistrationId);
    if (!isHome && !isAway) continue;

    stats.played++;
    const myGoals = isHome ? m.homeScore : m.awayScore;
    const oppGoals = isHome ? m.awayScore : m.homeScore;
    stats.goalsFor += myGoals;
    stats.goalsAgainst += oppGoals;

    const myRegistrationId = isHome ? m.homeRegistrationId : m.awayRegistrationId;
    if (m.winnerId === myRegistrationId) {
      stats.won++;
    } else if (m.winnerId == null) {
      stats.drawn++;
    } else {
      stats.lost++;
    }
  }

  stats.championships = await prisma.trophy.count({ where: { playerId } });
  return stats;
}

export type PlayerHistoryEntry = {
  registrationId: string;
  tournamentId: string;
  tournamentName: string;
  tournamentSlug: string;
  format: string;
  status: string;
  joinedAt: Date;
  isChampion: boolean;
  placement: "CHAMPION" | null;
};

/**
 * Returns the tournaments a player has joined, most recent first, marking any
 * they have won.
 */
export async function getPlayerHistory(playerId: string): Promise<PlayerHistoryEntry[]> {
  const [registrations, trophies] = await Promise.all([
    prisma.tournamentPlayer.findMany({
      where: { playerId },
      include: { tournament: { select: { id: true, name: true, slug: true, format: true, status: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.trophy.findMany({ where: { playerId }, select: { tournamentId: true } }),
  ]);

  const championIds = new Set(trophies.map((t) => t.tournamentId));
  return registrations.map((r) => ({
    registrationId: r.id,
    tournamentId: r.tournament.id,
    tournamentName: r.tournament.name,
    tournamentSlug: r.tournament.slug,
    format: r.tournament.format.replace(/_/g, " "),
    status: r.tournament.status,
    joinedAt: r.createdAt,
    isChampion: championIds.has(r.tournament.id),
    placement: championIds.has(r.tournament.id) ? "CHAMPION" : null,
  }));
}
