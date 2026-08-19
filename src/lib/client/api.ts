/**
 * Browser-side client for the app's own `/api/sleeper/*` routes.
 *
 * The UI never calls Sleeper directly — it goes through our API routes, which
 * handle normalization and cache the big player catalog. Every function here
 * returns typed domain objects.
 */

import type {
  DraftInfo,
  DraftPick,
  LeagueSettings,
  NormalizedPlayer,
  Team,
} from "../providers/types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
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

export function getState(): Promise<{ season: string; week: number }> {
  return getJson("/api/sleeper/state");
}

export async function getUserId(username: string): Promise<string> {
  const { userId } = await getJson<{ userId: string }>(
    `/api/sleeper/user/${encodeURIComponent(username)}`,
  );
  return userId;
}

export function getLeagues(
  userId: string,
  season?: string,
): Promise<LeagueSettings[]> {
  const q = season ? `?season=${encodeURIComponent(season)}` : "";
  return getJson(`/api/sleeper/leagues/${encodeURIComponent(userId)}${q}`);
}

export function getLeague(
  leagueId: string,
): Promise<{ league: LeagueSettings; teams: Team[] }> {
  return getJson(`/api/sleeper/league/${encodeURIComponent(leagueId)}`);
}

export function getDraft(draftId: string): Promise<DraftInfo> {
  return getJson(`/api/sleeper/draft/${encodeURIComponent(draftId)}`);
}

export function getDraftPicks(draftId: string): Promise<DraftPick[]> {
  return getJson(`/api/sleeper/draft/${encodeURIComponent(draftId)}/picks`);
}

export function getPlayers(): Promise<NormalizedPlayer[]> {
  return getJson("/api/sleeper/players");
}
