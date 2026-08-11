export type MatchResult = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
};

export type StandingRow = {
  participantId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

export type ScoringConfig = {
  win: number;
  draw: number;
  loss: number;
  headToHead: boolean;
};

const DEFAULT_SCORING: ScoringConfig = { win: 3, draw: 1, loss: 0, headToHead: true };

type H2H = { points: number; gd: number; gf: number };

/**
 * Computes a sorted standings table from a list of completed match results.
 *
 * Primary sort order: points, goal difference, goals for, then participant id
 * for stability. When `headToHead` is enabled, clusters that are still tied
 * after points/GD/GF are resolved by head-to-head results between the tied
 * participants.
 */
export function computeStandings(results: MatchResult[], config?: Partial<ScoringConfig>): StandingRow[] {
  const cfg: ScoringConfig = { ...DEFAULT_SCORING, ...config };

  const map = new Map<string, StandingRow>();
  const ensure = (id: string): StandingRow => {
    let row = map.get(id);
    if (!row) {
      row = {
        participantId: id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      };
      map.set(id, row);
    }
    return row;
  };

  for (const r of results) {
    const h = ensure(r.home);
    const a = ensure(r.away);
    h.played++;
    a.played++;
    h.goalsFor += r.homeScore;
    h.goalsAgainst += r.awayScore;
    a.goalsFor += r.awayScore;
    a.goalsAgainst += r.homeScore;
    const p = pointsFrom(cfg, r.homeScore - r.awayScore);
    h.points += p.winner;
    a.points += p.loser;
    if (r.homeScore > r.awayScore) {
      h.won++;
      a.lost++;
    } else if (r.homeScore < r.awayScore) {
      a.won++;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
    }
  }

  const rows = [...map.values()];
  for (const row of rows) row.goalDiff = row.goalsFor - row.goalsAgainst;

  rows.sort(compareRows);
  if (cfg.headToHead) applyHeadToHead(rows, results);

  return rows;
}

function compareRows(a: StandingRow, b: StandingRow): number {
  return (
    b.points - a.points ||
    b.goalDiff - a.goalDiff ||
    b.goalsFor - a.goalsFor ||
    a.participantId.localeCompare(b.participantId)
  );
}

function pointsFrom(config: ScoringConfig, diff: number): { winner: number; loser: number } {
  if (diff > 0) return { winner: config.win, loser: config.loss };
  if (diff < 0) return { winner: config.loss, loser: config.win };
  return { winner: config.draw, loser: config.draw };
}

function samePrimary(a: StandingRow, b: StandingRow): boolean {
  return a.points === b.points && a.goalDiff === b.goalDiff && a.goalsFor === b.goalsFor;
}

/**
 * Resolves ties between participants that share identical primary stats by
 * comparing the points, goal difference and goals scored in direct matches
 * against the other tied participants. Reorders each tied cluster in place.
 */
function applyHeadToHead(rows: StandingRow[], results: MatchResult[]): void {
  let start = 0;
  while (start < rows.length) {
    let end = start + 1;
    while (end < rows.length && samePrimary(rows[start], rows[end])) end++;
    if (end - start > 1) {
      const cluster = rows.slice(start, end);
      reorderCluster(cluster, results);
      for (let i = 0; i < cluster.length; i++) {
        rows[start + i] = cluster[i];
      }
    }
    start = end;
  }
}

function reorderCluster(cluster: StandingRow[], results: MatchResult[]): void {
  const idSet = new Set(cluster.map((r) => r.participantId));
  const h2h = new Map<string, H2H>();
  for (const id of idSet) h2h.set(id, { points: 0, gd: 0, gf: 0 });

  for (const r of results) {
    if (!idSet.has(r.home) || !idSet.has(r.away)) continue;
    const h = h2h.get(r.home)!;
    const a = h2h.get(r.away)!;
    h.gd += r.homeScore - r.awayScore;
    a.gd += r.awayScore - r.homeScore;
    h.gf += r.homeScore;
    a.gf += r.awayScore;
    if (r.homeScore > r.awayScore) {
      h.points += 3;
      a.points += 0;
    } else if (r.homeScore < r.awayScore) {
      a.points += 3;
      h.points += 0;
    } else {
      h.points += 1;
      a.points += 1;
    }
  }

  const rank = new Map<string, number>();
  const ids = [...idSet];
  ids
    .sort((x, y) => {
      const a = h2h.get(x)!;
      const b = h2h.get(y)!;
      return b.points - a.points || b.gd - a.gd || b.gf - a.gf || x.localeCompare(y);
    })
    .forEach((id, i) => rank.set(id, i));

  cluster.sort((a, b) => rank.get(a.participantId)! - rank.get(b.participantId)!);
}
