import { handle } from "@/lib/api-response";
import { getProvider } from "@/lib/providers/registry";
import { authFromHeaders } from "@/lib/providers/request-auth";

/** List a user's leagues for a season (defaults to the current season). */
export async function GET(
  req: Request,
  { params }: RouteContext<"/api/[provider]/leagues/[userId]">,
) {
  const { provider, userId } = await params;
  const season = new URL(req.url).searchParams.get("season");
  const auth = authFromHeaders(req);
  return handle(async () => {
    const p = getProvider(provider);
    const resolvedSeason = season ?? String(new Date().getFullYear());
    return p.getLeagues(userId, resolvedSeason, auth);
  });
}
