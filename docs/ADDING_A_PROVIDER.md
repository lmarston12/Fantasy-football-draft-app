# Adding a draft provider (e.g. ESPN or Yahoo)

The app talks to fantasy platforms only through the `DraftProvider` interface
in [`src/lib/providers/types.ts`](../src/lib/providers/types.ts). Sleeper and
ESPN are implemented today. Adding another platform is a self-contained task:
implement the interface, normalize that platform's data into the shared domain
types, and register it — the API routes are already generic.

## Wiring (already generalized)

The route tree is `src/app/api/[provider]/**`; each handler resolves the
concrete adapter via `getProvider(name)` in
[`src/lib/providers/registry.ts`](../src/lib/providers/registry.ts). So adding a
provider needs **no route changes** — implement the adapter and add one line to
the registry map. The browser client
([`src/lib/client/api.ts`](../src/lib/client/api.ts)) takes the provider as its
first argument and builds `/api/<provider>/…`.

Providers that need per-request credentials (ESPN private leagues) accept an
optional `ProviderAuth`; the client sends it as request **headers** (never query
params), the route reads it via `authFromHeaders`, and the adapter forwards it
to the platform. Nothing is persisted or logged.

## Steps

1. **Create the adapter.** Add `src/lib/providers/<platform>/` with:
   - `client.ts` — thin fetch wrappers over the platform's endpoints.
   - `adapter.ts` — a class implementing `DraftProvider`, converting raw
     responses into `LeagueSettings`, `Team`, `DraftInfo`, `DraftPick`, and
     `NormalizedPlayer`.
   - `scoring.ts` — map the platform's scoring config into `ScoringSettings`.

2. **Normalize thoroughly.** The engine assumes:
   - `NormalizedPlayer.position` is one of the supported positions or `null`.
   - `NormalizedPlayer.searchRank` is a consensus rank (lower = better), or
     `null` if the platform has none — in which case importing a rankings CSV
     becomes the practical way to rank.
   - `LeagueSettings.rosterSlots` uses the shared `SlotType`s; map exotic
     slots to `BENCH` if they don't affect starting-lineup math.

3. **Register it.** Add your provider to the map in
   `src/lib/providers/registry.ts`. The generic `/api/[provider]/**` routes and
   the `provider`-aware browser client pick it up automatically — keep the
   returned shapes identical so the UI is unchanged.

4. **Add fixtures + tests.** Mirror `src/lib/testing/fixtures.ts` with a
   couple of real (anonymized) payloads and assert your adapter normalizes
   them correctly.

## ESPN specifics

> **Implemented** — see [`src/lib/providers/espn/`](../src/lib/providers/espn/).
> ESPN uses a composite league reference `"{season}-{leagueId}"` as both its
> `leagueId` and `draftId` (it has no separate draft entity), and its player
> catalog is fetched from the public season-level endpoint. The notes below
> record the design constraints.

ESPN has **no official public API**. Integrations use an *unofficial*,
undocumented endpoint (`lm-api-reads.fantasy.espn.com` /
`fantasy.espn.com/apis/v3/...`). Practical caveats to design around and to
surface in the UI:

- **Private leagues need cookies.** For a private league the user must copy
  their `espn_s2` and `SWID` cookies from a logged-in browser session; the
  adapter sends them as request cookies. Public leagues need none. Treat these
  as secrets: accept them at request time, never log them, and don't persist
  them server-side.
- **It can break without notice.** Because the API is unofficial, ESPN can
  change field names or shapes at any time. Isolate all of that fragility in
  the adapter and fail gracefully.
- **Still free.** No paid tier is required — but the cookie step and the
  fragility are the trade-offs versus Sleeper's clean public API. Say so in
  the connect flow so users aren't surprised.

Yahoo, by contrast, has an *official* API but requires registering a developer
app and OAuth login — free, but with more setup friction. The same adapter
pattern applies.
