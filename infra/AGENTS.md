# Agent instructions: infra

Read the root [AGENTS.md](../AGENTS.md) first. This file adds instructions for
this topic only.

## What to research

1. For each infra repo, read its README, pins and source at the current main
   commit and record the commit.
2. Record which repos it uses (from pins and README) and what it does to the
   product repos.
3. Record what is live and what is not yet, as the repo itself states it.
4. Update the app's data: `output/app/infra-map/src/repos.ts` for the map and
   `output/app/infra-map/src/pages/<repo>.json` for each repo page.

## Sources

**Prefer:** the repos themselves at a recorded commit
(github.com/quirq-ai/<repo>), and live repository settings read through the
GitHub API.

**Avoid:** chat summaries, plans and memory notes; they go stale. A claim the
code does not back stays out.

## How to verify

- Open every source and confirm it says what the finding claims.
- Reproduce numbers where possible; otherwise quote them with their source.
- Every `source` path in a page JSON exists at that page's `sha`.
- Every edge in `repos.ts` is backed by a pin or a README line in the `from`
  repo.
- Commands shown on a page contain no `#` comments (they break zsh pastes).
- `npm run build` passes in `output/app/infra-map/`.

## How to put results into output/

1. Check "Requested outputs" in [GOAL.md](GOAL.md). Publish only into the
   ticked formats.
2. Write to the matching folder:
   - onepager: `output/onepager/`
   - slide: `output/slide/`
   - report: `output/report/`
   - app: `output/app/<app-name>/`
3. Name files `YYYY-MM-DD-<short-name>.<ext>`.
4. Follow the README in each format folder.
5. List sources in every output.

## After publishing

Update [README.md](README.md): findings so far, status, progress checklist,
published outputs table and "Last updated". Then update this topic's row in the
root README Topics table.

## Topic-specific notes

- The app is built from shadcn/ui components (copied from shadcn-ui/ui
  `apps/v4/registry/new-york-v4/ui`). Keep new UI on shadcn components.
- The repos move quickly. When refreshing, bump each page's `sha` and the
  `SOURCES` list in `src/App.tsx` together.
