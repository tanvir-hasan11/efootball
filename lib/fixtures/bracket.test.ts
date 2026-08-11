import { describe, expect, it } from "vitest";
import { generateSingleElimination, nextPowerOfTwo, seedOrder, stageLabel } from "./bracket";
import { generateDoubleElimination } from "./double-elim";
import { generateSwissRound } from "./swiss";

describe("seedOrder", () => {
  it("produces the standard bracket seeding", () => {
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(seedOrder(16)).toEqual([1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]);
  });
});

describe("nextPowerOfTwo", () => {
  it("rounds up to the next power of two", () => {
    expect(nextPowerOfTwo(1)).toBe(1);
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(12)).toBe(16);
    expect(nextPowerOfTwo(31)).toBe(32);
  });
});

describe("generateSingleElimination", () => {
  it("builds a full bracket for a power-of-two field", () => {
    const players = Array.from({ length: 16 }, (_, i) => `p${i + 1}`);
    const bracket = generateSingleElimination(players);
    expect(bracket.rounds).toHaveLength(4);
    const counts = bracket.rounds.map((r) => r.slots.length);
    expect(counts).toEqual([8, 4, 2, 1]);
    expect(bracket.rounds[0].slots[0]).toEqual({ position: 0, home: "p1", away: "p16" });
    expect(bracket.rounds[0].slots[4]).toEqual({ position: 4, home: "p2", away: "p15" });
  });

  it("gives top seeds byes when the field is not a power of two", () => {
    const players = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
    const bracket = generateSingleElimination(players);
    const round1 = bracket.rounds[0].slots;
    const matches = round1.filter((s) => s.home && s.away);
    expect(matches).toHaveLength(4);
    const byes = round1.filter((s) => (s.home && !s.away) || (!s.home && s.away));
    expect(byes).toHaveLength(4);
    // Seed 1 gets a bye and should appear in round 2.
    const round2 = bracket.rounds[1].slots;
    const allRound2 = round2.flatMap((s) => [s.home, s.away]).filter(Boolean);
    expect(allRound2).toContain("p1");
  });

  it("exposes a sensible stage label", () => {
    expect(stageLabel(1, 5)).toBe("Round of 32");
    expect(stageLabel(2, 5)).toBe("Round of 16");
    expect(stageLabel(3, 5)).toBe("Quarter-finals");
    expect(stageLabel(4, 5)).toBe("Semi-finals");
    expect(stageLabel(5, 5)).toBe("Final");
  });
});

describe("generateDoubleElimination", () => {
  it("produces the correct number of matches for a clean field", () => {
    const players = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
    const bracket = generateDoubleElimination(players);
    // Winners: 7 matches. Losers: 6 matches. Grand final: 1. Total 14 = 2*(8-1).
    expect(bracket.slots).toHaveLength(14);
    const losers = bracket.slots.filter((s) => s.bracketType === "LOSERS");
    expect(losers).toHaveLength(6);
    const grand = bracket.slots.filter((s) => s.bracketType === "GRAND");
    expect(grand).toHaveLength(1);
  });

  it("fills winners round 1 and leaves later slots empty", () => {
    const players = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
    const bracket = generateDoubleElimination(players);
    const round1 = bracket.slots.filter((s) => s.bracketType === "WINNERS" && s.round === 1);
    expect(round1).toHaveLength(4);
    expect(round1.every((s) => s.home && s.away)).toBe(true);
    const allFilled = bracket.slots.filter((s) => s.home || s.away);
    expect(allFilled).toHaveLength(4);
  });
});

describe("generateSwissRound", () => {
  it("pairs the top two players together and avoids rematches", () => {
    const players = [
      { id: "a", points: 9 },
      { id: "b", points: 6 },
      { id: "c", points: 3 },
      { id: "d", points: 0 },
    ];
    const used = new Set<string>();
    const pairs = generateSwissRound(players, used);
    expect(pairs).toHaveLength(2);
    expect(pairs[0][0]).toBe("a");
    expect(pairs[0][1]).toBe("b");
  });

  it("does not pair opponents that already played", () => {
    const players = [
      { id: "a", points: 9 },
      { id: "b", points: 6 },
      { id: "c", points: 3 },
      { id: "d", points: 0 },
    ];
    const used = new Set(["a|b"]);
    const pairs = generateSwissRound(players, used);
    const keyOf = ([x, y]: [string, string]) => (x < y ? `${x}|${y}` : `${y}|${x}`);
    for (const p of pairs) {
      expect(used.has(keyOf(p))).toBe(false);
    }
    // a must play c now, not b.
    expect(pairs.some((p) => p.includes("a") && p.includes("c"))).toBe(true);
  });
});
