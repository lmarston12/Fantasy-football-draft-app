/**
 * Extract optional provider credentials from request headers.
 *
 * The browser client sends ESPN private-league cookies as request headers
 * (never query params). Here they're read back into a `ProviderAuth` and handed
 * to the adapter, which forwards them to ESPN. They are never logged or stored.
 */

import type { ProviderAuth } from "./types";

export function authFromHeaders(req: Request): ProviderAuth | undefined {
  const espnS2 = req.headers.get("x-espn-s2");
  const swid = req.headers.get("x-espn-swid");
  if (!espnS2 && !swid) return undefined;
  return {
    espnS2: espnS2 ?? undefined,
    swid: swid ?? undefined,
  };
}
