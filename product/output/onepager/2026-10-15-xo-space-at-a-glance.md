# XO Space at a glance

suraj's XO Space research in one page. xo-space is the local control plane
behind an XO Cowork workspace: one Python process that brokers chat to
coding-agent runtimes, owns the on-disk project model, and maps the folders
under `~/xo-projects` in its Space UI. The teardown reads xo-space at commit
`f1fecdd` (published 31 July 2026). The architecture reference was verified
against the working tree in August 2026. The Liveblocks reading uses the docs
as of 18 September 2026.

## The claim

> You cannot compare the cost of a unit of work across four agents if the
> comparison logic has four branches in it. A single normalized entry shape, a
> single session record, a single event vocabulary: those are the
> preconditions for a meter.

From [Anatomy of an Agent Control Plane](../report/2026-10-15-xo-space-control-plane.md#21-what-this-means-for-quirq), §21.

## In numbers

| | |
|---|---|
| **42,580** | lines across 221 modules, in one Python process |
| **4** | runtimes behind one API, each on its own transport: Claude Code, OpenClaw, Hermes, Antigravity |
| **100** | lines in `loader.py`, the one seam every agent-specific fact goes through |
| **5** | fields and a usage counter per session-index entry; chat messages never enter the project folder |
| **1** | second per watcher tick; any folder under the projects root is a mapped project within a second |
| **12** | entities across five stores; four have no identity at all |
| **5.6 MB** | in `argus.db`, a store the folder contract never mentions, against 6.4 KB for every project's `.xo/` tier combined (measured, one workspace) |
| **69%** | of observed sessions dropped on attribution: 123 of 178 ran outside the projects root (measured, one workspace, eleven days) |
| **10** | encrypted snapshots kept per project, in a private GitHub repo named `xo-project-<id>` |
| **3,000** | Liveblocks Free-tier collaboration minutes (from the docs): fifty hours a month of someone watching an agent |

## Where to go next

| Read | For |
|---|---|
| [Anatomy of an Agent Control Plane](../report/2026-10-15-xo-space-control-plane.md) | The teardown: the capability seam, agents as data, four transports, the index that holds no messages, backup, and what isn't built yet |
| [XO Space: the architecture](../report/2026-10-15-xo-space-architecture.md) | The implementation reference: Space as a small operating system, the data model across five stores, measured timeline growth, and the marked proposals |
| [Liveblocks, read for XO Space](../report/2026-10-15-liveblocks-for-xo-space.md) | Whether a hosted room per project could make a Space shareable: where it would sit, what installs in the container, its cost, and a bounded pilot |

## How it connects

- **quirq.** xo-space already materializes three of the five things a unit of
  work needs: the workspace, the durable result and the spend side of the
  budget. It cannot yet verify: it has no definition-of-done evaluator and no
  budget that can refuse
  ([§21](../report/2026-10-15-xo-space-control-plane.md#21-what-this-means-for-quirq)).
- **Memory.** A memory engine would plug into `memory/`, beside `PROGRESS.md`,
  in a folder that survives a runtime switch
  ([§21](../report/2026-10-15-xo-space-control-plane.md#21-what-this-means-for-quirq)).
- **Space Walk.** The profiler of this OS reads the same native logs as the
  watcher, with zero coupling today. A `sessionslist.json` row already carries
  everything needed to hand it a session
  ([§4.3](../report/2026-10-15-xo-space-architecture.md#4-3-converging-with-space-walk)).
- **Human rescue.** In the proposed Liveblocks integration, a comment that
  mentions an agent reaches it as a prompt: the human-rescue channel quirq's
  `C_total` needs to account for
  ([§08](../report/2026-10-15-liveblocks-for-xo-space.md#08-building-and-sharing-a-space-autonomously)).

## Open questions

Tracked as issues on this repo:
[#37 attribution loss and subagents](https://github.com/quirq-ai/research/issues/37),
[#24 one provider-neutral session record](https://github.com/quirq-ai/research/issues/24),
[#31 measuring human rescue](https://github.com/quirq-ai/research/issues/31),
[#32 long-lived session manager](https://github.com/quirq-ai/research/issues/32) and
[#23 memory-ablation trial](https://github.com/quirq-ai/research/issues/23).
The architecture report leaves seven decisions to the operator, from whether
Plane A is dead to what the CLI is called
([§2.10](../report/2026-10-15-xo-space-architecture.md#2-10-the-lean-redesign)).
The Liveblocks reading has not confirmed whether a presence-only agent counts
toward the meter
([§10](../report/2026-10-15-liveblocks-for-xo-space.md#10-sources)).

## Sources

All by Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[xo-space](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/xo-space)
([index.html](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/xo-space/index.html)),
[xo-space-architecture](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/xo-space-architecture)
([index.html](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/xo-space-architecture/index.html)) and
[liveblocks-for-xo-space](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/liveblocks-for-xo-space)
([index.html](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/liveblocks-for-xo-space/index.html)).
