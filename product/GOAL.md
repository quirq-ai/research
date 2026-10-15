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

## Research questions

1. **What is a unit of work, and what is a quirq?** The unit's commitments,
   the environment that measures it, and the mint rule.
2. **How is a quirq computed and read?** Scoring, settlement, all-in cost,
   portfolio ratios, intervals and audits.
3. **What is established, and what is still open?** Which claims are derived,
   which were measured in mock mode, which are illustrative arithmetic, and
   which hypotheses are untested.

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

## Scope

**In scope:**

- suraj's quirq research in the writings repo: the essay *What is a unit of
  work?* and the whitepaper *quirq: A Unit of Work for Intelligence*, with its
  full text `llm.txt`.
- The quirq product as these pieces describe it: what is available now and
  what is still to prove.

**Out of scope:**

- New measurements. The essay's worked numbers are illustrative arithmetic,
  and the whitepaper's measured tier is mock mode. Running its scheduled
  experiments, E4 to E7, would be new research.
- Correcting or extending the calculus. The texts are brought across
  unchanged.
- Acting on the related open issues below. They follow the repo's issue
  triage.

## Related issues

- [#22 Attack the quirq mint with real agents](https://github.com/quirq-ai/research/issues/22)
- [#27 Promise vs penalty for async agents](https://github.com/quirq-ai/research/issues/27)
- [#28 Do owner budgets track value?](https://github.com/quirq-ai/research/issues/28)
- [#29 Does QER predict real outcomes?](https://github.com/quirq-ai/research/issues/29)
- [#30 What does a check set cost to write?](https://github.com/quirq-ai/research/issues/30)
- [#31 Measuring human rescue](https://github.com/quirq-ai/research/issues/31)
- [#35 Mint attack gold battery](https://github.com/quirq-ai/research/issues/35)

## Done when

- The essay and the whitepaper are published here, credited and linked to
  their originals at `a5a356d`.
- Every number and claim in the one-pager and the README findings is checked
  against a report line, or against `llm.txt` for the whitepaper.
- A one-pager points a reader at the key numbers, the open questions and both
  reports.

## Requested outputs

Tick only the formats the requester asked for. Agents publish into these
folders and no others.

- [x] onepager: `output/onepager/`
- [ ] slide: `output/slide/`
- [x] report: `output/report/`
- [ ] app: `output/app/`

Requested by: suraj, on 2026-10-15.
