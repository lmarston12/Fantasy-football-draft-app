/**
 * Test fixtures shared across unit tests. Not shipped to the client bundle
 * (only imported from *.test.ts files).
 */

import type {
  LeagueSettings,
  NormalizedPlayer,
  Position,
  RosterSlot,
  SlotType,
} from "../providers/types";

export function slots(...types: SlotType[]): RosterSlot[] {
  return types.map((type) => ({ type }));
}

/** A standard 12-team, half-PPR league with a common roster. */
export function makeLeague(overrides: Partial<LeagueSettings> = {}): LeagueSettings {
  return {
    leagueId: "L1",
    name: "Test League",
    season: "2025",
    teamCount: 12,
    rosterSlots: slots(
      "QB",
      "RB",
      "RB",
      "WR",
      "WR",
      "TE",
      "FLEX",
      "K",
      "DEF",
      "BENCH",
      "BENCH",
      "BENCH",
      "BENCH",
      "BENCH",
      "BENCH",
    ),
    scoring: { pointsPerReception: 0.5, passingTdSixPoints: false, raw: {} },
    draftId: "D1",
    ...overrides,
  };
}

let autoId = 0;

export function makePlayer(
  name: string,
  position: Position,
  searchRank: number,
  team: string | null = null,
  overrides: Partial<NormalizedPlayer> = {},
): NormalizedPlayer {
  autoId += 1;
  return {
    id: overrides.id ?? `p${autoId}`,
    name,
    position,
    team,
    searchRank,
    byeWeek: null,
    injuryStatus: null,
    ...overrides,
  };
}

/**
 * Build a catalog with `count` players per offensive position plus a couple of
 * K/DEF, ranked by an interleaved overall search rank so positions are spread
 * across the board (roughly how a real board looks).
 */
export function makeCatalog(perPosition = 60): NormalizedPlayer[] {
  const positions: Position[] = ["QB", "RB", "WR", "TE"];
  const players: NormalizedPlayer[] = [];
  let overall = 1;
  for (let i = 0; i < perPosition; i++) {
    for (const pos of positions) {
      players.push(makePlayer(`${pos} Player ${i + 1}`, pos, overall++, "FA"));
    }
  }
  for (let i = 0; i < 20; i++) {
    players.push(makePlayer(`K Player ${i + 1}`, "K", overall++, "FA"));
    players.push(makePlayer(`DEF Player ${i + 1}`, "DEF", overall++, "FA"));
  }
  return players;
}
