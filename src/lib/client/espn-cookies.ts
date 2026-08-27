/**
 * Parse ESPN private-league cookies out of a pasted blob.
 *
 * The connect form lets a user paste one thing instead of hunting down two
 * cookies by hand: a full `Cookie:` request header, a `document.cookie` string,
 * a raw copy from the browser's Application/Network tab, or even just the two
 * values loosely. We extract `espn_s2` and `SWID` and hand them back as a
 * `ProviderAuth`. Like every other credential path, this is client-side only —
 * the values ride requests as headers and are never persisted server-side.
 *
 * Parsing is lenient by design: it never throws on junk, it just returns what
 * it could find (or `undefined` when it found neither).
 */

import type { ProviderAuth } from "../providers/types";

/**
 * Split a blob into `key`/`value` pairs. Cookie strings separate pairs with
 * `;`, but pastes from dev tools often use newlines (or tabs, one pair per
 * line), so we split on all of them. Only the first `=` splits a pair — ESPN's
 * `espn_s2` contains `%`-encoded `=` in its own value.
 */
function pairs(input: string): Array<[string, string]> {
  return input
    .split(/[;\n\r]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): [string, string] | null => {
      // Tolerate a leading "Cookie:" header prefix on the first segment.
      const cleaned = part.replace(/^cookie:\s*/i, "");
      const eq = cleaned.indexOf("=");
      if (eq === -1) return null;
      const key = cleaned.slice(0, eq).trim();
      const value = cleaned.slice(eq + 1).trim();
      if (!key || !value) return null;
      return [key, value];
    })
    .filter((p): p is [string, string] => p !== null);
}

/**
 * Extract `espn_s2` / `SWID` from a pasted cookie blob. Returns only the fields
 * found, or `undefined` if neither is present.
 */
export function parseEspnCookies(input: string): ProviderAuth | undefined {
  if (!input || !input.trim()) return undefined;

  let espnS2: string | undefined;
  let swid: string | undefined;

  for (const [key, value] of pairs(input)) {
    const lower = key.toLowerCase();
    if (lower === "espn_s2") espnS2 = value;
    else if (lower === "swid") swid = value;
  }

  // Fallback for values pasted without their `key=`: SWID is a brace-wrapped
  // GUID, which is unambiguous enough to recognize on its own.
  if (!swid) {
    const brace = input.match(/\{[0-9A-Fa-f-]{8,}\}/);
    if (brace) swid = brace[0];
  }

  if (!espnS2 && !swid) return undefined;
  return { espnS2, swid };
}
