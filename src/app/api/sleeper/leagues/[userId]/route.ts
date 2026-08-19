import { handle } from "@/lib/api-response";
import { sleeperProvider } from "@/lib/providers/sleeper/adapter";
import { fetchState } from "@/lib/providers/sleeper/client";

/** List a user's leagues for a season (defaults to the current season). */
export async function GET(
  req: Request,
  { params }: RouteContext<"/api/sleeper/leagues/[userId]">,
) {
  const { userId } = await params;
  const season = new URL(req.url).searchParams.get("season");
  return handle(async () => {
    const resolvedSeason = season ?? (await fetchState()).season;
    return sleeperProvider.getLeagues(userId, resolvedSeason);
  });
}
