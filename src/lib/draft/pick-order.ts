/**
 * Snake/linear draft-order math: which overall pick number a manager makes
 * next. Pure and deterministic so it can be unit-tested without any draft data.
 */

import type { DraftInfo } from "../providers/types";

/** The 1-indexed draft seat (slot) that a roster owns, or null if none. */
export function seatForRoster(
  draft: DraftInfo,
  rosterId: number | null,
): number | null {
  if (rosterId == null) return null;
  for (const [slot, rid] of Object.entries(draft.slotToRosterId)) {
    if (rid === rosterId) return Number(slot);
  }
  return null;
}

/** Overall pick number for a seat in a given round (1-indexed round & seat). */
function pickInRound(
  seat: number,
  round: number,
  teamCount: number,
  snake: boolean,
): number {
  const base = (round - 1) * teamCount;
  // Snake reverses the seat order every even round.
  if (snake && round % 2 === 0) return base + (teamCount - seat + 1);
  return base + seat;
}

/**
 * The manager's next pick number given how many picks have already been made.
 *
 * "Next" is the manager's upcoming pick; when it is currently their turn, it is
 * the pick AFTER this one — the "return pick" you're planning for. (For a
 * 16-team snake seat 1 with no picks made, this returns 32, not 1.) Returns
 * null when the roster has no seat or the draft has run out of rounds.
 */
export function nextPickNumber(
  draft: DraftInfo,
  rosterId: number | null,
  picksMade: number,
  maxRounds = 60,
): number | null {
  const seat = seatForRoster(draft, rosterId);
  if (seat == null) return null;

  const teamCount =
    draft.teamCount > 0
      ? draft.teamCount
      : Object.keys(draft.slotToRosterId).length;
  if (teamCount <= 0 || seat > teamCount) return null;

  const snake = !draft.type.toLowerCase().includes("linear");
  const nextToMake = picksMade + 1;

  const seatPicks: number[] = [];
  for (let round = 1; round <= maxRounds; round++) {
    seatPicks.push(pickInRound(seat, round, teamCount, snake));
  }
  seatPicks.sort((a, b) => a - b);

  const upcoming = seatPicks.find((p) => p >= nextToMake);
  if (upcoming == null) return null;
  // If it's currently our turn, the pick we plan for is the one after it.
  if (upcoming === nextToMake) {
    return seatPicks.find((p) => p > upcoming) ?? null;
  }
  return upcoming;
}
