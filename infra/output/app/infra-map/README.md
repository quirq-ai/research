# infra-map

An interactive map of the 13 quirq infra (qq) repos, with a page for each
repo, and the checklist for the qq alpha.

## What it shows

- **Map:** the 13 repos in four stages (your machine, before landing, after
  landing, shipping), with arrows from each repo to the repos it uses. Tap a
  repo to light up its links, then open its page. **Follow a change** walks
  one PR through the system in 9 steps.
- **All repos:** the same repos as a list, with the Chromium piece each one is
  modelled on.
- **A page per repo** (`#repo/<name>`, for example `#repo/gardener`): what it
  is, where it sits on the map, its links to other repos, how it works, key
  files, how to try it, and its status and limits. Each "How it works", key
  file, "Try it" and status item links the file it comes from at a recorded
  commit; the summary, badges and link list rest on the same READMEs and pins.
- **Alpha checklist:** the steps an alpha user follows, from installing qq to
  seeing their change ship in the daily canary. Each step has a copyable
  command where there is one and buttons that explain the outcomes they may
  hit. The two commands are `src/commands/setup.sh` and
  `src/commands/get-repo.sh`, imported raw so the page shows the tested text.
- **Before alpha:** what the team finishes before anyone is invited,
  including the canary setup. Ticks on both checklists are kept in the
  viewer's browser only.
- **Commands and terms:** the qq commands, a glossary and the known limits.

It supports the topic's findings in [../../../README.md](../../../README.md).

## Sources

- The map's links: `src/repos.ts`, from each repo's pinned dependencies
  (pyproject.toml, pins.toml) and README.
- Each repo page: `src/pages/<repo>.json`. Its `sha` is the commit it was
  written from, and every item names its `source` file.
- The commits checked are listed in the app's footer (`SOURCES` in
  `src/App.tsx`), all from 5 October 2026.

## Requirements

- Node.js 22 or newer, with npm.
- Exact dependency versions are pinned in `package.json` and in the
  repo root's `package-lock.json` (this app is an npm workspace).

The UI is built from [shadcn/ui](https://ui.shadcn.com) components, copied
from `apps/v4/registry/new-york-v4/ui` in shadcn-ui/ui into
`src/components/ui/` at commit 295a1f114a138f23b5dfee0e0c6812394dfeb90c and used
under the MIT licence, whose notice is in `src/components/ui/LICENSE`. The page
uses the system font stack and loads nothing from third parties. No API keys or
environment variables are needed.

## Setup

From the repo root:

```sh
npm ci
```

## Run

From this folder:

```sh
npm run dev
```

Open the address it prints (normally http://localhost:5173).

To build a static site instead, run `npm run build` (output in `dist/`, serve
it with any static server) or `npm run build:single` (one
self-contained `dist/index.html` you can open straight from disk).

On the research hub this app is the `infra` topic, at `/infra/`:
`infra/package.json` builds it and copies its `dist/` into `infra/dist/`.

## What you should see

A page titled "How quirq infra fits together" with five tabs: Map, All
repos, Alpha checklist, Before alpha, and Commands and terms. On the map, tapping **gardener** lights up
gardener, test-pipelines, infra-config, release and the product repos box,
and the card below the
map shows an **Open the gardener page** button. That page lists gardener's
key files, each linking to github.com/quirq-ai/gardener at commit
bf7d24d0fd81.
