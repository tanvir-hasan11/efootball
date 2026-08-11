import { describe, expect, it } from "vitest";
import { roundRobinPairs, roundRobinDouble, BYE } from "./round-robin";

describe("roundRobinPairs", () => {
  it("returns an empty list for fewer than two participants", () => {
    expect(roundRobinPairs([])).toEqual([]);
    expect(roundRobinPairs(["a"])).toEqual([]);
  });

  it("generates every pair exactly once for an even field", () => {
    const players = ["a", "b", "c", "d"];
    const pairs = roundRobinPairs(players);
    expect(pairs).toHaveLength(6);

    const seen = new Set<string>();
    for (const [a, b] of pairs) {
      const key = [a, b].sort().join("|");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("does not duplicate any matchup for larger even fields", () => {
    const players = Array.from({ length: 16 }, (_, i) => `p${i}`);
    const pairs = roundRobinPairs(players);
    expect(pairs).toHaveLength((16 * 15) / 2);
    const seen = new Set<string>();
    for (const [a, b] of pairs) {
      const key = [a, b].sort().join("|");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("handles odd fields with a bye", () => {
    const players = ["a", "b", "c"];
    const pairs = roundRobinPairs(players);
    expect(pairs).toHaveLength(3);
    const all = players.join(",");
    for (const [a, b] of pairs) {
      expect(a !== b).toBe(true);
      expect(a === BYE || b === BYE || (all.includes(a) && all.includes(b))).toBe(true);
    }
  });
});

describe("roundRobinDouble", () => {
  it("generates both directions for every pair", () => {
    const players = ["a", "b", "c", "d"];
    const pairs = roundRobinDouble(players);
    expect(pairs).toHaveLength(12);
    const keys = new Set(pairs.map(([a, b]) => `${a}>${b}`));
    for (const [a, b] of roundRobinPairs(players)) {
      expect(keys.has(`${a}>${b}`)).toBe(true);
      expect(keys.has(`${b}>${a}`)).toBe(true);
    }
  });
});
