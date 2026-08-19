/**
 * Roster-needs logic: what starting slots a team still has open, and how much
 * each position is in demand across the league.
 *
 * This is pure and deterministic so it can be unit-tested independently of any
 * network data.
 */

import {
  SLOT_ELIGIBILITY,
  STARTING_SLOTS,
  type LeagueSettings,
  type NormalizedPlayer,
  type Position,
  type RosterSlot,
  type SlotType,
} from "../providers/types";

const ALL_POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

/** Only starting slots (bench/IR/taxi excluded). */
function startingSlots(rosterSlots: RosterSlot[]): SlotType[] {
  return rosterSlots
    .map((s) => s.type)
    .filter((t) => STARTING_SLOTS.includes(t));
}

/**
 * Per-team demand for each position, distributing flex slots equally across
 * their eligible positions. E.g. a FLEX contributes 1/3 each to RB/WR/TE.
 * Used to compute VBD replacement levels.
 */
export function perTeamPositionDemand(
  league: LeagueSettings,
): Record<Position, number> {
  const demand: Record<Position, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    K: 0,
    DEF: 0,
  };
  for (const slot of startingSlots(league.rosterSlots)) {
    const eligible = SLOT_ELIGIBILITY[slot];
    if (eligible.length === 0) continue;
    const share = 1 / eligible.length;
    for (const pos of eligible) demand[pos] += share;
  }
  return demand;
}

export interface RosterNeeds {
  /** Count of each position currently on the roster. */
  positionCounts: Record<Position, number>;
  /** Starting slots not yet fillable by current players. */
  openSlots: SlotType[];
  /** Positions eligible to fill at least one open starting slot. */
  neededPositions: Set<Position>;
  /** True once all (fillable) starting slots are occupied. */
  depthPhase: boolean;
}

/**
 * Greedily assign the roster's players to starting slots to determine which
 * starting slots remain open.
 *
 * Dedicated position slots (QB/RB/...) are filled before flex slots so that a
 * flex is only consumed by a genuine surplus player. Within that, we fill in
 * the slot order the league defined.
 */
export function computeRosterNeeds(
  league: LeagueSettings,
  myPlayers: NormalizedPlayer[],
): RosterNeeds {
  const positionCounts: Record<Position, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    K: 0,
    DEF: 0,
  };
  for (const p of myPlayers) {
    if (p.position) positionCounts[p.position] += 1;
  }

  // Pool of available players per position for greedy slot assignment.
  const remaining: Record<Position, number> = { ...positionCounts };

  const slots = startingSlots(league.rosterSlots);
  // Fill dedicated slots first, then flex slots (most restrictive first).
  const ordered = [...slots].sort(
    (a, b) => SLOT_ELIGIBILITY[a].length - SLOT_ELIGIBILITY[b].length,
  );

  const openSlots: SlotType[] = [];
  for (const slot of ordered) {
    const eligible = SLOT_ELIGIBILITY[slot];
    // Choose the eligible position with the most surplus to fill this slot.
    const pick = eligible
      .filter((pos) => remaining[pos] > 0)
      .sort((a, b) => remaining[b] - remaining[a])[0];
    if (pick) {
      remaining[pick] -= 1;
    } else {
      openSlots.push(slot);
    }
  }

  const neededPositions = new Set<Position>();
  for (const slot of openSlots) {
    for (const pos of SLOT_ELIGIBILITY[slot]) neededPositions.add(pos);
  }

  return {
    positionCounts,
    openSlots,
    neededPositions,
    depthPhase: openSlots.length === 0,
  };
}

/** Positions the roster has a surplus of relative to starting demand. */
export function surplusPositions(
  league: LeagueSettings,
  needs: RosterNeeds,
): Set<Position> {
  const demand = perTeamPositionDemand(league);
  const surplus = new Set<Position>();
  for (const pos of ALL_POSITIONS) {
    // Round demand up: 2.33 RB demand means ~3 useful RBs before surplus.
    const target = Math.ceil(demand[pos]);
    if (needs.positionCounts[pos] >= target && target > 0) {
      surplus.add(pos);
    }
  }
  return surplus;
}
