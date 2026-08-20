/**
 * Per-tab storage for ESPN private-league cookies.
 *
 * ESPN `espn_s2`/`SWID` are secrets. They must ride every request to the board
 * (including the pick-polling loop), but must never land in the URL or in any
 * durable store. We keep them in `sessionStorage` — scoped to the tab and
 * cleared when it closes — keyed by the league reference, and read them back in
 * the draft hooks. If they're absent (public league, or a fresh tab) requests
 * simply go out without them.
 */

import type { ProviderAuth } from "../providers/types";

const PREFIX = "espnAuth:";

function key(leagueRef: string): string {
  return `${PREFIX}${leagueRef}`;
}

export function storeEspnAuth(leagueRef: string, auth: ProviderAuth): void {
  if (typeof window === "undefined") return;
  if (!auth.espnS2 && !auth.swid) return;
  try {
    window.sessionStorage.setItem(key(leagueRef), JSON.stringify(auth));
  } catch {
    // sessionStorage can throw (private mode / quota); degrade to no-store.
  }
}

export function readEspnAuth(leagueRef: string): ProviderAuth | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(key(leagueRef));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as ProviderAuth;
    if (!parsed.espnS2 && !parsed.swid) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}
