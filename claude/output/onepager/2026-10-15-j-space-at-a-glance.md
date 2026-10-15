# The J-Space at a glance

suraj's close reading of Anthropic's global-workspace interpretability paper,
*Verbalizable Representations Form a Global Workspace in Language Models*
(Transformer Circuits, 2026), which works with Claude models. His post of
1 August 2026 explains what a J-space is, then how to build one. This page
keeps its two labels: *\[from the paper\]* for the paper's equations,
procedures and numbers, and *\[reconstruction\]* for suraj's own engineering,
which the paper does not state.

## The claim

> A large model's residual stream at any layer is a vector of several thousand
> numbers, and almost all of it is inaccessible to the model itself. The
> paper's claim is that a small, structured slice of that vector is different
> in kind: it is the part the model can talk about, be asked to focus on,
> reason over, and have its mind changed about. They call that slice the
> **J-space**, and they find it with a linear map computed once per layer.

From [The J-Space: a construction manual](../report/2026-10-15-j-space.md#01-the-claim-and-why-it-needs-a-new-lens), §01.

## In numbers

| | |
|---|---|
| **~25** | concepts the J-space holds at a time *\[from the paper\]* |
| **< 10%** | of activation variance at any layer lies in the J-space *\[from the paper\]* |
| **6–7%** | median share of a concept vector's variance in its J-space part; ~93% lies outside *\[from the paper\]* |
| **88% vs 5%** | swap trials that succeeded using the J-space part vs the remaining ~93% *\[from the paper\]* |
| **54% / 70%** | success of swapping an intermediate reasoning step: Haiku 4.5 / Sonnet and Opus 4.5 *\[from the paper\]* |
| **~100%** | trials on which a Spanish → French lens swap changed the output under explicit report and flexible inference; under continuation and anomaly detection, essentially no effect *\[from the paper\]* |
| **1,000** | pretraining-like prompts, averaged into one fixed d × d Jacobian per layer *\[from the paper\]* |
| **~L38** | workspace onset on the paper's 0–100 depth scale, about a third of the way through *\[from the paper\]* |
| **≈ 204,800 vs 2,000** | corpus-passes at d = 8,192: forward mode for the full matrix vs reverse mode for a 2,000-token concept set *\[reconstruction\]* |

The *\[reconstruction\]* row is analytical: suraj has not run the pipeline
against a frontier model.

## Where to go next

| Read | For |
|---|---|
| [The report](../report/2026-10-15-j-space.md) | The full reading and build, with 11 figures |
| [§02–§05: the J-space](../report/2026-10-15-j-space.md#02-deriving-the-jacobian-lens) | What it is, in the paper's definitions |
| [§07–§14: building one](../report/2026-10-15-j-space.md#07-building-one-the-pipeline) | Six steps from corpus to validation; reconstruction unless badged |
| [§15–§16: findings](../report/2026-10-15-j-space.md#15-what-the-paper-found-with-it) | Five properties with their experiments; sensory, workspace and motor regions |
| [§17: limitations](../report/2026-10-15-j-space.md#17-limitations-and-failure-modes) | The paper's own limits and three failure modes for a reproduction |
| [§18: what generalizes](../report/2026-10-15-j-space.md#18-what-generalizes) | The methodological moves suraj thinks are portable |
| [The paper](https://transformer-circuits.pub/2026/workspace/index.html) | The primary source; its Methods section carries the technical content |

## Open questions

Left open in the report:

- **Experience reports.** Ablating the J-space during stream-of-consciousness
  narration "dramatically reduced experiential language score" on Sonnet 4.5,
  Opus 4.5 and Opus 4.6. suraj treats what it means as open, as the authors do
  ([§15](../report/2026-10-15-j-space.md#15-what-the-paper-found-with-it)).
- **Early layers.** The lens is unreliable in the first third, and parts of
  the model's "true workspace" may operate in earlier layers
  ([§17](../report/2026-10-15-j-space.md#17-limitations-and-failure-modes)).
- **The authors' build.** The paper does not state its implementation
  strategy or compute cost. suraj's may differ, and he has not run it against
  a frontier model ([§19](../report/2026-10-15-j-space.md#19-sources)).
- **Conscious access.** The paper calls the philosophical implications
  "unclear and likely controversial". suraj treats them as a separate
  conversation ([§18](../report/2026-10-15-j-space.md#18-what-generalizes)).

## Sources

By Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[j-space](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/j-space)
([index.html](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/j-space/index.html)).

The paper it reads:
[*Verbalizable Representations Form a Global Workspace in Language Models*](https://transformer-circuits.pub/2026/workspace/index.html),
Transformer Circuits, 2026.
