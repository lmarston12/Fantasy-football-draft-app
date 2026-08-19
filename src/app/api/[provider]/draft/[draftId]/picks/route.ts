import { handle } from "@/lib/api-response";
import { getProvider } from "@/lib/providers/registry";
import { authFromHeaders } from "@/lib/providers/request-auth";

// Always fresh: this is the live draft state the UI polls.
export const dynamic = "force-dynamic";

/** All picks made so far in a draft. */
export async function GET(
  req: Request,
  { params }: RouteContext<"/api/[provider]/draft/[draftId]/picks">,
) {
  const { provider, draftId } = await params;
  const auth = authFromHeaders(req);
  return handle(() => getProvider(provider).getPicks(draftId, auth));
}
