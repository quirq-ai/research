# Claude Code at a glance

suraj's Claude Code research in one page: what the teardown found, and where
Claude Code shows up across his writings. All of it describes Claude Code
2.1.280, as read in September 2026.

## The claim

> An OS for Claude Code should treat the conversation as the durable object,
> the process as a lease it can revoke and re-grant with the same
> configuration, and the host as a replaceable client of the process.

From [Anatomy of a Claude Code session](../report/2026-10-08-claude-code-session.md).

## In numbers

| | |
|---|---|
| **4** | identities answer to "the session": host, process, conversation, workspace |
| **9** | boot steps, redone on every launch and every resume |
| **19** | transcript record types, four of which matter |
| **120** | command-line options; 63 listed by `--help`, 17 hidden but documented, 40 hidden and undocumented |
| **1,143** | environment variable names read by the binary; the reference documents 368 |
| **82** | top-level keys in one `~/.claude.json`, which every process on the machine shares and rewrites |
| **7** | stages in the permission pipeline for one tool call |
| **66** | control-request subtypes in the stream-json protocol |
| **7** | ways in or out of a running session, and 7 ways to hand work to an app |
| **30** | days, by default, before a transcript is swept; the clock is the file's modification time |

## Where to go next

| Read | For |
|---|---|
| [The teardown](../report/2026-10-08-claude-code-session.md) | The full anatomy, 17 figures, and the friction map for an OS |
| [`~/.claude.json`, key by key](../app/claude-json-explorer/) | Every key of the state file: what it holds, who writes it, what reads it |

## Claude Code across the writings

| Post | What it says about Claude Code |
|---|---|
| [Anatomy of a Codex session](https://quirq.ai/codex-session/) | The companion teardown: Codex CLI 0.155 read the same way, to build a session-based OS around it |
| [Anatomy of an Agent Control Plane](https://quirq.ai/xo-space/#write) | How xo-space drives Claude Code: a `claude` subprocess per turn with stream-json output, a pre-allocated session id, and, when a native login exists, three token variables scrubbed so it wins |
| [XO Space: the architecture](https://quirq.ai/xo-space-architecture/#data) | Claude Code's native logs as one of five stores; the argus daemon tails them into its own SQLite database |
| [The anatomy of Space Walk](https://github.com/sharmasuraj0123/writings/blob/fcdd25f9386db22028dbb2468897bf24f32a7a88/research/spacewalk-architecture/index.html) | Replays Claude Code logs in 3D: lines are sniffed by `sessionId` or type, and `tool_use` is paired with `tool_result` by id |
| [Anatomy of a Personal Memory Engine](https://quirq.ai/personal-memory-engine/#capture) | Four shell hooks on `SessionStart`, `UserPromptSubmit` and `Stop` capture and recall memory, the same scripts for Claude Code and Codex |
| [What is a unit of work?](https://quirq.ai/what-is-quirq/) | Claude Code as one of the runtimes quirq observes, not replaces; its transcripts stay in its own store |

## Open questions

Tracked as issues on this repo:
[#24 shared session record](https://github.com/quirq-ai/research/issues/24),
[#32 session manager](https://github.com/quirq-ai/research/issues/32),
[#33 crash consistency](https://github.com/quirq-ai/research/issues/33),
[#34 tool-call purity](https://github.com/quirq-ai/research/issues/34) and
[#37 attribution loss and subagents](https://github.com/quirq-ai/research/issues/37).

## Sources

All by Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`fcdd25f`:
[claude-code-session](https://github.com/sharmasuraj0123/writings/blob/fcdd25f9386db22028dbb2468897bf24f32a7a88/claude-code-session/index.html),
[claude-json explorer](https://github.com/sharmasuraj0123/writings/tree/fcdd25f9386db22028dbb2468897bf24f32a7a88/claude-code-session/claude-json),
[codex-session](https://github.com/sharmasuraj0123/writings/blob/fcdd25f9386db22028dbb2468897bf24f32a7a88/codex-session/index.html),
[xo-space](https://github.com/sharmasuraj0123/writings/blob/fcdd25f9386db22028dbb2468897bf24f32a7a88/xo-space/index.html),
[xo-space-architecture](https://github.com/sharmasuraj0123/writings/blob/fcdd25f9386db22028dbb2468897bf24f32a7a88/xo-space-architecture/index.html),
[spacewalk-architecture](https://github.com/sharmasuraj0123/writings/blob/fcdd25f9386db22028dbb2468897bf24f32a7a88/research/spacewalk-architecture/index.html),
[personal-memory-engine](https://github.com/sharmasuraj0123/writings/blob/fcdd25f9386db22028dbb2468897bf24f32a7a88/personal-memory-engine/index.html) and
[what-is-quirq](https://github.com/sharmasuraj0123/writings/blob/fcdd25f9386db22028dbb2468897bf24f32a7a88/what-is-quirq/index.html).
