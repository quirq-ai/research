# Goal: product

## Purpose

This topic is the home of quirq, the product thesis. It collects suraj's
research on quirq in one place: what a unit of work is, why the environment
that hosts the work has to measure it, how a quirq is minted from verified
state and read against its all-in cost, and which of these claims are still
open. The source is suraj's writing at
[github.com/sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings).
The research informs how the quirq product measures the work agents do, and
what it has to prove before it claims more.

This topic also collects suraj's research on XO Space. xo-space is the local
agent control plane behind an XO Cowork workspace: one process that brokers
chat to several coding-agent runtimes behind one API and owns the on-disk
project model. The research covers how it is built, what it stores and where,
and what it would take to share a Space. It informs quirq: xo-space is where
a unit of work gets its workspace, its durable result and its metered spend.
The source is suraj's writing at
[github.com/sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings),
read at commit `a5a356d`.

## Research questions

1. **What is a unit of work, and what is a quirq?** The unit's commitments,
   the environment that measures it, and the mint rule.
2. **How is a quirq computed and read?** Scoring, settlement, all-in cost,
   portfolio ratios, intervals and audits.
3. **What is established, and what is still open?** Which claims are derived,
   which were measured in mock mode, which are illustrative arithmetic, and
   which hypotheses are untested.
4. **How does xo-space put several agent runtimes behind one API?** The capability seam, agents as data, the adapter contract, the four transports and the streaming layer.
5. **What does xo-space store, where, and for how long?** The three storage tiers, the five stores, the twelve entities and their identities, and what bounds each file.
6. **What does xo-space give a unit of work, and what is missing?** What is already in place, what cannot yet be verified, and the marked proposals for consolidating the data plane.
7. **Could a hosted sync layer make a Space shareable?** Liveblocks read against xo-space: where it would sit, what installs in the container, and what it costs.

## Research action

- Bring the essay *What is a unit of work?* and the whitepaper *quirq: A Unit
  of Work for Intelligence* into this topic without changing their meaning.
  Credit and link each original at commit `a5a356d`.
- Publish the essay as a Markdown report with its figures, and the whitepaper
  as its PDF, Draft v3.
- Check every whitepaper claim against its full text, `llm.txt`, at the same
  commit.
- Keep the sources' own labels: sourced, derived, measured in mock mode,
  illustrative, open.
- Where the essay corrects the whitepaper, as on the sign of the audit
  correction, keep both texts unchanged and point to the correction.
- Publish a one-pager with the key numbers, the open questions and links into
  both reports.
- Bring the three XO Space posts from the writings repo into this topic as
  reports, without changing their meaning. Credit suraj and link every
  original post at commit `a5a356d`.
- Keep the source's own labels: read from the source at a commit, measured on
  one workspace, from the Liveblocks docs, or a proposal.
- Publish a one-pager with the key numbers and a link to each report.

## Scope

**In scope:**

- suraj's quirq research in the writings repo: the essay *What is a unit of
  work?* and the whitepaper *quirq: A Unit of Work for Intelligence*, with its
  full text `llm.txt`.
- The quirq product as these pieces describe it: what is available now and
  what is still to prove.
- suraj's XO Space posts: the control-plane teardown (xo-space at commit `f1fecdd`), the architecture reference (the working tree in August 2026) and the Liveblocks reading (the docs as of 18 September 2026).

**Out of scope:**

- New measurements. The essay's worked numbers are illustrative arithmetic,
  and the whitepaper's measured tier is mock mode. Running its scheduled
  experiments, E4 to E7, would be new research.
- Correcting or extending the calculus. The texts are brought across
  unchanged.
- Acting on the related open issues below. They follow the repo's issue
  triage.
- New measurements of xo-space. Reading later commits or re-running the one-workspace measurements would be new research.
- Building any proposal in the posts: the lean redesign, the clock, the consolidated session record or the Liveblocks pilot.

## Related issues

- [#22 Attack the quirq mint with real agents](https://github.com/quirq-ai/research/issues/22)
- [#27 Promise vs penalty for async agents](https://github.com/quirq-ai/research/issues/27)
- [#28 Do owner budgets track value?](https://github.com/quirq-ai/research/issues/28)
- [#29 Does QER predict real outcomes?](https://github.com/quirq-ai/research/issues/29)
- [#30 What does a check set cost to write?](https://github.com/quirq-ai/research/issues/30)
- [#31 Measuring human rescue](https://github.com/quirq-ai/research/issues/31)
- [#35 Mint attack gold battery](https://github.com/quirq-ai/research/issues/35)
- [#23 Memory-ablation trial for tenure decay](https://github.com/quirq-ai/research/issues/23)
- [#24 One provider-neutral agent session record](https://github.com/quirq-ai/research/issues/24)
- [#32 Long-lived agent session manager](https://github.com/quirq-ai/research/issues/32)
- [#37 Is the 69% attribution loss mostly subagents run outside the projects root?](https://github.com/quirq-ai/research/issues/37)

## Done when

- The essay and the whitepaper are published here, credited and linked to
  their originals at `a5a356d`.
- Every number and claim in the one-pager and the README findings is checked
  against a report line, or against `llm.txt` for the whitepaper.
- A one-pager points a reader at the key numbers, the open questions and both
  reports.
- The three XO Space posts are published here as reports, credited and linked to their originals at `a5a356d`.
- The one-pager "XO Space at a glance" points a reader at the key numbers and at each report.
- Every XO Space finding in the README names its report section and was checked against it.

## Requested outputs

Tick only the formats the requester asked for. Agents publish into these
folders and no others.

- [x] onepager: `output/onepager/`
- [ ] slide: `output/slide/`
- [x] report: `output/report/`
- [ ] app: `output/app/`

Requested by: suraj, on 2026-10-15.
