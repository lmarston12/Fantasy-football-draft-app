/**
 * ESPN league reference helpers.
 *
 * ESPN has no separate draft entity and its league endpoint needs the season
 * in the URL path, but the app's `DraftProvider` interface identifies leagues
 * and drafts by a single opaque string. So for ESPN we encode both the season
 * and the numeric league id into one reference: `"{season}-{leagueId}"`.
 *
 * This module is pure (no network) so both the ESPN adapter and the browser
 * connect form can build and read the reference.
 */

export interface EspnLeagueRef {
  season: string;
  leagueId: string;
}

/** Build the composite reference used as leagueId/draftId for ESPN. */
export function formatEspnLeagueRef(season: string, leagueId: string): string {
  return `${season.trim()}-${leagueId.trim()}`;
}

/** Parse a composite ESPN reference back into its season and league id. */
export function parseEspnLeagueRef(ref: string): EspnLeagueRef {
  const idx = ref.indexOf("-");
  if (idx <= 0 || idx === ref.length - 1) {
    throw new Error(
      `Invalid ESPN league reference "${ref}" (expected "{season}-{leagueId}").`,
    );
  }
  return { season: ref.slice(0, idx), leagueId: ref.slice(idx + 1) };
}
