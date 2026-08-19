"use client";

import type { NormalizedPlayer, Position } from "@/lib/providers/types";
import { positionClasses } from "@/lib/client/format";

const ORDER: Position[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

/** Lists the user's drafted players grouped by position. */
export function MyRosterPanel({ players }: { players: NormalizedPlayer[] }) {
  const byPos = new Map<Position, NormalizedPlayer[]>();
  for (const p of players) {
    if (!p.position) continue;
    if (!byPos.has(p.position)) byPos.set(p.position, []);
    byPos.get(p.position)!.push(p);
  }

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        My roster ({players.length})
      </h2>
      {players.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No picks yet. Recommendations below are for your first pick.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {ORDER.filter((pos) => byPos.has(pos)).map((pos) => (
            <div key={pos} className="flex items-start gap-2">
              <span
                className={`mt-0.5 w-9 shrink-0 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold ${positionClasses(
                  pos,
                )}`}
              >
                {pos}
              </span>
              <ul className="flex flex-1 flex-col gap-0.5 text-sm">
                {byPos.get(pos)!.map((p) => (
                  <li key={p.id} className="text-zinc-800 dark:text-zinc-200">
                    {p.name}
                    {p.team ? (
                      <span className="ml-1 text-xs text-zinc-400">
                        {p.team}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
