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

/** Won/lost/points record ESPN nests under `record.overall`. */
export interface EspnTeamRecordSide {
  wins?: number;
  losses?: number;
  ties?: number;
  pointsFor?: number;
  pointsAgainst?: number;
}

export interface EspnTeam {
  id: number;
  location?: string;
  nickname?: string;
  abbrev?: string;
  primaryOwner?: string | null;
  /** Present with the `mStandings`/`mTeam` views on completed seasons. */
  record?: { overall?: EspnTeamRecordSide };
  /** Final calculated standing (1 = champion). 0/absent before a season ends. */
  rankCalculatedFinal?: number;
  playoffSeed?: number;
}

/** A league member (human), stable across seasons by their SWID-style `id`. */
export interface EspnMember {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

export interface EspnDraftPick {
  overallPickNumber: number;
  roundId: number;
  roundPickNumber?: number;
  teamId: number;
  playerId: number;
  /** Owner (member) SWID that made the pick; stable across seasons. */
  memberId?: string | null;
  keeper?: boolean;
}

export interface EspnLeagueResponse {
  id: number;
  seasonId: number;
  /** Prior seasons ESPN has for this same league id, e.g. [2019, 2020, ...]. */
  status?: {
    previousSeasons?: number[];
  };
  members?: EspnMember[];
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

/**
 * The league-scoped `kona_player_info` view wraps each player in an entry with
 * roster/ownership metadata we ignore; the ranked player is under `.player`.
 */
interface EspnKonaPlayerEntry {
  player?: EspnPlayer;
}
interface EspnKonaPlayersResponse {
  players?: EspnKonaPlayerEntry[];
}

/**
 * How many players to pull for the catalog. ESPN returns them pre-sorted by
 * draft rank, so this is effectively "top N by ADP" — generous enough to cover
 * every pick in a deep league plus late-round fliers.
 */
const PLAYER_CATALOG_LIMIT = 1000;

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
 * A single past season for history analysis: adds the `mStandings` view so the
 * response carries each team's final `record` and `rankCalculatedFinal`, plus
 * `members` for display names. The current-season `fetchLeague` omits standings
 * because they don't exist pre-draft; keep them separate so live draft loads
 * stay lean.
 */
export function fetchLeagueSeason(
  season: string,
  leagueId: string,
  auth?: ProviderAuth,
): Promise<EspnLeagueResponse> {
  return getJson<EspnLeagueResponse>(
    leaguePath(season, leagueId, [
      "mSettings",
      "mTeam",
      "mStandings",
      "mDraftDetail",
    ]),
    { auth },
  );
}

/**
 * The player catalog with real draft ranks, pre-sorted by ADP.
 *
 * Must use the *league-scoped* `kona_player_info` view: the public season-level
 * `players_wl` endpoint returns `draftRanksByRankType` empty (no ranks) AND
 * ignores the `x-fantasy-filter` sort/limit, so it yields an unranked, unsorted
 * dump. The league endpoint honors the filter (returns exactly `limit` players,
 * sorted by PPR draft rank) and populates the ranks. It works for public
 * leagues without auth; private leagues pass espn_s2/SWID like every other call.
 *
 * Returns bare `EspnPlayer[]` (unwrapped from kona's `{ players: [{ player }] }`)
 * so callers see the same shape the old season endpoint gave.
 */
export async function fetchPlayers(
  season: string,
  leagueId: string,
  auth?: ProviderAuth,
): Promise<EspnPlayer[]> {
  const fantasyFilter = {
    players: {
      limit: PLAYER_CATALOG_LIMIT,
      sortDraftRanks: {
        sortPriority: 100,
        sortAsc: true,
        value: "PPR",
      },
    },
  };
  const res = await getJson<EspnKonaPlayersResponse>(
    leaguePath(season, leagueId, ["kona_player_info"]),
    { auth, fantasyFilter },
  );
  return (res.players ?? [])
    .map((e) => e.player)
    .filter((p): p is EspnPlayer => Boolean(p));
}
