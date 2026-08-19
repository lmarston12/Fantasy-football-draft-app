"use client";

import type {
  DraftPick,
  NormalizedPlayer,
  Team,
} from "@/lib/providers/types";

interface Props {
  teams: Team[];
  picks: DraftPick[];
  playersById: Map<string, NormalizedPlayer>;
  myRosterId: number | null;
}

/** Shows every team, its pick count, and its most recent pick. */
export function TeamsOverviewPanel({
  teams,
  picks,
  playersById,
  myRosterId,
}: Props) {
  const picksByRoster = new Map<number, DraftPick[]>();
  for (const pick of picks) {
    if (pick.rosterId == null) continue;
    if (!picksByRoster.has(pick.rosterId)) picksByRoster.set(pick.rosterId, []);
    picksByRoster.get(pick.rosterId)!.push(pick);
  }

  const sorted = [...teams].sort((a, b) => a.rosterId - b.rosterId);

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Teams
      </h2>
      <ul className="flex flex-col gap-1.5 text-sm">
        {sorted.map((team) => {
          const teamPicks = picksByRoster.get(team.rosterId) ?? [];
          const last = teamPicks[teamPicks.length - 1];
          const lastPlayer = last ? playersById.get(last.playerId) : undefined;
          const isMe = team.rosterId === myRosterId;
          return (
            <li
              key={team.rosterId}
              className={`flex items-center justify-between rounded-md px-2 py-1 ${
                isMe
                  ? "bg-emerald-50 dark:bg-emerald-950/40"
                  : ""
              }`}
            >
              <span className="truncate">
                <span className="text-zinc-400">{team.rosterId}. </span>
                {team.ownerName ?? `Team ${team.rosterId}`}
                {isMe && (
                  <span className="ml-1 text-xs font-medium text-emerald-600">
                    (you)
                  </span>
                )}
              </span>
              <span className="ml-2 shrink-0 text-right text-xs text-zinc-500">
                {teamPicks.length} pick{teamPicks.length === 1 ? "" : "s"}
                {lastPlayer && (
                  <span className="ml-1 text-zinc-400">
                    · {lastPlayer.position}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
