/**
 * "Availability at your next pick": will a given available player still be on
 * the board when this manager picks again?
 *
 * The model is calibrated to the league's OWN draft history rather than generic
 * ADP. For a target overall pick P we measure, across past seasons, how many
 * players of each position were taken before pick P (mean + spread). A player's
 * chance of surviving to P is then their positional rank vs that consumption:
 * if far more of their position typically clears than their rank, they're
 * likely gone; if fewer, likely there.
 *
 * All functions here are pure and deterministic (unit-tested with a fixture).
 */

import type {
  LeagueHistory,
  NormalizedPlayer,
  Position,
} from "../providers/types";

const ALL_POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

/** Mean and standard deviation of a position's consumption before a pick. */
export interface Consumption {
  /** Mean count of this position drafted before the target pick. */
  mean: number;
  /** Standard deviation of that count across past seasons. */
  sd: number;
}

/** How likely an available player is to survive to the target pick. */
export type AvailabilityBand = "gone" | "tossup" | "there";

/** Floor on the spread so a single (or tight) history can't over-collapse z. */
const MIN_SD = 1.5;

function zeroCounts(): Record<Position, number> {
  return { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 };
}

function emptyConsumption(): Record<Position, Consumption> {
  const out = {} as Record<Position, Consumption>;
  for (const pos of ALL_POSITIONS) out[pos] = { mean: 0, sd: 0 };
  return out;
}

/**
 * Per-position consumption before overall pick `pickNo`, averaged over the
 * league's past seasons.
 *
 * Positions are resolved through the current `catalog` (a draft pick carries
 * only a player id); historical picks for players no longer in the catalog are
 * skipped, and a season with no catalog overlap contributes no signal. A
 * position or history with no signal returns {mean:0, sd:0}, which `bandFor`
 * treats as "don't guess".
 */
export function computeConsumptionByPick(
  history: LeagueHistory,
  catalog: NormalizedPlayer[],
  pickNo: number,
): Record<Position, Consumption> {
  const result = emptyConsumption();
  if (pickNo <= 1 || history.seasons.length === 0) return result;

  const positionById = new Map<string, Position>();
  for (const p of catalog) {
    if (p.position) positionById.set(p.id, p.position);
  }

  // Per-position array of "count taken before P", one entry per usable season.
  const perSeasonCounts: Record<Position, number[]> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    K: [],
    DEF: [],
  };

  for (const season of history.seasons) {
    const counts = zeroCounts();
    let usable = false;
    for (const pick of season.picks) {
      if (pick.pickNo >= pickNo) continue;
      const pos = positionById.get(pick.playerId);
      if (!pos) continue;
      counts[pos] += 1;
      usable = true;
    }
    // A season we couldn't resolve at all (no catalog overlap) adds no signal.
    if (!usable) continue;
    for (const pos of ALL_POSITIONS) perSeasonCounts[pos].push(counts[pos]);
  }

  for (const pos of ALL_POSITIONS) {
    const xs = perSeasonCounts[pos];
    if (xs.length === 0) continue;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
    result[pos] = { mean, sd: Math.sqrt(variance) };
  }

  return result;
}

/**
 * Band an available player by comparing their positional rank `k` to how much
 * of their position typically clears before the target pick.
 *
 *   z = (k - mean) / max(sd, MIN_SD)
 *   z <= -0.6        far more of this position clears than their rank -> gone
 *   -0.6 < z < 0.9   within the noise -> toss-up
 *   z >= 0.9         their rank sits comfortably past consumption -> there
 *
 * Returns null when there's no historical signal for the position (mean and sd
 * both zero) so the caller can simply show no band rather than a false guess.
 */
export function bandFor(
  position: Position,
  positionalRank: number,
  consumption: Record<Position, Consumption>,
): AvailabilityBand | null {
  const c = consumption[position];
  if (!c || (c.mean === 0 && c.sd === 0)) return null;
  const z = (positionalRank - c.mean) / Math.max(c.sd, MIN_SD);
  if (z <= -0.6) return "gone";
  if (z >= 0.9) return "there";
  return "tossup";
}
