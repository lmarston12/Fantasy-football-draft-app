import { handle } from "@/lib/api-response";
import { sleeperProvider } from "@/lib/providers/sleeper/adapter";

/** Draft metadata (status, type, slot -> roster mapping). */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/api/sleeper/draft/[draftId]">,
) {
  const { draftId } = await params;
  return handle(() => sleeperProvider.getDraft(draftId));
}
