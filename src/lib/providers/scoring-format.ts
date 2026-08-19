/**
 * Provider-agnostic display helpers for normalized scoring.
 *
 * These read only the shared `ScoringSettings` shape, so they live outside any
 * one platform's adapter and are safe to import from UI and from any provider.
 */

import type { ScoringSettings } from "./types";

/** Human label for the PPR flavor, for display. */
export function pprLabel(scoring: ScoringSettings): string {
  const ppr = scoring.pointsPerReception;
  if (ppr >= 1) return "PPR";
  if (ppr > 0) return `${ppr} PPR`;
  return "Standard";
}
