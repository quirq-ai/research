# Agent instructions: design

Read the root [AGENTS.md](../AGENTS.md) first. This file adds instructions for
this topic only.

## What to research

1. Record quirq's current stack and UI from the repos (for example, the
   `infra` app in this repo is built on shadcn/ui), with the file each fact
   comes from.
2. Pick 4 to 6 public design systems or component libraries and record why
   each was picked.
3. For each, record its components, tokens (type, colour, spacing), dark mode
   support, licence and fit with quirq's stack, each from its official docs
   or source.
4. Record how comparable developer-tool companies handle design, from their
   own public design system sites.
5. Compare the options and recommend one, keeping the recommendation apart
   from the sourced facts.

## Sources

**Prefer:** official design system sites and docs, their source repos at a
recorded commit or release, and quirq's own repos.

**Avoid:** blog roundups, "top 10" lists and other secondhand summaries.

## How to verify

- Open every source and confirm it says what the finding claims.
- Reproduce numbers where possible; otherwise quote them with their source.
- Record the version or commit of each design system you describe.
- Licence claims cite the project's LICENSE file.

## Publishing

Follow steps 5 to 8 of the root [AGENTS.md](../AGENTS.md): publish only into
the formats ticked in [GOAL.md](GOAL.md), then update [README.md](README.md)
and run `npm run topics` at the repo root.

## Topic-specific notes

- The JSON vs TOML video in `output/app/json-vs-toml-video/` is built from its
  `source/`: change the page there, render stills with `render.mjs beats` and
  look at them before rendering the full video, then copy the MP4 into `site/`.
- Every verdict in the video comes from `source/measure/results.json`; never
  edit a number in `source/data.js` by hand.
- Prompt Motion counts in the motion report come from `scrape.py` and
  `stats.py` beside the report; the gallery grows, so re-running them gives new
  numbers that need a new dated report.
