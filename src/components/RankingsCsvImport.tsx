"use client";

import { useRef, useState } from "react";
import type { NormalizedPlayer } from "@/lib/providers/types";
import { matchRankingsToCatalog, parseRankingsCsv } from "@/lib/rankings/csv";

interface Props {
  catalog: NormalizedPlayer[];
  /** Called with a playerId -> rank map, or null to clear the override. */
  onApply: (rankById: Map<string, number> | null) => void;
}

/**
 * Lets the user import their own rankings (CSV) to override Sleeper's baseline.
 * Parsing and matching happen entirely in the browser.
 */
export function RankingsCsvImport({ catalog, onApply }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function apply(text: string) {
    const rows = parseRankingsCsv(text);
    if (rows.length === 0) {
      setSummary("Could not read any rows from that file.");
      return;
    }
    const { rankById, unmatched, totalRows } = matchRankingsToCatalog(
      rows,
      catalog,
    );
    onApply(rankById);
    setSummary(
      `Applied ${rankById.size} of ${totalRows} rankings` +
        (unmatched.length
          ? ` · ${unmatched.length} unmatched (e.g. ${unmatched
              .slice(0, 2)
              .map((u) => u.name)
              .join(", ")})`
          : ""),
    );
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(apply);
  }

  function clear() {
    onApply(null);
    setSummary(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold uppercase tracking-wide text-zinc-500"
      >
        Custom rankings
        <span className="text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-zinc-500">
            Upload a CSV to override the built-in ranking. Columns:{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              rank,player,pos,team
            </code>{" "}
            (header optional).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-emerald-700"
          />
          {summary && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {summary}
              </p>
              <button
                onClick={clear}
                className="shrink-0 text-xs text-rose-600 hover:underline"
              >
                Reset to built-in
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
