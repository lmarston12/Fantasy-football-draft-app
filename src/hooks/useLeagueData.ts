"use client";

/**
 * Loads the static-for-the-session data needed to render a draft board:
 * league settings, teams, draft metadata, and the player catalog. These are
 * fetched once; live picks are handled separately by useDraftPolling.
 */

import { useEffect, useState } from "react";
import {
  getDraft,
  getLeague,
  getPlayers,
} from "@/lib/client/api";
import type {
  DraftInfo,
  LeagueSettings,
  NormalizedPlayer,
  Team,
} from "@/lib/providers/types";

export interface LeagueData {
  league: LeagueSettings;
  teams: Team[];
  draft: DraftInfo;
  players: NormalizedPlayer[];
}

interface State {
  data: LeagueData | null;
  loading: boolean;
  error: string | null;
}

export function useLeagueData(
  leagueId: string | null,
  draftId: string,
): State {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState({ data: null, loading: true, error: null });
      try {
        const draft = await getDraft(draftId);
        const resolvedLeagueId = leagueId ?? draft.leagueId;
        const [{ league, teams }, players] = await Promise.all([
          resolvedLeagueId
            ? getLeague(resolvedLeagueId)
            : Promise.reject(
                new Error("Could not determine the league for this draft."),
              ),
          getPlayers(),
        ]);
        if (cancelled) return;
        setState({
          data: { league, teams, draft, players },
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          data: null,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load league.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [leagueId, draftId]);

  return state;
}
