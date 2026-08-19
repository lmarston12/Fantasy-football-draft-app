import { handle } from "@/lib/api-response";
import { sleeperProvider } from "@/lib/providers/sleeper/adapter";

/** Resolve a Sleeper username to its internal user id. */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/api/sleeper/user/[username]">,
) {
  const { username } = await params;
  return handle(async () => {
    const userId = await sleeperProvider.getUserId(username);
    return { userId };
  });
}
