/**
 * Shared helpers for the Sleeper proxy route handlers.
 */

import { NextResponse } from "next/server";
import { SleeperApiError } from "./providers/sleeper/client";

/** Run a route handler, converting thrown errors into JSON responses. */
export async function handle<T>(
  fn: () => Promise<T>,
): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof SleeperApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
