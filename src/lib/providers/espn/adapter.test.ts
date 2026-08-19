import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { EspnLeagueResponse, EspnPlayer } from "./client";

vi.mock("./client", () => ({
  fetchLeague: vi.fn(),
  fetchPlayers: vi.fn(),
}));

import * as api from "./client";
import { espnProvider } from "./adapter";

const REF = "2025-123";

function leagueFixture(): EspnLeagueResponse {
  return {
    id: 123,
    seasonId: 2025,
    settings: {
      name: "Test ESPN League",
      size: 10,
      rosterSettings: {
        lineupSlotCounts: {
          "0": 1, // QB
          "2": 2, // RB
          "4": 2, // WR
          "6": 1, // TE
          "23": 1, // FLEX
          "17": 1, // K
          "16": 1, // DEF
          "20": 6, // BENCH
        },
      },
      scoringSettings: {
        scoringItems: [
          { statId: 53, points: 1 }, // full PPR
          { statId: 4, points: 4 }, // 4-pt passing TD
        ],
      },
      draftSettings: { type: "SNAKE", pickOrder: [3, 1, 2] },
    },
    teams: [
      { id: 1, location: "Team", nickname: "One", primaryOwner: "{OWN1}" },
      { id: 2, location: "Team", nickname: "Two" },
    ],
    draftDetail: {
      drafted: false,
      inProgress: true,
      picks: [
        { overallPickNumber: 1, roundId: 1, teamId: 3, playerId: 1001 },
        { overallPickNumber: 2, roundId: 1, teamId: 1, playerId: 1002 },
      ],
    },
  };
}

function playersFixture(): EspnPlayer[] {
  return [
    {
      id: 1001,
      fullName: "Star RB",
      defaultPositionId: 2,
      proTeamId: 12,
      draftRanksByRankType: { PPR: { rank: 1 } },
    },
    {
      id: 1002,
      fullName: "Star WR",
      defaultPositionId: 3,
      proTeamId: 14,
      draftRanksByRankType: { STANDARD: { rank: 5 } },
    },
    { id: 1003, firstName: "No", lastName: "Rank", defaultPositionId: 1, proTeamId: 0 },
    { id: 9999, fullName: "Coach Guy", defaultPositionId: 99 },
  ];
}

beforeEach(() => {
  (api.fetchLeague as Mock).mockReset();
  (api.fetchPlayers as Mock).mockReset();
  (api.fetchLeague as Mock).mockResolvedValue(leagueFixture());
  (api.fetchPlayers as Mock).mockResolvedValue(playersFixture());
});

describe("EspnProvider.getLeague", () => {
  it("normalizes roster slots, scoring, and ids from the league ref", async () => {
    const league = await espnProvider.getLeague(REF);
    expect(league.leagueId).toBe(REF);
    expect(league.draftId).toBe(REF); // league doubles as the draft
    expect(league.season).toBe("2025");
    expect(league.teamCount).toBe(10);
    expect(league.scoring.pointsPerReception).toBe(1);
    expect(league.scoring.passingTdSixPoints).toBe(false);
    expect(league.rosterSlots.map((s) => s.type)).toEqual([
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
    ]);
  });

  it("passes the season+leagueId parsed from the ref to the client", async () => {
    await espnProvider.getLeague(REF);
    expect(api.fetchLeague).toHaveBeenCalledWith("2025", "123", undefined);
  });

  it("forwards auth to the client for private leagues", async () => {
    const auth = { espnS2: "s2val", swid: "{swid}" };
    await espnProvider.getLeague(REF, auth);
    expect(api.fetchLeague).toHaveBeenCalledWith("2025", "123", auth);
  });
});

describe("EspnProvider.getTeams", () => {
  it("maps ESPN teams to normalized teams", async () => {
    const teams = await espnProvider.getTeams(REF);
    expect(teams).toEqual([
      { rosterId: 1, ownerId: "{OWN1}", ownerName: "Team One" },
      { rosterId: 2, ownerId: null, ownerName: "Team Two" },
    ]);
  });
});

describe("EspnProvider.getDraft", () => {
  it("derives status, type, and the slot->roster mapping", async () => {
    const draft = await espnProvider.getDraft(REF);
    expect(draft.status).toBe("drafting");
    expect(draft.type).toBe("snake");
    expect(draft.slotToRosterId).toEqual({ 1: 3, 2: 1, 3: 2 });
  });
});

describe("EspnProvider.getPicks", () => {
  it("normalizes draft picks", async () => {
    const picks = await espnProvider.getPicks(REF);
    expect(picks).toEqual([
      { pickNo: 1, round: 1, rosterId: 3, pickedBy: "3", playerId: "1001" },
      { pickNo: 2, round: 1, rosterId: 1, pickedBy: "1", playerId: "1002" },
    ]);
  });
});

describe("EspnProvider.getPlayerCatalog", () => {
  it("normalizes players, skips unknown positions, and handles missing ranks", async () => {
    const players = await espnProvider.getPlayerCatalog({ season: "2025" });
    expect(api.fetchPlayers).toHaveBeenCalledWith("2025");
    // The staff entry (position 99) is dropped.
    expect(players.map((p) => p.name)).toEqual(["Star RB", "Star WR", "No Rank"]);
    expect(players[0]).toMatchObject({
      id: "1001",
      position: "RB",
      team: "KC",
      searchRank: 1,
    });
    // Falls back to STANDARD rank when PPR is absent.
    expect(players[1].searchRank).toBe(5);
    // No rank and no pro team -> nulls (CSV import is the fallback).
    expect(players[2]).toMatchObject({ searchRank: null, team: null });
  });
});

describe("EspnProvider unsupported operations", () => {
  it("rejects username and league-listing lookups", async () => {
    await expect(espnProvider.getUserId()).rejects.toThrow();
    await expect(espnProvider.getLeagues()).rejects.toThrow();
  });
});
