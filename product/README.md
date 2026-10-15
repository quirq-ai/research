# product

suraj's research on quirq, the product thesis: what a unit of work is, how a quirq is minted from verified work, and what is still to prove.

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
