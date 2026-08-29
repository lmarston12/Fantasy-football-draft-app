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
  LeagueSettings,
  NormalizedPlayer,
  Position,
} from "../providers/types";
import { perTeamPositionDemand } from "./needs";

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

/** Consumption after a roster-drift pass, plus which positions it shifted. */
export interface RosterDriftResult {
  consumption: Record<Position, Consumption>;
  /** Positions whose consumption was shifted up (bands made more conservative). */
  shifted: Position[];
}

/**
 * Correct the empirical consumption for roster changes since the history was
 * drafted.
 *
 * The consumption means come from *past* drafts, run under *past* roster
 * settings. If this year's roster demands more of a position than those seasons
 * did — most commonly an added FLEX pulling RB/WR/TE forward — those players
 * will clear earlier than history alone predicts, so the raw bands read
 * optimistic. We nudge the affected means up by the extra league-wide starter
 * demand, scaled by how much of the draft happens before the target pick.
 *
 * Only positions whose demand *increased* are shifted (bands only get more
 * conservative, never looser), and only when at least one past season carries
 * its roster construction so the drift is real rather than assumed. Positions
 * with no empirical signal are left untouched.
 */
export function adjustForRosterDrift(
  consumption: Record<Position, Consumption>,
  params: { league: LeagueSettings; history: LeagueHistory; pickNo: number },
): RosterDriftResult {
  const { league, history, pickNo } = params;
  const teamCount = league.teamCount;
  const rosterSize = league.rosterSlots.length;
  if (teamCount <= 0 || rosterSize <= 0 || pickNo <= 1) {
    return { consumption, shifted: [] };
  }

  // Historical per-team demand, averaged over seasons that carry their roster.
  const histDemands = history.seasons
    .filter((s) => s.rosterSlots && s.rosterSlots.length > 0)
    .map((s) => perTeamPositionDemand({ ...league, rosterSlots: s.rosterSlots! }));
  if (histDemands.length === 0) return { consumption, shifted: [] };

  const current = perTeamPositionDemand(league);
  // Fraction of the whole draft that occurs before the target pick. The extra
  // flex starters are front-loaded; a uniform fraction keeps the nudge modest.
  const beforeFraction = Math.min(1, Math.max(0, (pickNo - 1) / (teamCount * rosterSize)));

  const out = { ...consumption };
  const shifted: Position[] = [];
  for (const pos of ALL_POSITIONS) {
    const c = consumption[pos];
    // Don't fabricate a band where there was no empirical signal.
    if (c.mean === 0 && c.sd === 0) continue;
    const histAvg =
      histDemands.reduce((a, d) => a + d[pos], 0) / histDemands.length;
    const deltaPerTeam = current[pos] - histAvg;
    if (deltaPerTeam <= 1e-9) continue; // only tighten on added demand
    const shift = deltaPerTeam * teamCount * beforeFraction;
    if (shift <= 1e-9) continue;
    out[pos] = { mean: c.mean + shift, sd: c.sd };
    shifted.push(pos);
  }

  return { consumption: out, shifted };
}
