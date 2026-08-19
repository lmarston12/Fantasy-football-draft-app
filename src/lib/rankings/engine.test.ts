import { describe, expect, it } from "vitest";
import { buildDraftBoard, replacementRanks } from "./engine";
import { perTeamPositionDemand } from "../draft/needs";
import { makeCatalog, makeLeague, makePlayer } from "../testing/fixtures";
import type { DraftPick } from "../providers/types";

function pick(pickNo: number, playerId: string, rosterId: number): DraftPick {
  return {
    pickNo,
    round: Math.ceil(pickNo / 12),
    rosterId,
    pickedBy: `u${rosterId}`,
    playerId,
  };
}

describe("replacementRanks", () => {
  it("derives replacement rank from league demand and team count", () => {
    const league = makeLeague();
    const ranks = replacementRanks(perTeamPositionDemand(league), 12);
    // RB demand 2.33 * 12 = 28.
    expect(ranks.RB).toBe(28);
    expect(ranks.QB).toBe(12);
  });
});

describe("buildDraftBoard", () => {
  it("excludes drafted players from the board", () => {
    const league = makeLeague();
    const catalog = makeCatalog();
    const target = catalog.find((p) => p.position === "RB")!;
    const board = buildDraftBoard({
      league,
      catalog,
      picks: [pick(1, target.id, 5)],
      myRosterId: 1,
    });
    expect(board.available.some((r) => r.player.id === target.id)).toBe(false);
    expect(board.bestAvailable.some((r) => r.player.id === target.id)).toBe(
      false,
    );
  });

  it("gives scarce-position starters positive value over replacement", () => {
    const league = makeLeague();
    const catalog = makeCatalog();
    const board = buildDraftBoard({
      league,
      catalog,
      picks: [],
      myRosterId: 1,
    });
    const topRb = board.bestAvailable.find((r) => r.player.position === "RB")!;
    expect(topRb.vor).toBeGreaterThan(0);
    expect(topRb.tier).toBe("Elite");
  });

  it("boosts players that fill an open starting slot in the recommendation", () => {
    const league = makeLeague();
    const catalog = makeCatalog();
    // My roster already has 1 QB (so QB need is filled) but no TE.
    const myQb = catalog.find((p) => p.position === "QB")!;
    const board = buildDraftBoard({
      league,
      catalog,
      picks: [pick(1, myQb.id, 1)],
      myRosterId: 1,
    });
    // A comparable-value TE should out-recommend a second QB of similar value.
    const bestTe = board.available.find((r) => r.player.position === "TE")!;
    const bestQb = board.available.find((r) => r.player.position === "QB")!;
    expect(bestTe.flags.fillsNeed).toBe(true);
    expect(bestQb.flags.fillsNeed).toBe(false);
    // TE recommendation should reflect the need bonus.
    expect(bestTe.recommendationScore).toBeGreaterThan(bestTe.valueScore);
  });

  it("flags a handcuff sharing team + position with my roster in depth phase", () => {
    // Tiny league so depth phase is reached quickly.
    const league = makeLeague({
      rosterSlots: [{ type: "RB" }, { type: "BENCH" }],
      teamCount: 2,
    });
    const starter = makePlayer("Star RB", "RB", 1, "KC", { id: "star" });
    const backup = makePlayer("Backup RB", "RB", 40, "KC", { id: "backup" });
    const catalog = [starter, backup, makePlayer("Other RB", "RB", 2, "SF")];
    const board = buildDraftBoard({
      league,
      catalog,
      picks: [pick(1, "star", 1)],
      myRosterId: 1,
    });
    const backupRanked = board.available.find((r) => r.player.id === "backup")!;
    expect(board.needs.depthPhase).toBe(true);
    expect(backupRanked.flags.handcuff).toBe(true);
    expect(backupRanked.recommendationScore).toBeGreaterThan(
      backupRanked.valueScore,
    );
  });

  it("lets an imported custom ranking override search_rank", () => {
    const league = makeLeague();
    const catalog = makeCatalog();
    // Pick a WR ranked poorly by search_rank and promote it to overall #1.
    const sleeper = [...catalog]
      .filter((p) => p.position === "WR")
      .sort((a, b) => (a.searchRank ?? 0) - (b.searchRank ?? 0));
    const underdog = sleeper[10];
    const board = buildDraftBoard({
      league,
      catalog,
      picks: [],
      myRosterId: 1,
      customRankById: new Map([[underdog.id, 1]]),
    });
    const topWr = board.bestAvailable.find((r) => r.player.position === "WR")!;
    expect(topWr.player.id).toBe(underdog.id);
    expect(topWr.positionalRank).toBe(1);
  });
});
