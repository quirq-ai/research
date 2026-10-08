# claude

suraj's research on Claude Code: what a session is made of, where its state lives, how a host drives it, and what an agent OS should own around it.

| | |
|---|---|
| Status | Published |
| Owner | suraj |
| Started | 2026-10-08 |
| Last updated | 2026-10-08 |

Status is one of: Proposed, Researching, Published, Paused, Archived.

## What this topic is

Claude Code is the agent runtime most of suraj's writing builds on. xo-space
drives it, Space Walk replays its logs, the personal memory engine hooks into
it, and quirq counts the work done in its sessions. This topic brings that
research together from
[suraj's writings](https://github.com/sharmasuraj0123/writings), credited and
linked to each original post. Purpose and research action live in
[GOAL.md](GOAL.md).

## Research and findings so far

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
