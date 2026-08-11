import { seedOrder as seedOrderFor } from "./bracket";

export type BracketType = "WINNERS" | "LOSERS" | "GRAND";

export type DoubleElimSlot = {
  bracketType: BracketType;
  round: number;
  position: number;
  home: string | null;
  away: string | null;
};

export type DoubleEliminationBracket = {
  winnersRounds: number;
  losersRounds: number;
  slots: DoubleElimSlot[];
};

function losersRoundCounts(k: number): number[] {
  const rounds = 2 * k - 2;
  const sizes: number[] = [];
  for (let i = 1; i <= rounds; i++) {
    sizes.push(Math.pow(2, k - 2 - Math.floor((i - 1) / 2)));
  }
  return sizes;
}

/**
 * Generates the skeleton of a double-elimination bracket for `participants`
 * (ordered by seed). Winners-bracket round 1 is filled (top seeds receive
 * byes); every other slot is left empty and populated by advancement.
 *
 * Feeding rules (used by the advancement logic):
 * - Winner of WB slot (r, p) -> WB slot (r+1, floor(p/2)).
 * - Loser of WB round-1 slot (1, p) -> LB slot (1, p).
 * - Loser of WB slot (r, p) with r >= 2 -> LB slot (2r-2, p).
 * - Winner of LB slot (i, p) -> LB slot (i+1, p).
 * - Grand final: WB champion vs final LB champion.
 */
export function generateDoubleElimination(participants: string[]): DoubleEliminationBracket {
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(participants.length, 2))));
  const k = Math.log2(size);
  const winnersRounds = k;
  const losersRounds = 2 * k - 2;
  const order = seedOrderFor(size);
  const slots: DoubleElimSlot[] = [];

  const round1ByeHome: Record<number, string> = {};
  const round1ByeAway: Record<number, string> = {};

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
    slots.push({ bracketType: "WINNERS", round: 1, position: p, home, away });

    if ((hasA && !hasB) || (!hasA && hasB)) {
      const winner = hasA ? participants[seedA - 1] : participants[seedB - 1];
      const parent = Math.floor(p / 2);
      if (p % 2 === 0) round1ByeHome[parent] = winner;
      else round1ByeAway[parent] = winner;
    }
  }

  for (let r = 2; r <= winnersRounds; r++) {
    const slotCount = size / Math.pow(2, r);
    for (let pos = 0; pos < slotCount; pos++) {
      const home = r === 2 ? round1ByeHome[pos] ?? null : null;
      const away = r === 2 ? round1ByeAway[pos] ?? null : null;
      slots.push({ bracketType: "WINNERS", round: r, position: pos, home, away });
    }
  }

  const losersCounts = losersRoundCounts(k);
  for (let i = 0; i < losersCounts.length; i++) {
    for (let pos = 0; pos < losersCounts[i]; pos++) {
      slots.push({ bracketType: "LOSERS", round: i + 1, position: pos, home: null, away: null });
    }
  }

  slots.push({ bracketType: "GRAND", round: 1, position: 0, home: null, away: null });

  return { winnersRounds, losersRounds, slots };
}
