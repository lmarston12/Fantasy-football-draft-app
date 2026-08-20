/**
 * Map ESPN's `scoringSettings.scoringItems` into the app's ScoringSettings.
 *
 * ESPN encodes scoring as a list of `{ statId, points }` items. We distill the
 * two levers that most change draft value — PPR weight and passing-TD value —
 * keeping a small raw map for transparency. Relevant stat ids:
 *   53 = receptions, 4 = passing touchdowns.
 */

import type { ScoringSettings } from "../types";
import type { EspnScoringItem } from "./client";

const STAT_RECEPTION = 53;
const STAT_PASS_TD = 4;

export function normalizeScoring(
  items: EspnScoringItem[] | null | undefined,
): ScoringSettings {
  const list = items ?? [];
  const byStat = new Map(list.map((i) => [i.statId, i.points]));
  const pointsPerReception = byStat.get(STAT_RECEPTION) ?? 0;
  const passTd = byStat.get(STAT_PASS_TD) ?? 4;
  return {
    pointsPerReception,
    passingTdSixPoints: passTd >= 6,
    raw: {
      rec: pointsPerReception,
      pass_td: passTd,
    },
  };
}
