# design

Which design system, principles and tokens quirq should use across its product UI, docs and research hub.

| | |
|---|---|
| Status | Published |
| Owner | suraj |
| Started | 2026-10-06 |
| Last updated | 2026-10-06 |

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
