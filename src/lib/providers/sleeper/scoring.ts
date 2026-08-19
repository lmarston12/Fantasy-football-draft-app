/**
 * Normalize Sleeper's `scoring_settings` map into the app's ScoringSettings.
 *
 * Sleeper stores scoring as a flat map of scalar rules (e.g. `rec: 1`,
 * `pass_td: 4`). We distill the two levers that most change draft value —
 * PPR weight and passing-TD value — while keeping the raw map for
 * transparency. This is intentionally small; the ranking engine currently
 * uses PPR weight to nudge pass-catchers, not a full points projection.
 */

import type { ScoringSettings } from "../types";

export function normalizeScoring(
  raw: Record<string, number> | null | undefined,
): ScoringSettings {
  const scoring = raw ?? {};
  const pointsPerReception =
    typeof scoring.rec === "number" ? scoring.rec : 0;
  const passTd = typeof scoring.pass_td === "number" ? scoring.pass_td : 4;
  return {
    pointsPerReception,
    passingTdSixPoints: passTd >= 6,
    raw: scoring,
  };
}

/** Human label for the PPR flavor, for display. */
export function pprLabel(scoring: ScoringSettings): string {
  const ppr = scoring.pointsPerReception;
  if (ppr >= 1) return "PPR";
  if (ppr > 0) return `${ppr} PPR`;
  return "Standard";
}
