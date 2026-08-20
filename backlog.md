# Backlog

Bugs and improvements not needed for the initial working deploy. Rough
priority order; check items off as they land.

## High priority

- [x] **Direct GitHub push + auto-deploy loop (Claude Code Desktop → GitHub → Vercel)**

  Claude Code Desktop pushes to this repo fine using local git credentials —
  no GitHub App needed for this path. Vercel auto-deploys on every push to
  `main` for GitHub-connected projects by default, confirmed working.

- [ ] **Direct GitHub push access from cloud/browser Claude Code (claude.ai)**

  Cloud/browser Claude Code sessions (claude.ai) still can't push to this
  repo — the claude.ai GitHub connector only grants *read* access; writing
  requires a GitHub App installed on the repo with write permission, which
  isn't set up yet (see `github.com/settings/installations` — no
  Claude/Anthropic app listed). Full root-cause writeup:
  https://claude.ai/code/artifact/a3196e38-ecd7-4b52-a4c5-683e9b4ba84a

  Note: this only affects the claude.ai/browser path. Claude Code Desktop
  already has direct push access via local git credentials (see above).

  **Done when:** a cloud/browser Claude Code session can `git push` to this
  repo directly (no manual zip/local-terminal round trip), and that push
  shows up as a new Vercel deployment without any manual step in between.

## Improvements

- [x] **Add support for ESPN leagues (not just Sleeper)**

  Done. Added an ESPN adapter behind the existing `DraftProvider` interface and
  generalized the API route tree from `/api/sleeper/*` to `/api/[provider]/*`
  (registry in `src/lib/providers/registry.ts`). The connect form now has a
  Sleeper | ESPN toggle; ESPN users enter a league ID + season, with optional
  `espn_s2`/`SWID` cookies for private leagues (sent per-request, kept only in
  tab `sessionStorage`, never persisted server-side or logged). ESPN has no
  reliable consensus rank, so the CSV rankings import is the fallback there.

- [x] **Platform toggle showed "Espn" instead of "ESPN"**

  The connect-form platform toggle title-cased the provider name via a
  `capitalize` class, rendering the ESPN initialism as "Espn". Fixed with an
  explicit `PROVIDER_LABEL` map in `src/components/ConnectForm.tsx`.

- [ ] **Easier ESPN sign-in (avoid manual espn_s2 / SWID copy)**

  Private ESPN leagues currently require the user to open browser dev tools and
  hand-copy the `espn_s2` and `SWID` cookies. That's the biggest friction point
  in the ESPN flow. Explore a smoother path, e.g.:
  - A guided helper with screenshots / a bookmarklet that surfaces the two
    cookie values in one click.
  - An ESPN OAuth / official login flow if one becomes viable (ESPN has no
    official fantasy API today, so this may not be possible).
  - Accepting a full pasted `Cookie` header and parsing the two values out.

  Keep the same secret-handling guarantees: read-only, per-request, tab-only
  storage, never persisted server-side or logged.

- [ ] **Replace the default Vercel/Next favicon**

  App still ships the stock framework favicon. Add a real icon so browser tabs
  and bookmarks don't read as a generic scaffold. (`src/app/favicon.ico` /
  `icon` metadata.)

- [ ] **Modernize the UI**

  Current UI (cards, chips, a plain data table) reads as generic
  "AI-app-generated" — the same component patterns show up across other AI
  tools rather than something purpose-built for a live draft. Needs a real
  design pass, not just polish. Candidate directions to consider:
  - A visual identity specific to *drafting* (fast-scan, high data density,
    live/urgent feel) rather than a generic dashboard look.
  - Tighter information density in `AvailablePlayersTable` — this is the
    component someone stares at during a live draft; every extra pixel of
    whitespace costs scan speed.
  - A more distinctive type/color system instead of default Tailwind
    zinc/emerald.
  - Revisit `DraftBoard`'s two-column layout for something that reads more
    "live tool" than "settings page."

  Scope this as an actual design pass (reference: `artifact-design`-style
  process — pick a palette/type/layout on purpose, not a template) rather
  than incremental tweaks.

- [ ] **Cleaner deploy URL**

  Current URL has a random suffix (`ff-draft-app-eosin.vercel.app`) from
  Vercel auto-disambiguating a name collision. No code change needed —
  in the Vercel dashboard: Project → Settings → Domains, try assigning a
  cleaner `*.vercel.app` subdomain directly (renaming the project alone
  doesn't always update the domain). A real custom domain is a paid
  add-on depending on registrar cost, not a Vercel fee — flag actual cost
  if the user wants to go that route rather than a `*.vercel.app` domain.

## Cleanup

- [ ] **Delete stale Vercel projects**

  Failed import attempts during initial setup left behind empty project
  shells that still hold their names:
  - `fantasy-football-draft-app`
  - `ff-draft-assistant`

  Neither has a real deployment. Delete both: open each in the Vercel
  dashboard → Settings → scroll to bottom → Delete Project. Frees the
  names up and de-clutters the project list. No cost either way (Hobby
  tier), purely tidiness.
