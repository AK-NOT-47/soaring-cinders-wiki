# AGENTS.md

Guidance for AI agents working in this repository. Keep it short; add a rule
only when an agent could not have inferred it from the code.

## What this repo is

The **published static build** of the Soaring Cinders lore wiki — plain HTML,
one CSS file, three JS files. No build step, no package manager, no tests, no
dependencies. Deployed to GitHub Pages from the repo root.

**The content is generated upstream.** Pages are built from the team's private
design-docs repository and synced here. This repo is an artifact, not a source
tree.

## Hard invariants

- **Never hand-author or hand-edit lore prose in `*.html`.** Wording, facts,
  dates, and `Design history` sections come from the upstream generator; edits
  here are silently overwritten on the next sync. If a page's content is wrong,
  report it — do not patch it. Presentation-layer work (`assets/*`, and the
  mechanical page changes that a template change implies) is fair game.
- **Every fact on a page carries the date it was decided**, and each page ends
  with a `Design history`. Never add a claim without a date, and never delete a
  date or a history entry.
- **The three indexes must stay in sync with the pages on disk.**
  `assets/search-index.js` (`window.SEARCH_INDEX`) and
  `assets/preview-index.js` (`window.PREVIEW_INDEX`, keyed by page slug) must
  cover every non-index page. Adding, removing, or renaming a page without
  updating both breaks search and hover previews.
- **Asset URLs are cache-busted with a single shared hash**: every
  `assets/…?v=<hash>` across all 237 HTML files uses the same value. If you
  change any file in `assets/`, update the hash **everywhere** in one pass —
  a partial update ships a mixed, broken build.
  ```sh
  grep -rho '?v=[0-9a-f]*' --include='*.html' . | sort -u   # must print one line
  ```
- **Page counts are asserted in the UI** — the home hero stats and the `.cnt`
  badges in every sidebar. Adding or removing a page means updating them.
- **Keep `.nojekyll`.** Without it Pages runs Jekyll and drops paths that begin
  with an underscore.
- **Theme is night-first.** The inline `<head>` script reads
  `localStorage['sc-wiki-theme']` (`day` | `night`) and sets
  `document.documentElement.dataset.theme` before first paint. It must stay
  inline, in `<head>`, and wrapped in `try/catch` — moving or deferring it
  causes a flash of the wrong theme; both themes must remain legible.
- **Relative links only.** Root pages link `assets/…`, namespace pages link
  `../assets/…`. Nothing may hardcode the `github.io` origin.

## Layout

`index.html` + nine namespace directories, each with its own `index.html`:
`world`, `characters`, `locations`, `story`, `bestiary`, `items`, `magic`,
`systems`, `development`. Shared UI lives in `assets/`.

## CI and deploys

`.github/workflows/deploy-pages.yml` uploads the repo root and deploys to Pages
on every push to `main`. There is no test or lint job, so **nothing catches a
broken page for you** — verify locally before pushing:

```sh
python3 -m http.server 8000   # then load a namespace page, not just /
```

Check search, hover previews, both themes, and the mobile nav. Do not widen the
workflow's `permissions:` block, remove its `concurrency: pages` guard, or add
steps that fetch or execute code from outside the repo.

## Conventions

- Work on the branch you were assigned; never push to `main`.
- Match the surrounding HTML exactly — it is generator output: minified-ish,
  long single lines, `<!doctype html>` lowercase. Do not reformat or
  pretty-print files you are otherwise not changing; a whitespace-only reflow
  produces an unreviewable diff.
- Keep pages dependency-free. The only external resource is the Google Fonts
  stylesheet already in each `<head>`; do not add CDN scripts or trackers.
- Commit messages follow the existing log: `Sync: …` for upstream content
  pulls, Conventional Commits (`fix:`, `ci:`, `chore:`) for everything else.
