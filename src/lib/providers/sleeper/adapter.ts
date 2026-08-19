/**
 * Sleeper implementation of the DraftProvider interface.
 *
 * Responsible for turning Sleeper's raw JSON (from client.ts) into the app's
 * normalized domain types. This is the only file that should know Sleeper's
 * field names for league/draft/player data (scoring lives in scoring.ts).
 */

import type {
  DraftInfo,
  DraftPick,
  DraftProvider,
  DraftStatus,
  LeagueSettings,
  NormalizedPlayer,
  Position,
  RosterSlot,
  SlotType,
  Team,
} from "../types";
import { normalizeScoring } from "./scoring";
import * as api from "./client";
import type { SleeperLeague, SleeperPlayer } from "./client";

/** Positions the app reasons about; anything else normalizes to null. */
const KNOWN_POSITIONS: ReadonlySet<string> = new Set([
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
]);

/** Map a Sleeper roster_position token to our SlotType. */
function toSlotType(token: string): SlotType {
  switch (token) {
    case "QB":
    case "RB":
    case "WR":
    case "TE":
    case "K":
    case "DEF":
    case "FLEX":
    case "REC_FLEX":
    case "SUPER_FLEX":
    case "IR":
    case "TAXI":
      return token;
    case "BN":
      return "BENCH";
    // IDP and any other exotic slots don't affect offensive value ranking;
    // treat them as bench so starting-slot math stays correct. (Documented
    // limitation: IDP scoring is not modeled in v1.)
    default:
      return "BENCH";
  }
}

function normalizePosition(token: string | null | undefined): Position | null {
  if (!token) return null;
  return KNOWN_POSITIONS.has(token) ? (token as Position) : null;
}

function playerName(p: SleeperPlayer): string {
  if (p.full_name && p.full_name.trim()) return p.full_name;
  const composed = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return composed || p.player_id;
}

function normalizeStatus(status: string): DraftStatus {
  switch (status) {
    case "pre_draft":
      return "pre_draft";
    case "drafting":
      return "drafting";
    case "complete":
      return "complete";
    default:
      return "unknown";
  }
}

function toLeagueSettings(league: SleeperLeague): LeagueSettings {
  const rosterSlots: RosterSlot[] = (league.roster_positions ?? []).map(
    (token) => ({ type: toSlotType(token) }),
  );
  return {
    leagueId: league.league_id,
    name: league.name,
    season: league.season,
    teamCount: league.total_rosters,
    rosterSlots,
    scoring: normalizeScoring(league.scoring_settings),
    draftId: league.draft_id ?? null,
  };
}

export class SleeperProvider implements DraftProvider {
  readonly name = "sleeper";

  async getUserId(username: string): Promise<string> {
    const user = await api.fetchUser(username);
    if (!user?.user_id) {
      throw new Error(`No Sleeper user found for "${username}".`);
    }
    return user.user_id;
  }

  async getLeagues(userId: string, season: string): Promise<LeagueSettings[]> {
    const leagues = await api.fetchLeagues(userId, season);
    return leagues.map(toLeagueSettings);
  }

  async getLeague(leagueId: string): Promise<LeagueSettings> {
    const league = await api.fetchLeague(leagueId);
    return toLeagueSettings(league);
  }

  async getTeams(leagueId: string): Promise<Team[]> {
    const [rosters, users] = await Promise.all([
      api.fetchRosters(leagueId),
      api.fetchLeagueUsers(leagueId),
    ]);
    const nameByUserId = new Map(
      users.map((u) => [u.user_id, u.display_name]),
    );
    return rosters.map((r) => ({
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      ownerName: r.owner_id ? nameByUserId.get(r.owner_id) ?? null : null,
    }));
  }

  async getDraft(draftId: string): Promise<DraftInfo> {
    const draft = await api.fetchDraft(draftId);
    const slotToRosterId: Record<number, number> = {};
    for (const [slot, rosterId] of Object.entries(
      draft.slot_to_roster_id ?? {},
    )) {
      slotToRosterId[Number(slot)] = rosterId;
    }
    return {
      draftId: draft.draft_id,
      leagueId: draft.league_id,
      status: normalizeStatus(draft.status),
      teamCount: draft.settings?.teams ?? Object.keys(slotToRosterId).length,
      type: draft.type,
      slotToRosterId,
    };
  }

  async getPicks(draftId: string): Promise<DraftPick[]> {
    const picks = await api.fetchDraftPicks(draftId);
    return picks.map((p) => ({
      pickNo: p.pick_no,
      round: p.round,
      rosterId: p.roster_id,
      pickedBy: p.picked_by,
      playerId: p.player_id,
    }));
  }

  async getPlayerCatalog(): Promise<NormalizedPlayer[]> {
    const players = await api.fetchAllPlayers();
    const result: NormalizedPlayer[] = [];
    for (const p of Object.values(players)) {
      const position =
        normalizePosition(p.position) ??
        normalizePosition(p.fantasy_positions?.[0]);
      // Skip players with no fantasy-relevant position (staff, practice-squad
      // entries with null positions, etc.) to keep the catalog lean.
      if (!position) continue;
      result.push({
        id: p.player_id,
        name: playerName(p),
        position,
        team: p.team ?? null,
        searchRank:
          typeof p.search_rank === "number" ? p.search_rank : null,
        byeWeek: typeof p.bye_week === "number" ? p.bye_week : null,
        injuryStatus: p.injury_status ?? null,
      });
    }
    return result;
  }
}

/** Shared singleton; the provider holds no per-request state. */
export const sleeperProvider = new SleeperProvider();
