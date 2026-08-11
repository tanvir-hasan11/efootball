import { describe, expect, it } from "vitest";
import { computeStandings } from "./standings";

describe("computeStandings", () => {
  const results = [
    { home: "a", away: "b", homeScore: 2, awayScore: 1 },
    { home: "c", away: "d", homeScore: 0, awayScore: 0 },
    { home: "b", away: "c", homeScore: 1, awayScore: 1 },
    { home: "d", away: "a", homeScore: 0, awayScore: 3 },
    { home: "a", away: "c", homeScore: 1, awayScore: 2 },
    { home: "b", away: "d", homeScore: 3, awayScore: 0 },
  ];

  it("sorts by points then goal difference then goals for", () => {
    const table = computeStandings(results);
    expect(table).toHaveLength(4);

    const byId = Object.fromEntries(table.map((r) => [r.participantId, r]));
    expect(byId["a"].points).toBe(6); // 2 wins
    expect(byId["b"].points).toBe(4); // 1 win, 1 draw, 1 loss
    expect(byId["c"].points).toBe(5); // 1 win, 2 draws
    expect(byId["d"].points).toBe(1); // 1 draw, 2 losses

    expect(table[0].participantId).toBe("a");
    expect(table[1].participantId).toBe("c");
    expect(table[2].participantId).toBe("b");
    expect(table[3].participantId).toBe("d");
  });

  it("tracks per-match statistics correctly", () => {
    const table = computeStandings(results);
    const a = table.find((r) => r.participantId === "a")!;
    expect(a.played).toBe(3);
    expect(a.won).toBe(2);
    expect(a.lost).toBe(1);
    expect(a.goalsFor).toBe(6);
    expect(a.goalsAgainst).toBe(3);
    expect(a.goalDiff).toBe(3);
  });

  it("breaks ties using head-to-head when enabled", () => {
    const tied = [
      { home: "x", away: "y", homeScore: 2, awayScore: 0 },
      { home: "x", away: "z", homeScore: 0, awayScore: 2 },
      { home: "y", away: "z", homeScore: 1, awayScore: 1 },
    ];
    const table = computeStandings(tied, { headToHead: true });
    // x and z both have 3 points, GD 0. x beat y, z beat x, so z should rank first.
    expect(table[0].participantId).toBe("z");
    expect(table[1].participantId).toBe("x");
  });

  it("respects custom scoring configuration", () => {
    const custom = [
      { home: "a", away: "b", homeScore: 1, awayScore: 0 },
      { home: "c", away: "d", homeScore: 0, awayScore: 0 },
    ];
    const table = computeStandings(custom, { win: 3, draw: 0, loss: 0, headToHead: false });
    const a = table.find((r) => r.participantId === "a")!;
    const c = table.find((r) => r.participantId === "c")!;
    expect(a.points).toBe(3);
    expect(c.points).toBe(0);
  });
});
