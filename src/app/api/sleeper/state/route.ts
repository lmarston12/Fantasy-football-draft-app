import { handle } from "@/lib/api-response";
import { fetchState } from "@/lib/providers/sleeper/client";

/** Current NFL season/week — used to default the league season selector. */
export async function GET() {
  return handle(async () => {
    const state = await fetchState();
    return { season: state.season, week: state.week };
  });
}
