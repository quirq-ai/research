# infra-map

An interactive map of the 13 quirq infra (qq) repos, with a page for each
repo.

## What it shows

- **Map:** the 13 repos in four stages (your machine, before landing, after
  landing, shipping), with arrows from each repo to the repos it uses. Tap a
  repo to light up its links, then open its page. **Follow a change** walks
  one PR through the system in 9 steps.
- **All repos:** the same repos as a list, with the Chromium piece each one is
  modelled on.
- **A page per repo** (`#repo/<name>`, for example `#repo/gardener`): what it
  is, where it sits on the map, its links to other repos, how it works, key
  files, how to try it, and its status and limits. Every claim links to the
  file it comes from, at a recorded commit.
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
- Exact dependency versions are pinned in `package.json` and
  `package-lock.json`.

The UI is built from [shadcn/ui](https://ui.shadcn.com) components, copied
from `apps/v4/registry/new-york-v4/ui` in shadcn-ui/ui into
`src/components/ui/`. No API keys or environment variables are needed.

## Setup

From this folder:

```sh
npm ci
```

## Run

```sh
npm run dev
```

Open the address it prints (normally http://localhost:5173).

To build a static site instead, run `npm run build` (output in `dist/`, serve
it with any static server) or `npm run build:single` (one self-contained
`dist/index.html` you can open straight from disk).

## What you should see

A page titled "How quirq infra fits together" with three tabs: Map, All
repos, and Commands and terms. On the map, tapping **gardener** lights up
gardener, test-pipelines, infra-config and release, and the card below the
map shows an **Open the gardener page** button. That page lists gardener's
key files, each linking to github.com/quirq-ai/gardener at commit
bf7d24d0fd81.
