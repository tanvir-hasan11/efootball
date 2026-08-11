export type SwissPlayer = {
  id: string;
  points: number;
};

export type SwissPairing = [string, string];

/**
 * Generates one round of Swiss pairings for `players`.
 *
 * Players are sorted by points (descending, stable) and paired greedily
 * top-down: each player meets the closest-ranked opponent they have not
 * already played. `previousMatchups` should contain every matchup key
 * (e.g. "a|b" with a < b) played in earlier rounds.
 */
export function generateSwissRound(
  players: SwissPlayer[],
  previousMatchups: Set<string>,
): SwissPairing[] {
  const matchupKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  const sorted = [...players].sort((a, b) => b.points - a.points);
  const used = new Set<string>();
  const pairs: SwissPairing[] = [];

  for (const p of sorted) {
    if (used.has(p.id)) continue;

    let opponent: string | null = null;
    for (const q of sorted) {
      if (q.id === p.id || used.has(q.id)) continue;
      if (previousMatchups.has(matchupKey(p.id, q.id))) continue;
      opponent = q.id;
      break;
    }

    if (opponent) {
      used.add(p.id);
      used.add(opponent);
      pairs.push([p.id, opponent]);
    } else {
      // No opponent available without a rematch; this can happen with an
      // odd field. The player receives a bye.
      used.add(p.id);
    }
  }

  return pairs;
}
