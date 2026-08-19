"use client";

import { useMemo, useState } from "react";
import type { Position } from "@/lib/providers/types";
import type { RankedPlayer } from "@/lib/rankings/types";
import { positionClasses, tierClasses } from "@/lib/client/format";

const FILTERS: (Position | "ALL")[] = [
  "ALL",
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
];

/**
 * Sortable/filterable table of available players. The incoming list is already
 * ordered by the engine (recommendation or pure value); this component only
 * filters by position and name.
 */
export function AvailablePlayersTable({
  players,
  limit = 60,
}: {
  players: RankedPlayer[];
  limit?: number;
}) {
  const [filter, setFilter] = useState<Position | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players
      .filter((r) => filter === "ALL" || r.player.position === filter)
      .filter((r) => !q || r.player.name.toLowerCase().includes(q))
      .slice(0, limit);
  }, [players, filter, query, limit]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search player…"
          className="ml-auto w-40 rounded-md border border-black/15 bg-white px-2.5 py-1 text-sm outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-zinc-800"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 font-medium">Player</th>
              <th className="px-2 py-2 font-medium">Pos</th>
              <th className="px-2 py-2 text-right font-medium">Pos Rk</th>
              <th className="px-2 py-2 text-right font-medium">Value</th>
              <th className="px-2 py-2 font-medium">Tier</th>
              <th className="px-3 py-2 font-medium">Why</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.player.id}
                className={`border-t border-black/5 dark:border-white/5 ${
                  r.flags.fillsNeed
                    ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                    : ""
                }`}
              >
                <td className="px-3 py-2">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {r.player.name}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {r.player.team ?? "FA"}
                    {r.player.byeWeek ? ` · bye ${r.player.byeWeek}` : ""}
                    {r.player.injuryStatus
                      ? ` · ${r.player.injuryStatus}`
                      : ""}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-semibold ${positionClasses(
                      r.player.position,
                    )}`}
                  >
                    {r.player.position}
                  </span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {r.player.position}
                  {r.positionalRank}
                </td>
                <td className="px-2 py-2 text-right tabular-nums font-medium">
                  {r.vor >= 0 ? `+${r.vor}` : r.vor}
                </td>
                <td className="px-2 py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${tierClasses(
                      r.tier,
                    )}`}
                  >
                    {r.tier}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-zinc-500">
                  {r.reasons.slice(0, 2).join(" · ")}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-sm text-zinc-400"
                >
                  No players match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
