import { describe, expect, it } from "vitest";
import {
  computeRosterNeeds,
  perTeamPositionDemand,
  surplusPositions,
} from "./needs";
import { makeLeague, makePlayer } from "../testing/fixtures";

describe("perTeamPositionDemand", () => {
  it("distributes flex slots equally across eligible positions", () => {
    const league = makeLeague();
    const demand = perTeamPositionDemand(league);
    // Roster: QB, RB, RB, WR, WR, TE, FLEX(RB/WR/TE 1/3 each), K, DEF
    expect(demand.QB).toBeCloseTo(1);
    expect(demand.RB).toBeCloseTo(2 + 1 / 3);
    expect(demand.WR).toBeCloseTo(2 + 1 / 3);
    expect(demand.TE).toBeCloseTo(1 + 1 / 3);
    expect(demand.K).toBeCloseTo(1);
    expect(demand.DEF).toBeCloseTo(1);
  });

  it("ignores bench and IR slots", () => {
    const league = makeLeague();
    const demand = perTeamPositionDemand(league);
    const total = Object.values(demand).reduce((a, b) => a + b, 0);
    // 9 starting slots total.
    expect(total).toBeCloseTo(9);
  });
});

describe("computeRosterNeeds", () => {
  it("reports all starting slots open for an empty roster", () => {
    const league = makeLeague();
    const needs = computeRosterNeeds(league, []);
    expect(needs.depthPhase).toBe(false);
    expect(needs.openSlots).toContain("QB");
    expect(needs.openSlots).toContain("FLEX");
    // 9 starting slots.
    expect(needs.openSlots).toHaveLength(9);
  });

  it("fills dedicated slots before flex", () => {
    const league = makeLeague();
    // Two RBs should fill the two RB slots, not a flex.
    const needs = computeRosterNeeds(league, [
      makePlayer("RB A", "RB", 1),
      makePlayer("RB B", "RB", 2),
    ]);
    // RB slots filled; FLEX still open (no surplus to spill into it).
    expect(needs.openSlots).toContain("FLEX");
    expect(needs.openSlots).not.toContain("RB");
    expect(needs.positionCounts.RB).toBe(2);
  });

  it("spills a surplus RB into FLEX", () => {
    const league = makeLeague();
    const needs = computeRosterNeeds(league, [
      makePlayer("RB A", "RB", 1),
      makePlayer("RB B", "RB", 2),
      makePlayer("RB C", "RB", 3),
    ]);
    // Third RB consumes the FLEX slot.
    expect(needs.openSlots).not.toContain("FLEX");
    expect(needs.openSlots).not.toContain("RB");
  });

  it("marks depth phase when every starting slot is filled", () => {
    const league = makeLeague({
      rosterSlots: [{ type: "QB" }, { type: "RB" }, { type: "BENCH" }],
    });
    const needs = computeRosterNeeds(league, [
      makePlayer("QB A", "QB", 1),
      makePlayer("RB A", "RB", 2),
    ]);
    expect(needs.depthPhase).toBe(true);
    expect(needs.openSlots).toHaveLength(0);
  });
});

describe("surplusPositions", () => {
  it("flags a position once it meets rounded starting demand", () => {
    const league = makeLeague();
    // RB demand ~2.33 -> ceil 3. Three RBs -> surplus.
    const needs = computeRosterNeeds(league, [
      makePlayer("RB A", "RB", 1),
      makePlayer("RB B", "RB", 2),
      makePlayer("RB C", "RB", 3),
    ]);
    expect(surplusPositions(league, needs).has("RB")).toBe(true);
    expect(surplusPositions(league, needs).has("WR")).toBe(false);
  });
});
