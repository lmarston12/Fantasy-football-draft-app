# Architecture

## Goals

- **Free & serverless-friendly.** No database, no paid APIs. State is fetched
  live from Sleeper; the browser only remembers which league/draft/team you
  picked (via the URL).
- **Runs the same locally and on Vercel.** Next.js App Router API routes are
  serverless functions on Vercel and plain routes locally — no code changes
  to deploy.
- **Provider-agnostic core.** The ranking engine and UI depend only on
  normalized domain types, never on Sleeper's raw shapes.

## Data flow

```
Browser (React)                Next.js API routes            Sleeper API
──────────────                 ──────────────────            ───────────
ConnectForm ───────────────▶  /api/sleeper/user/[name] ───▶  /user/{name}
                              /api/sleeper/leagues/... ───▶  /user/{id}/leagues/...
                              /api/sleeper/league/... ────▶  /league/{id}(+/rosters,/users)

DraftBoard page:
  useLeagueData ───────────▶  /api/sleeper/draft/[id] ────▶  /draft/{id}
                              /api/sleeper/league/[id] ───▶  /league/{id}
                              /api/sleeper/players ───────▶  /players/nfl   (cached ~1h)
  useDraftPolling (5s) ────▶  /api/sleeper/draft/[id]/picks ▶ /draft/{id}/picks
```

Why route Sleeper calls through our own API layer instead of calling Sleeper
from the browser:

1. **Caching.** The player catalog (`/players/nfl`) is ~5MB. The
   `/api/sleeper/players` route caches the normalized result in memory
   (`src/lib/cache.ts`) so we fetch it at most once per hour per warm server
   instance.
2. **Normalization boundary.** Route handlers return the app's domain types
   (`LeagueSettings`, `DraftPick`, `NormalizedPlayer`, …), so the client and
   the ranking engine never see Sleeper-specific JSON.
3. **Future providers.** Swapping/adding a provider is a server-side change;
   the browser contract stays the same.

## Layers

| Layer | Path | Responsibility |
| ----- | ---- | -------------- |
| Provider | `src/lib/providers/` | `DraftProvider` interface + `sleeper/` adapter that normalizes raw Sleeper JSON |
| API routes | `src/app/api/sleeper/**` | Thin serverless proxies; error handling + catalog caching |
| Engine | `src/lib/rankings/` | Rank-based VBD, tiers, recommendation scoring, CSV import |
| Needs | `src/lib/draft/needs.ts` | Positional demand + open-slot / surplus computation |
| Client data | `src/lib/client/`, `src/hooks/` | Typed fetch client + load/poll hooks |
| UI | `src/components/`, `src/app/` | Draft board and connect flow |

## Key decisions

- **No database / no auth.** Everything needed is public and read-only.
  Selections live in the URL (`/draft/{id}?league={id}&roster={rosterId}`) so
  the board is shareable and refresh-safe.
- **Polling over websockets.** Sleeper exposes no public realtime feed. The
  poller runs only while `draft.status === "drafting"` and pauses on hidden
  tabs to respect rate limits.
- **Pure, testable core.** `needs.ts`, `rankings/engine.ts`, and
  `rankings/csv.ts` are pure functions covered by Vitest
  (`src/**/*.test.ts`), so the logic that actually drives picks can be
  verified without the network.
