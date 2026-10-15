# Mixture of Kittens at a glance

suraj's research note on Mixture-of-Kittens (MoK), in one page. MoK is
Cursor's open-source training kernel for mixture-of-experts layers on NVIDIA
GB300 NVL72 racks. The note covers why that layer was the bottleneck, how MoK
fuses it into one kernel, what Cursor measured and what suraj makes of it. It
describes MoK as Cursor open-sourced it on 4 August 2026, and was published on
5 August 2026. The measurements are Cursor's. The infra topic collects the note
as compute-infrastructure research, apart from qq.

## The claim

> The thesis of MoK: stop treating communication and computation as separate
> phases run by separate kernels, and instead schedule both on the same chip,
> at the same time, from inside one kernel.

From [Mixture of Kittens](../report/2026-10-15-mixture-of-kittens.md#the-last-bottleneck), §01.

## In numbers

| | |
|---|---|
| **>50%** | of end-to-end training time went to the MoE layer before MoK, depending on workload |
| **72** | Blackwell GPUs in one NVLink domain on a GB300 NVL72 rack |
| **148** | SMs on a Blackwell die, partitioned by MoK into computation and communication teams |
| **18 µs** | dispatch initiation, pull-based, against 103 µs push-based, as Cursor measured it |
| **up to 29%** | higher NVLink utilization for pull-based dispatch when experts are imbalanced |
| **2368** | tokens, the two-wave lower bound on minibatch size for a Kimi-class shape; Cursor's microbenchmarks peaked around 2560 |
| **2.37×** | peak MXFP8 forward-pass speedup of the fused MoK layer on one NVL72, over the fastest of four public baselines |
| **1.41×** | end-to-end gain over Cursor's previous DeepEP-based stack on 512 GPUs: 760.9 to 1,070.2 tokens/sec/GPU |

## Where to go next

| Read | For |
|---|---|
| [The note](../report/2026-10-15-mixture-of-kittens.md) | The full explainer, with 4 figures and 2 tables |
| [Push or pull](../report/2026-10-15-mixture-of-kittens.md#push-or-pull) | The direction MoK picks for each of the four MoE transfers, and why |
| [Ring token buffers](../report/2026-10-15-mixture-of-kittens.md#ring-token-buffers) | How a fixed-size ring buffer keeps the CPU out of buffer sizing |
| [The numbers](../report/2026-10-15-mixture-of-kittens.md#the-numbers) | Benchmark setup, baselines, model shapes and the end-to-end run |
| [Why it matters](../report/2026-10-15-mixture-of-kittens.md#why-it-matters) | suraj's four takeaways, from determinism to the rack as the unit of optimization |

## Sources

By Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[research/mixture-of-kittens](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/research/mixture-of-kittens/index.html).
The note's primary sources: Cursor's
[post](https://cursor.com/blog/mixture-of-kittens) and the
[MoK repository](https://github.com/cursor/mixture-of-kittens).
