# Fantasy Draft Assistant

A small, free web app that connects to your **Sleeper** or **ESPN** fantasy
football league and recommends the best available player during your live
draft — aware of your league's scoring, roster construction, who's already been
drafted, and your own team's needs.

- **Live draft board** that auto-refreshes as picks come in.
- **Scarcity-aware value (VBD)** computed from your league's actual roster
  settings, not a generic default.
- **Roster-need & handcuff logic** — recommendations shift toward your open
  starting slots, then toward depth/handcuffs once your starters are set.
- **Bring your own rankings** — import a CSV to override the built-in
  baseline; the same value math runs on top of your ranks.

> **Cost:** Free, end to end. Sleeper's read API needs no key and no login,
> and the app runs locally or on a free hosting tier. See
> [Cost & limitations](#cost--limitations).

---

## Quick start (local)

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Open <http://localhost:3000> and pick your platform:

- **Sleeper:** enter your username, pick your league and team. No password ever
  — the app only reads public Sleeper data.
- **ESPN:** enter your league ID and season. Public leagues need nothing more;
  private leagues need your `espn_s2` and `SWID` cookies (copied from a
  logged-in ESPN browser session) — used read-only, sent only with your
  requests, and never stored on the server.

### Other commands

```bash
npm run lint     # ESLint
npm test         # Vitest unit tests (ranking engine, needs, CSV parsing)
npm run build    # Production build (also full type-check)
```

---

## Deploying to Vercel (free tier)

The app is a standard Next.js App Router project, so its API routes become
serverless functions automatically — no code changes needed to deploy.

1. Push this repo to GitHub.
2. Import it at <https://vercel.com/new> and accept the defaults (Vercel
   detects Next.js).
3. Deploy. The free **Hobby** plan is sufficient for personal use.

No environment variables are required. (`SLEEPER_BASE_URL` exists only so
tests can point at a mock; leave it unset in production.)

---

## How the recommendations work

The engine uses rank-based **Value Over Replacement** (VBD):

1. **Base rank** for each player = your imported custom rank if provided,
   otherwise Sleeper's consensus `search_rank`.
2. **Replacement level** per position is derived from your league's real
   roster construction — dedicated slots plus a proportional share of each
   flex slot, times the number of teams. Deeper starting requirements push
   replacement deeper and make that position scarcer.
3. **Value (VOR)** = how many positional ranks a player sits *above* their
   position's replacement level. This is what the **Best available** view
   sorts by.
4. **Recommendation ("For you")** adjusts value for your roster: a bonus for
   filling an open starting slot, a penalty for a position you've already
   stocked, and a handcuff bonus (same NFL team + position as a player you
   own) once your starting lineup is essentially full.

Each row shows the reasoning ("+18 value over replacement RB", "Fills an open
starting slot", "Handcuff for your SF RB") so you can trust or overrule it.

### Importing your own rankings

Open **Custom rankings** in the left rail and upload a CSV. Recognized
columns (header row optional, case-insensitive):

```csv
rank,player,pos,team
1,Christian McCaffrey,RB,SF
2,Ja'Marr Chase,WR,CIN
```

- A headerless file is read as `rank,name`.
- Names are matched fuzzily (punctuation/suffixes ignored); a `pos` column
  disambiguates duplicate names. The import summary reports how many rows
  matched and lists any that didn't.

---

## Cost & limitations

**Free:** Sleeper's public API (leagues, rosters, drafts, player catalog) is
free and unauthenticated. Hosting fits Vercel's free tier. Nothing here
requires a paid service. If that ever changes, it will be called out
explicitly rather than added silently.

**Limitations to be aware of:**

- **Sleeper and ESPN.** Both sit behind one provider interface; Yahoo can be
  added the same way — see
  [`docs/ADDING_A_PROVIDER.md`](docs/ADDING_A_PROVIDER.md). ESPN has no official
  API, so the ESPN path uses their unofficial read endpoints and can break if
  ESPN changes them. Private ESPN leagues need your `espn_s2`/`SWID` cookies
  (used read-only, per request, never stored); public leagues need nothing. ESPN
  offers no reliable consensus rank, so import a rankings CSV for ESPN drafts.
- **Rankings, not projections.** The engine ranks value from Sleeper's
  consensus rank (or your CSV) and your league settings. It is a strong,
  transparent heuristic — not a paid expert projection model. Import your own
  rankings if you trust a particular source more.
- **Offensive + K/DEF scoring.** IDP/defensive-player slots are treated as
  bench for lineup math and aren't ranked in v1.
- **Polling, not push.** The live board polls Sleeper every few seconds
  (Sleeper offers no public websocket) and pauses when the tab is hidden.

---

## Project layout

```
src/
  app/                     # Next.js App Router pages + API routes
    api/[provider]/**      # Server-side proxy (Sleeper/ESPN; caches catalog)
    draft/[draftId]/       # The live draft board page
  components/              # UI (draft board, tables, panels, CSV import)
  hooks/                   # useLeagueData, useDraftPolling
  lib/
    providers/             # DraftProvider interface + Sleeper/ESPN adapters + registry
    rankings/              # VBD engine + CSV import
    draft/                 # roster-needs logic
    cache.ts               # in-memory TTL cache for the player catalog
docs/                      # architecture + how to add a provider
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data flow.
