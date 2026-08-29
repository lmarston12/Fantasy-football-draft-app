import { describe, expect, it } from "vitest";
import { bandFor, computeConsumptionByPick } from "./availability";
import { makePlayer } from "../testing/fixtures";
import type {
  DraftPick,
  LeagueHistory,
  NormalizedPlayer,
  Position,
  SeasonHistory,
} from "../providers/types";

const POSITIONS: Position[] = ["QB", "RB", "WR", "TE"];

/** A catalog with 30 stable-id players per offensive position. */
function catalog(): NormalizedPlayer[] {
  const players: NormalizedPlayer[] = [];
  for (const pos of POSITIONS) {
    for (let i = 1; i <= 30; i++) {
      players.push(makePlayer(`${pos} ${i}`, pos, i, "FA", { id: `${pos}-${i}` }));
    }
  }
  return players;
}

/** Build one past season that drafts the first N ids of each position. */
function season(name: string, counts: Partial<Record<Position, number>>): SeasonHistory {
  const picks: DraftPick[] = [];
  let overall = 1;
  for (const pos of POSITIONS) {
    const n = counts[pos] ?? 0;
    for (let i = 1; i <= n; i++) {
      picks.push({
        pickNo: overall++,
        round: 1,
        rosterId: 1,
        pickedBy: "u1",
        playerId: `${pos}-${i}`,
      });
    }
  }
  return { season: name, picks, standings: [] };
}

function history(seasons: SeasonHistory[]): LeagueHistory {
  return { seasons, ownerNames: {}, partial: false };
}

describe("computeConsumptionByPick", () => {
  it("averages per-position consumption before the target pick", () => {
    // Two seasons, 32 picks each before pick 33.
    const h = history([
      season("2024", { RB: 15, WR: 13, TE: 2, QB: 2 }),
      season("2023", { RB: 13, WR: 15, TE: 1, QB: 3 }),
    ]);
    const c = computeConsumptionByPick(h, catalog(), 33);
    expect(c.RB.mean).toBeCloseTo(14);
    expect(c.RB.sd).toBeCloseTo(1);
    expect(c.WR.mean).toBeCloseTo(14);
    expect(c.TE.mean).toBeCloseTo(1.5);
    expect(c.TE.sd).toBeCloseTo(0.5);
    expect(c.QB.mean).toBeCloseTo(2.5);
  });

  it("only counts picks strictly before the target pick", () => {
    // 20 RBs drafted, but only the first 10 land before pick 11.
    const h = history([season("2024", { RB: 20 })]);
    const c = computeConsumptionByPick(h, catalog(), 11);
    expect(c.RB.mean).toBeCloseTo(10);
  });

  it("skips picks for players missing from the catalog", () => {
    const h: LeagueHistory = history([
      {
        season: "2024",
        picks: [
          { pickNo: 1, round: 1, rosterId: 1, pickedBy: "u", playerId: "RB-1" },
          { pickNo: 2, round: 1, rosterId: 1, pickedBy: "u", playerId: "ghost" },
        ],
        standings: [],
      },
    ]);
    const c = computeConsumptionByPick(h, catalog(), 33);
    expect(c.RB.mean).toBeCloseTo(1);
  });

  it("returns no signal for an empty history", () => {
    const c = computeConsumptionByPick(history([]), catalog(), 33);
    for (const pos of POSITIONS) {
      expect(c[pos]).toEqual({ mean: 0, sd: 0 });
    }
  });
});

describe("bandFor", () => {
  const consumption = computeConsumptionByPick(
    history([
      season("2024", { RB: 15, WR: 13, TE: 2, QB: 2 }),
      season("2023", { RB: 13, WR: 15, TE: 1, QB: 3 }),
    ]),
    catalog(),
    33,
  );

  it("flags a player well ahead of consumption as likely gone", () => {
    // RB mean 14, sd 1 (floored to 1.5): k=10 -> z=-2.7.
    expect(bandFor("RB", 10, consumption)).toBe("gone");
  });

  it("flags a player near the mean as a toss-up", () => {
    // k=14 -> z=0.
    expect(bandFor("RB", 14, consumption)).toBe("tossup");
  });

  it("flags a player comfortably past consumption as likely there", () => {
    // k=17 -> z=2.
    expect(bandFor("RB", 17, consumption)).toBe("there");
  });

  it("returns null when the position has no historical signal", () => {
    const empty = computeConsumptionByPick(history([]), catalog(), 33);
    expect(bandFor("RB", 5, empty)).toBeNull();
  });
});
