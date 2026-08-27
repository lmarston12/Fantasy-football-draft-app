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

- [x] **Easier ESPN sign-in (avoid manual espn_s2 / SWID copy)**

  Done. The private-league section of `ConnectForm.tsx` now takes a single
  pasted cookie blob (full `Cookie:` header, `document.cookie` dump, or a loose
  paste) and auto-extracts `espn_s2` + `SWID` via the pure
  `parseEspnCookies` helper (`src/lib/client/espn-cookies.ts`, unit-tested). It
  also offers a drag-to-bookmarks **cookie-grabber bookmarklet** that copies the
  values off a logged-in ESPN page in one click — with a graceful fallback, since
  ESPN sometimes marks `espn_s2` HttpOnly (unreadable by JS), in which case the
  manual/paste path still works. OAuth stays off the table (no official ESPN
  API). Secret handling is unchanged: read-only, per-request headers, tab-only
  `sessionStorage`, never persisted server-side or logged.

- [ ] **ESPN sign-in polish (no new infra)**

  Small wins on top of the paste + bookmarklet + guide flow, all client-side,
  no change to the secret model. Est. ~1–2 hrs total.
  - **Copy-the-bookmarklet button.** Some users can't drag a `javascript:` link
    to the bookmarks bar (locked-down browsers, mobile). Add a "copy bookmarklet
    code" button next to the drag link so they can create the bookmark manually.
    The bookmarklet source already exists as `ESPN_BOOKMARKLET` in
    `src/components/ConnectForm.tsx`.
  - **Clipboard read shortcut.** Add a "Paste from clipboard" button on the
    cookie textarea that calls `navigator.clipboard.readText()` and runs it
    through `parseEspnCookies` (`src/lib/client/espn-cookies.ts`) — one tap after
    the bookmarklet copies, instead of a manual paste. Feature-detect and hide
    when the API/permission is unavailable.
  - **Parse-state affordance.** Show a small ✓/✗ per field (espn_s2 / SWID) so
    the user can see at a glance which value the paste resolved.

  Note: none of this defeats HttpOnly `espn_s2` — see the extension item below
  for the only reliable "no dev tools at all" path.

- [ ] **ESPN cookies via a browser extension (the real "no dev tools" path)**

  The one clean way to remove dev tools entirely *and* handle an HttpOnly
  `espn_s2` (which a bookmarklet/`document.cookie` cannot read). A tiny
  extension with the `cookies` permission for `espn.com` reads both `espn_s2`
  and `SWID` and hands them to the app.

  **Sketch:**
  - Manifest V3 extension, host permission `https://*.espn.com/*`, permission
    `cookies`. A single action/popup button "Send my ESPN cookies to Draft
    Assistant".
  - On click, `chrome.cookies.get({url, name})` for `espn_s2` and `SWID`, then
    hand off to the app. Handoff options, cleanest first:
    - deep link the app with the values in a **fragment** (`#…`, never a query —
      keep them out of server logs/history), app reads `location.hash` and
      clears it immediately; or
    - `window.postMessage` if the app tab is already open.
  - App side: a small receiver that drops the values straight into the existing
    `espnS2`/`swid` state — no new storage layer; still tab-only `sessionStorage`
    afterward.

  **Cost / trade-offs:** build ~1 day; then Chrome Web Store + Firefox AMO
  review and publishing; cross-browser + manifest upkeep when ESPN or store
  policy shifts. **Only worth it if ESPN private-league users are a meaningful
  share of the audience** — for personal/small use the paste + guide flow is the
  right cost/benefit. Keep every secret guarantee: read-only, per-request,
  tab-only, never persisted server-side, never logged, never in a query string.

  **Rejected alternative — server-side login proxy.** Having the user type their
  ESPN email/password into our app and driving a headless browser (Playwright)
  to capture cookies server-side would also remove dev tools, but it breaks the
  app's core "no server-side secrets" promise, means handling a user's ESPN
  password, and is brittle against ESPN's Disney OneID login + CAPTCHA + MFA and
  bot detection. High effort, high risk, security regression — **do not pursue.**

- [x] **Replace the default Vercel/Next favicon**

  Done. Replaced the stock `favicon.ico` with a football-brown badge and an
  "FF" monogram + lace stitch, legible from 16px up. `src/app/icon.tsx` and
  `src/app/apple-icon.tsx` generate the modern `<link rel="icon">` / iOS
  home-screen variants at request time via `next/og`'s `ImageResponse`
  (Next.js statically caches these); `src/app/favicon.ico` was regenerated
  as a real multi-size (16/32/48) PNG-format `.ico` for the legacy
  `/favicon.ico` request every browser makes regardless of the generated tag.

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
