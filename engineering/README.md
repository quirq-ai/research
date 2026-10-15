# engineering

How quirq engineers build software: how the repos fit together, how changes are tested and reviewed, how AI agents take part, and suraj's teardowns of the systems it builds with.

| | |
|---|---|
| Status | Published |
| Owner | suraj |
| Started | 2026-10-06 |
| Last updated | 2026-10-15 |

Status is one of: Proposed, Researching, Published, Paused, Archived.

## What this topic is

This topic looks at engineering practice across the quirq repos: their
structure and dependencies, testing and code review, and where AI agents fit
in the dev loop. It also compares agent and UI integration frameworks
(CopilotKit/AG-UI, LangGraph's React SDK, the Vercel AI SDK, assistant-ui).
How qq builds, tests and lands changes is covered by the
[infra](../infra/) topic instead. Purpose and research action live in
[GOAL.md](GOAL.md).

It also holds suraj's engineering research from his writings: teardowns and field guides on the systems quirq builds with, such as web frameworks, data formats, compression and developer tools, each published here as a report with a one-pager.

## Research and findings so far

### Frontend architecture

Each finding is suraj's, from his writings at `a5a356d`.

- **The App Router's grammar is one rule, folders for URL segments and a closed set of file stems for behaviour, so `next build` knows the whole tree before any request arrives; every efficiency follows from that, and so does every cost.** Source: [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md#01-one-rule-many-precomputations), §01. Verified: 2026-10-15.
- **Every visible link costs two requests, a `/_tree` and a page segment that carries its layouts: a page with 12 visible links made 24 prefetch requests, 20,143 B on the wire, 8.7× the page's own HTML \[measured here\].** Source: [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md#one-link-two-gets), §09. Verified: 2026-10-15.
- **Moving `"use client"` from the top of a layout down to the leaves cut 38,489 B of JavaScript from every route but made the RSC payload 5.6× and the HTML 2.3× larger, uncompressed: on a hard load, rendered output ships twice \[measured here\].** Source: [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md#the-price-stated-first), §01. Verified: 2026-10-15.
- **The build cache does not skip prerendering: at 401 routes it cut compile from 25.2 s to 1.86 s, while static generation took 22–24 s on every build, 58% of a 38.4 s warm build \[measured here\].** Source: [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md#12-faster-cheaper-builds), §12. Verified: 2026-10-15.
- **Sibling dynamic folders with different parameter names pass the build and kill the server: `app/[a]/x` beside `app/[b]/y` built with exit code 0 and `next start` exited 1 \[measured here\], so a pipeline that gates on `next build` alone can ship an app that dies at boot \[reconstruction\].** Source: [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md#what-validation-misses), §03. Verified: 2026-10-15.
- **A page registry is a table with two columns, a string from your data on the left and the code allowed to draw it on the right, and it is a trust boundary: the one point where an untrusted string decides which of your functions runs.** Source: [A Table With Two Columns](output/report/2026-10-15-page-registries.md#01-the-shape-and-the-table), §01. Verified: 2026-10-15.
- **The one rule that survives every version of the registry design: the discriminant is a string constant chosen by a human, versioned in the string itself, as in `"hero.v2"`, and never derived from a file path, a class name, a component export name or a generated id \[house design\].** Source: [A Table With Two Columns](output/report/2026-10-15-page-registries.md#nominal-not-structural), §02. Verified: 2026-10-15.
- **MagicPath has no concept of a tag, a schema, a version or a slot, and suraj judges it a good fit for the block-factory role in a registry you own and a bad fit for anything load-bearing \[house design\].** Source: [A Table With Two Columns](output/report/2026-10-15-page-registries.md#12-magicpath-what-you-gain-what-you-pay), §12. Verified: 2026-10-15.

<!--
Add one bullet per verified finding:
- **Finding in one sentence.** Source: [title](link). Verified: YYYY-MM-DD.
Keep inferences and open questions in the sections below, not here.
-->

### Open questions

_None recorded yet._

## Status and progress

- [x] GOAL.md filled in and agreed with the requester
- [x] AGENTS.md filled in
- [x] Research under way
- [x] Findings verified against sources
- [x] Requested outputs published

## Published outputs

| Format | File | Date | Notes |
|---|---|---|---|
| onepager | [Frontend architecture at a glance](output/onepager/2026-10-15-frontend-architecture-at-a-glance.md) | 2026-10-15 | Key numbers and findings from suraj's two frontend-architecture reports |
| report | [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md) | 2026-10-15 | suraj's teardown of Next.js 16.4 routing, read at v16.4.0 and measured in a 2-vCPU lab, with its 18 figures |
| report | [A Table With Two Columns](output/report/2026-10-15-page-registries.md) | 2026-10-15 | suraj's design for a page registry, with its 10 figures and a MagicPath section from its CLI as run on 28 September 2026 |
