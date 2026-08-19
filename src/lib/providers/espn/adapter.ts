/**
 * ESPN implementation of the DraftProvider interface.
 *
 * Turns ESPN's raw JSON (from client.ts) into the app's normalized domain
 * types. This is the only file that should know ESPN's field names and numeric
 * id conventions (scoring lives in scoring.ts). ESPN's API is unofficial, so
 * every mapping here is defensive.
 */

import type {
  DraftInfo,
  DraftPick,
  DraftProvider,
  DraftStatus,
  LeagueSettings,
  NormalizedPlayer,
  Position,
  ProviderAuth,
  RosterSlot,
  SlotType,
  Team,
} from "../types";
import { normalizeScoring } from "./scoring";
import { parseEspnLeagueRef } from "./ref";
import * as api from "./client";
import type { EspnLeagueResponse, EspnPlayer } from "./client";

/** ESPN lineup-slot id -> our SlotType (roster construction). */
const SLOT_BY_LINEUP_ID: Record<number, SlotType> = {
  0: "QB",
  2: "RB",
  3: "FLEX", // RB/WR
  4: "WR",
  5: "REC_FLEX", // WR/TE
  6: "TE",
  7: "SUPER_FLEX", // OP: QB/RB/WR/TE
  16: "DEF", // D/ST
  17: "K",
  20: "BENCH",
  21: "IR",
  23: "FLEX", // RB/WR/TE
};

/** ESPN player defaultPositionId -> our Position. */
const POSITION_BY_ID: Record<number, Position> = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DEF",
};

/** ESPN proTeamId -> NFL team abbreviation. 0 = free agent / none. */
const TEAM_BY_ID: Record<number, string> = {
  1: "ATL",
  2: "BUF",
  3: "CHI",
  4: "CIN",
  5: "CLE",
  6: "DAL",
  7: "DEN",
  8: "DET",
  9: "GB",
  10: "TEN",
  11: "IND",
  12: "KC",
  13: "LV",
  14: "LAR",
  15: "MIA",
  16: "MIN",
  17: "NE",
  18: "NO",
  19: "NYG",
  20: "NYJ",
  21: "PHI",
  22: "ARI",
  23: "PIT",
  24: "LAC",
  25: "SF",
  26: "SEA",
  27: "TB",
  28: "WSH",
  29: "CAR",
  30: "JAX",
  33: "BAL",
  34: "HOU",
};

/** Order lineup slots starters-first for a readable roster display. */
const SLOT_DISPLAY_ORDER = [0, 2, 4, 6, 23, 3, 5, 7, 17, 16, 20, 21];

function toSlotType(lineupId: number): SlotType {
  return SLOT_BY_LINEUP_ID[lineupId] ?? "BENCH";
}

function normalizePosition(id: number | undefined): Position | null {
  if (id === undefined) return null;
  return POSITION_BY_ID[id] ?? null;
}

function normalizeTeam(proTeamId: number | undefined): string | null {
  if (!proTeamId) return null;
  return TEAM_BY_ID[proTeamId] ?? null;
}

function playerName(p: EspnPlayer): string {
  if (p.fullName && p.fullName.trim()) return p.fullName;
  const composed = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return composed || String(p.id);
}

/** Pick a usable consensus rank, preferring PPR then standard; else null. */
function playerSearchRank(p: EspnPlayer): number | null {
  const ranks = p.draftRanksByRankType;
  const ppr = ranks?.PPR?.rank;
  if (typeof ppr === "number" && ppr > 0) return ppr;
  const std = ranks?.STANDARD?.rank;
  if (typeof std === "number" && std > 0) return std;
  return null;
}

function rosterSlots(league: EspnLeagueResponse): RosterSlot[] {
  const counts = league.settings?.rosterSettings?.lineupSlotCounts ?? {};
  const slots: RosterSlot[] = [];
  const seen = new Set<number>();
  const emit = (id: number) => {
    const count = counts[String(id)] ?? 0;
    for (let i = 0; i < count; i++) slots.push({ type: toSlotType(id) });
    seen.add(id);
  };
  for (const id of SLOT_DISPLAY_ORDER) emit(id);
  // Any slot ids ESPN returns that we didn't list explicitly (exotic formats).
  for (const key of Object.keys(counts)) {
    const id = Number(key);
    if (!seen.has(id)) emit(id);
  }
  return slots;
}

