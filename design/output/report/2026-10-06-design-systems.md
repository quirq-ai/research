# Design systems for quirq

Report, 2026-10-06. Requested by suraj.

## Question and context

Which design system should quirq's product UI, docs and research hub use,
and which principles and tokens should they share? This report also looks at
how comparable developer-tool companies handle design. Scope and questions
are in [GOAL.md](../../GOAL.md).

## Method

1. Read quirq's own UI code in this repo at commit `1beb404`: the infra-map
   app and the hub builder, `packages/present`. The product repos (xo-space,
   innernet) were not read. They are outside this research's access.
2. Picked five public design systems:
   - **shadcn/ui and Radix Themes**, because quirq already uses shadcn/ui
     and Radix.
   - **GitHub Primer, IBM Carbon and Vercel Geist**, as design systems run by
     developer-tool and platform companies.
3. For each system, read its official docs, its LICENSE file and its
   `package.json` on the default branch, all on 2026-10-06. Every licence,
   version and import below was re-fetched and checked against the file.

## Findings

### quirq today

- **The infra-map app is built on React 19, Vite 8 and Tailwind CSS 4, with
  shadcn/ui components on the `radix-ui` package.**
  Source: [package.json](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/infra/output/app/infra-map/package.json),
  [components/ui/LICENSE](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/infra/output/app/infra-map/src/components/ui/LICENSE)
  (copied from shadcn/ui `new-york-v4` at commit `295a1f1`).
- **The app maps the quirq brand onto shadcn's CSS-variable tokens, with
  light and dark values.** Its primary colour is `#b0478c` in light mode and
  `#f2a2d5` in dark mode. Dark mode follows the OS setting unless
  `data-theme` on `<html>` overrides it. The CSS comment names the source
  palette as the "xo-space \"quirq\" theme".
  Source: [index.css](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/infra/output/app/infra-map/src/index.css).
