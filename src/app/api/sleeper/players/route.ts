import { handle } from "@/lib/api-response";
import { cached } from "@/lib/cache";
import { sleeperProvider } from "@/lib/providers/sleeper/adapter";
import type { NormalizedPlayer } from "@/lib/providers/types";

const PLAYERS_TTL_MS = 60 * 60 * 1000; // 1 hour; Sleeper updates this daily.

/**
 * The normalized player catalog. This is the one large payload we cache
 * server-side (see lib/cache.ts) so we don't re-download ~5MB per request.
 */
export async function GET() {
  return handle(() =>
    cached<NormalizedPlayer[]>("sleeper:players", PLAYERS_TTL_MS, () =>
      sleeperProvider.getPlayerCatalog(),
    ),
  );
}
