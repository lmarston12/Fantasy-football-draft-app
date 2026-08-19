/**
 * Provider-agnostic domain types.
 *
 * These types are the boundary between "raw platform data" (Sleeper today,
 * ESPN/Yahoo later) and the rest of the app. Every provider adapter is
 * responsible for normalizing its platform's shapes into these types, so the
 * ranking engine, needs logic, and UI never depend on a specific platform.
 *
 * See docs/ADDING_A_PROVIDER.md for how to add a new provider.
 */

/**
 * Optional per-request credentials a provider may need. Sleeper needs none;
 * ESPN needs `espnS2`/`swid` cookies for private leagues. These are secrets:
 * accepted at request time, forwarded straight to the platform, never
 * persisted server-side and never logged. Kept generic so other OAuth-style
 * platforms (Yahoo) can reuse the shape.
 */
export interface ProviderAuth {
  espnS2?: string;
  swid?: string;
}

/** Fantasy-relevant player positions we reason about. */
export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";

/** Roster slot types a league can define, including flex variants. */
export type SlotType =
  | Position
  | "FLEX" // RB/WR/TE
  | "SUPER_FLEX" // QB/RB/WR/TE
  | "REC_FLEX" // WR/TE
  | "BENCH"
  | "IR"
  | "TAXI";

/** Which positions are eligible to fill a given slot. */
export const SLOT_ELIGIBILITY: Record<SlotType, Position[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  K: ["K"],
  DEF: ["DEF"],
  FLEX: ["RB", "WR", "TE"],
  REC_FLEX: ["WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
  BENCH: [],
  IR: [],
  TAXI: [],
};

/** A slot that a starter must be placed into (bench/IR/taxi excluded). */
export const STARTING_SLOTS: SlotType[] = [
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
  "FLEX",
  "REC_FLEX",
  "SUPER_FLEX",
];

/** Normalized scoring rules, distilled to the levers that change value. */
export interface ScoringSettings {
  /** Points per reception (0 = standard, 0.5 = half-PPR, 1 = full PPR). */
  pointsPerReception: number;
  /** True if passing TDs are worth 6 (vs the common 4). */
  passingTdSixPoints: boolean;
  /** Raw provider scoring map, kept for transparency/debugging. */
  raw: Record<string, number>;
}

/** A single roster slot definition for the league (order preserved). */
export interface RosterSlot {
  type: SlotType;
}

/** League-wide settings needed to rank and advise. */
export interface LeagueSettings {
  leagueId: string;
  name: string;
  season: string;
  teamCount: number;
  /** Ordered roster construction, e.g. [QB, RB, RB, WR, WR, TE, FLEX, ...]. */
  rosterSlots: RosterSlot[];
  scoring: ScoringSettings;
  /**
   * Draft id associated with this league, when one exists. Sleeper exposes a
   * distinct draft id; ESPN has no separate draft entity, so its adapter uses
   * the league id here.
   */
  draftId: string | null;
}

/** A normalized player from the platform's catalog. */
export interface NormalizedPlayer {
  /** Provider-scoped player id (Sleeper player_id today). */
  id: string;
  name: string;
  position: Position | null;
  /** NFL team abbreviation, e.g. "KC". Null for unsigned/unknown. */
  team: string | null;
  /**
   * Platform consensus rank (lower = better). This is the free ranking
   * baseline. Null when the platform has no rank for the player.
   */
  searchRank: number | null;
  /** Bye week, when known. */
  byeWeek: number | null;
  injuryStatus: string | null;
}

/** A fantasy team in the league. */
export interface Team {
  /** Sleeper roster_id (stable within a league). */
  rosterId: number;
  /** Owner's display name, when resolvable. */
  ownerName: string | null;
  /** Owner's platform user id. */
  ownerId: string | null;
}

/** A single completed draft pick. */
export interface DraftPick {
  /** Overall pick number, 1-indexed. */
  pickNo: number;
  round: number;
  /** Roster/team that made the pick. */
  rosterId: number | null;
  /** Platform user id that made the pick. */
  pickedBy: string | null;
  /** Provider player id selected. */
  playerId: string;
}

export type DraftStatus = "pre_draft" | "drafting" | "complete" | "unknown";

/** Draft metadata, including the slot -> roster mapping and order. */
export interface DraftInfo {
  draftId: string;
  leagueId: string | null;
  status: DraftStatus;
  teamCount: number;
  /** "snake" or "linear"; informational for the UI. */
  type: string;
  /**
   * Maps draft slot (1-indexed seat) to roster_id. Sleeper exposes this as
   * `draft_order`/`slot_to_roster_id`; we normalize to slot -> rosterId.
   */
  slotToRosterId: Record<number, number>;
}

/**
 * The read-only surface every draft platform must implement. All methods are
 * read-only: this app observes a draft, it never makes picks on your behalf.
 */
export interface DraftProvider {
  readonly name: string;

  /**
   * Resolve a username to the platform's internal user id. Platforms that
   * don't identify leagues by username (ESPN) throw a clear error instead.
   */
  getUserId(username: string): Promise<string>;

  /** List a user's leagues for a given season (e.g. "2025"). */
  getLeagues(
    userId: string,
    season: string,
    auth?: ProviderAuth,
  ): Promise<LeagueSettings[]>;

  /** Fetch full normalized league settings by id. */
  getLeague(leagueId: string, auth?: ProviderAuth): Promise<LeagueSettings>;

  /** Teams in a league. */
  getTeams(leagueId: string, auth?: ProviderAuth): Promise<Team[]>;

  /** Draft metadata for a draft id. */
  getDraft(draftId: string, auth?: ProviderAuth): Promise<DraftInfo>;

  /** All picks made so far in a draft. */
  getPicks(draftId: string, auth?: ProviderAuth): Promise<DraftPick[]>;

  /**
   * The platform's full player catalog, normalized. Some platforms (ESPN)
   * scope the catalog by season and may need auth for private leagues; Sleeper
   * ignores both.
   */
  getPlayerCatalog(opts?: {
    season?: string;
    auth?: ProviderAuth;
  }): Promise<NormalizedPlayer[]>;
}
