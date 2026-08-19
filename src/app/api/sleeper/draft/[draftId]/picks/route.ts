import { handle } from "@/lib/api-response";
import { sleeperProvider } from "@/lib/providers/sleeper/adapter";

// Always fresh: this is the live draft state the UI polls.
export const dynamic = "force-dynamic";

/** All picks made so far in a draft. */
export async function GET(
  _req: Request,
  { params }: RouteContext<"/api/sleeper/draft/[draftId]/picks">,
) {
  const { draftId } = await params;
  return handle(() => sleeperProvider.getPicks(draftId));
}
