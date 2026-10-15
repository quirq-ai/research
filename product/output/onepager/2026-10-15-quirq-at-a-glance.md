# quirq at a glance

suraj's quirq research in one page: what a unit of work is, how a quirq is
minted from verified work, and what is still to prove. It covers two pieces
read at commit `a5a356d`: the essay *What is a unit of work?*, a working
proposal first published on 31 July 2026, and the whitepaper *quirq: A Unit
of Work for Intelligence*, Draft v3, July 2026. By the essay's own account
nothing in it has been measured; its worked numbers are illustrative
arithmetic.

## The claim

> The **unit of work is the job**. The **environment is the boundary** you put
> observations over, which is what makes the job observable at all. The
> **quirq is the reading** that boundary produces once the declared checks
> have been evaluated against it.

From [What is a unit of work?](../report/2026-10-15-what-is-quirq.md#1-2-how-to-measure-work), §1.2.

## In numbers

| | |
|---|---|
| **3** | things make a job a unit of work: a definition of done, a verifiable result, a single owner |
| **3.20** | quirqs minted when a \$4.00 support ticket scores 0.80 on its checks and settles divisibly (illustrative) |
| **9.5×** | inflation of QER when one minute of human rescue at \$65/hour is left out of a \$0.128 unit (illustrative) |
| **55%** | by which the mean of per-unit ratios flatters a five-unit portfolio over the ratio of sums (illustrative) |
| **16.9%** | of accepted units fail a held-out gold battery in a 400-unit audit, at κ = 0.55 (illustrative) |
| **111%** | real growth in minted quirqs from April to June, after deflating 14.1% budget inflation; nominal growth was 141% (illustrative) |
| **3** | headline hypotheses, on tenure decay, predictive validity and budget governance; all open and untested |
| **3.5%** | of a 200-unit ledger was fiction when self-report could settle; read from captured state, the 7 false claims minted nothing (whitepaper E1, mock mode) |
| **85.6%** | cost-per-unit decay to the execution floor in a persistent environment, against flat cold-start cost (whitepaper E3, mock mode, consistency only) |

## Where to go next

| Read | For |
|---|---|
| [What is a unit of work?](../report/2026-10-15-what-is-quirq.md) | The full essay: the unit, the environment that measures it, and the case for an output meter |
| [How to measure](../report/2026-10-15-what-is-quirq.md#4-how-to-measure) | The calculus: scoring, settlement, all-in cost, QER, audits, and the three hypotheses with their falsifiers |
| [Evidence](../report/2026-10-15-what-is-quirq.md#6-evidence) | The literature as of August 2026, for and against, and the four strongest objections |
| [quirq: A Unit of Work for Intelligence](../report/2026-10-15-quirq-whitepaper.pdf) | The whitepaper, Draft v3: the mint rule, the gaming attacks, and harness experiments E1 to E3 in mock mode |

## How it connects

- quirq observes agent runtimes and does not replace them. Claude Code, Codex,
  Cursor and others each keep their own sessions
  ([§1.7](../report/2026-10-15-what-is-quirq.md#1-7-how-this-compares-to-other-innovations)).
  suraj's Claude Code research is in the [claude](../../../claude/) topic.
- Of the essay's three shifts, two are "the product being built today": from
  what the agent said to what changed in the project, and from one runtime's
  transcript to a durable workspace record. The third, from tokens to verified
  outcomes, is "the research program that gives the product its name" (§1.7).

## Open questions

The essay lists what is
[still to prove](../report/2026-10-15-what-is-quirq.md#still-to-prove):
production-grade before/after outcome verification, default minting and
settlement, predictive QER and business-impact accounting, budget governance
that resists gaming and mispricing, and feature-equivalent observation
across every runtime.

Related issues:
[#22 attack the quirq mint with real agents](https://github.com/quirq-ai/research/issues/22),
[#27 promise vs penalty for async agents](https://github.com/quirq-ai/research/issues/27),
[#28 do owner budgets track value?](https://github.com/quirq-ai/research/issues/28),
[#29 does QER predict real outcomes?](https://github.com/quirq-ai/research/issues/29),
[#30 what does a check set cost to write?](https://github.com/quirq-ai/research/issues/30),
[#31 measuring human rescue](https://github.com/quirq-ai/research/issues/31) and
[#35 mint attack gold battery](https://github.com/quirq-ai/research/issues/35).

## Sources

Both by Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[what-is-quirq](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/what-is-quirq)
and
[quirq-whitepaper.pdf](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/quirq-whitepaper.pdf),
whose full text is
[llm.txt](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/llm.txt).
