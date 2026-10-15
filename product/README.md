# product

suraj's research on quirq and the workspace it runs in: what a unit of work is, how a quirq is minted from verified work, how XO Space hosts the work, and what is still to prove.

| | |
|---|---|
| Status | Published |
| Owner | suraj |
| Started | 2026-10-06 |
| Last updated | 2026-10-15 |

Status is one of: Proposed, Researching, Published, Paused, Archived.

## What this topic is

quirq names both a product and the research program behind it. The product
being built today is a local workspace layer around agent runtimes such as
Claude Code and Codex. The research proposes the quirq as the output meter to
read beside the token: value budgeted by a human owner, minted by verification
against captured world state, costed all-in, and read over time as a
trajectory. This topic brings that research together from
[suraj's writings](https://github.com/sharmasuraj0123/writings), credited and
linked to each original post. Purpose and research action live in
[GOAL.md](GOAL.md).

It also holds suraj's research on XO Space, the local agent control plane behind an XO Cowork workspace: how it puts several agent runtimes behind one API, what it stores and where, and what it would take to share a Space. xo-space is where a unit of work gets its workspace, its durable result and its metered spend.

## Research and findings so far

### quirq

Each finding is suraj's, from his writings at `a5a356d`.

- **A unit of work is a bounded job with an accountable owner, a declared finish line, and a way to determine whether that finish line was reached; a prompt is only the opening instruction.** Source: [What is a unit of work?](output/report/2026-10-15-what-is-quirq.md#1-1-what-is-a-unit-of-work), §1.1. Verified: 2026-10-15.
- **Work can only be measured where some environment observed it: the environment is a boundary you draw, and what it cannot see, it cannot measure.** Source: [What is a unit of work?](output/report/2026-10-15-what-is-quirq.md#1-2-how-to-measure-work), §1.2. Verified: 2026-10-15.
- **Tokens and quirqs are complementary meters: the token records what the machine drew, the quirq records what verifiably changed, and read against cost and energy they give cost per quirq, quirqs per dollar and quirqs per kilowatt-hour.** Source: [What is a unit of work?](output/report/2026-10-15-what-is-quirq.md#1-7-how-this-compares-to-other-innovations), §1.7. Verified: 2026-10-15.
- **The worker can change the world but cannot write its own score: V is the weighted share of declared checks that the captured after-state passes, never the worker's own account.** Source: [What is a unit of work?](output/report/2026-10-15-what-is-quirq.md#definitions-and-verification), §4.2. Verified: 2026-10-15.
- **Settlement mints Q = B·φ(V) quirqs and never more than the declared budget, so the unit cannot inflate from the production side; budget drift on the pricing side is a separate channel.** Source: [What is a unit of work?](output/report/2026-10-15-what-is-quirq.md#the-settlement-rule), §4.3. Verified: 2026-10-15.
- **Human rescue is the cost term that decides whether a QER figure means anything: in the worked example, leaving out one minute at a \$65/hour loaded rate inflates QER 9.5×, and cheaper inference makes this worse.** Source: [What is a unit of work?](output/report/2026-10-15-what-is-quirq.md#the-all-in-cost-model), §4.4. Verified: 2026-10-15.
- **Nothing in the essay has been measured: its own figures, tables and intervals are illustrative arithmetic, and its three hypotheses are open in the strict sense, untested.** Source: [What is a unit of work?](output/report/2026-10-15-what-is-quirq.md#scope-and-limitations), §4.12. Verified: 2026-10-15.
- **In the whitepaper's mock-mode harness, reading completion from captured state minted none of 7 false completion claims, while a self-report arm settled all 7, 3.5% of the ledger; mock mode validates the machinery, not real agents.** Source: [quirq: A Unit of Work for Intelligence](output/report/2026-10-15-quirq-whitepaper.pdf), §7.2. Verified: 2026-10-15.

### XO Space

Each finding is suraj's, from his writings at `a5a356d`.

- **No core file may name a specific agent: at commit `f1fecdd` the rule has exactly four written exceptions, and it is upheld in review by humans because the AST guard that checks it is kept as local dev tooling and not committed.** Source: [Anatomy of an Agent Control Plane](output/report/2026-10-15-xo-space-control-plane.md#18-the-modularity-invariant), §18. Verified: 2026-10-15.
- **The project folder holds only metadata, which makes it safe to sync, fork or push to git: a session-index entry is five fields and a usage counter, and chat messages stay in each runtime's own storage.** Source: [Anatomy of an Agent Control Plane](output/report/2026-10-15-xo-space-control-plane.md#10-the-index-that-holds-no-messages), §10. Verified: 2026-10-15.
- **Read through the quirq lens, xo-space already materializes the workspace, the durable result and the spend side of the budget, three of the five things a unit of work needs, but it cannot yet verify: it has no definition-of-done evaluator and no budget that can refuse.** Source: [Anatomy of an Agent Control Plane](output/report/2026-10-15-xo-space-control-plane.md#21-what-this-means-for-quirq), §21. Verified: 2026-10-15.
- **Observation asks nothing of the operator: a repo dropped under the projects root is on the map within a second, and every session is attributed by where it ran, with no registration, no plugin and no wrapper.** Source: [XO Space: the architecture](output/report/2026-10-15-xo-space-architecture.md#4-4-the-xo-project-work-as-usual), §4.4. Verified: 2026-10-15.
- **The platform's data lives in five stores, and the largest derived one is the one the folder contract doesn't mention: on the one workspace measured, `argus.db` is 5.6 MB against 6.4 KB for every project's `.xo/` tier combined.** Source: [XO Space: the architecture](output/report/2026-10-15-xo-space-architecture.md#3-4-the-data-model-entity-by-entity), §3.4. Verified: 2026-10-15.
- **Growth and identity are the same problem seen twice: of ten files checked, seven have no eviction path, so a folder synced after a year of daily use carries every session it has ever hosted, with no way to drop one.** Source: [XO Space: the architecture](output/report/2026-10-15-xo-space-architecture.md#3-5-how-the-timeline-grows), §3.5. Verified: 2026-10-15.
- **Measured on one workspace over eleven days, 69% of observed sessions were dropped on attribution because they ran outside the projects root, and 171 of 178 argus rows were subagent runs, which `.xo/` has no concept of.** Source: [XO Space: the architecture](output/report/2026-10-15-xo-space-architecture.md#5-1-consolidating-the-plane), §5.1. Verified: 2026-10-15.
- **suraj proposes Liveblocks as a mirror that the watcher publishes, never a second writer, and only half of it installs inside the container: the SDKs do, the room server does not.** Source: [Liveblocks, read for XO Space](output/report/2026-10-15-liveblocks-for-xo-space.md#01-why-read-liveblocks-now), §01. Verified: 2026-10-15.

<!--
Add one bullet per verified finding:
- **Finding in one sentence.** Source: [title](link). Verified: YYYY-MM-DD.
Keep inferences and open questions in the sections below, not here.
-->

### Open questions

The essay's list of what is still to prove is in the
[report](output/report/2026-10-15-what-is-quirq.md#still-to-prove), §1.7.
Tracked as issues: [#22](https://github.com/quirq-ai/research/issues/22),
[#27](https://github.com/quirq-ai/research/issues/27),
[#28](https://github.com/quirq-ai/research/issues/28),
[#29](https://github.com/quirq-ai/research/issues/29),
[#30](https://github.com/quirq-ai/research/issues/30),
[#31](https://github.com/quirq-ai/research/issues/31) and
[#35](https://github.com/quirq-ai/research/issues/35).
XO Space questions are tracked as [#37](https://github.com/quirq-ai/research/issues/37),
[#24](https://github.com/quirq-ai/research/issues/24),
[#32](https://github.com/quirq-ai/research/issues/32) and
[#23](https://github.com/quirq-ai/research/issues/23); human rescue, #31, applies to both.

## Status and progress

- [x] GOAL.md filled in and agreed with the requester
- [x] AGENTS.md filled in
- [x] Research under way
- [x] Findings verified against sources
- [x] Requested outputs published

## Published outputs

| Format | File | Date | Notes |
|---|---|---|---|
| onepager | [quirq at a glance](output/onepager/2026-10-15-quirq-at-a-glance.md) | 2026-10-15 | Key numbers, open questions and links into the essay and the whitepaper |
| report | [What is a unit of work?](output/report/2026-10-15-what-is-quirq.md) | 2026-10-15 | suraj's essay on the unit of work and the quirq calculus, a working proposal first published 31 July 2026, with its figures |
| report | [quirq: A Unit of Work for Intelligence](output/report/2026-10-15-quirq-whitepaper.pdf) | 2026-10-15 | suraj's whitepaper as a PDF, Draft v3, July 2026 |
| onepager | [XO Space at a glance](output/onepager/2026-10-15-xo-space-at-a-glance.md) | 2026-10-15 | Key numbers from the three XO Space reports, what each report is for, and the related open issues |
| report | [Anatomy of an Agent Control Plane](output/report/2026-10-15-xo-space-control-plane.md) | 2026-10-15 | suraj's component-by-component teardown of xo-space at commit `f1fecdd`, with its 12 figures |
| report | [XO Space: the architecture](output/report/2026-10-15-xo-space-architecture.md) | 2026-10-15 | suraj's implementation reference for xo-space, verified against the working tree in August 2026, with its 22 figures |
| report | [Liveblocks, read for XO Space](output/report/2026-10-15-liveblocks-for-xo-space.md) | 2026-10-15 | suraj's reading of the Liveblocks docs as of 18 September 2026 against xo-space, with a proposed integration and pilot; 9 figures |
