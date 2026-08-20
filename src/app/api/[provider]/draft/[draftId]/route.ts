import { handle } from "@/lib/api-response";
import { getProvider } from "@/lib/providers/registry";
import { authFromHeaders } from "@/lib/providers/request-auth";

/** Draft metadata (status, type, slot -> roster mapping). */
export async function GET(
  req: Request,
  { params }: RouteContext<"/api/[provider]/draft/[draftId]">,
) {
  const { provider, draftId } = await params;
  const auth = authFromHeaders(req);
  return handle(() => getProvider(provider).getDraft(draftId, auth));
}
