/**
 * Parse a user-supplied rankings CSV and match rows to catalog players.
 *
 * Supported shapes (header row is auto-detected, case-insensitive):
 *   - Columns named some of: rank, player/name, pos/position, team
 *   - Headerless: assumed to be `rank,name` (or `name` only -> rank by order)
 *
 * Matching is fuzzy on a normalized name (lowercased, punctuation and common
 * suffixes stripped), disambiguated by position when the CSV provides one.
 * Matched rows override Sleeper's `search_rank` in the engine.
 */

import type { NormalizedPlayer, Position } from "../providers/types";

export interface RankingRow {
  rank: number;
  name: string;
  position: Position | null;
  team: string | null;
}

export interface CsvMatchResult {
  /** playerId -> custom rank. */
  rankById: Map<string, number>;
  /** Rows that could not be matched to a catalog player. */
  unmatched: RankingRow[];
  /** Total rows parsed from the file. */
  totalRows: number;
}

const KNOWN_POSITIONS: ReadonlySet<string> = new Set([
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
]);

/** Parse a single CSV line, honoring double-quoted fields. */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields.map((f) => f.trim());
}

function normalizePositionToken(token: string | undefined): Position | null {
  if (!token) return null;
  const up = token.toUpperCase().replace(/\d+$/, ""); // "WR1" -> "WR"
  return KNOWN_POSITIONS.has(up) ? (up as Position) : null;
}

/** Normalize a player name for fuzzy matching. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'`]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse CSV text into ranking rows. */
export function parseRankingsCsv(text: string): RankingRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const firstCols = parseCsvLine(lines[0]).map((c) => c.toLowerCase());
  const headerLooksLikeHeader = firstCols.some((c) =>
    ["rank", "rk", "player", "name", "pos", "position", "team"].includes(c),
  );

  let rankIdx = -1;
  let nameIdx = -1;
  let posIdx = -1;
  let teamIdx = -1;

  let startLine = 0;
  if (headerLooksLikeHeader) {
    startLine = 1;
    firstCols.forEach((c, i) => {
      if ((c === "rank" || c === "rk") && rankIdx < 0) rankIdx = i;
      else if ((c === "player" || c === "name") && nameIdx < 0) nameIdx = i;
      else if ((c === "pos" || c === "position") && posIdx < 0) posIdx = i;
      else if (c === "team" && teamIdx < 0) teamIdx = i;
    });
    // If a header existed but no name column was identified, assume 2nd col.
    if (nameIdx < 0) nameIdx = firstCols.length > 1 ? 1 : 0;
    if (rankIdx < 0 && firstCols.length > 1) rankIdx = 0;
  } else {
    // Headerless: rank,name or just name.
    if (firstCols.length >= 2) {
      rankIdx = 0;
      nameIdx = 1;
    } else {
      nameIdx = 0;
    }
  }

  const rows: RankingRow[] = [];
  for (let i = startLine; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = (nameIdx >= 0 ? cols[nameIdx] : cols[0])?.trim();
    if (!name) continue;
    const parsedRank = rankIdx >= 0 ? Number(cols[rankIdx]) : NaN;
    const rank = Number.isFinite(parsedRank) ? parsedRank : rows.length + 1;
    rows.push({
      rank,
      name,
      position: normalizePositionToken(posIdx >= 0 ? cols[posIdx] : undefined),
      team: teamIdx >= 0 ? cols[teamIdx]?.toUpperCase() || null : null,
    });
  }
  return rows;
}

/** Match parsed rows to catalog players, producing a playerId -> rank map. */
export function matchRankingsToCatalog(
  rows: RankingRow[],
  catalog: NormalizedPlayer[],
): CsvMatchResult {
  // Index catalog by normalized name (+ position) for disambiguation.
  const byNamePos = new Map<string, NormalizedPlayer[]>();
  const byName = new Map<string, NormalizedPlayer[]>();
  for (const p of catalog) {
    const n = normalizeName(p.name);
    if (!byName.has(n)) byName.set(n, []);
    byName.get(n)!.push(p);
    if (p.position) {
      const key = `${n}|${p.position}`;
      if (!byNamePos.has(key)) byNamePos.set(key, []);
      byNamePos.get(key)!.push(p);
    }
  }

  const rankById = new Map<string, number>();
  const unmatched: RankingRow[] = [];

  for (const row of rows) {
    const n = normalizeName(row.name);
    let candidates: NormalizedPlayer[] | undefined;
    if (row.position) candidates = byNamePos.get(`${n}|${row.position}`);
    if (!candidates || candidates.length === 0) candidates = byName.get(n);

    if (!candidates || candidates.length === 0) {
      unmatched.push(row);
      continue;
    }
    // Prefer a team match when the CSV provided a team and multiple candidates.
    let chosen = candidates[0];
    if (candidates.length > 1 && row.team) {
      chosen = candidates.find((c) => c.team === row.team) ?? candidates[0];
    }
    // Keep the best (lowest) rank if the same player appears twice.
    const existing = rankById.get(chosen.id);
    if (existing == null || row.rank < existing) {
      rankById.set(chosen.id, row.rank);
    }
  }

  return { rankById, unmatched, totalRows: rows.length };
}
