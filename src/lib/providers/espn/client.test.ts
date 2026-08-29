import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EspnApiError, fetchLeague, fetchPlayers } from "./client";

const originalFetch = global.fetch;

function mockOk(body: unknown) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => body,
  })) as unknown as typeof fetch;
}

/** Grab the headers object passed to the last fetch call. */
function lastHeaders(f: unknown): Record<string, string> {
  const mock = f as unknown as { mock: { calls: unknown[][] } };
  const init = mock.mock.calls[0][1] as RequestInit;
  return init.headers as Record<string, string>;
}

/** Grab the URL passed to the last fetch call. */
function lastUrl(f: unknown): string {
  const mock = f as unknown as { mock: { calls: unknown[][] } };
  return mock.mock.calls[0][0] as string;
}

beforeEach(() => {
  delete process.env.ESPN_BASE_URL;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("espn client auth handling", () => {
  it("sends the Cookie header when private-league auth is provided", async () => {
    global.fetch = mockOk({ id: 1 });
    await fetchLeague("2025", "123", { espnS2: "S2", swid: "{SW}" });
    const headers = lastHeaders(global.fetch);
    expect(headers.cookie).toBe("espn_s2=S2; SWID={SW}");
  });

  it("omits the Cookie header for public leagues", async () => {
    global.fetch = mockOk({ id: 1 });
    await fetchLeague("2025", "123");
    const headers = lastHeaders(global.fetch);
    expect(headers.cookie).toBeUndefined();
  });

  it("omits the Cookie header when only one credential is present", async () => {
    global.fetch = mockOk({ id: 1 });
    await fetchLeague("2025", "123", { espnS2: "S2" });
    const headers = lastHeaders(global.fetch);
    expect(headers.cookie).toBeUndefined();
  });
});

describe("espn client player catalog", () => {
  it("hits the league-scoped kona endpoint with a sort filter, no cookie for public leagues", async () => {
    global.fetch = mockOk({ players: [] });
    await fetchPlayers("2025", "123");
    const headers = lastHeaders(global.fetch);
    const url = lastUrl(global.fetch);
    // Ranks live only on the league-scoped kona_player_info view.
    expect(url).toContain("/leagues/123");
    expect(url).toContain("view=kona_player_info");
    expect(headers["x-fantasy-filter"]).toContain("sortDraftRanks");
    expect(headers.cookie).toBeUndefined();
  });

  it("forwards private-league auth as a cookie", async () => {
    global.fetch = mockOk({ players: [] });
    await fetchPlayers("2025", "123", { espnS2: "S2", swid: "{SW}" });
    expect(lastHeaders(global.fetch).cookie).toBe("espn_s2=S2; SWID={SW}");
  });

  it("unwraps kona's { players: [{ player }] } shape to bare players", async () => {
    global.fetch = mockOk({
      players: [{ player: { id: 1, fullName: "A" } }, { player: { id: 2 } }, {}],
    });
    const players = await fetchPlayers("2025", "123");
    // The entry without a `.player` is dropped.
    expect(players.map((p) => p.id)).toEqual([1, 2]);
  });
});

describe("espn client errors", () => {
  it("throws EspnApiError with the HTTP status", async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    await expect(fetchLeague("2025", "123")).rejects.toMatchObject({
      name: "EspnApiError",
      status: 401,
    });
    await expect(fetchLeague("2025", "123")).rejects.toBeInstanceOf(
      EspnApiError,
    );
  });
});
