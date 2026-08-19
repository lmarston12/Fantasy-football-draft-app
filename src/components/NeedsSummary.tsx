"use client";

import type { Position } from "@/lib/providers/types";
import type { RosterNeeds } from "@/lib/draft/needs";
import { positionClasses } from "@/lib/client/format";

const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

/** Summarizes the user's roster: counts, open starting slots, draft phase. */
export function NeedsSummary({ needs }: { needs: RosterNeeds }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Your needs
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            needs.depthPhase
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {needs.depthPhase ? "Depth phase" : "Filling starters"}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {POSITIONS.map((pos) => (
          <span
            key={pos}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${positionClasses(
              pos,
            )}`}
          >
            {pos}
            <span className="tabular-nums opacity-80">
              {needs.positionCounts[pos]}
            </span>
          </span>
        ))}
      </div>

      <div>
        <p className="mb-1 text-xs text-zinc-500">Open starting slots</p>
        {needs.openSlots.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            All starters filled — drafting for depth &amp; upside.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {needs.openSlots.map((slot, i) => (
              <span
                key={`${slot}-${i}`}
                className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {slot}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
