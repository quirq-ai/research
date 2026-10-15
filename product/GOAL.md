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

This part of the topic adds two tools that suraj read for quirq. Space Walk is
XO Labs' fork of mindwalk. It replays a coding agent's session as light over a
3D map of the repository, and suraj proposes it as the evidence layer for the
quirq. iai-pme is a local personal memory engine by Areg Aramovich Noya and
Lilli Noya. suraj's independent teardown reads it as a working Mₜ and asks what
that means for quirq's tenure hypothesis. The material informs how quirq can
explain a score with evidence, and how it could meter memory.

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
8. **How does Space Walk turn agent logs into evidence for a unit of work?** What it reads, what it computes, and what it still needs before a trace can join a unit.
9. **What would let an xo-project folder carry its own evidence?** What the folder holds today and what Space Walk needs from it.
10. **How does a working personal memory engine capture, store, recall and forget?** iai-pme v2.7.3, with suraj's measurements and the project's own benchmarks kept apart.
11. **What does a working, meterable Mₜ mean for quirq's tenure hypothesis?** What the memory engine and Space Walk can measure, and what needs a randomized trial.

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
- Publish suraj's "The anatomy of Space Walk" and "Anatomy of a Personal
  Memory Engine" as reports. Keep their text, tables and figures unchanged.
- Credit suraj and link each original post at commit `a5a356d`.
- Keep each source's labels: measured on suraj's install, the project's own
  benchmark, the spec's worked or illustrative example, proposal, open.
- Publish a onepager with the key numbers from both reports and links to
  their quirq sections.
- Link issues #23 and #36 from the onepager. Do not act on them here.

## Scope

**In scope:**

- suraj's quirq research in the writings repo: the essay *What is a unit of
  work?* and the whitepaper *quirq: A Unit of Work for Intelligence*, with its
  full text `llm.txt`.
- The quirq product as these pieces describe it: what is available now and
  what is still to prove.
- suraj's XO Space posts: the control-plane teardown (xo-space at commit `f1fecdd`), the architecture reference (the working tree in August 2026) and the Liveblocks reading (the docs as of 18 September 2026).
- suraj's Space Walk architecture note (`research/spacewalk-architecture`) and his iai-pme teardown (`personal-memory-engine`).
- The quirq sections of both: Space Walk §12 to §14 and the memory engine §18.

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
- New measurements of Space Walk or iai-pme. The writings describe the Space Walk working tree in August 2026 and iai-pme v2.7.3.
- Building what Space Walk proposes: the scope overlay, the QER dashboard, bunching detection and the raw mirror.
- Running the memory-ablation trial. It follows the repo's issue triage under #23 and #36.

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
- [#36 What does "memory off" mean for a memory-ablation trial?](https://github.com/quirq-ai/research/issues/36)

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
- Both posts are published here as reports, credited to suraj and linked to their originals at `a5a356d`.
- A onepager gives the key numbers from both reports and links each quirq section.
- Every number in the onepager and the README findings is traced to a report line.

## Requested outputs

Tick only the formats the requester asked for. Agents publish into these
folders and no others.

- [x] onepager: `output/onepager/`
- [ ] slide: `output/slide/`
- [x] report: `output/report/`
- [ ] app: `output/app/`

Requested by: suraj, on 2026-10-15.
