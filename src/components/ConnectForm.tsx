"use client";

/**
 * The connect flow on the home page:
 *   username -> user id -> pick a league -> pick your team -> open the board.
 *
 * Read-only: we only look up public Sleeper data. No password is ever asked
 * for, because Sleeper's read API needs none.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getLeague,
  getLeagues,
  getState,
  getUserId,
} from "@/lib/client/api";
import { pprLabel } from "@/lib/providers/sleeper/scoring";
import type { LeagueSettings, Team } from "@/lib/providers/types";

type Step = "username" | "league" | "team";

export function ConnectForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("username");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [season, setSeason] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<LeagueSettings[]>([]);
  const [league, setLeagueSel] = useState<LeagueSettings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    getState()
      .then((s) => setSeason(s.season))
      .catch(() => setSeason(String(new Date().getFullYear())));
  }, []);

  async function submitUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await getUserId(username.trim());
      const found = await getLeagues(id, season || undefined);
      setUserId(id);
      setLeagues(found);
      if (found.length === 0) {
        setError(`No ${season} leagues found for "${username}".`);
      } else {
        setStep("league");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseLeague(sel: LeagueSettings) {
    setBusy(true);
    setError(null);
    try {
      const { league: full, teams: t } = await getLeague(sel.leagueId);
      setLeagueSel(full);
      setTeams(t);
      // Auto-select the user's own team when we can identify it.
      const mine = t.find((team) => team.ownerId === userId);
      if (mine) {
        openBoard(full, mine.rosterId);
        return;
      }
      setStep("team");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load league.");
      setBusy(false);
    }
  }

  function openBoard(sel: LeagueSettings, rosterId: number) {
    if (!sel.draftId) {
      setError("This league has no draft yet.");
      setBusy(false);
      return;
    }
    const params = new URLSearchParams({
      league: sel.leagueId,
      roster: String(rosterId),
    });
    router.push(`/draft/${sel.draftId}?${params.toString()}`);
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      {step === "username" && (
        <form onSubmit={submitUsername} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Sleeper username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. yourname"
              autoComplete="off"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="season" className="text-sm text-zinc-600 dark:text-zinc-400">
              Season
            </label>
            <input
              id="season"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-24 rounded-lg border border-black/15 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Looking up…" : "Find my leagues"}
          </button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No login or password needed — this reads public Sleeper data only.
          </p>
        </form>
      )}

      {step === "league" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Choose a league</h2>
            <button
              onClick={() => setStep("username")}
              className="text-sm text-zinc-500 hover:underline"
            >
              ← back
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {leagues.map((lg) => (
              <li key={lg.leagueId}>
                <button
                  disabled={busy}
                  onClick={() => chooseLeague(lg)}
                  className="flex w-full items-center justify-between rounded-lg border border-black/10 px-4 py-3 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50 dark:border-white/10 dark:hover:bg-emerald-950/40"
                >
                  <span className="font-medium">{lg.name}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {lg.teamCount} teams · {pprLabel(lg.scoring)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === "team" && league && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Which team is yours?</h2>
            <button
              onClick={() => setStep("league")}
              className="text-sm text-zinc-500 hover:underline"
            >
              ← back
            </button>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {teams.map((team) => (
              <li key={team.rosterId}>
                <button
                  onClick={() => openBoard(league, team.rosterId)}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-left text-sm transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-white/10 dark:hover:bg-emerald-950/40"
                >
                  {team.ownerName ?? `Team ${team.rosterId}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
