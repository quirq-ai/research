# Codex sessions at a glance

suraj's Codex research in one page: what his teardown of OpenAI's Codex CLI
found, and the explorer for the desktop app's state file. The teardown
describes `codex-cli 0.155.0-alpha.2.6`, desktop-bundled on macOS arm64, as
inspected on 25 September 2026. It rests on help output, generated App Server
types, storage schemas and the official manual; no model-backed session was
launched. The explorer maps one snapshot of that state file from 3 October
2026 and cites the installed ChatGPT desktop bundle, 26.928.31416.

## The claim

> The design commitment is simple: Codex owns the mechanics of its agent
> loop; the surrounding product owns durable intent, routing, decisions, and
> accepted outcomes. That boundary lets Space offload work without making its
> own identity and reliability depend on the lifetime of a chat window.

From [Anatomy of a Codex session](../report/2026-10-15-codex-session.md#18-what-must-be-proved-before-the-adapter-can-run-unattended), §18.

## In numbers

| | |
|---|---|
| **2** | lineage edges on a thread: `forkedFromId` for "branched from this history", `parentThreadId` for "spawned under this agent" |
| **10** | recent rollout files read for keys and record discriminators only (local observation) |
| **0 or 1** | canonical project per thread in the experimental schema; a project can have many threads and multiple ordered roots |
| **4** | layers answer four questions: instructions, configuration, tool registration and permissions (documented) |
| **2** | graphs a session-based OS needs: conversational lineage, and work dependency kept in the product |
| **5** | minutes: the documented maximum wait for a hosted session's environment to connect |
| **1 of 3** | a live worker, a durable schedule, a durable work item: a process running in the background supplies only one (OS design) |
| **2** | directions of offloading: Space drives Codex, and Codex calls Space through proposed tools such as `submit_work` (proposed integration) |

## Where to go next

| Read | For |
|---|---|
| [The teardown](../report/2026-10-15-codex-session.md) | The full anatomy in 19 sections and 14 figures, from thread identity to the proposed data model and acceptance suite |
| [Codex JSON, field by field](../app/codex-json-explorer/) | The desktop's `.codex-global-state.json`: observed field types, owning writers, project and thread associations, and cached schemas |

## How it connects

- **Claude Code.** The teardown is the companion to
  [Anatomy of a Claude Code session](../report/2026-10-08-claude-code-session.md),
  summarized in [Claude Code at a glance](2026-10-08-claude-code-at-a-glance.md).
  Its purpose is to make Codex legible enough to build a session-based
  operating system around it.
- **Space.** The anatomy is for designing an operating system that can route
  work into Space and other products.
  [§16](../report/2026-10-15-codex-session.md#16-two-directions-of-offloading-space-drives-codex-codex-calls-space)
  proposes an adapter with two directions.
  [§17](../report/2026-10-15-codex-session.md#17-a-minimal-data-model-for-a-session-based-os)
  proposes a data model of WorkItem, Attempt, Observation, Decision and
  Artifact that keeps intent independent from execution. The report did not
  test either.

## Open questions

The report names what it did not establish
([§19](../report/2026-10-15-codex-session.md#known-disagreements-and-open-questions)):
crash-consistent backup and restore, cross-version transcript compatibility,
the runtime behavior of experimental methods, whether every item type is
retained in every history mode, cross-surface session discovery, native
desktop-to-hosted session import, end-to-end Space execution, and deployment
latency, cost or throughput. The documentation and the bundled alpha already
disagree about history pagination. The acceptance suite in
[§18](../report/2026-10-15-codex-session.md#18-what-must-be-proved-before-the-adapter-can-run-unattended)
was not executed.

Tracked as issues on this repo:
[#24 provider-neutral session record](https://github.com/quirq-ai/research/issues/24)
asks whether one schema with the §17 records can round-trip both Claude Code
and Codex sessions through forks, compaction and resume without losing
evidence.
[#32 session manager](https://github.com/quirq-ai/research/issues/32),
[#33 crash consistency](https://github.com/quirq-ai/research/issues/33) and
[#37 attribution loss and subagents](https://github.com/quirq-ai/research/issues/37)
also draw on this teardown.

## Sources

All by Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[codex-session](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/codex-session/index.html)
(post folder:
[codex-session](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/codex-session))
and the
[codex-json explorer](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/codex-session/codex-json).
