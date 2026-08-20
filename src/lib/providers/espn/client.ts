/**
 * Thin, typed wrappers over ESPN's *unofficial* fantasy read endpoints.
 *
 * ESPN publishes no official API. These endpoints (`lm-api-reads.fantasy.espn.com`)
 * are undocumented and can change field names or shapes without notice — all of
 * that fragility is contained here and in `adapter.ts`. Everything is read-only.
 *
 * Auth: public leagues need no credentials. Private leagues require the user's
 * `espn_s2` and `SWID` cookies, copied from a logged-in browser session. They
 * are treated as secrets: passed per-request, forwarded straight to ESPN as a
 * `Cookie` header, never persisted and never logged.
 */

import { ProviderApiError } from "../errors";
import type { ProviderAuth } from "../types";

const DEFAULT_BASE_URL = "https://lm-api-reads.fantasy.espn.com";

/** Overridable base URL (used by tests; defaults to the real API). */
export function espnBaseUrl(): string {
  return process.env.ESPN_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_BASE_URL;
}

export class EspnApiError extends ProviderApiError {
  constructor(message: string, status: number, url: string) {
    super(message, status, url);
    this.name = "EspnApiError";
  }
}

/**
 * Build the `Cookie` header value for a private-league request, or return
 * undefined for public leagues. Never logged.
 */
function cookieHeader(auth?: ProviderAuth): string | undefined {
  if (!auth?.espnS2 || !auth?.swid) return undefined;
  return `espn_s2=${auth.espnS2}; SWID=${auth.swid}`;
}

async function getJson<T>(
  path: string,
  opts: { auth?: ProviderAuth; fantasyFilter?: unknown } = {},
): Promise<T> {
  const url = `${espnBaseUrl()}${path}`;
  const headers: Record<string, string> = { accept: "application/json" };
  const cookie = cookieHeader(opts.auth);
  if (cookie) headers.cookie = cookie;
  if (opts.fantasyFilter !== undefined) {
    headers["x-fantasy-filter"] = JSON.stringify(opts.fantasyFilter);
  }
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    // 401 typically means a private league without valid espn_s2/SWID cookies.
    const hint =
      res.status === 401
        ? " (private league — check your espn_s2 and SWID cookies)"
        : "";
    throw new EspnApiError(
      `ESPN request failed (${res.status})${hint}`,
      res.status,
      url,
    );
  }
  return (await res.json()) as T;
}

// ---- Raw ESPN response shapes (only the fields we consume) ----

export interface EspnScoringItem {
  statId: number;
  points: number;
}

export interface EspnTeam {
  id: number;
  location?: string;
  nickname?: string;
  abbrev?: string;
  primaryOwner?: string | null;
}

export interface EspnDraftPick {
  overallPickNumber: number;
  roundId: number;
  roundPickNumber?: number;
  teamId: number;
  playerId: number;
}

export interface EspnLeagueResponse {
  id: number;
  seasonId: number;
  settings?: {
    name?: string;
    size?: number;
    rosterSettings?: {
      lineupSlotCounts?: Record<string, number>;
    };
    scoringSettings?: {
      scoringItems?: EspnScoringItem[];
    };
    draftSettings?: {
      type?: string;
      // Team ids in draft-slot order (slot 1 = index 0).
      pickOrder?: number[];
    };
  };
  teams?: EspnTeam[];
  draftDetail?: {
    drafted?: boolean;
    inProgress?: boolean;
    picks?: EspnDraftPick[];
  };
}

export interface EspnRankByType {
  rank?: number;
}

export interface EspnPlayer {
  id: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  defaultPositionId?: number;
  proTeamId?: number;
  injuryStatus?: string | null;
  draftRanksByRankType?: Record<string, EspnRankByType>;
}

/** Season-level players endpoint returns bare player objects. */
type EspnPlayersResponse = EspnPlayer[];

// ---- Endpoint calls ----

function leaguePath(season: string, leagueId: string, views: string[]): string {
  const q = views.map((v) => `view=${encodeURIComponent(v)}`).join("&");
  return `/apis/v3/games/ffl/seasons/${encodeURIComponent(
    season,
  )}/segments/0/leagues/${encodeURIComponent(leagueId)}?${q}`;
}

/** League settings + teams + draft detail in a single request. */
export function fetchLeague(
  season: string,
  leagueId: string,
  auth?: ProviderAuth,
): Promise<EspnLeagueResponse> {
  return getJson<EspnLeagueResponse>(
    leaguePath(season, leagueId, ["mSettings", "mTeam", "mDraftDetail"]),
    { auth },
  );
}

/**
 * The player catalog for a season. Uses the public season-level endpoint so it
 * needs neither a league id nor auth. `x-fantasy-filter` bounds the result and
 * sorts by draft rank so the most relevant players come first.
 */
export function fetchPlayers(season: string): Promise<EspnPlayersResponse> {
  const fantasyFilter = {
    players: {
      limit: 1500,
      sortDraftRanks: {
        sortPriority: 100,
        sortAsc: true,
        value: "PPR",
      },
    },
  };
  return getJson<EspnPlayersResponse>(
    `/apis/v3/games/ffl/seasons/${encodeURIComponent(
      season,
    )}/players?scoringPeriodId=0&view=players_wl`,
    { fantasyFilter },
  );
}
