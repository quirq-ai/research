# Design systems for quirq in one page

One-pager, 2026-10-06. Requested by suraj. Full write-up:
[design systems report](../report/2026-10-06-design-systems.md).

**Question.** Which design system, principles and tokens should quirq use
across its product UI, docs and research hub? How do comparable
developer-tool companies handle design?

**Short answer.** quirq already builds on shadcn/ui and Radix with Tailwind
and CSS-variable tokens, and that is the strongest fit. The gap is
consistency: the research hub uses a separate palette. The recommendation,
which is an inference rather than a sourced finding, is to make the quirq
palette in the infra-map app the one token set and apply it to the hub. The
target is WCAG 2.1 AA contrast, which Carbon states for its own themes.

## Key findings

1. **quirq's stack.** The infra-map app is built on React 19, Tailwind CSS 4
   and shadcn/ui on `radix-ui`. It maps the quirq brand (primary
   `#b0478c`) onto shadcn's CSS variables, with light and dark values.
   ([package.json](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/infra/output/app/infra-map/package.json),
   [index.css](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/infra/output/app/infra-map/src/index.css))
2. **Two palettes.** The research hub uses its own accent (`#2f5bd3`) and a
   system-ui font, so quirq's surfaces do not share tokens yet.
   ([present.js](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/packages/present/bin/present.js#L100-L117))
3. **Open options.**
   - shadcn/ui (MIT): copy-in components, CSS-variable tokens, a `.dark`
     selector.
   - Radix Themes (MIT, 3.3.0): pre-styled, built on Radix Primitives.
   - Primer (MIT): GitHub's system, with 9 themes including colour-blind and
     high-contrast ones.
   - Carbon (Apache-2.0): IBM's system. Its components follow the IBM
     Accessibility Checklist, "based on WCAG AA".

   ([shadcn theming](https://ui.shadcn.com/docs/theming),
   [Radix Themes](https://www.radix-ui.com/themes/docs/overview/getting-started),
   [Primer primitives](https://primer.style/product/primitives/),
   [Carbon accessibility](https://carbondesignsystem.com/guidelines/accessibility/overview/))
4. **How others handle it.**
   - GitHub, IBM and Vercel each run their own named system and define
     colour as named tokens.
   - Vercel publishes Geist's guidance and its font (SIL OFL), but its
     component package `@vercel/geistcn` is not on public npm.

   ([Geist](https://vercel.com/geist/introduction),
   [Geist font](https://vercel.com/font))

## Open questions

- The product repos (xo-space, innernet) were not read, so the source of the
  quirq theme is unverified.
- Which typeface to standardise on.

## Sources

All sources were checked on 2026-10-06. The full list is in the
[report's references](../report/2026-10-06-design-systems.md#references).
