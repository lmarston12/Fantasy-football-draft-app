"use client";

/**
 * Polls draft picks on an interval while a draft is live.
 *
 * - Polls every `intervalMs` (default 5s) while a draft is live ("drafting")
 *   OR scheduled but not started ("pre_draft"). Polling in pre_draft matters:
 *   the draft status is captured when the page loads, so a draft that flips
 *   from pre_draft to drafting afterward would otherwise never start updating
 *   until a manual reload. Picks stream in the moment they're made either way.
 * - Pauses while the browser tab is hidden to be a good API citizen.
 * - Fetches once immediately for complete drafts (no polling loop).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getDraftPicks } from "@/lib/client/api";
import type {
  DraftPick,
  DraftStatus,
  ProviderAuth,
} from "@/lib/providers/types";

export interface DraftPollState {
  picks: DraftPick[];
  loading: boolean;
  error: string | null;
  /** Timestamp of the last successful refresh. */
  lastUpdated: number | null;
  /** Force an immediate refresh. */
  refresh: () => void;
}

const DEFAULT_INTERVAL_MS = 5000;

export function useDraftPolling(
  provider: string,
  draftId: string,
  status: DraftStatus,
  auth?: ProviderAuth,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): DraftPollState {
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const inFlight = useRef(false);

  const authKey = auth ? `${auth.espnS2 ?? ""}:${auth.swid ?? ""}` : "";

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await getDraftPicks(provider, draftId, auth);
      setPicks(next);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load picks.");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, draftId, authKey]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
    })();

    if (status !== "drafting" && status !== "pre_draft") return;

    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [refresh, status, intervalMs]);

  return { picks, loading, error, lastUpdated, refresh: () => void refresh() };
}
