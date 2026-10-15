# claude

suraj's research on coding agents: what a Claude Code or Codex session is made of, where its state lives, how a host drives it, and what an agent OS should own around it.

| | |
|---|---|
| Status | Published |
| Owner | suraj |
| Started | 2026-10-08 |
| Last updated | 2026-10-15 |

Status is one of: Proposed, Researching, Published, Paused, Archived.

## What this topic is

Claude Code is the agent runtime most of suraj's writing builds on. xo-space
drives it, Space Walk replays its logs, the personal memory engine hooks into
it, and quirq counts the work done in its sessions. This topic brings that
research together from
[suraj's writings](https://github.com/sharmasuraj0123/writings), credited and
linked to each original post. Purpose and research action live in
[GOAL.md](GOAL.md).

It also holds suraj's teardown of a Codex session, read the same way as the Claude Code one, with an explorer of the Codex desktop app's global state file, so the two agent runtimes can be compared on the same questions.

## Research and findings so far

### Claude Code sessions

Each finding is suraj's, from his writings at `fcdd25f`; the start is the
[one-pager](output/onepager/2026-10-08-claude-code-at-a-glance.md).

- **A session is four things with four lifetimes: host, process,
  conversation and workspace. Only the conversation, a JSONL file named by a
  UUID, is durable; the process is a lease on it.** Source:
  [Anatomy of a Claude Code session](output/report/2026-10-08-claude-code-session.md).
  Verified: 2026-10-08.
- **Claude Code 2.1.280 has 120 command-line options; 57 are hidden from
  `--help` and 40 of those are undocumented.** Source: the same report, §06.
  Verified: 2026-10-08.
- **`~/.claude.json` is a cache every process shares and rewrites, not a
  config file: 82 top-level keys on one machine, only five documented as
  editable.** Source: the report, §08, and the
  [explorer](output/app/claude-json-explorer/). Verified: 2026-10-08.
- **Transcripts are swept after 30 days by default, counted from the file's
  modification time, so anything an OS indexes can vanish under it.** Source:
  the report, §04. Verified: 2026-10-08.
- **xo-space, Space Walk, the personal memory engine and quirq all build on
  Claude Code sessions; the one-pager links each section.** Source:
  [one-pager](output/onepager/2026-10-08-claude-code-at-a-glance.md).
  Verified: 2026-10-08.

### Codex sessions

Each finding is suraj's, from his writings at `a5a356d`.

- **The word session names several different things: the protocol calls the conversation a thread, a thread contains turns, a turn contains typed items, and the installed build's `sessionId` groups a tree of related threads.** Source: [Anatomy of a Codex session](output/report/2026-10-15-codex-session.md#01-the-word-session-names-several-different-things), §01. Verified: 2026-10-15.
- **A fork and a subagent are different edges: `forkedFromId` records "branched from this history", `parentThreadId` records "spawned under this agent", and a fork is not automatically a subagent.** Source: [Anatomy of a Codex session](output/report/2026-10-15-codex-session.md#02-identity-lineage-and-the-session-tree), §02. Verified: 2026-10-15.
- **A turn is an asynchronous stream: the `turn/start` response identifies the accepted turn and is not its final answer \[Documented\], and after a connection loss the outcome is unknown, so a controller re-reads the thread and its turn state before submitting a side-effecting instruction again.** Source: [Anatomy of a Codex session](output/report/2026-10-15-codex-session.md#05-a-turn-is-an-asynchronous-stream-with-control-points), §05. Verified: 2026-10-15.
- **Disk is a set of stores, not one portable session file: schema-only inspection found date-partitioned JSONL rollout files, a SQLite state database, a logs database and a session-name index \[Local observation\], and copying a JSONL file is not a demonstrated process checkpoint \[OS design\].** Source: [Anatomy of a Codex session](output/report/2026-10-15-codex-session.md#06-disk-is-a-set-of-stores-not-one-portable-session-file), §06. Verified: 2026-10-15.
- **The desktop's `.codex-global-state.json` is separate from those session stores, and the companion explorer maps it recursively: objects become folder pages, leaves become sections, and dynamic identifiers are replaced by placeholders.** Source: [Anatomy of a Codex session](output/report/2026-10-15-codex-session.md#06-disk-is-a-set-of-stores-not-one-portable-session-file), §06, and the [explorer](output/app/codex-json-explorer/). Verified: 2026-10-15.
- **App Server is the control interface: a bidirectional JSON-RPC-style protocol of threads, turns and items in which approvals are server requests, and the documentation marks it experimental and unsupported for production workloads \[Documented\].** Source: [Anatomy of a Codex session](output/report/2026-10-15-codex-session.md#10-app-server-is-the-control-interface), §10. Verified: 2026-10-15.
- **A stored conversation does not run itself: background work needs a scheduler and an available host, and local work requires the computer and app to remain available \[Documented\].** Source: [Anatomy of a Codex session](output/report/2026-10-15-codex-session.md#15-background-work-needs-a-scheduler-and-an-available-host), §15. Verified: 2026-10-15.
- **suraj's design commitment is that Codex owns the mechanics of its agent loop and the surrounding product owns durable intent, routing, decisions and accepted outcomes; the acceptance tests for an adapter on that boundary are proposed and were not executed.** Source: [Anatomy of a Codex session](output/report/2026-10-15-codex-session.md#18-what-must-be-proved-before-the-adapter-can-run-unattended), §18. Verified: 2026-10-15.

### Open questions

Tracked as issues: [#24](https://github.com/quirq-ai/research/issues/24),
[#32](https://github.com/quirq-ai/research/issues/32),
[#33](https://github.com/quirq-ai/research/issues/33),
[#34](https://github.com/quirq-ai/research/issues/34) and
[#37](https://github.com/quirq-ai/research/issues/37).

## Status and progress

- [x] GOAL.md filled in and agreed with the requester
- [x] AGENTS.md filled in
- [x] Research under way
- [x] Findings verified against sources
- [x] Requested outputs published

## Published outputs

| Format | File | Date | Notes |
|---|---|---|---|
| onepager | [Claude Code at a glance](output/onepager/2026-10-08-claude-code-at-a-glance.md) | 2026-10-08 | Key numbers and every place Claude Code appears in the writings |
| report | [Anatomy of a Claude Code session](output/report/2026-10-08-claude-code-session.md) | 2026-10-08 | suraj's teardown of Claude Code 2.1.280, with its 17 figures |
| app | [~/.claude.json, key by key](output/app/claude-json-explorer/) | 2026-10-08 | One page per object of the global state file |
| onepager | [Codex sessions at a glance](output/onepager/2026-10-15-codex-at-a-glance.md) | 2026-10-15 | Key numbers and the claim from the Codex teardown, with links to the report and the explorer |
| report | [Anatomy of a Codex session](output/report/2026-10-15-codex-session.md) | 2026-10-15 | suraj's teardown of codex-cli 0.155.0-alpha.2.6 (desktop-bundled, macOS arm64), with its 14 figures |
| app | [Codex JSON, field by field](output/app/codex-json-explorer/) | 2026-10-15 | One page per object shape of the desktop's `.codex-global-state.json`, as of ChatGPT desktop 26.928.31416 |
