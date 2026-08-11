export type BracketSlot = {
  position: number;
  home: string | null;
  away: string | null;
};

export type BracketRound = {
  round: number;
  slots: BracketSlot[];
};

export type SingleEliminationBracket = {
  rounds: BracketRound[];
  thirdPlaceMatch: boolean;
};

export function nextPowerOfTwo(n: number): number {
  if (n <= 0) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Returns the standard tournament seeding order for a bracket of `size`
 * (a power of two). The returned array has length `size`; `order[i]` is the
 * seed placed at bracket position `i`. Adjacent positions pair up in the first
 * round so that seed 1 and seed 2 cannot meet before the final.
 */
export function seedOrder(size: number): number[] {
  if (size === 1) return [1];
  const half = seedOrder(size / 2);
  const result: number[] = [];
  for (const s of half) {
    result.push(s);
    result.push(size + 1 - s);
  }
  return result;
}

function roundCount(bracketSize: number): number {
  let n = bracketSize;
  let rounds = 0;
  while (n > 1) {
    n /= 2;
    rounds++;
  }
  return rounds;
}

/**
 * Generates a single-elimination bracket for `participants` (an array of
 * participant ids ordered by seed, index 0 = seed 1). Top seeds receive byes
 * when the participant count is not a power of two. A `THIRD_PLACE` match is
 * optionally included between the two semi-final losers.
 *
 * Round-1 slots are filled; later rounds are left empty and populated by
 * advancement. The winner of a slot at `position p` in `round r` feeds slot
 * `floor(p / 2)` in `round r + 1`.
 */
export function generateSingleElimination(
  participants: string[],
  thirdPlaceMatch = true,
): SingleEliminationBracket {
  if (participants.length === 0) {
    return { rounds: [], thirdPlaceMatch };
  }

  const size = nextPowerOfTwo(participants.length);
  const order = seedOrder(size);
  const totalRounds = roundCount(size);
  const rounds: BracketRound[] = [];

  const round1Slots: BracketSlot[] = [];
  const round2Home: Record<number, string> = {};
  const round2Away: Record<number, string> = {};

  for (let p = 0; p < size / 2; p++) {
    const seedA = order[2 * p];
    const seedB = order[2 * p + 1];
    const hasA = seedA <= participants.length;
    const hasB = seedB <= participants.length;

    let home: string | null = null;
    let away: string | null = null;
    if (hasA && hasB) {
      home = participants[seedA - 1];
      away = participants[seedB - 1];
    } else if (hasA) {
      home = participants[seedA - 1];
    } else if (hasB) {
      away = participants[seedB - 1];
    }
    round1Slots.push({ position: p, home, away });

    if ((hasA && !hasB) || (!hasA && hasB)) {
      const winner = hasA ? participants[seedA - 1] : participants[seedB - 1];
      const parent = Math.floor(p / 2);
      if (p % 2 === 0) round2Home[parent] = winner;
      else round2Away[parent] = winner;
    }
  }
  rounds.push({ round: 1, slots: round1Slots });

  for (let r = 2; r <= totalRounds; r++) {
    const slotCount = size / Math.pow(2, r);
    const slots: BracketSlot[] = [];
    for (let pos = 0; pos < slotCount; pos++) {
      const home = r === 2 ? round2Home[pos] ?? null : null;
      const away = r === 2 ? round2Away[pos] ?? null : null;
      slots.push({ position: pos, home, away });
    }
    rounds.push({ round: r, slots });
  }

  return { rounds, thirdPlaceMatch };
}

/**
 * Generates an empty knockout skeleton with `size` slots in the first round
 * (a power of two). Every slot is null; participants are filled in by
 * advancement logic. Used for knockout stages whose entrants are determined
 * at runtime (e.g. group-stage qualifiers).
 */
export function emptyBracket(size: number, thirdPlaceMatch = true): SingleEliminationBracket {
  const totalRounds = roundCount(size);
  const rounds: BracketRound[] = [];
  for (let r = 1; r <= totalRounds; r++) {
    const slotCount = size / Math.pow(2, r);
    rounds.push({
      round: r,
      slots: Array.from({ length: slotCount }, (_, pos) => ({ position: pos, home: null, away: null })),
    });
  }
  return { rounds, thirdPlaceMatch };
}

const STAGE_NAMES = [
  "Final",
  "Semi-finals",
  "Quarter-finals",
  "Round of 16",
  "Round of 32",
  "Round of 64",
];

/**
 * Maps a bracket round number to a human-readable stage label, e.g. round 1 of
 * a 32-player bracket is "Round of 32".
 */
export function stageLabel(roundNumber: number, totalRounds: number): string {
  const fromFinal = totalRounds - roundNumber;
  return STAGE_NAMES[fromFinal] ?? `Round ${roundNumber}`;
}
