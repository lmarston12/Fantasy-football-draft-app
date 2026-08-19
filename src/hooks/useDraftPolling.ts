"use client";

/**
 * Polls draft picks on an interval while a draft is live.
 *
 * - Polls every `intervalMs` (default 5s) only when the draft is "drafting".
 * - Pauses while the browser tab is hidden to be a good API citizen.
 * - Fetches once immediately for pre-draft/complete drafts (no polling loop).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getDraftPicks } from "@/lib/client/api";
import type { DraftPick, DraftStatus } from "@/lib/providers/types";

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
  draftId: string,
  status: DraftStatus,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): DraftPollState {
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await getDraftPicks(draftId);
      setPicks(next);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load picks.");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [draftId]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
    })();

    if (status !== "drafting") return;

    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [refresh, status, intervalMs]);

  return { picks, loading, error, lastUpdated, refresh: () => void refresh() };
}
