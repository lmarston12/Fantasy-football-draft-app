/**
 * Types for the ranking engine and its output.
 */

import type {
  DraftPick,
  LeagueSettings,
  NormalizedPlayer,
  Position,
} from "../providers/types";
import type { RosterNeeds } from "../draft/needs";

/** Tier labels, from most to least valuable relative to replacement. */
export type Tier = "Elite" | "Great" | "Starter" | "Depth" | "Deep";

/** A player scored and ranked for the current draft state. */
export interface RankedPlayer {
  player: NormalizedPlayer;
  /** Base ordering rank used (custom rank if provided, else searchRank). */
  baseRank: number;
  /** 1-indexed rank among available players at the same position. */
  positionalRank: number;
  /** Positional rank considered "replacement level" for this league. */
  replacementRank: number;
  /** Value over replacement: replacementRank - positionalRank. */
  vor: number;
  tier: Tier;
  /** Scarcity-aware value used for global "best available" ordering. */
  valueScore: number;
  /** valueScore adjusted for the user's roster needs (used for "for you"). */
  recommendationScore: number;
  flags: {
    /** Fills one of the user's open starting slots. */
    fillsNeed: boolean;
    /** Backup sharing NFL team + position with a player on the user's roster. */
    handcuff: boolean;
    /** User already has a surplus at this position. */
    surplus: boolean;
  };
  /** Short, human-readable reasons the player is ranked where they are. */
  reasons: string[];
}

/** Tunable weights for the engine. Defaults are defined in engine.ts. */
export interface EngineConfig {
  /** Bonus added to recommendationScore when a player fills an open need. */
  needBonus: number;
  /** Penalty applied when the user already has surplus at the position. */
  surplusPenalty: number;
  /** Bonus for a handcuff once the user's starting slots are mostly filled. */
  handcuffBonus: number;
}

export interface BuildDraftBoardParams {
  league: LeagueSettings;
  catalog: NormalizedPlayer[];
  picks: DraftPick[];
  /** The user's own roster id, or null if not yet identified. */
  myRosterId: number | null;
  /** Optional custom ranking override: playerId -> rank. */
  customRankById?: ReadonlyMap<string, number>;
  config?: Partial<EngineConfig>;
}

export interface DraftBoard {
  /** Available players ordered by recommendation for the user's team. */
  available: RankedPlayer[];
  /** Available players ordered by pure scarcity value (need-agnostic). */
  bestAvailable: RankedPlayer[];
  /** The user's current roster (normalized players). */
  myPlayers: NormalizedPlayer[];
  /** The user's computed roster needs. */
  needs: RosterNeeds;
  /** Replacement-level positional rank used per position. */
  replacementRankByPos: Record<Position, number>;
}
