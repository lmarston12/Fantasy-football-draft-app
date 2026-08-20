import { handle } from "@/lib/api-response";
import { getProvider } from "@/lib/providers/registry";

/** Resolve a username to the platform's internal user id. */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/api/[provider]/user/[username]">,
) {
  const { provider, username } = await params;
  return handle(async () => {
    const userId = await getProvider(provider).getUserId(username);
    return { userId };
  });
}
