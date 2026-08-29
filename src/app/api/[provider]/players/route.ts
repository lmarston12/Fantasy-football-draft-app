import { handle } from "@/lib/api-response";
import { cached } from "@/lib/cache";
import { getProvider } from "@/lib/providers/registry";
import { authFromHeaders } from "@/lib/providers/request-auth";
import type { NormalizedPlayer } from "@/lib/providers/types";

const PLAYERS_TTL_MS = 60 * 60 * 1000; // 1 hour; platforms update daily.

/**
 * The normalized player catalog. This is the one large payload we cache
 * server-side (see lib/cache.ts) so we don't re-download it per request. The
 * cache key is scoped per provider + season since catalogs differ across both.
 */
export async function GET(
  req: Request,
  { params }: RouteContext<"/api/[provider]/players">,
) {
  const { provider } = await params;
  const url = new URL(req.url);
  const season = url.searchParams.get("season") ?? "current";
  // ESPN scopes its ranked catalog by league (its ranks are league-endpoint
  // only); the key includes it so leagues don't share a cached catalog.
  const league = url.searchParams.get("league") ?? undefined;
  const auth = authFromHeaders(req);
  return handle(() =>
    cached<NormalizedPlayer[]>(
      `${provider}:players:${season}:${league ?? ""}`,
      PLAYERS_TTL_MS,
      () =>
        getProvider(provider).getPlayerCatalog({
          season: season === "current" ? undefined : season,
          leagueId: league,
          auth,
        }),
    ),
  );
}
