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
  ProviderAuth,
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
  provider: string,
  leagueId: string | null,
  draftId: string,
  season: string | null,
  auth?: ProviderAuth,
): State {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  // Serialize auth so the effect re-runs if the credentials actually change,
  // without depending on a new object identity every render.
  const authKey = auth ? `${auth.espnS2 ?? ""}:${auth.swid ?? ""}` : "";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setState({ data: null, loading: true, error: null });
      try {
        const draft = await getDraft(provider, draftId, auth);
        const resolvedLeagueId = leagueId ?? draft.leagueId;
        const [{ league, teams }, players] = await Promise.all([
          resolvedLeagueId
            ? getLeague(provider, resolvedLeagueId, auth)
            : Promise.reject(
                new Error("Could not determine the league for this draft."),
              ),
          getPlayers(
            provider,
            season ?? undefined,
            resolvedLeagueId ?? undefined,
            auth,
          ),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, leagueId, draftId, season, authKey]);

  return state;
}
