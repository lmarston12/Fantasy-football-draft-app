import { describe, expect, it } from "vitest";
import { nextPickNumber, seatForRoster } from "./pick-order";
import type { DraftInfo } from "../providers/types";

/** A draft where seat s owns rosterId 100 + s. */
function draft(teamCount: number, type = "snake"): DraftInfo {
  const slotToRosterId: Record<number, number> = {};
  for (let s = 1; s <= teamCount; s++) slotToRosterId[s] = 100 + s;
  return {
    draftId: "d",
    leagueId: "l",
    status: "drafting",
    teamCount,
    type,
    slotToRosterId,
  };
}

describe("seatForRoster", () => {
  it("finds the seat that owns a roster", () => {
    expect(seatForRoster(draft(16), 105)).toBe(5);
  });
  it("returns null for an unknown roster or null id", () => {
    expect(seatForRoster(draft(16), 999)).toBeNull();
    expect(seatForRoster(draft(16), null)).toBeNull();
  });
});

describe("nextPickNumber (snake)", () => {
  const d = draft(16);

  it("returns the return pick from the start of the draft", () => {
    // Seat 1, no picks made: current pick is 1, return pick is 32.
    expect(nextPickNumber(d, 101, 0)).toBe(32);
  });

  it("returns the upcoming pick when it is not your turn", () => {
    // One pick made (pick 2 is up next); seat 1's next pick is 32.
    expect(nextPickNumber(d, 101, 1)).toBe(32);
  });

  it("looks past the current pick on back-to-back turns", () => {
    // 31 made, pick 32 is up (seat 1's turn): plan for 33.
    expect(nextPickNumber(d, 101, 31)).toBe(33);
    // 32 made, pick 33 is up (seat 1 again): next is round 4 = 64.
    expect(nextPickNumber(d, 101, 32)).toBe(64);
  });

  it("handles a middle seat", () => {
    // Seat 5 of 16: round 1 pick 5, round 2 (reversed) pick 28.
    expect(nextPickNumber(d, 105, 0)).toBe(5);
    expect(nextPickNumber(d, 105, 5)).toBe(28);
  });

  it("returns null for an unknown roster", () => {
    expect(nextPickNumber(d, 999, 0)).toBeNull();
  });
});

describe("nextPickNumber (linear)", () => {
  it("keeps the same seat each round", () => {
    const d = draft(16, "linear");
    // Seat 1: current pick 1, return pick is round 2 pick 17.
    expect(nextPickNumber(d, 101, 0)).toBe(17);
  });
});
