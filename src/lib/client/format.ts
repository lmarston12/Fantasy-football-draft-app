/**
 * Small presentation helpers shared across components.
 */

import type { Position } from "../providers/types";
import type { Tier } from "../rankings/types";
import type { AvailabilityBand } from "../draft/availability";

/** Tailwind classes for a position badge. */
export function positionClasses(position: Position | null): string {
  switch (position) {
    case "QB":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
    case "RB":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "WR":
      return "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300";
    case "TE":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "K":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300";
    case "DEF":
      return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

/** Tailwind classes for a tier chip. */
export function tierClasses(tier: Tier): string {
  switch (tier) {
    case "Elite":
      return "bg-emerald-600 text-white";
    case "Great":
      return "bg-emerald-500/80 text-white";
    case "Starter":
      return "bg-sky-500/80 text-white";
    case "Depth":
      return "bg-zinc-400 text-white dark:bg-zinc-600";
    case "Deep":
      return "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200";
  }
}

/** Short label for an availability band ("will this survive to my next pick?"). */
export function availabilityLabel(band: AvailabilityBand): string {
  switch (band) {
    case "gone":
      return "Likely gone";
    case "tossup":
      return "Toss-up";
    case "there":
      return "Likely there";
  }
}

/** Tailwind classes for an availability-band chip. */
export function availabilityClasses(band: AvailabilityBand): string {
  switch (band) {
    case "gone":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
    case "tossup":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    case "there":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  }
}
