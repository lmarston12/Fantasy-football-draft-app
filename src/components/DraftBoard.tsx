"use client";

import { useMemo, useState } from "react";
import type { LeagueData } from "@/hooks/useLeagueData";
import type { DraftPick } from "@/lib/providers/types";
import { buildDraftBoard } from "@/lib/rankings/engine";
import {
  adjustForRosterDrift,
  bandFor,
  computeConsumptionByPick,
  type AvailabilityBand,
} from "@/lib/draft/availability";
import { nextPickNumber } from "@/lib/draft/pick-order";
import { pprLabel } from "@/lib/providers/scoring-format";
import { AvailablePlayersTable } from "./AvailablePlayersTable";
import { MyRosterPanel } from "./MyRosterPanel";
import { NeedsSummary } from "./NeedsSummary";
import { RankingsCsvImport } from "./RankingsCsvImport";
import { TeamsOverviewPanel } from "./TeamsOverviewPanel";

type Mode = "foryou" | "value";

interface Props {
  data: LeagueData;
  picks: DraftPick[];
  myRosterId: number | null;
  lastUpdated: number | null;
  onRefresh: () => void;
}

/** The full draft board: recommendations, roster, needs, and league state. */
export function DraftBoard({
  data,
  picks,
  myRosterId,
  lastUpdated,
  onRefresh,
}: Props) {
  const [mode, setMode] = useState<Mode>("foryou");
  const [customRankById, setCustomRankById] = useState<Map<
    string,
    number
  > | null>(null);

  const playersById = useMemo(
    () => new Map(data.players.map((p) => [p.id, p])),
    [data.players],
  );

  const board = useMemo(
    () =>
      buildDraftBoard({
        league: data.league,
        catalog: data.players,
        picks,
        myRosterId,
        customRankById: customRankById ?? undefined,
      }),
    [data.league, data.players, picks, myRosterId, customRankById],
  );

  const list = mode === "foryou" ? board.available : board.bestAvailable;
  const topPick = board.available[0];

  // Without any usable ranks (no platform searchRank and no imported CSV), the
  // engine can only order players by catalog position — which produces
  // confident-looking but meaningless recommendations. Warn instead of
  // pretending, and point at the CSV import that fixes it.
  const hasUsableRanks =
    customRankById != null ||
    data.players.some((p) => p.searchRank != null);

  // "Availability at your next pick": the overall pick this manager will make
  // next (their "return pick"), and — from the league's own draft history —
  // how likely each available player is to still be on the board by then.
  const nextPick = useMemo(
    () => nextPickNumber(data.draft, myRosterId, picks.length),
    [data.draft, myRosterId, picks.length],
  );

  const availability = useMemo(() => {
    if (!data.history || nextPick == null) return null;
    const base = computeConsumptionByPick(data.history, data.players, nextPick);
    // Correct for roster changes since the history was drafted (e.g. an added
    // flex this year makes RB/WR/TE clear earlier than past drafts imply).
    return adjustForRosterDrift(base, {
      league: data.league,
      history: data.history,
      pickNo: nextPick,
    });
  }, [data.history, data.players, data.league, nextPick]);

  // Only band players when the ordering is real (usable ranks) and we have
  // history-derived consumption; otherwise positional rank is meaningless.
  const bandByPlayerId = useMemo(() => {
    if (!availability || !hasUsableRanks) return null;
    const m = new Map<string, AvailabilityBand>();
    for (const r of board.available) {
      if (!r.player.position) continue;
      const band = bandFor(
        r.player.position,
        r.positionalRank,
        availability.consumption,
      );
      if (band) m.set(r.player.id, band);
    }
    return m.size > 0 ? m : null;
  }, [availability, hasUsableRanks, board.available]);

  const driftShifted = availability?.shifted ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* Left rail */}
      <aside className="flex flex-col gap-4">
        <NeedsSummary needs={board.needs} />
        {!hasUsableRanks && (
          <section className="rounded-xl border border-amber-500/40 bg-amber-50 p-4 dark:bg-amber-950/30">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              No draft ranks available
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This catalog has no consensus ranks, so the ordering below is not
              meaningful. Import a rankings CSV to get real recommendations.
            </p>
          </section>
        )}
        {hasUsableRanks && topPick && (
          <section className="rounded-xl border border-emerald-500/40 bg-emerald-50 p-4 dark:bg-emerald-950/30">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Top pick for you
            </h2>
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {topPick.player.name}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {topPick.player.position}
              {topPick.positionalRank} · {topPick.player.team ?? "FA"} ·{" "}
              {topPick.tier}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {topPick.reasons.join(" · ")}
            </p>
          </section>
        )}
        <MyRosterPanel players={board.myPlayers} />
        <RankingsCsvImport
          catalog={data.players}
          onApply={setCustomRankById}
        />
        <TeamsOverviewPanel
          teams={data.teams}
          picks={picks}
          playersById={playersById}
          myRosterId={myRosterId}
        />
      </aside>

      {/* Main column */}
      <main className="flex min-h-[70vh] flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">{data.league.name}</h1>
            <p className="text-xs text-zinc-500">
              {data.league.teamCount} teams · {pprLabel(data.league.scoring)} ·{" "}
              {picks.length} picks made
              {customRankById ? " · custom rankings" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-black/10 p-0.5 dark:border-white/10">
              <button
                onClick={() => setMode("foryou")}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  mode === "foryou"
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-600 dark:text-zinc-300"
                }`}
              >
                For you
              </button>
              <button
                onClick={() => setMode("value")}
                className={`rounded-md px-3 py-1 text-sm font-medium ${
                  mode === "value"
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-600 dark:text-zinc-300"
                }`}
              >
                Best available
              </button>
            </div>
            <button
              onClick={onRefresh}
              className="rounded-lg border border-black/10 px-3 py-1 text-sm hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-zinc-800"
              title={
                lastUpdated
                  ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}`
                  : undefined
              }
            >
              Refresh
            </button>
          </div>
        </div>
        {bandByPlayerId && nextPick && (
          <p className="mb-2 text-xs text-zinc-500">
            Availability estimated at{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              your pick {nextPick}
            </span>{" "}
            from this league&apos;s past drafts. Toss-ups are the players worth
            targeting now.
            {driftShifted.length > 0 && (
              <>
                {" "}
                Adjusted for this year&apos;s roster change (more{" "}
                {driftShifted.join("/")} demand than past seasons).
              </>
            )}
          </p>
        )}
        <AvailablePlayersTable
          players={list}
          bandByPlayerId={bandByPlayerId}
          nextPick={nextPick}
        />
      </main>
    </div>
  );
}
