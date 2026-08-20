import { handle } from "@/lib/api-response";
import { getProvider } from "@/lib/providers/registry";
import { authFromHeaders } from "@/lib/providers/request-auth";

/** Full league settings plus the league's teams. */
export async function GET(
  req: Request,
  { params }: RouteContext<"/api/[provider]/league/[leagueId]">,
) {
  const { provider, leagueId } = await params;
  const auth = authFromHeaders(req);
  return handle(async () => {
    const p = getProvider(provider);
    const [league, teams] = await Promise.all([
      p.getLeague(leagueId, auth),
      p.getTeams(leagueId, auth),
    ]);
    return { league, teams };
  });
}
