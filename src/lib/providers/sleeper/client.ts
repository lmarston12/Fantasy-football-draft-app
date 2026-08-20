/**
 * Thin, typed wrappers over Sleeper's public read-only REST API.
 *
 * Sleeper's API requires no key and no auth for the data this app uses. It is
 * rate-limited (Sleeper asks for < 1000 calls/min), which we stay well under
 * by caching the large player catalog and polling draft picks on an interval.
 *
 * Docs: https://docs.sleeper.com/
 *
 * These functions return Sleeper's raw JSON shapes. Normalization into the
 * app's domain types happens in `adapter.ts`.
 */

import { ProviderApiError } from "../errors";

const DEFAULT_BASE_URL = "https://api.sleeper.app/v1";

/** Overridable base URL (used by tests; defaults to the real API). */
export function sleeperBaseUrl(): string {
  return process.env.SLEEPER_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_BASE_URL;
}

export class SleeperApiError extends ProviderApiError {
  constructor(message: string, status: number, url: string) {
    super(message, status, url);
    this.name = "SleeperApiError";
  }
}

async function getJson<T>(path: string): Promise<T> {
  const url = `${sleeperBaseUrl()}${path}`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    // We do our own TTL caching in the API route layer, so bypass Next's
    // fetch cache to always observe fresh draft state.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new SleeperApiError(
      `Sleeper request failed (${res.status})`,
      res.status,
      url,
    );
  }
  return (await res.json()) as T;
}

// ---- Raw Sleeper response shapes (only the fields we consume) ----

export interface SleeperUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  draft_id: string | null;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
}

export interface SleeperLeagueUser {
  user_id: string;
  display_name: string | null;
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string | null;
  status: string;
  type: string;
  settings: { teams?: number; rounds?: number };
  slot_to_roster_id: Record<string, number> | null;
}

export interface SleeperPick {
  pick_no: number;
  round: number;
  roster_id: number | null;
  picked_by: string | null;
  player_id: string;
}

export interface SleeperPlayer {
  player_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  position?: string | null;
  team?: string | null;
  fantasy_positions?: string[] | null;
  search_rank?: number | null;
  bye_week?: number | null;
  injury_status?: string | null;
}

export interface SleeperState {
  season: string;
  week: number;
}

// ---- Endpoint calls ----

export function fetchState(): Promise<SleeperState> {
  return getJson<SleeperState>("/state/nfl");
}

export function fetchUser(username: string): Promise<SleeperUser | null> {
  // Sleeper returns null (200) for unknown usernames.
  return getJson<SleeperUser | null>(`/user/${encodeURIComponent(username)}`);
}

export function fetchLeagues(
  userId: string,
  season: string,
): Promise<SleeperLeague[]> {
  return getJson<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`);
}

export function fetchLeague(leagueId: string): Promise<SleeperLeague> {
  return getJson<SleeperLeague>(`/league/${leagueId}`);
}

export function fetchRosters(leagueId: string): Promise<SleeperRoster[]> {
  return getJson<SleeperRoster[]>(`/league/${leagueId}/rosters`);
}

export function fetchLeagueUsers(
  leagueId: string,
): Promise<SleeperLeagueUser[]> {
  return getJson<SleeperLeagueUser[]>(`/league/${leagueId}/users`);
}

export function fetchDraft(draftId: string): Promise<SleeperDraft> {
  return getJson<SleeperDraft>(`/draft/${draftId}`);
}

export function fetchDraftPicks(draftId: string): Promise<SleeperPick[]> {
  return getJson<SleeperPick[]>(`/draft/${draftId}/picks`);
}

export function fetchAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  // ~5MB payload; callers MUST cache this (see lib/cache.ts).
  return getJson<Record<string, SleeperPlayer>>("/players/nfl");
}
