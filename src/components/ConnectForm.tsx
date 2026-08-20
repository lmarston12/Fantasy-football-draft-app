"use client";

/**
 * The connect flow on the home page. Two platforms:
 *
 *   Sleeper: username -> user id -> pick a league -> pick your team -> board.
 *   ESPN:    league id (+ season, + optional private-league cookies)
 *            -> pick your team -> board.
 *
 * Sleeper is fully public and never asks for a password. ESPN is public too for
 * public leagues; private ESPN leagues require the user's `espn_s2` and `SWID`
 * cookies, which are used read-only, sent per request, and kept only in this
 * tab's sessionStorage — never persisted server-side and never logged.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getLeague,
  getLeagues,
  getState,
  getUserId,
} from "@/lib/client/api";
import { pprLabel } from "@/lib/providers/scoring-format";
import { formatEspnLeagueRef } from "@/lib/providers/espn/ref";
import { storeEspnAuth } from "@/lib/client/espn-session";
import type { LeagueSettings, ProviderAuth, Team } from "@/lib/providers/types";

type Provider = "sleeper" | "espn";
type Step = "username" | "espn" | "league" | "team";

/** Display labels — ESPN is an initialism, so not title-cased. */
const PROVIDER_LABEL: Record<Provider, string> = {
  sleeper: "Sleeper",
  espn: "ESPN",
};

export function ConnectForm() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("sleeper");
  const [step, setStep] = useState<Step>("username");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [season, setSeason] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<LeagueSettings[]>([]);
  const [league, setLeagueSel] = useState<LeagueSettings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  // ESPN-specific inputs.
  const [espnLeagueId, setEspnLeagueId] = useState("");
  const [showPrivate, setShowPrivate] = useState(false);
  const [espnS2, setEspnS2] = useState("");
  const [swid, setSwid] = useState("");

  useEffect(() => {
    getState(provider)
      .then((s) => setSeason(s.season))
      .catch(() => setSeason(String(new Date().getFullYear())));
  }, [provider]);

  function switchProvider(next: Provider) {
    if (next === provider) return;
    setProvider(next);
    setStep(next === "sleeper" ? "username" : "espn");
    setError(null);
    setLeagues([]);
    setLeagueSel(null);
    setTeams([]);
  }

  async function submitUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await getUserId("sleeper", username.trim());
      const found = await getLeagues("sleeper", id, season || undefined);
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

  function espnAuth(): ProviderAuth | undefined {
    if (!showPrivate) return undefined;
    if (!espnS2.trim() && !swid.trim()) return undefined;
    return { espnS2: espnS2.trim(), swid: swid.trim() };
  }

  async function submitEspn(e: React.FormEvent) {
    e.preventDefault();
    if (!espnLeagueId.trim() || !season.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const ref = formatEspnLeagueRef(season.trim(), espnLeagueId.trim());
      const auth = espnAuth();
      const { league: full, teams: t } = await getLeague("espn", ref, auth);
      // Keep private-league cookies for the board (per tab only).
      if (auth) storeEspnAuth(ref, auth);
      setLeagueSel(full);
      setTeams(t);
      setStep("team");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load league.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseLeague(sel: LeagueSettings) {
    setBusy(true);
    setError(null);
    try {
      const { league: full, teams: t } = await getLeague("sleeper", sel.leagueId);
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
      provider,
      league: sel.leagueId,
      season: sel.season,
      roster: String(rosterId),
    });
    router.push(`/draft/${encodeURIComponent(sel.draftId)}?${params.toString()}`);
  }

  const inputClass =
    "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100";

  return (
    <div className="w-full max-w-xl rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      {/* Platform selector */}
      <div className="mb-5 inline-flex rounded-lg border border-black/10 p-0.5 dark:border-white/10">
        {(["sleeper", "espn"] as Provider[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => switchProvider(p)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              provider === p
                ? "bg-emerald-600 text-white"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {PROVIDER_LABEL[p]}
          </button>
        ))}
      </div>

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
              className={inputClass}
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

      {step === "espn" && (
        <form onSubmit={submitEspn} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="espnLeagueId"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              ESPN league ID
            </label>
            <input
              id="espnLeagueId"
              value={espnLeagueId}
              onChange={(e) => setEspnLeagueId(e.target.value)}
              placeholder="e.g. 123456"
              inputMode="numeric"
              autoComplete="off"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Find it in your ESPN league URL: …/leagues/&lt;this number&gt;.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="espnSeason" className="text-sm text-zinc-600 dark:text-zinc-400">
              Season
            </label>
            <input
              id="espnSeason"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-24 rounded-lg border border-black/15 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="rounded-lg border border-black/10 p-3 dark:border-white/10">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={showPrivate}
                onChange={(e) => setShowPrivate(e.target.checked)}
              />
              This is a private league
            </label>
            {showPrivate && (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Private ESPN leagues need two cookies from a browser where
                  you&apos;re logged in to ESPN. Open your ESPN league, then in
                  your browser&apos;s dev tools copy the <code>espn_s2</code> and{" "}
                  <code>SWID</code> cookie values. They&apos;re used read-only,
                  sent only with your requests, and never stored on our server.
                </p>
                <div>
                  <label
                    htmlFor="espnS2"
                    className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    espn_s2
                  </label>
                  <input
                    id="espnS2"
                    value={espnS2}
                    onChange={(e) => setEspnS2(e.target.value)}
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="swid"
                    className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    SWID
                  </label>
                  <input
                    id="swid"
                    value={swid}
                    onChange={(e) => setSwid(e.target.value)}
                    placeholder="{XXXXXXXX-XXXX-...}"
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Loading…" : "Load my league"}
          </button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            ESPN has no official API — this uses their public read endpoints and
            can occasionally break if ESPN changes them. No ESPN ranking baseline
            is guaranteed; import a rankings CSV on the board if the list looks
            unranked.
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
              onClick={() => setStep(provider === "sleeper" ? "league" : "espn")}
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
