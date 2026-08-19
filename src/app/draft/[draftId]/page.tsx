"use client";

import { use } from "react";
import Link from "next/link";
import { useLeagueData } from "@/hooks/useLeagueData";
import { useDraftPolling } from "@/hooks/useDraftPolling";
import { DraftBoard } from "@/components/DraftBoard";

function toParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function DraftPage(props: PageProps<"/draft/[draftId]">) {
  const { draftId } = use(props.params);
  const search = use(props.searchParams);
  const leagueId = toParam(search.league);
  const myRosterId = toParam(search.roster)
    ? Number(toParam(search.roster))
    : null;

  const { data, loading, error } = useLeagueData(leagueId, draftId);
  const poll = useDraftPolling(
    draftId,
    data?.draft.status ?? "unknown",
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:underline"
        >
          ← Change league
        </Link>
        {data && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              data.draft.status === "drafting"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {data.draft.status === "drafting"
              ? "Live · auto-refreshing"
              : data.draft.status === "complete"
                ? "Draft complete"
                : "Pre-draft"}
          </span>
        )}
      </div>

      {loading && (
        <p className="py-20 text-center text-zinc-500">Loading league…</p>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <p className="font-medium">Couldn&apos;t load this draft.</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <>
          {poll.error && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Live picks: {poll.error}
            </p>
          )}
          <DraftBoard
            data={data}
            picks={poll.picks}
            myRosterId={myRosterId}
            lastUpdated={poll.lastUpdated}
            onRefresh={poll.refresh}
          />
        </>
      )}
    </div>
  );
}
