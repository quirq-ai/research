# design

Which design system, principles and tokens quirq should use across its product UI, docs and research hub.

| | |
|---|---|
| Status | Published |
| Owner | suraj |
| Started | 2026-10-06 |
| Last updated | 2026-10-15 |

Status is one of: Proposed, Researching, Published, Paused, Archived.

## What this topic is

This topic compares public design systems and component libraries and
recommends the design system, principles and tokens (type, colour, spacing,
dark mode) for quirq's product UI, docs and research hub. Purpose and research
action live in [GOAL.md](GOAL.md).

## Research and findings so far

Checked on 2026-10-06 against the sources linked. The full evidence is in
the [report](output/report/2026-10-06-design-systems.md).

- **quirq's infra-map app is built on React 19, Tailwind CSS 4 and shadcn/ui
  on `radix-ui`, and maps the quirq brand onto shadcn's CSS-variable
  tokens, with light and dark values.** Source:
  [infra-map package.json](../infra/output/app/infra-map/package.json),
  [index.css](../infra/output/app/infra-map/src/index.css). Verified: 2026-10-06.
- **The research hub uses its own palette (accent `#2f5bd3`) and a
  system-ui font, so the two surfaces do not share tokens.** Source:
  [present.js](../packages/present/bin/present.js). Verified: 2026-10-06.
- **shadcn/ui, Radix Themes and Primer are MIT-licensed; Carbon is
  Apache-2.0; only the Geist font (SIL OFL 1.1) is public, and
  `@vercel/geistcn` is not on public npm.** Source: each project's LICENSE
  and the npm registry, linked in the report. Verified: 2026-10-06.
- **Carbon is the only one of the five that states a standard: its
  components follow the IBM Accessibility Checklist, "based on WCAG AA".**
  Source: [Carbon accessibility](https://carbondesignsystem.com/guidelines/accessibility/overview/).
  Verified: 2026-10-06.
- **Primer ships 9 colour themes, including colour-blind, tritanopia and
  high-contrast ones, selected with `data-color-mode`.** Source:
  [Primer primitives](https://primer.style/product/primitives/). Verified: 2026-10-06.

### Motion design with Claude

Checked on 2026-10-15 against the sources linked. The evidence is in the
[report](output/report/2026-10-15-prompt-motion.md); the worked example is the
[JSON vs TOML video](output/app/json-vs-toml-video/).

- **Every video in the Prompt Motion gallery is code that draws each frame,
  captured frame by frame; of the 57 entries that name a stack, 24 use plain
  HTML in a headless browser, 13 Remotion, 10 HyperFrames and 5 Three.js.**
  Source: [How motion graphics are made with Claude](output/report/2026-10-15-prompt-motion.md#02-every-video-is-code-captured-frame-by-frame),
  §02. Verified: 2026-10-15.
- **All 234 entries in the gallery on 14 October 2026 name Claude Opus 5.5 as
  their model.** Source: [the report](output/report/2026-10-15-prompt-motion.md#01-what-prompt-motion-is),
  §01. Verified: 2026-10-15.
- **The gallery's best-received prompts share five parts: one concept, a banned
  list, a beat grid, a build method and a review step.** Source: [the
  report](output/report/2026-10-15-prompt-motion.md#03-what-the-best-received-prompts-share),
  §03, from the Prompt Motion blog. Verified: 2026-10-15.
- **Of the gallery's 27 explainer prompts, none asks Claude to check its facts
  and two say who the video is for.** Source: [the
  report](output/report/2026-10-15-prompt-motion.md#04-what-explainer-prompts-leave-out),
  §04, from the Prompt Motion blog. Verified: 2026-10-15.
- **The method can carry a measured result: in the JSON vs TOML video, every
  verdict on screen was measured on the exact bytes shown, through the same 10
  JSON and 10 TOML parsers as the original research.** Source: [the
  app](output/app/json-vs-toml-video/) and its
  [results](output/app/json-vs-toml-video/source/measure/results.json).
  Verified: 2026-10-15.

<!--
Add one bullet per verified finding:
- **Finding in one sentence.** Source: [title](link). Verified: YYYY-MM-DD.
Keep inferences and open questions in the sections below, not here.
-->

### Open questions

- The product repos (xo-space, innernet) were not read, so their stack and
  the source of the "quirq" theme are unverified.
- Which typeface quirq should standardise on.
- Whether to build the shared token stylesheet the report recommends (an
  inference, not a finding).

## Status and progress

- [x] GOAL.md filled in and agreed with the requester
- [x] AGENTS.md filled in
- [x] Research under way
- [x] Findings verified against sources
- [x] Requested outputs published

## Published outputs

| Format | File | Date | Notes |
|---|---|---|---|
| onepager | [2026-10-06-design-systems.md](output/onepager/2026-10-06-design-systems.md) | 2026-10-06 | Short answer and key findings |
| report | [2026-10-06-design-systems.md](output/report/2026-10-06-design-systems.md) | 2026-10-06 | quirq's stack, five design systems compared, recommendation |
| report | [How motion graphics are made with Claude](output/report/2026-10-15-prompt-motion.md) | 2026-10-15 | The Prompt Motion gallery: rendering stacks, what the best prompts share, our counts, and how we applied it |
| onepager | [Motion design with Claude at a glance](output/onepager/2026-10-15-motion-with-claude.md) | 2026-10-15 | Key numbers and what we took from the method |
| app | [JSON vs TOML, in motion](output/app/json-vs-toml-video/) | 2026-10-15 | A 101-second explainer of What the Parser Hears, with its source and measured verdicts |
