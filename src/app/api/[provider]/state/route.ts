import { handle } from "@/lib/api-response";
import { getProvider } from "@/lib/providers/registry";
import { fetchState } from "@/lib/providers/sleeper/client";

/**
 * Current season/week — used to default the league season selector.
 *
 * Sleeper exposes the live NFL season/week; other platforms (ESPN) don't have
 * an equivalent public endpoint, so we fall back to the calendar year.
 */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/api/[provider]/state">,
) {
  const { provider } = await params;
  return handle(async () => {
    // Validate the provider even though season is a generic default, so an
    // unknown platform fails here the same as on every other route.
    getProvider(provider);
    if (provider === "sleeper") {
      const state = await fetchState();
      return { season: state.season, week: state.week };
    }
    return { season: String(new Date().getFullYear()), week: 0 };
  });
}
