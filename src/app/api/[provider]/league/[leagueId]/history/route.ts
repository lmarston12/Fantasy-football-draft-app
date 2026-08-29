import { handle } from "@/lib/api-response";
import { getProvider } from "@/lib/providers/registry";
import { authFromHeaders } from "@/lib/providers/request-auth";

/**
 * Past-season draft history for a league. Optional on the provider interface:
 * providers that don't expose a traversable history (e.g. Sleeper) return null
 * rather than erroring, so callers degrade gracefully.
 */
export async function GET(
  req: Request,
  { params }: RouteContext<"/api/[provider]/league/[leagueId]/history">,
) {
  const { provider, leagueId } = await params;
  const auth = authFromHeaders(req);
  return handle(async () => {
    const p = getProvider(provider);
    if (!p.getLeagueHistory) return null;
    return p.getLeagueHistory(leagueId, { auth });
  });
}
