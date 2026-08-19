import { describe, expect, it } from "vitest";
import {
  matchRankingsToCatalog,
  normalizeName,
  parseRankingsCsv,
} from "./csv";
import { makePlayer } from "../testing/fixtures";

describe("normalizeName", () => {
  it("strips punctuation and suffixes", () => {
    expect(normalizeName("Ja'Marr Chase")).toBe("jamarr chase");
    expect(normalizeName("Michael Pittman Jr.")).toBe("michael pittman");
    expect(normalizeName("A.J. Brown")).toBe("aj brown");
  });
});

describe("parseRankingsCsv", () => {
  it("parses a headered CSV with rank, player, pos, team", () => {
    const rows = parseRankingsCsv(
      "Rank,Player,Pos,Team\n1,Christian McCaffrey,RB,SF\n2,Tyreek Hill,WR,MIA",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      rank: 1,
      name: "Christian McCaffrey",
      position: "RB",
      team: "SF",
    });
  });

  it("handles quoted fields with commas", () => {
    const rows = parseRankingsCsv('Rank,Player\n1,"Smith, Jr., Steve"');
    expect(rows[0].name).toBe("Smith, Jr., Steve");
  });

  it("treats a headerless two-column file as rank,name", () => {
    const rows = parseRankingsCsv("1,Josh Allen\n2,Jalen Hurts");
    expect(rows[0]).toMatchObject({ rank: 1, name: "Josh Allen" });
    expect(rows[1].rank).toBe(2);
  });

  it("falls back to row order when a rank is missing", () => {
    const rows = parseRankingsCsv("Player\nJosh Allen\nJalen Hurts");
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
  });
});

describe("matchRankingsToCatalog", () => {
  const catalog = [
    makePlayer("Christian McCaffrey", "RB", 1, "SF", { id: "cmc" }),
    makePlayer("Ja'Marr Chase", "WR", 2, "CIN", { id: "chase" }),
    // Two different players who normalize to the same name.
    makePlayer("Mike Williams", "WR", 30, "NYJ", { id: "will-wr" }),
    makePlayer("Mike Williams", "DEF", 200, "PIT", { id: "will-def" }),
  ];

  it("matches on normalized name and returns playerId -> rank", () => {
    const rows = parseRankingsCsv(
      "Rank,Player\n1,Christian McCaffrey\n2,JaMarr Chase",
    );
    const { rankById, unmatched } = matchRankingsToCatalog(rows, catalog);
    expect(rankById.get("cmc")).toBe(1);
    expect(rankById.get("chase")).toBe(2);
    expect(unmatched).toHaveLength(0);
  });

  it("disambiguates duplicate names by position", () => {
    const rows = parseRankingsCsv(
      "Rank,Player,Pos\n5,Mike Williams,WR",
    );
    const { rankById } = matchRankingsToCatalog(rows, catalog);
    expect(rankById.get("will-wr")).toBe(5);
    expect(rankById.has("will-def")).toBe(false);
  });

  it("reports rows that do not match any player", () => {
    const rows = parseRankingsCsv("Rank,Player\n1,Nonexistent Person");
    const { unmatched } = matchRankingsToCatalog(rows, catalog);
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0].name).toBe("Nonexistent Person");
  });
});
