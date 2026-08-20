"use client";

import { useMemo, useState } from "react";
import type { LeagueData } from "@/hooks/useLeagueData";
import type { DraftPick } from "@/lib/providers/types";
import { buildDraftBoard } from "@/lib/rankings/engine";
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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* Left rail */}
      <aside className="flex flex-col gap-4">
        <NeedsSummary needs={board.needs} />
        {topPick && (
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
        <AvailablePlayersTable players={list} />
      </main>
    </div>
  );
}
