export const BYE = "__BYE__";

export type Pairing = [string, string];

/**
 * Generates a single round-robin fixture list for the given participant ids
 * using the circle method. Every participant plays every other participant
 * exactly once.
 *
 * If the participant count is odd, a BYE participant is added so that one
 * player rests each round.
 */
export function roundRobinPairs(participants: string[]): Pairing[] {
  const n = participants.length;
  if (n < 2) return [];

  const arr = n % 2 === 1 ? [...participants, BYE] : [...participants];
  const size = arr.length;
  const pairs: Pairing[] = [];

  for (let round = 0; round < size - 1; round++) {
    for (let i = 0; i < size / 2; i++) {
      const a = arr[i];
      const b = arr[size - 1 - i];
      if (a !== BYE && b !== BYE) {
        pairs.push([a, b]);
      }
    }
    const last = arr[size - 1];
    for (let j = size - 1; j > 1; j--) {
      arr[j] = arr[j - 1];
    }
    arr[1] = last;
  }

  return pairs;
}

/**
 * Generates a double round-robin (home and away) fixture list for the given
 * participant ids. Each pair of participants meets twice, once in each
 * direction.
 */
export function roundRobinDouble(participants: string[]): Pairing[] {
  const single = roundRobinPairs(participants);
  const doubles = single.flatMap(([a, b]) => [
    [a, b] as Pairing,
    [b, a] as Pairing,
  ]);
  return doubles;
}
