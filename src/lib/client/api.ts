/**
 * Browser-side client for the app's own `/api/[provider]/*` routes.
 *
 * The UI never calls a fantasy platform directly — it goes through our API
 * routes, which handle normalization and cache the big player catalog. Every
 * function takes the active `provider` and returns typed domain objects.
 *
 * ESPN private leagues need `espn_s2`/`SWID` cookies. They ride as request
 * headers (never query params) and are forwarded server-side to ESPN. They are
 * never placed in a URL and never logged.
 */

import type {
  DraftInfo,
  DraftPick,
  LeagueSettings,
  NormalizedPlayer,
  ProviderAuth,
  Team,
} from "../providers/types";

function authHeaders(auth?: ProviderAuth): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (auth?.espnS2) headers["x-espn-s2"] = auth.espnS2;
  if (auth?.swid) headers["x-espn-swid"] = auth.swid;
  return headers;
}

async function getJson<T>(url: string, auth?: ProviderAuth): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(auth) });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

const base = (provider: string) => `/api/${encodeURIComponent(provider)}`;

export function getState(
  provider: string,
): Promise<{ season: string; week: number }> {
  return getJson(`${base(provider)}/state`);
}

export async function getUserId(
  provider: string,
  username: string,
): Promise<string> {
  const { userId } = await getJson<{ userId: string }>(
    `${base(provider)}/user/${encodeURIComponent(username)}`,
  );
  return userId;
}

export function getLeagues(
  provider: string,
  userId: string,
  season?: string,
  auth?: ProviderAuth,
): Promise<LeagueSettings[]> {
  const q = season ? `?season=${encodeURIComponent(season)}` : "";
  return getJson(
    `${base(provider)}/leagues/${encodeURIComponent(userId)}${q}`,
    auth,
  );
}

export function getLeague(
  provider: string,
  leagueId: string,
  auth?: ProviderAuth,
): Promise<{ league: LeagueSettings; teams: Team[] }> {
  return getJson(
    `${base(provider)}/league/${encodeURIComponent(leagueId)}`,
    auth,
  );
}

export function getDraft(
  provider: string,
  draftId: string,
  auth?: ProviderAuth,
): Promise<DraftInfo> {
  return getJson(
    `${base(provider)}/draft/${encodeURIComponent(draftId)}`,
    auth,
  );
}

export function getDraftPicks(
  provider: string,
  draftId: string,
  auth?: ProviderAuth,
): Promise<DraftPick[]> {
  return getJson(
    `${base(provider)}/draft/${encodeURIComponent(draftId)}/picks`,
    auth,
  );
}

export function getPlayers(
  provider: string,
  season?: string,
  leagueId?: string,
  auth?: ProviderAuth,
): Promise<NormalizedPlayer[]> {
  const params = new URLSearchParams();
  if (season) params.set("season", season);
  // ESPN needs the league to fetch ranked players (its ranks are league-scoped).
  if (leagueId) params.set("league", leagueId);
  const q = params.toString() ? `?${params.toString()}` : "";
  return getJson(`${base(provider)}/players${q}`, auth);
}