function toLeagueSettings(
  ref: string,
  season: string,
  league: EspnLeagueResponse,
): LeagueSettings {
  return {
    leagueId: ref,
    name: league.settings?.name ?? `ESPN League ${league.id}`,
    season,
    teamCount: league.settings?.size ?? league.teams?.length ?? 0,
    rosterSlots: rosterSlots(league),
    scoring: normalizeScoring(league.settings?.scoringSettings?.scoringItems),
    // ESPN has no distinct draft id; the league reference doubles as it.
    draftId: ref,
  };
}

function teamName(t: {
  location?: string;
  nickname?: string;
  abbrev?: string;
  id: number;
}): string | null {
  const full = [t.location, t.nickname].filter(Boolean).join(" ").trim();
  return full || t.abbrev || null;
}

function draftStatus(league: EspnLeagueResponse): DraftStatus {
  const d = league.draftDetail;
  if (!d) return "unknown";
  if (d.inProgress) return "drafting";
  if (d.drafted) return "complete";
  return "pre_draft";
}

export class EspnProvider implements DraftProvider {
  readonly name = "espn";

  async getUserId(): Promise<string> {
    throw new Error(
      "ESPN leagues are opened by league id, not username. Enter your ESPN league ID.",
    );
  }

  async getLeagues(): Promise<LeagueSettings[]> {
    throw new Error(
      "ESPN cannot list leagues by user. Enter a specific ESPN league ID.",
    );
  }

  async getLeague(
    leagueRef: string,
    auth?: ProviderAuth,
  ): Promise<LeagueSettings> {
    const { season, leagueId } = parseEspnLeagueRef(leagueRef);
    const league = await api.fetchLeague(season, leagueId, auth);
    return toLeagueSettings(leagueRef, season, league);
  }

  async getTeams(leagueRef: string, auth?: ProviderAuth): Promise<Team[]> {
    const { season, leagueId } = parseEspnLeagueRef(leagueRef);
    const league = await api.fetchLeague(season, leagueId, auth);
    return (league.teams ?? []).map((t) => ({
      rosterId: t.id,
      ownerId: t.primaryOwner ?? null,
      ownerName: teamName(t),
    }));
  }

  async getDraft(draftRef: string, auth?: ProviderAuth): Promise<DraftInfo> {
    const { season, leagueId } = parseEspnLeagueRef(draftRef);
    const league = await api.fetchLeague(season, leagueId, auth);
    const slotToRosterId: Record<number, number> = {};
    const pickOrder = league.settings?.draftSettings?.pickOrder ?? [];
    pickOrder.forEach((teamId, idx) => {
      slotToRosterId[idx + 1] = teamId;
    });
    return {
      draftId: draftRef,
      leagueId: draftRef,
      status: draftStatus(league),
      teamCount: league.settings?.size ?? league.teams?.length ?? 0,
      type: (league.settings?.draftSettings?.type ?? "snake").toLowerCase(),
      slotToRosterId,
    };
  }

  async getPicks(draftRef: string, auth?: ProviderAuth): Promise<DraftPick[]> {
    const { season, leagueId } = parseEspnLeagueRef(draftRef);
    const league = await api.fetchLeague(season, leagueId, auth);
    const picks = league.draftDetail?.picks ?? [];
    return picks.map((p) => ({
      pickNo: p.overallPickNumber,
      round: p.roundId,
      rosterId: p.teamId,
      pickedBy: p.teamId != null ? String(p.teamId) : null,
      playerId: String(p.playerId),
    }));
  }

  async getPlayerCatalog(opts?: {
    season?: string;
  }): Promise<NormalizedPlayer[]> {
    const season = opts?.season ?? String(new Date().getFullYear());
    const players = await api.fetchPlayers(season);
    const result: NormalizedPlayer[] = [];
    for (const p of players) {
      const position = normalizePosition(p.defaultPositionId);
      if (!position) continue;
      result.push({
        id: String(p.id),
        name: playerName(p),
        position,
        team: normalizeTeam(p.proTeamId),
        searchRank: playerSearchRank(p),
        byeWeek: null,
        injuryStatus: p.injuryStatus ?? null,
      });
    }
    return result;
  }
}

/** Shared singleton; the provider holds no per-request state. */
export const espnProvider = new EspnProvider();
