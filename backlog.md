# Backlog

Bugs and improvements not needed for the initial working deploy. Rough
priority order; check items off as they land.

## High priority

- [ ] **Direct GitHub push + auto-deploy loop (Claude → GitHub → Vercel)**

  Right now Claude can't push to this repo — the claude.ai GitHub connector
  only grants *read* access; writing requires a GitHub App installed on the
  repo with write permission, which isn't set up yet (see
  `github.com/settings/installations` — no Claude/Anthropic app listed).
  Full root-cause writeup:
  https://claude.ai/code/artifact/a3196e38-ecd7-4b52-a4c5-683e9b4ba84a

  The Vercel side is likely already solved: this project was imported
  straight from the GitHub repo, and Vercel auto-deploys on every push to
  `main` for GitHub-connected projects by default. Worth confirming (push a
  trivial change and watch the Vercel dashboard for a new deployment) rather
  than assuming — but the missing piece is almost certainly just Claude's
  GitHub write access, not Vercel's side of the hook.

  **Done when:** Claude can `git push` to this repo directly (no manual
  zip/local-terminal round trip), and that push shows up as a new Vercel
  deployment without any manual step in between.

## Improvements

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
