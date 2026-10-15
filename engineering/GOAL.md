# Goal: engineering

## Purpose

This topic studies how quirq engineers build software day to day: how the
quirq repos fit together, how changes are tested and reviewed, and how AI
agents take part in that work. It complements the `infra` topic, which covers
qq, the build, test and land system. The answers inform where to invest in
engineering practice and agent tooling at quirq.

This topic also holds suraj's frontend-architecture research, from his
writings at `a5a356d`. *Next.js routing, taken apart* follows one route of a
Next.js 16.4 app from file to click and prices each precomputation in a lab.
*A Table With Two Columns* designs a page registry: the table from a shape
name in your data to the code allowed to draw it. Together they inform how
quirq engineers build web frontends: what a Next.js App Router app costs to
build, serve and navigate, and how to render pages from data.

This topic also collects suraj's research on data formats: JSON, YAML and
TOML as configuration that people write and programs load, what a TOML file
is and how a program turns it into behaviour, and where JSON that a system
loads and stores all day should live. The source is suraj's writing at
[github.com/sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings),
read at commit `a5a356d`. The research informs how xo-space reads, writes
back and stores its configuration and state, and how quirq could write down
its outcome spec.

This topic also collects suraj's research on compression from his writings:
what compression and compaction each keep, and which codec, level or format
each kind of file wants. The source is two posts in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`, both first published on 9 October 2026. They inform how the XO
repos store, send and compact data, from JSON and logs to an agent's context
window.

## Research questions

1. **Agent and UI integration patterns.** How do agent frameworks connect an
   agent to an app's UI, and how do CopilotKit/AG-UI, LangGraph's React SDK,
   the Vercel AI SDK and assistant-ui compare on:
   - shared state that both the agent and the UI read and write,
   - generative UI, where the agent's output renders as UI components,
   - human-in-the-loop, where the user approves or edits an agent step?

   Source idea: [#16 Idea: CopilotKit shared state](https://github.com/quirq-ai/research/issues/16).

2. **Repo structure.** How are the quirq repos structured, and how do they
   depend on each other?
3. **Testing and code review.** What testing and code review practice do the
   quirq repos follow today, and where are the gaps?
4. **AI agents in the dev loop.** How do AI agents fit into the quirq
   development loop today, and what would make them more useful?
5. **What does Next.js 16.4 precompute from an `app/` tree, and what does each precomputation cost?** Discovery, the route table, the request path, rendering, the client router, prefetching and what each route ships.
6. **Which practices move those costs, and which common beliefs about Next.js routing fail at 16.4?**
7. **How should a page registry be built?** Its shapes, the ways to build the table, what one entry carries, where to validate, how to version and how it fails.
8. **What does MagicPath add to a registry, and what does it cost?**
9. **Configuration formats.** Where do JSON, YAML and TOML parsers hear something other than what the author wrote, and which format and guardrails fit which kind of file?
10. **TOML files.** How does a `.toml` file become typed data and then program behaviour, and which decisions belong to the application?
11. **Storing JSON.** Where should JSON that a system loads and stores all day live, and how is that built from free, open-source parts?
12. **Our own trees.** How do xo-space and the other XO trees read, write and store configuration and JSON state today?
13. **What do compression and compaction each keep?** What lossless and lossy compression, storage compaction and an agent's context compaction keep, what they drop, and whether it can come back.
14. **Which codec, level or format does each kind of file want?** JSON, small messages, binary encodings, config files, logs, tables, images, audio, video and already-compressed files, as measured in October 2026.
15. **Where does compression meet the XO trees and agent sessions?** The xo-space backup tarball and compaction fields, Mindwalk's compaction marks, and what agent CLIs do with their transcripts.

## Research action

- For question 1, read each framework's official docs and source, build or
  run its reference examples, and compare them on the three patterns.
- For questions 2 and 3, read the quirq repos at a recorded commit: their
  manifests, dependency pins, test suites, CI workflows and branch and review
  settings, plus their merged PRs.
- For question 4, look at where agents already open, review or land changes
  in the quirq repos (PR authorship, review bots, repo agent guides) and
  compare that with what the agent tooling supports.

- Bring both posts from the writings repo into this topic as reports without
  changing their meaning: text, tables and figures. Credit suraj and link
  each original at `a5a356d`.
- Keep each post's own labels. The Next.js teardown uses \[from the code\],
  \[from the docs\], \[measured here\] and \[reconstruction\]. The registry
  essay uses \[documented\], \[house design\] and \[third-party, unverified\].
- Trace every number in the one-pager and the README findings to a report
  line.
- Bring the three data-format posts into this topic as reports without
  changing their meaning: *What the Parser Hears*, *What is a TOML file?*
  and *Where the JSON Lives*. Credit suraj and link each original post at
  commit `a5a356d`.
- Keep each post's own labels for what was taken from a spec, the docs or
  the tree, measured, reconstructed or proposed.
- Publish a one-pager with the key numbers and a link to each report section
  it draws on.
- Bring both compression posts into this topic as reports, with their text,
  tables and figures unchanged. Credit and link each original at `a5a356d`.
- Keep the posts' own labels: from the paper, from the spec, from the docs,
  from the tree, measured here and reconstruction.
- Publish a one-pager with the key numbers and a pointer to each report.

## Scope

**In scope:**

- The quirq repos and how engineers work across them: structure,
  dependencies, testing, code review and agent use.
- Agent and UI integration frameworks, for question 1: CopilotKit/AG-UI,
  LangGraph's React SDK, the Vercel AI SDK and assistant-ui.
- suraj's frontend-architecture posts in the writings repo: the Next.js 16.4 routing teardown, and the page-registry essay with its MagicPath section.
- suraj's posts on configuration formats, TOML files and storing JSON, in the writings repo at commit `a5a356d`.
- suraj's two compression posts at `a5a356d`, What Compression Keeps and What Each File Wants, with their figures.

**Out of scope:**

- How qq itself works (the build, test and land system). That is the `infra`
  topic.
- Product strategy and design. Those are the `product` and `design` topics.
- New measurements of Next.js. The teardown describes `next@16.4.0`, measured on 9 October 2026 on one shared 2-vCPU container. Re-running the lab on later releases would be new research.
- Re-checking MagicPath's docs, pricing or output quality. The essay could not read the vendor docs and ran no generation.
- New measurements of the data formats. The posts describe formats, parsers and databases as of October 2026. Re-running their harnesses or checking later releases would be new research.
- Changing the XO trees the posts read. The posts read them and left them unchanged.
- Acting on the related issue [#33 Crash consistency of agent runtime stores](https://github.com/quirq-ai/research/issues/33). It follows the repo's issue triage.
- New compression measurements. The posts were measured on 10 October 2026 on one shared 2-CPU machine. Rerunning their harness or checking later releases would be new research.
- Acting on the posts' suggestions for the XO trees, such as the xo-space backup tarball fix.

## Done when

- Each research question has an answer whose claims cite a source: a file at
  a recorded commit, a merged PR, or official documentation.
- The gaps found under questions 3 and 4 are listed with a suggested next step
  for each.
- The onepager and the report are published and listed in the README.
- Both frontend-architecture posts are published here as reports, credited and linked to their originals at `a5a356d`.
- A one-pager points a reader at the key numbers and findings of both.
- Each README finding from them cites a report section and was checked against it.
- The three data-format posts are published as reports, credited to suraj and linked to their originals at `a5a356d`.
- The data-formats one-pager is published and listed in the README.
- Each data-format finding in the README links the report section it comes from.
- Both compression posts are published as reports, credited and linked to their originals.
- A one-pager points a reader at the key numbers and at each report.
- Each README finding names its report section and was checked against it.

## Requested outputs

Tick only the formats the requester asked for. Agents publish into these
folders and no others.

- [x] onepager: `output/onepager/`
- [ ] slide: `output/slide/`
- [x] report: `output/report/`
- [ ] app: `output/app/`

Requested by: suraj, on 2026-10-06.
The frontend-architecture reports and one-pager: suraj, on 2026-10-15, as part of bringing his writings into the matching topics.
