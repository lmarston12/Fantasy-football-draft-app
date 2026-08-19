/**
 * The ranking engine: given league settings, the player catalog, and the picks
 * made so far, produce a scarcity-aware, roster-need-aware ranking of the best
 * available players.
 *
 * Approach (rank-based Value Over Replacement / VBD):
 *
 *  1. Base ordering rank per player = custom rank (if imported) else Sleeper's
 *     `search_rank`. Unranked players sort to the bottom.
 *  2. Per position, compute a "replacement level": the positional rank of the
 *     last player expected to start across the whole league, derived from the
 *     league's actual roster construction (dedicated + flex slots), not a
 *     generic default.
 *  3. Each available player's value = replacementRank - positionalRank (VOR).
 *     Positive = a startable, above-replacement player; scarcity at a position
 *     (deep starting requirements) pushes replacement deeper and raises value.
 *  4. Recommendation score = VOR adjusted for the user's roster: a bonus for
 *     filling an open starting slot, a penalty for positions already stocked,
 *     and a handcuff bonus once the starting lineup is essentially full.
 *
 * This uses only free public data (Sleeper's consensus `search_rank`) and the
 * league's own settings. It is a heuristic, not a points projection — see
 * README "Limitations".
 */

import {
  type NormalizedPlayer,
  type Position,
} from "../providers/types";
import {
  computeRosterNeeds,
  perTeamPositionDemand,
  surplusPositions,
  type RosterNeeds,
} from "../draft/needs";
import type {
  BuildDraftBoardParams,
  DraftBoard,
  EngineConfig,
  RankedPlayer,
  Tier,
} from "./types";
import { SLOT_ELIGIBILITY } from "../providers/types";

const ALL_POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

export const DEFAULT_CONFIG: EngineConfig = {
  needBonus: 10,
  surplusPenalty: 6,
  handcuffBonus: 6,
};

/** VOR thresholds for tier labels (points above/below replacement). */
function tierForVor(vor: number): Tier {
  if (vor >= 24) return "Elite";
  if (vor >= 12) return "Great";
  if (vor >= 0) return "Starter";
  if (vor >= -12) return "Depth";
  return "Deep";
}

function baseRankFor(
  player: NormalizedPlayer,
  customRankById?: ReadonlyMap<string, number>,
): number {
  const custom = customRankById?.get(player.id);
  if (typeof custom === "number") return custom;
  if (typeof player.searchRank === "number") return player.searchRank;
  return Number.POSITIVE_INFINITY;
}

/** Replacement-level positional rank per position for this league. */
export function replacementRanks(
  perTeamDemandByPos: Record<Position, number>,
  teamCount: number,
): Record<Position, number> {
  const ranks = {} as Record<Position, number>;
  for (const pos of ALL_POSITIONS) {
    // League-wide expected starters at this position ~= the last startable rank.
    const leagueStarters = Math.round(perTeamDemandByPos[pos] * teamCount);
    ranks[pos] = Math.max(1, leagueStarters);
  }
  return ranks;
}

export function buildDraftBoard(params: BuildDraftBoardParams): DraftBoard {
  const { league, catalog, picks, myRosterId, customRankById } = params;
  const config: EngineConfig = { ...DEFAULT_CONFIG, ...params.config };

  const byId = new Map(catalog.map((p) => [p.id, p]));
  const draftedIds = new Set(picks.map((p) => p.playerId));

  // The user's current roster.
  const myPlayers: NormalizedPlayer[] =
    myRosterId == null
      ? []
      : picks
          .filter((p) => p.rosterId === myRosterId)
          .map((p) => byId.get(p.playerId))
          .filter((p): p is NormalizedPlayer => Boolean(p));

  const needs: RosterNeeds = computeRosterNeeds(league, myPlayers);
  const surplus = surplusPositions(league, needs);
  const perTeamDemand = perTeamPositionDemand(league);
  const replacementRankByPos = replacementRanks(perTeamDemand, league.teamCount);

  // Positions that can fill any open starting slot.
  const neededPositions = new Set<Position>();
  for (const slot of needs.openSlots) {
    for (const pos of SLOT_ELIGIBILITY[slot]) neededPositions.add(pos);
  }

  // Teams of players already on my roster, per position (for handcuffs).
  const myTeamsByPos = new Map<Position, Set<string>>();
  for (const p of myPlayers) {
    if (!p.position || !p.team) continue;
    if (!myTeamsByPos.has(p.position)) myTeamsByPos.set(p.position, new Set());
    myTeamsByPos.get(p.position)!.add(p.team);
  }

  // Available players with their base ordering rank.
  const available = catalog
    .filter((p) => !draftedIds.has(p.id))
    .map((p) => ({ player: p, baseRank: baseRankFor(p, customRankById) }));

  // Positional ranks: sort each position by base rank.
  const positionalRankById = new Map<string, number>();
  for (const pos of ALL_POSITIONS) {
    const group = available
      .filter((a) => a.player.position === pos)
      .sort((a, b) => a.baseRank - b.baseRank);
    group.forEach((a, i) => positionalRankById.set(a.player.id, i + 1));
  }

  const ranked: RankedPlayer[] = available.map(({ player, baseRank }) => {
    const pos = player.position as Position; // catalog is pre-filtered to known positions
    const positionalRank = positionalRankById.get(player.id) ?? 9999;
    const replacementRank = replacementRankByPos[pos];
    const vor = replacementRank - positionalRank;
    const valueScore = vor;

    const fillsNeed = neededPositions.has(pos);
    const isSurplus = surplus.has(pos);
    // Handcuff: a backup sharing NFL team + position with one of my players.
    // (available already excludes drafted players, so this is never self.)
    const isHandcuff =
      player.team != null && myTeamsByPos.get(pos)?.has(player.team) === true;

    let recommendationScore = valueScore;
    const reasons: string[] = [];

    if (vor >= 0) {
      reasons.push(`+${vor} value over replacement ${pos}`);
    } else {
      reasons.push(`${vor} vs replacement ${pos}`);
    }

    const handcuffApplies = isHandcuff && needs.depthPhase;
    if (fillsNeed) {
      recommendationScore += config.needBonus;
      reasons.push(`Fills an open starting slot (${pos})`);
    }
    // A deliberate handcuff is intentional depth, so it is exempt from the
    // "you already have starters here" penalty.
    if (isSurplus && !fillsNeed && !handcuffApplies) {
      recommendationScore -= config.surplusPenalty;
      reasons.push(`You already have starters at ${pos}`);
    }
    if (handcuffApplies) {
      recommendationScore += config.handcuffBonus;
      reasons.push(`Handcuff/depth for your ${player.team} ${pos}`);
    }

    return {
      player,
      baseRank,
      positionalRank,
      replacementRank,
      vor,
      tier: tierForVor(vor),
      valueScore,
      recommendationScore,
      flags: {
        fillsNeed,
        handcuff: isHandcuff,
        surplus: isSurplus,
      },
      reasons,
    };
  });

  const bestAvailable = [...ranked].sort(
    (a, b) => b.valueScore - a.valueScore || a.baseRank - b.baseRank,
  );
  const recommended = [...ranked].sort(
    (a, b) =>
      b.recommendationScore - a.recommendationScore || a.baseRank - b.baseRank,
  );

  return {
    available: recommended,
    bestAvailable,
    myPlayers,
    needs,
    replacementRankByPos,
  };
}
