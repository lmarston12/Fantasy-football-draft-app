import { handle } from "@/lib/api-response";
import { sleeperProvider } from "@/lib/providers/sleeper/adapter";

/** Full league settings plus the league's teams. */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/api/sleeper/league/[leagueId]">,
) {
  const { leagueId } = await params;
  return handle(async () => {
    const [league, teams] = await Promise.all([
      sleeperProvider.getLeague(leagueId),
      sleeperProvider.getTeams(leagueId),
    ]);
    return { league, teams };
  });
}