- **The research hub uses a different palette and font.** Its accent is
  `#2f5bd3`, it uses a system-ui font, and dark mode follows only the OS
  setting.
  Source: [present.js, lines 100–117](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/packages/present/bin/present.js#L100-L117).
  So two quirq surfaces in the same repo do not share tokens yet.

### The five design systems

| System | What it is | Licence | Version (default branch) | Tech | Tokens | Dark mode |
|---|---|---|---|---|---|---|
| shadcn/ui | Copy-in components. "This is not a component library. It is how you build your component library." | MIT | `shadcn` CLI 4.21.3 | React + Tailwind. The registry dialog imports from `radix-ui`; the docs also offer Base UI and React Aria bases | CSS variables ("We use and recommend CSS variables for theming"), OKLCH defaults | "overriding the same tokens inside a `.dark` selector" |
| Radix Themes | "a pre-styled component library" built on Radix Primitives | MIT (WorkOS) | `@radix-ui/themes` 3.3.0 | React 16.8–19 | CSS variables, e.g. `--space-1`, `--font-size-1` | `appearance` prop on `Theme` |
| GitHub Primer | "The design system for GitHub" | MIT (GitHub) | `@primer/react` 38.40.1, `@primer/primitives` 11.10.0 | React 18–19 | "available to consume as CSS variables" | `data-color-mode`: `auto`, `light` or `dark`; 9 themes, including colour-blind, tritanopia and high-contrast |
| IBM Carbon | "IBM's open source design system" | Apache-2.0 | `@carbon/react` 1.117.0 (latest on npm) | React and Web Components | Sass tokens with the `$` prefix | Four themes, "two default light themes and two default dark themes": White, Gray 10, Gray 90, Gray 100 |
| Vercel Geist | "Vercel's design system for building consistent web experiences" | Components: none found. Geist font: SIL OFL 1.1 | `geist` font 1.7.2 | React (`@vercel/geistcn`) | CSS variables, e.g. `var(--ds-gray-100)`, with P3 colours | Not verified |

Further findings:

- **Carbon is the only one of the five that states a standard.** "Carbon
  components follow the IBM Accessibility Checklist which is based on WCAG
  AA, Section 508, and European standards." Its colour themes "strive to
  comply with the WCAG 2.1 AA guidelines for contrast."
  No WCAG target was found for the other four.
- **Geist's components do not appear to be public.** The Geist site says
  components "are published as `@vercel/geistcn`", but the public npm
  registry returns 404 for that name, and the page gives no install command
  or licence. The Geist *font* is public: "Licensed under OFL. Use it on your
  sites and projects."
- **Radix Themes and shadcn/ui share the same accessibility base.** Both
  dialogs import `Dialog` from the `radix-ui` package, which the infra-map
  app already uses.

### How comparable companies handle design

GitHub (Primer), IBM (Carbon) and Vercel (Geist) each run their own named
design system.

- **GitHub and IBM publish the code** under MIT and Apache-2.0 licences.
- **Vercel publishes the design guidance and the font, but not the
  components.**
- **All three define colour as named tokens**: CSS variables for Primer and
  Geist, and Sass `$` tokens for Carbon.
- **Primer and Carbon ship several light and dark themes.**
  Primer goes furthest on accessibility themes, with colour-blind,
  tritanopia and high-contrast variants.

## Recommendation (inference, not a sourced finding)

1. **Standardise on shadcn/ui on Radix, with Tailwind and CSS-variable
   tokens.** quirq already uses this stack. It is MIT-licensed, and because
   the code is copied in, quirq owns its components. That matches how GitHub
   and Vercel keep their own systems.
2. **Make the quirq palette in the infra-map app the single token source.**
   Apply it to the research hub, which today uses its own blue accent. A
   small shared token stylesheet in `packages/` would let both surfaces use
   it.
3. **Keep the dark-mode convention the app already uses:** follow the OS
   setting, and allow a `data-theme` override. Primer uses the same idea
   with `data-color-mode="auto"`.
4. **Borrow targets from Carbon and Primer:** WCAG 2.1 AA contrast for every
   token pair, as Carbon states it, and consider a high-contrast theme later,
   as Primer offers.

## Limitations and open questions

- The product repos (xo-space, innernet) were not read, so their actual
  stack and the source of the "quirq" theme are unverified.
- Versions are read from each repo's default branch on 2026-10-06. Carbon's
  `main` branch shows `1.118.0-rc.0`, while the npm latest is 1.117.0.
- Geist's dark-mode support and any WCAG targets for shadcn/ui, Radix
  Themes, Primer and Geist were not verified.
- Open: which typeface quirq should standardise on. The hub uses system-ui,
  and the infra-map app's font was not checked.

## References

- shadcn/ui: [docs](https://ui.shadcn.com/docs), [theming](https://ui.shadcn.com/docs/theming), [LICENSE](https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md), [package.json](https://raw.githubusercontent.com/shadcn-ui/ui/main/packages/shadcn/package.json), [dialog.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/dialog.tsx), [dialog docs](https://ui.shadcn.com/docs/components/dialog)
- Radix Themes: [getting started](https://www.radix-ui.com/themes/docs/overview/getting-started), [dark mode](https://www.radix-ui.com/themes/docs/theme/dark-mode), [LICENSE](https://raw.githubusercontent.com/radix-ui/themes/main/LICENSE), [package.json](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/package.json), [space.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/styles/tokens/space.css), [dialog.tsx](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/dialog.tsx)
- Primer: [primer.style](https://primer.style/), [primitives](https://primer.style/product/primitives/), [react LICENSE](https://raw.githubusercontent.com/primer/react/main/LICENSE), [primitives LICENSE](https://raw.githubusercontent.com/primer/primitives/main/LICENSE), [react package.json](https://raw.githubusercontent.com/primer/react/main/packages/react/package.json), [primitives package.json](https://raw.githubusercontent.com/primer/primitives/main/package.json)
- Carbon: [carbondesignsystem.com](https://carbondesignsystem.com/), [accessibility](https://carbondesignsystem.com/guidelines/accessibility/overview/), [colour](https://carbondesignsystem.com/elements/color/overview/), [themes](https://carbondesignsystem.com/elements/themes/overview/), [LICENSE](https://raw.githubusercontent.com/carbon-design-system/carbon/main/LICENSE), [npm latest](https://registry.npmjs.org/@carbon/react/latest)
- Geist: [introduction](https://vercel.com/geist/introduction), [colours](https://vercel.com/geist/colors), [font](https://vercel.com/font), [font LICENSE](https://raw.githubusercontent.com/vercel/geist-font/main/LICENSE.txt), [font package.json](https://raw.githubusercontent.com/vercel/geist-font/main/packages/next/package.json), [npm lookup for @vercel/geistcn](https://registry.npmjs.org/@vercel%2fgeistcn)
- quirq: [infra-map package.json](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/infra/output/app/infra-map/package.json), [index.css](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/infra/output/app/infra-map/src/index.css), [components/ui/LICENSE](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/infra/output/app/infra-map/src/components/ui/LICENSE), [present.js](https://github.com/quirq-ai/research/blob/1beb404e64376e96938ae7c34aae475e51ec9152/packages/present/bin/present.js)
