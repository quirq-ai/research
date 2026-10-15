# Evidence and memory at a glance

suraj's research on two tools and what they mean for quirq. Space Walk, XO
Labs' fork of mindwalk, replays a coding agent's session as light over a 3D
map of the repository; suraj argues it is the missing evidence layer for the
quirq. iai-pme is a fully local memory engine by Areg Aramovich Noya and
Lilli Noya; suraj's independent teardown reads it as a working Mₜ for
quirq's tenure hypothesis. The Space Walk note was verified against the fork
in August 2026 and updated on 16 August; the teardown, published 31 July
2026, reads iai-pme v2.7.3.

## The claim

> Space Walk meters the inputs; the quirq settles the outputs. Kept on
> separate meters and joined only through the world — cwd plus commit — each
> half makes the other auditable.

From [The anatomy of Space Walk](../report/2026-10-15-space-walk-architecture.md#proving-the-quirq), §12.

## In numbers

| | |
|---|---|
| **3** | harness log dialects (Claude Code, Codex, pi) normalized into one trace, each detected by content sniffing |
| **10,000** | files per map, filled in three tiers (touched, ghosts, then everything else), so a budget cut drops scenery before evidence |
| **≤ 2** | sealed, toolless judge calls per evaluation; findings without valid evidence are dropped |
| **5.2×** | inflation of naive QER from 30 s of human rescue at $65/h, on the spec's worked $0.128 unit; 120 s inflates it 17.9× |
| **4** | fail-safe shell hooks capture and recall memory; every script ends in `exit 0` on every path |
| **167.5 ms** | full recall, engine-reported, measured on a 61-record store; 1.4 s with the engine dead |
| **≈88%** | cheaper per retrieval, by the engine's own conservative estimate: a ~350-token pack displaces a ~2,850-token agent search |
| **2,993** | most session-start tokens the benchmark suite measured (least 1,629), under a ≤ 3,000-token steady-state budget |
| **1.000** | Rescue@10, the project's own benchmark: the current fact ranks top-10 after a contradiction; flat-cosine control 0.69–0.71 |

## Where to go next

| Read | For |
|---|---|
| [The anatomy of Space Walk](../report/2026-10-15-space-walk-architecture.md) | The pipeline from logs to light, with 7 figures. [§12](../report/2026-10-15-space-walk-architecture.md#proving-the-quirq) to [§14](../report/2026-10-15-space-walk-architecture.md#a-folder-that-carries-its-own-evidence) put the trace to work as evidence for the quirq |
| [Anatomy of a Personal Memory Engine](../report/2026-10-15-personal-memory-engine.md) | iai-pme v2.7.3 component by component, with 16 figures. [§18](../report/2026-10-15-personal-memory-engine.md#18-what-this-means-for-quirq) reads it through the quirq lens |

## How it connects

- **quirq's evidence.** A trace is transcript-derived, so under assumption A2
  it can never be a check; that frees it to explain a score without touching
  it. Its join key to a unit is cwd plus commit, and only Codex traces carry
  the commit
  ([§12](../report/2026-10-15-space-walk-architecture.md#proving-the-quirq)).
- **quirq's tenure hypothesis.** suraj reads iai-pme as a working Mₜ:
  persistent across sessions, non-decreasing and meterable. Its economy
  panel measures the context an agent no longer has to rebuild, which
  Equation 8 predicts should shrink
  ([§18](../report/2026-10-15-personal-memory-engine.md#18-what-this-means-for-quirq)).
  Space Walk's compaction and subagent marks identify memory-ablation arms,
  but "H1 is a randomized falsification design, not a chart"
  ([§12](../report/2026-10-15-space-walk-architecture.md#proving-the-quirq)).
  The whitepaper's account is in
  [What is a unit of work?](../report/2026-10-15-what-is-quirq.md#tenure-memory-and-the-cost-trajectory)
- **xo-space.** An xo-project folder indexes its sessions; it does not
  contain them. A watcher-written raw mirror would let Space Walk replay a
  whole project with zero new code on its side
  ([§14](../report/2026-10-15-space-walk-architecture.md#a-folder-that-carries-its-own-evidence)).

## Open questions

Tracked as issues:
[#23](https://github.com/quirq-ai/research/issues/23) asks whether cost per
verified unit falls as project memory Mₜ accumulates;
[#36](https://github.com/quirq-ai/research/issues/36) asks what a "memory
off" arm strips, since repo files and history also act as memory. In the
reports, the spec marks open three of Space Walk's further-out uses,
tenure-cost decay among them, and the raw mirror's three costs (sensitivity,
identity, portability) belong in its design before the first byte is
mirrored.

## Sources

All by Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[research/spacewalk-architecture](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/research/spacewalk-architecture)
([source](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/research/spacewalk-architecture/index.html))
and
[personal-memory-engine](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/personal-memory-engine)
([source](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/personal-memory-engine/index.html)).
