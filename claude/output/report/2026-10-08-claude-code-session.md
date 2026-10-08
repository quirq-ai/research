# Anatomy of a Claude Code session

A Claude Code session is a conversation file named by a UUID, and the process you talk to is only a lease on it. This is a teardown of Claude Code 2.1.280 for building an OS around it: what a session is made of and where each part lives on disk, all 120 command-line options (57 of them hidden), the global state file every process rewrites, the stream-json and control protocol a host uses to drive a session, the six other ways into a running one, the ways Claude hands work to other programs, and the friction map for an OS that owns what the process forgets.

By **Suraj Sharma**, XO Labs · Applied Agent Research. First published 24 September 2026 as [Anatomy of a Claude Code session](https://quirq.ai/claude-code-session/). Subject: Claude Code 2.1.280 (desktop build, macOS arm64).

Source: [`claude-code-session/index.html`](https://github.com/sharmasuraj0123/writings/blob/fcdd25f9386db22028dbb2468897bf24f32a7a88/claude-code-session/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `fcdd25f`. Brought into this repo on 2026-10-08 with its text, tables and figures unchanged; only the format moved from HTML to Markdown. The post's badges appear as *[from the docs]*, *[from the binary]*, *[measured]*, *[from the tree]* and *[reconstruction]*. Links into the `~/.claude.json` explorer open this topic's [copy of it](../app/claude-json-explorer/).

> **How to read the badges**
>
> *[from the docs]* marks facts from Anthropic's Claude Code documentation as published on 24 September 2026, paraphrased, with a link to the section. *[from the binary]* marks facts read from the Claude Code 2.1.280 executable: its help text, and the strings and schemas in the JavaScript it embeds. Much of that is undocumented and can change in any release. *[measured]* marks counts and observations from one machine's files and processes, and from small live runs. *[from the tree]* marks XO's own code. *[reconstruction]* marks inference and design. The closing provenance note says what was not verified.

## 01 · What a session is

A Claude Code session is a conversation with an identity. The identity is a UUID. The conversation is an append-only file keyed by that UUID and by the directory it started in. Everything else, including the process you think of as "Claude Code", is a lease on that file that can end at any moment and be taken out again.

The official definition is one sentence: a session is a saved conversation tied to a project directory \[[docs: sessions](https://code.claude.com/docs/en/sessions)\] *[from the docs]*. That is accurate and incomplete. Four different things answer to "the session", each with its own identifier and lifetime, and most of the friction in building on Claude Code comes from treating two of them as one. Figure 1 separates them, using this session, the one that wrote this post, as the example.

**Figure 1. One session, four identities: host, process, conversation, workspace**

![Four stacked bands. The host, such as a terminal, the desktop app, an SDK app or xo-space, spawns and holds the process. The process has a pid, a registry file and a socket, and lives for one launch. It writes the conversation, identified by a session UUID and a JSONL file, which lives until the retention sweep. The conversation runs in a workspace, identified by its absolute path, which supplies instructions, settings and trust. Cardinalities are noted between the bands.](2026-10-08-claude-code-session/fig-01-four-layers.svg)

Live values from this session's registry file and environment *[measured]*. Only the orange band is durable. A host that loses its process has lost nothing but configuration; a host that loses the conversation file has lost the session.

### The four identities, and how they come apart

**The conversation** is the session in the sense that matters. Its `sessionId` is a UUID chosen at launch, or supplied by the caller with `--session-id`. It names the transcript file and the per-session folders beside it, and it is what `--resume` takes. It survives any number of processes. It can be *resumed* (continue appending), *forked* (`--fork-session` or `/branch` copy the history into a new UUID), or *replaced* in place (`/clear` starts a new UUID in the same process).

**The process** is one run of the `claude` binary serving one conversation at a time. It registers itself in `~/.claude/sessions/<pid>.json` with its `sessionId`, `cwd`, `version`, `entrypoint`, `kind`, a `status` of `busy` or `idle`, and the path of its inbox socket, and deletes the file when it exits *[measured]*. Everything not written to the transcript lives here and dies here: MCP connections, flags the launch passed, "allow for this session" grants, running background tasks.

**The host** is whatever launched the process and holds its standard streams. A terminal renders the TUI. The desktop app keeps its own record per session, keyed `local_<uuid>`, and passes that key down as `hostSessionId`. An SDK app holds a `Query`. xo-space holds nothing between turns; it spawns a new process for each one and maps its own session key to the native UUID \[[§ Driving a session](#10-driving-a-session-the-stream-json-protocol)\]. The transcripts on this machine name four entrypoints: `claude-desktop` (84 sessions), `sdk-cli` (110, mostly an automation's headless runs), `sdk-ts` (12), and `local-agent` for the desktop app's Cowork mode *[measured]*.

**The workspace** is the directory the process starts in, plus any directories added with `--add-dir`. It decides which `CLAUDE.md`, `.claude/` settings, skills, agents and `.mcp.json` load, whether the folder is trusted, and which project folder the transcript is filed under. Several conversations share one workspace; a conversation keeps the workspace it started in even when its process later changes directory.

> **The claim this post defends**
>
> An OS for Claude Code should treat the conversation as the durable object, the process as a lease it can revoke and re-grant with the same configuration, and the host as a replaceable client of the process. The rest of this post is the anatomy that claim rests on: how a process boots and runs a turn (§ [2](#02-boot-from-argv-to-the-init-message), [3](#03-one-turn-unrolled)), what it leaves on disk (§ [4](#04-where-a-session-lives-on-disk), [5](#05-the-transcript-is-a-graph)), every flag and setting that shapes it (§ [6](#06-every-flag-by-what-it-controls), [7](#07-settings-environment-and-who-wins), [8](#09-permissions-the-decision-pipeline)), the ways an app drives it and it drives apps (§ [9](#10-driving-a-session-the-stream-json-protocol) to [12](#13-how-claude-hands-work-to-your-app)), and what the OS should own (§ [13](#14-friction-and-what-the-os-should-own)).

## 02 · Boot: from argv to the init message

Before the first token, a launch settles nine things in a fixed order: the command, the configuration, the credential, the folder's trust, the process's registration, the startup hooks, the context, the tool servers, and the announcement. All nine are redone on every launch, including every resume, and each is a place where an OS can put its hand on the session.

**Figure 2. Nine steps from argv to system/init, and the lever an OS holds at each**

![Nine boxes in two rows. Row one: parse argv and environment, resolve settings, choose a credential, decide folder trust, register the process. Row two: run Setup and SessionStart hooks, assemble the context, connect MCP servers and plugins, and emit the system init message. Under each box, in orange, the lever an OS controls at that step.](2026-10-08-claude-code-session/fig-02-boot.svg)

Order and levers from the settings, authentication, headless and hooks references; the `--await-initialize` behaviour from the schema descriptions in the 2.1.280 binary. Orange text is what a host controls at each step. Step 9 is the first moment a host can learn the session's ID from the process itself, unless it chose the ID with `--session-id`.

### Configuration and credential

Settings resolve top down: managed policy, then command-line arguments including `--settings`, then `.claude/settings.local.json`, then `.claude/settings.json`, then `~/.claude/settings.json`. Scalars take the highest value; lists such as `permissions.allow` merge across files. Environment variables are not a level of their own: each variable that shadows a setting has its own rule \[[docs: settings § Settings precedence](https://code.claude.com/docs/en/settings#settings-precedence)\]. `--setting-sources` removes file levels, and `--bare` removes all three, leaving managed policy and `--settings`.

The credential is the first match in a seven-step list: a cloud provider selected by environment, then `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_API_KEY`, the `apiKeyHelper` script, `CLAUDE_CODE_OAUTH_TOKEN`, an Anthropic profile, and only last the subscription login from `/login`. Under `-p` an API key in the environment is used without asking \[[docs: authentication § Authentication precedence](https://code.claude.com/docs/en/authentication#authentication-precedence)\]. The order explains a class of bug XO has hit repeatedly: a token left in the environment silently outranks a fresh login, which is why xo-space scrubs three variables from every child it spawns before the login can win \[`adapters/claude_code/adapter.py`, `_subprocess_env`\] *[from the tree]*.

### Trust, and what `-p` skips

An interactive session in a new folder shows a trust dialog. A `-p` run or an SDK session never does, and the consequence is asymmetric. Project `permissions.allow` rules are not applied, because they grant capability. But the project's hooks, its `env` block, its helper commands, and every server in its `.mcp.json` are used, with no prompt \[[docs: permissions § What runs before you trust a folder](https://code.claude.com/docs/en/permissions#what-runs-before-you-trust-a-folder)\]. An OS that points `claude -p` at a repository it did not write is running that repository's hooks on its own machine. The remedies are `--setting-sources user`, `--bare`, or `--settings '{"disableAllHooks": true}'` for the run.

### Registration, hooks, context, servers

The process writes its registry file and binds its inbox socket early; the docs say the socket path is exported before any hook runs, `SessionStart` included \[[docs: cross-session messaging § The session's inbox socket](https://code.claude.com/docs/en/cross-session-messaging#the-sessions-inbox-socket)\]. `Setup` hooks run only with `--init`, `--init-only` or `--maintenance`. `SessionStart` hooks run on every start, with a `source` of startup, resume, clear or compact; their plain-text output becomes context, and they can persist environment variables for later Bash calls by writing `export` lines to the file named by `CLAUDE_ENV_FILE`. On this machine those files are `~/.claude/session-env/<sessionId>/sessionstart-hook-1.sh`; 27 of 333 session folders hold one *[measured]*.

The context loaded before the first prompt is the system prompt, `CLAUDE.md` files and unscoped rules, auto memory, the names of MCP tools, and one description per skill and agent \[[docs: context window](https://code.claude.com/docs/en/context-window#what-the-timeline-shows)\]. Tool schemas for MCP servers are deferred and fetched on demand through `ToolSearch`, so a server's cost at boot is its names, not its schemas. Under `-p` with `--mcp-config`, the first turn waits for pending servers up to `MCP_TIMEOUT`, 30 seconds by default, unless a remote server's tool list is cached \[[docs: headless](https://code.claude.com/docs/en/headless#fail-ci-when-a-plugin-or-mcp-server-doesnt-load)\]. In a per-turn design that wait is paid on every turn.

The launch ends with `system/init`, the first line of the stream-json output unless plugin-install or startup-hook events precede it. It names the session, the model, the tool list, each MCP server with its status, the permission mode, the slash commands, skills, plugins and agents, the credential source, the working directory, the version, and a `capabilities` array that hosts should feature-detect on instead of comparing version strings \[[docs: TypeScript reference § SDKSystemMessage](https://code.claude.com/docs/en/agent-sdk/typescript#sdksystemmessage)\]. On 2.1.280 it also carries the inbox socket's path and the auto memory directory. In a long-lived session with stream-json input, the launch instead ends with the response to the host's `initialize` request, and `system/init` is repeated at the start of every turn *[measured]*. A host that did not pass `--session-id` learns the session's identity here, which is why xo-space now pre-allocates the ID: its earlier design recorded the ID from this line, and a client disconnect before the line was processed left the transcript orphaned \[`adapters/claude_code/adapter.py`, `write_preliminary_entry`\] *[from the tree]*.

## 03 · One turn, unrolled

A turn starts when a message leaves the input queue and ends when the model stops asking for tools. In between, the process runs a loop of model requests and tool calls, and every step of that loop is visible to a host and most of it can be intercepted. The loop is the unit an OS schedules, meters and interrupts.

**Figure 3. The loop inside one turn, with its hook points and exits**

![A loop. Inputs from the command line, stdin, the inbox socket, channels, background task notifications and scheduled tasks enter a queue. A message leaves the queue, passes UserPromptSubmit, and becomes a model request. The streamed response is appended one content block per record. If it asks for tools, each call passes PreToolUse and the permission pipeline, runs, and passes PostToolUse; after the batch, PostToolBatch fires and the results go back into the next model request. When the response asks for no tools, the Stop hook runs and a result message ends the turn. Side exits: interrupt, API failure with StopFailure, and compaction.](2026-10-08-claude-code-session/fig-03-turn-loop.svg)

Hook names and their order are from the hooks reference; the one-record-per-content-block writing is measured. Purple boxes are the points where configuration outside Claude Code can act on a turn without being its host.

### What enters the queue

A turn needs a message, and six things can supply one: the prompt on the command line, a `user` line on stdin in stream-json mode, a post to the inbox socket, a channel notification, the completion notice of a background task, and a scheduled task firing. They share one queue. The stream-json input and the socket both accept a `priority` of `now`, `next` or `later` *[from the binary]*, and the transcript records the queue itself as `queue-operation` lines: enqueue, dequeue, and remove, with `absorbed_mid_turn` as the reason when a queued message was folded into the running turn *[measured]*. A message that arrives during a turn is read between tool calls; one that arrives while the session is idle starts a new turn.

### Model requests and tool calls

Each model request carries the recorded system prompt, the tool list, and the history. The response is written to the transcript one content block per record as it arrives, so a single response with a thinking block and three tool calls is four `assistant` records with one `requestId`. If the response asks for tools, every call passes `PreToolUse` and the permission pipeline of [§ Permissions](#09-permissions-the-decision-pipeline), the calls run (in parallel where the tools allow it), `PostToolUse` or `PostToolUseFailure` fires for each, and `PostToolBatch` fires once the whole batch has resolved, before the next model call \[[docs: hooks § Hook lifecycle](https://code.claude.com/docs/en/hooks#hook-lifecycle)\]. The results go back as `user` records and the loop repeats. A subagent is a tool call whose execution is another loop, with its own context window and its own transcript under `<sessionId>/subagents/`.

The turn ends when a response asks for no tools. The `Stop` hook can refuse to let it end and send Claude back to work; on an API failure `StopFailure` fires instead. In stream-json mode a `result` message closes the turn with its duration, number of model round trips, usage, estimated cost, `stop_reason`, and any permission denials. Background shells, subagents and monitors started during the turn keep running after it, and report back later through `task_notification` messages that can start the next turn.

### Ways a turn stops early

- **Interrupt.** A host sends an `interrupt` control request. Since 2.1.205 the response is a receipt listing the messages that were still queued, and with `cancel_queued` it cancels them. SIGINT has the same effect from outside.
- **SIGTERM.** The process kills running Bash process trees, runs `SessionEnd` hooks, and exits with code 143, leaving the turn unfinished with no result recorded. Resuming the session continues that turn \[[docs: headless § Stop a run with SIGTERM](https://code.claude.com/docs/en/headless#stop-a-run-with-sigterm)\].
- **API errors.** Retryable failures emit `system/api_retry` events and are retried; a fallback model list can take over on overload. Of the 73,150 assistant records here, 247 are client-written placeholders for failed requests, most of them authentication and rate-limit errors *[measured]*.
- **Limits.** `--max-turns` and `--max-budget-usd` end a print-mode run with an error result; once the budget is spent, new subagents refuse to start and running background subagents are stopped.
- **Deferral.** Under `-p`, a `PreToolUse` hook can end the process at a single tool call for the host to finish later.

### Compaction is part of the loop, not outside it

When the context approaches the model's limit, the next request is preceded by a compaction: `PreCompact` fires, a summarization request runs over the history, the transcript gets a `compact_boundary` record, and `PostCompact` fires. What comes back afterwards is reconstructed from disk rather than from the conversation: the project `CLAUDE.md` and auto memory, a fresh git status, the current plan, up to five recently used files, and invoked skill bodies up to 5,000 tokens each and 25,000 in total; `SessionStart` hooks matching the `compact` source run again. Context that hooks added earlier is summarized away with everything else \[[docs: context window § What survives compaction](https://code.claude.com/docs/en/context-window#what-survives-compaction)\]. For an OS this is the one point where the session forgets on its own, and `SessionStart` with the `compact` matcher is the one hook that lets the OS put its own state back. The six compactions on this machine each recorded token counts before and after, and which records were preserved verbatim *[measured]*.

## 04 · Where a session lives on disk

A session is spread across about a dozen places on disk, and only one of them is the conversation. The rest are the process's registry entry, its socket, its scratch space, its file snapshots, its spilled tool output, and the host's own record of it. They have different owners, different lifetimes, and different cleanup rules.

Everything in this section was measured on one machine on 24 September 2026, from the files themselves, reporting structure and counts only *[measured]*. The machine is a working one: 205 sessions over four and a half months, mostly run by the desktop app, plus about a hundred headless runs from an inbox automation.

- **1,650** transcript files: 203 sessions, 34 subagents, 1,413 workflow agents
- **901 MB** of JSONL, 164,570 records, zero parse errors
- **19** top-level record types, 36 attachment types
- **12%** of record uuids appear in more than one file

**Figure 4. The files one session owns, grouped by who writes them and how long they last**

![Four groups of paths. Swept with the transcript: the transcript file, the per-session folder with subagent transcripts, workflow records and spilled tool results, file-history snapshots, session-env files, and plans. Live only while the process runs: the registry file, its key file, the inbox socket, and shell snapshots. Project scope: auto memory and the project entry in the global config. Indexes kept by hosts: the desktop app's session records, the background supervisor's roster and job files, and xo-space's session index.](2026-10-08-claude-code-session/fig-04-disk-map.svg)

The groupings and retention rules follow the docs' application data section; the paths and file names were measured here, except `tasks/`, which this machine does not have. The orange file is the only one that has to exist for `--resume` to work. Every other entry can be lost without losing the conversation, and every grey entry is a pointer that can outlive what it points to.

### The folder name is a lossy encoding of the launch directory

The transcript folder is the working directory at launch with every character outside letters and digits replaced by a hyphen, nothing collapsed, so `/.claude-worktrees` becomes `--claude-worktrees`. The docs state the rule and add that names over 200 characters are truncated and suffixed with a hash \[[docs: sessions § Where transcripts are stored](https://code.claude.com/docs/en/sessions#where-transcripts-are-stored)\]; on this machine 202 of 203 transcripts encode their first record's `cwd` exactly, and the longest folder name is 161 characters *[measured]*. The encoding cannot be reversed: the real path has to be read from the `cwd` field inside the records. It is also keyed to the launch directory, so a session that later changes directory keeps writing to the original folder, while some per-session artifacts follow the new one.

A host that owns its sessions should not depend on the derived name at all. Since 2.1.234, setting `CLAUDE_CONFIG_DIR` and `CLAUDE_CODE_PROJECT_DIR_NAME` together pins both the configuration root and the project folder, whatever the working directory; the docs describe exactly this case, a host that gives each embedded session its own configuration directory \[[docs: sessions § Name the project directory yourself](https://code.claude.com/docs/en/sessions#name-the-project-directory-yourself)\]. The Cowork mode of the desktop app already isolates sessions this way: each of its sessions runs against a private `.claude/` configuration directory of its own, credentials included *[measured]*.

### Retention: thirty days since the file was last touched

The sweep deletes transcripts, their per-session folders, file-history, plans, debug logs and session-env entries once they are older than `cleanupPeriodDays`, 30 by default and never less than 1 \[[docs: .claude directory § Cleaned up automatically](https://code.claude.com/docs/en/claude-directory#cleaned-up-automatically)\]. In practice the clock is the file's modification time. Reopening a session appends metadata records (a title, a mode, a last-prompt pointer), which touches the file: 79 of 203 transcripts here were last modified more than a day after their newest timestamped record, and conversations from May are still on disk in September because their files were touched later *[measured]*. The registry in `sessions/` is not swept at all; each file is removed when its process exits. `history.jsonl` and the per-project entries in `~/.claude.json` are never pruned, and here all eleven `lastSessionId` pointers in the latter name transcripts that no longer exist \[[explorer: projects](../app/claude-json-explorer/projects/)\].

Three consequences for an OS. First, a transcript the OS references can disappear under it with no notification, so the OS must either raise `cleanupPeriodDays`, mirror transcripts (the SDK's `sessionStore`), or keep the results it cares about outside the transcript. Second, "last active" must come from record timestamps, not mtimes. Third, every index the OS keeps is one more pointer that can dangle: the desktop app's own records here point at 161 transcripts, of which 78 are gone *[measured]*.

### Plaintext, and heavier than it looks

Transcripts are not encrypted; anything that passed through a tool is in them \[[docs: .claude directory § Plaintext storage](https://code.claude.com/docs/en/claude-directory#plaintext-storage)\]. The measurement shows how literally that holds. A user record carries a `toolUseResult` alongside the model-facing `tool_result`; for an `Edit` it includes `originalFile`, the entire file before the change. Those structured results are 183 MB of the 901, and thinking blocks another 84 MB. The `skill_listing` attachment, re-sent as the skill list changes, is 82 MB. A `prompt_snapshot` attachment stores the full system prompt. Remote Control sessions record the owning account and organization UUIDs in `bridge-session` lines *[measured]*. An OS that indexes, syncs or backs up transcripts is handling source code, secrets that tools printed, and account identifiers, and should scrub before any copy leaves the machine.

## 05 · The transcript is a graph

The `.jsonl` file reads like a log of messages. It is a forest of records linked by `parentUuid`, written one content block at a time, with bookkeeping lines interleaved and, after a fork, whole runs of records copied into other files. Any program that reads it as a list will count some things twice and lose others.

The docs are clear that the format is internal and changes between versions, and they point readers at `/export`, the headless interfaces, and the SDK's session readers instead \[[docs: sessions § Where transcripts are stored](https://code.claude.com/docs/en/sessions#where-transcripts-are-stored)\]. An OS still needs to know the shape, because it decides what an OS can reconstruct after the fact and what it must capture live. What follows is measured over the 1,650 transcripts on this machine, versions 2.1.128 to 2.1.280 *[measured]*.

**Figure 5. Records, the parent chain, and the three things that break a naive reader**

![A vertical chain of ten transcript records on the left: a user prompt, an attachment, three assistant records that share one API request id and hold a thinking block and two tool uses, a tool result, an assistant reply, a compact boundary with no parent but a logical parent pointer, the compact summary, and the continuation. One tool result hangs off the first tool use as a dead-end leaf. On the right, a subagent file whose records are sidechains, four metadata lines that have no uuid, and a forked file that begins with copies of the original records.](2026-10-08-claude-code-session/fig-05-transcript-graph.svg)

A synthetic example with the structure measured across 164,570 records. Three things break a list reader: parallel tool results that hang off earlier records as dead ends (433 of them in main transcripts here), one API response split across up to 18 records, and forks that copy records into new files. The compaction boundary is the one record whose parent pointer is deliberately cut.

### Nineteen record types, four of which matter

Only `user`, `assistant`, `attachment` and `system` records carry a `uuid` and a `parentUuid`, and only they form the graph. They share an envelope: `cwd`, `entrypoint`, `gitBranch`, `isSidechain`, `parentUuid`, `sessionId`, `timestamp`, `type`, `userType`, `uuid`, `version`. The other fifteen types are bookkeeping lines with no identity of their own *[measured]*:

| Type                                          | Records | What it is                                                                                         |
|-----------------------------------------------|---------|----------------------------------------------------------------------------------------------------|
| `assistant`                                   | 73,150  | one content block of a model response; `requestId` and `message.id` group the blocks               |
| `user`                                        | 45,209  | a prompt, or a tool result with the structured `toolUseResult` beside it                           |
| `attachment`                                  | 28,196  | context injected into the turn: hook output, skill listings, reminders, the system prompt snapshot |
| `last-prompt`                                 | 5,648   | the last prompt, and a `leafUuid` pointing at the conversation’s current tip                       |
| `custom-title`, `ai-title`, `agent-name`      | 3,449   | names; re-appended, last write wins                                                                |
| `queue-operation`                             | 2,402   | prompts queued while a turn ran, and when they were absorbed                                       |
| `mode`, `atis-latch`                          | 4,018   | session flags; `mode` was always `normal` here                                                     |
| `bridge-session`                              | 935     | the Remote Control session and sequence number, with account ids                                   |
| `system`                                      | 662     | `stop_hook_summary`, `api_error`, `compact_boundary`, and a few others                             |
| `pr-link`, `frame-link`                       | 487     | pull requests and artifacts the session produced                                                   |
| `file-history-snapshot`, `file-history-delta` | 348     | checkpoint bookkeeping, only from 2.1.260 on                                                       |
| `artifact-*`, `cost-state`                    | 68      | artifact state; persisted cost totals in headless runs                                             |

Two absences are informative. There are no `summary` records, which older readers used to title a session; titles now come from `custom-title` and `ai-title`. And `toolUseResult` is stored for every tool result in a main transcript but only for errors, as a string, in subagent transcripts, so a diff made by a subagent exists only in the model-facing text *[measured]*.

### Seven rules for anything that reads a transcript

1.  **Deduplicate by `uuid`, not by file.** A fork starts with a copy of the source's records under the same uuids; here 12% of uuids appear in two or three files, and copied lines can carry a `sessionId` that does not match their file name.
2.  **Group assistant records by `requestId`.** One response is written as one record per content block, 1 to 18 records, with `apiBlockIndex` counting within it. Main transcripts repeat the final `usage` on every record, so summing records overcounts; subagent transcripts are written while streaming, so earlier records hold partial usage. Take the last record of each request. xo-space learned this the hard way: its reader notes that summing per record over-counted tokens three to seven times \[`adapters/claude_code/visualizer_source.py`\] *[from the tree]*.
3.  **Reattach tool results by `sourceToolAssistantUUID`.** Parallel tool calls produce one assistant record per call, and each result hangs off its own call. Walking parents back from the leaf skips every result but the last.
4.  **Cross compaction with `logicalParentUuid`.** A `compact_boundary` has a null parent by design, and its `compactMetadata` names the preserved segment and the token counts before and after.
5.  **Use record timestamps, and sort.** File order is not time order: timestamps step backwards 1,453 times across the main files here, and metadata lines have no timestamp at all.
6.  **Treat bookkeeping lines as last-write-wins.** A title can be re-appended hundreds of times with one value.
7.  **Prefer the documented readers.** `getSessionMessages()` and its siblings absorb these rules and will change when the format does.

### What a resume rebuilds, and what it does not

Resuming loads the conversation, the model it was using, the agent it was started as, the permission mode on some paths, an active goal, and scheduled tasks that have not expired. A tool that was running when the previous process died is not re-run; Claude continues without its output. What resume does *not* restore is most of the launch: `--mcp-config`, `--settings`, `--plugin-dir`, `--fallback-model` and `--add-dir` must be passed again, while settings files are simply re-read \[[docs: sessions § What a resumed session restores](https://code.claude.com/docs/en/sessions#what-a-resumed-session-restores)\]. The system prompt is the opposite case: it is recorded on the first request and reused verbatim until the next compaction, even if a later launch passes different prompt flags \[[docs: CLI reference § System prompt flags in resumed conversations](https://code.claude.com/docs/en/cli-reference#system-prompt-flags-in-resumed-conversations)\]; on disk, `prompt_snapshot` attachments carry full system prompts *[measured]*. And two processes that resume the same session without forking both append to one file, and their messages interleave. A session, in other words, is durable only in its conversation. Its configuration belongs to whoever launches it, every time.

## 06 · Every flag, by what it controls

Claude Code 2.1.280 accepts far more flags than it lists. The main command defines 120 options; `--help` shows 63 of them. The CLI reference documents 17 of the hidden ones, and the other 40 exist only in the binary. Most of the hidden ones are how the desktop app, the Agent SDK, background sessions and agent teams configure a session, which is exactly the set an OS needs to know.

- **120** options on the main command, plus -h and -v
- **63** listed by --help
- **17** hidden but documented in the CLI reference
- **40** hidden and undocumented

The counts come from the command definitions in the executable, where hidden options are marked with `hideHelp()` *[from the binary]*; the documented set is the CLI reference's flag table \[[docs: CLI reference § CLI flags](https://code.claude.com/docs/en/cli-reference#cli-flags)\], which itself warns that `--help` does not list every flag. In Figure 6, *help* means the flag is listed by `--help`, *docs* means it is hidden from `--help` but documented, and *binary* means it appears in neither and was read from the executable. Undocumented flags can change or disappear in any release; they are listed because the hosts that ship with Claude Code use them.

**Figure 6. All 120 options of claude 2.1.280, grouped by what they control**

| Flag                                                          | What it does                                                                               | Where        |
|---------------------------------------------------------------|--------------------------------------------------------------------------------------------|--------------|
| **Print mode and the stream protocol**                            |                                                                                            |              |
| `-p`, `--print`                                               | Run one non-interactive session and exit; skips the trust dialog                           | help         |
| `--output-format`                                             | `text`, `json` (one result) or `stream-json` (one event per line)                          | help         |
| `--input-format`                                              | `text` or `stream-json`, which keeps the process reading messages from stdin               | help         |
| `--verbose`                                                   | Full turn-by-turn output; required with stream-json output                                 | help         |
| `--include-partial-messages`                                  | Emit `stream_event` token deltas                                                           | help         |
| `--include-hook-events`                                       | Emit hook lifecycle events for every hook, not only startup hooks                          | help         |
| `--forward-subagent-text`                                     | Emit subagents' text and thinking, tagged with `parent_tool_use_id`                        | help         |
| `--replay-user-messages`                                      | Echo stdin user messages back on stdout as acknowledgements                                | help         |
| `--json-schema`                                               | Validate the final answer against a JSON Schema into `structured_output`                   | help         |
| `--prompt-suggestions`                                        | Emit a predicted next prompt after each turn                                               | help         |
| `--max-budget-usd`                                            | Stop when the estimated spend reaches this amount                                          | help         |
| `--max-turns`                                                 | Cap the number of agentic round trips                                                      | docs         |
| `--task-budget`                                               | Tell the model its token budget for the task (API-side)                                    | binary       |
| `--no-session-persistence`                                    | Do not write a transcript; the session cannot be resumed                                   | help         |
| `--bare`                                                      | Skip hooks, plugins, MCP discovery, CLAUDE.md and auto memory; API key auth only           | help         |
| `--await-initialize`                                          | Read the host's `initialize` request from stdin before loading plugins                     | binary       |
| `--sdk-url`                                                   | Speak the SDK stream over a WebSocket instead of stdio                                     | binary       |
| `--session-mirror`                                            | Emit `transcript_mirror` frames for an SDK `sessionStore`                                  | binary       |
| `--enable-auth-status`                                        | Emit `auth_status` messages in SDK mode                                                    | binary       |
| `--init`, `--maintenance`                                     | Run `Setup` hooks with that trigger, then continue (print mode)                            | docs         |
| `--init-only`                                                 | Run `Setup` and `SessionStart` hooks, then exit                                            | docs         |
| **Session identity and continuity**                               |                                                                                            |              |
| `-c`, `--continue`                                            | Reopen the most recent conversation in this directory                                      | help         |
| `-r`, `--resume`                                              | Resume by ID, name, or transcript path; no value opens the picker                          | help         |
| `--fork-session`                                              | With a resume, continue under a new session ID                                             | help         |
| `--session-id`                                                | Use this UUID for a new conversation                                                       | help         |
| `-n`, `--name`                                                | Display name, usable as a resume handle                                                    | help         |
| `--from-pr`                                                   | Pick among sessions linked to a pull request                                               | help         |
| `--teleport`                                                  | Pull a cloud session into this terminal                                                    | help         |
| `--resume-session-at`                                         | Resume only up to a given message, discarding what follows                                 | binary       |
| `--resume-drops-turn`                                         | Guard for a truncating resume: name the one turn it may discard                            | binary       |
| `--reply-on-resume`                                           | Query immediately if the resumed transcript ends on a user message                         | binary       |
| `--rewind-files`                                              | Restore files to a user message's checkpoint and exit                                      | binary       |
| `--parent-session-id`, `--correlation-id`                     | Link this process to a parent session or an external request (no help text for the latter) | binary       |
| **Permissions and tools**                                         |                                                                                            |              |
| `--permission-mode`                                           | `default` (alias `manual`), `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`  | help         |
| `--dangerously-skip-permissions`                              | Same as `--permission-mode bypassPermissions`                                              | help         |
| `--allow-dangerously-skip-permissions`                        | Make bypass selectable later without starting in it                                        | help         |
| `--permission-prompt-tool`                                    | Route prompts to an MCP tool, or with `stdio` over the control protocol                    | docs         |
| `--permission-prompts`                                        | `host` (default) or `none`, which denies anything that would prompt                        | help         |
| `--allowedTools`                                              | Rules that run without prompting (does not restrict the tool list)                         | help         |
| `--disallowedTools`                                           | Deny rules; a bare tool name removes the tool                                              | help         |
| `--tools`                                                     | Restrict the built-in tool set                                                             | help         |
| `--restricted`                                                | No command-running tools, file tools confined, only managed and `--settings` config        | help         |
| `--inherit-permission-mode`                                   | A parent's mode, used only when nothing else sets one                                      | binary       |
| `--plan-mode-instructions`                                    | Replace the plan-mode workflow text                                                        | binary       |
| `--enable-auto-mode`                                          | Removed in 2.1.111; auto is now a normal mode                                              | docs         |
| **Model and reasoning**                                           |                                                                                            |              |
| `--model`                                                     | Alias (`fable`, `opus`, `sonnet`, `haiku`) or full model ID                                | help         |
| `--fallback-model`                                            | Comma-separated chain for overload or unavailability                                       | help         |
| `--effort`                                                    | `low` to `max`; the docs add `ultracode`                                                   | help         |
| `--thinking`                                                  | `enabled`, `adaptive` or `disabled`                                                        | binary       |
| `--thinking-display`                                          | `summarized`, `omitted` or `highlights`                                                    | binary       |
| `--max-thinking-tokens`                                       | Deprecated in favour of `--thinking`                                                       | binary       |
| `--betas`                                                     | Extra beta headers (API key auth only)                                                     | help         |
| `--advisor`                                                   | Turn on the server-side advisor tool with a given model                                    | docs         |
| `--autocompact`                                               | Auto-compact window for this session, `auto` or 100k to 1M tokens                          | help         |
| **System prompt and first input**                                 |                                                                                            |              |
| `--system-prompt`, `--system-prompt-file`                     | Replace the default system prompt (mutually exclusive)                                     | help, docs   |
| `--append-system-prompt`, `--append-system-prompt-file`       | Append to it                                                                               | help, docs   |
| `--append-subagent-system-prompt`, `-file`                    | Append to every subagent's prompt (print mode)                                             | docs         |
| `--system-prompt-snapshot`                                    | `on` reuses the prompt recorded on the first request; `off` rebuilds it                    | help         |
| `--exclude-dynamic-system-prompt-sections`                    | Move per-machine sections into the first message for cache reuse                           | help         |
| `--prefill`, `--prefill-b64`                                  | Pre-fill the prompt input (no help text)                                                   | binary       |
| `--file`                                                      | Download uploaded file resources into the workspace at start                               | help         |
| **Configuration sources**                                         |                                                                                            |              |
| `--settings`                                                  | A settings file or inline JSON layered over the files (2 MiB cap)                          | help         |
| `--setting-sources`                                           | Which of `user`, `project`, `local` to read                                                | help         |
| `--managed-settings`                                          | Policy-tier settings passed down by a spawning parent                                      | binary       |
| `--project-config-root`                                       | Read project config from this checkout instead of the working directory                    | binary       |
| `--forward-home-settings`                                     | A `true` or `false` switch (no help text)                                                  | binary       |
| `--safe-mode`                                                 | Start with every customization off; auth and permissions normal                            | help         |
| `--disable-slash-commands`                                    | Disable all skills and commands                                                            | help         |
| **Extensions: MCP, plugins, agents, channels**                    |                                                                                            |              |
| `--mcp-config`                                                | MCP servers from files or JSON, added to the configured ones                               | help         |
| `--strict-mcp-config`                                         | Use only the servers from `--mcp-config`                                                   | help         |
| `--plugin-dir`, `--plugin-url`                                | Load a plugin for this session from a path, archive, or URL                                | help         |
| `--plugin-dir-no-mcp`                                         | Load a plugin but leave its MCP servers to the caller                                      | binary       |
| `--agent`, `--agents`                                         | Run as a named agent; define agents inline as JSON                                         | help         |
| `--channels`                                                  | Opt MCP channel servers into this session (research preview)                               | docs         |
| `--dangerously-load-development-channels`                     | Same, bypassing the allowlist, after a confirmation                                        | docs         |
| `--chrome`, `--no-chrome`                                     | Claude in Chrome integration on or off                                                     | help         |
| `--ide`                                                       | Connect to the IDE if exactly one is available                                             | help         |
| `--brief`                                                     | Enable the `SendUserMessage` tool                                                          | help         |
| **Workspace**                                                     |                                                                                            |              |
| `--add-dir`                                                   | Grant file access to more directories (not their configuration)                            | help         |
| `-w`, `--worktree`                                            | Run in a new git worktree under `.claude/worktrees/`                                       | help         |
| `--tmux`                                                      | Open the worktree session in tmux or iTerm2 panes                                          | help         |
| `--ref`, `--on-branch`                                        | Base a cloud session on a ref; a branch hint (no help text for the latter)                 | docs, binary |
| **Background, cloud and remote**                                  |                                                                                            |              |
| `--bg`, `--background`                                        | Start under the background supervisor and return                                           | help         |
| `--cloud`                                                     | Create a cloud session, or with `-p` queue a message into one                              | help         |
| `--environment`                                               | Run the cloud session on a self-hosted pool (`ccpool_…`)                                   | help         |
| `--remote`, `--pool`                                          | Deprecated aliases for `--cloud` and `--environment`                                       | docs, binary |
| `--remote-control`, `--rc`                                    | Start with Remote Control on, optionally named                                             | help, docs   |
| `--remote-control-session-name-prefix`                        | Prefix for generated Remote Control names                                                  | help         |
| `--attach-serve`                                              | Serve an existing session to an attaching client (the desktop app spawns it)               | binary       |
| `--messaging-socket-path`                                     | Choose the inbox socket or named pipe path                                                 | binary       |
| `--watch-artifact`, `--watch-artifact-no-autoreact`           | Watch a published artifact for comments                                                    | binary       |
| `--workload`                                                  | Tag requests for billing attribution                                                       | binary       |
| **Agent teams: set on teammate processes**                        |                                                                                            |              |
| `--agent-id`, `--agent-name`, `--agent-type`, `--agent-color` | A teammate's identity                                                                      | binary       |
| `--team-name`, `--plan-mode-required`                         | Its team, and whether it must plan first                                                   | binary       |
| `--teammate-mode`                                             | `in-process`, `auto`, `tmux`, `iterm2`                                                     | docs         |
| **Deep links and diagnostics**                                    |                                                                                            |              |
| `--deep-link-origin`, `-repo`, `-last-fetch`, `-cwd-b64`      | Context for a session opened from a deep link                                              | binary       |
| `-d`, `--debug`, `--debug-file`                               | Debug logging, optionally filtered by category, optionally to a file                       | help         |
| `-d2e`, `--debug-to-stderr`                                   | Deprecated: debug to stderr                                                                | binary       |
| `--ax-screen-reader`                                          | Flat, screen-reader friendly output                                                        | help         |

Descriptions are mine, condensed from the help text, the CLI reference, and the option descriptions in the binary. Where several flags share a row, they are one feature. The two *help* flags missing from the reference are `--brief` and `--file`.

### The same binary plays other roles

Some arguments never reach the option parser. The entry point checks for them first and turns the process into something other than a session *[from the binary]*: `--daemon-worker`, `--bg-pty-host` and `--bg-spare` are the background supervisor's children, one PTY host per session and pre-warmed spares; `--claude-in-chrome-mcp`, `--chrome-native-host` and `--computer-use-mcp` run the binary as an MCP server or a browser native host; `--exec` with `--bg` runs a shell command as a supervised job; `--update` is rewritten to the `update` subcommand; and `remote-control` (alias `rc`), `daemon`, `self-hosted-runner` and the background verbs are dispatched before `main()` runs. Listing `ps` on a machine with background sessions shows several `claude` processes that are not sessions at all.

### Subcommands

| Command                                                                                                                                        | Purpose                                                                   | Where  |
|------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|--------|
| `agents`                                                                                                                                       | Agent view; `--json` lists live and background sessions                   | help   |
| `attach`, `logs`, `stop` (`kill`), `respawn`, `rm`                                                                                             | Manage a background session by its short ID                               | help   |
| `auth login`, `logout`, `status`                                                                                                               | Credentials; `status` prints JSON and exits 1 when logged out             | help   |
| `setup-token`                                                                                                                                  | Print a long-lived OAuth token for CI                                     | help   |
| `mcp` `add`, `add-json`, `add-from-claude-desktop`, `get`, `list`, `remove`, `login`, `logout`, `reset-project-choices`, `serve`               | Configure MCP servers; `serve` runs Claude Code as an MCP server          | help   |
| `plugin` `install`, `uninstall`, `enable`, `disable`, `list`, `details`, `update`, `prune`, `validate`, `tag`, `init`, `eval`, `marketplace …` | Plugins and marketplaces; most take `--json` and `-y` for scripting       | help   |
| `project purge`                                                                                                                                | Delete one project's transcripts, history lines and config entry          | help   |
| `auto-mode` `config`, `defaults`, `critique`, `reset`                                                                                          | Inspect or reset the auto-mode classifier rules                           | help   |
| `doctor`, `install`, `update`, `import`, `gateway`, `ultrareview`                                                                              | Health, versions, config import, the enterprise gateway, cloud review     | help   |
| `daemon` `run`, `status`, `logs`, `stop`, `uninstall`                                                                                          | The background supervisor; it runs on demand                              | docs   |
| `remote-control` (`rc`)                                                                                                                        | Remote Control in server mode, no local TUI                               | docs   |
| `self-hosted-runner`                                                                                                                           | Host cloud sessions on your own machines                                  | docs   |
| `sandbox install`, `status`; `import-conversations`; `design-login`                                                                            | Sandbox setup, importing conversation exports, the design surface's login | binary |
| `edit-hook`, `edit-permission-rules`, `edit-memory-settings`, `edit-skill-overrides`, `edit-sandbox-settings`, `edit-chrome-settings`          | Settings editors with `--json`, used by the IDE and desktop front ends    | binary |

### Rules that decide whether a combination works

- **Print-only.** `--output-format`, `--input-format`, `--include-partial-messages`, `--forward-subagent-text`, `--json-schema`, `--max-budget-usd`, `--max-turns`, `--no-session-persistence` and `--permission-prompts` only apply with `-p`. `--replay-user-messages` and `--await-initialize` also need stream-json input.
- **Refused together.** `--bg` with `-p`; `--cloud "task"` with `-p`; `--system-prompt` with `--system-prompt-file`; `--tmux` without `--worktree`; `--fork-session` without a resume. xo-space's adapter also treats `--resume` and `--session-id` as exclusive *[from the tree]*.
- **Not remembered.** A resume re-reads settings files but not `--mcp-config`, `--settings`, `--plugin-dir`, `--fallback-model` or `--add-dir`; a host must pass them on every launch.
- **Precedence.** Flags sit above every settings file and below managed policy; `--allowedTools` cannot override a deny rule from any level.

## 07 · Settings, environment, and who wins

A session's behaviour is set in five settings layers, 120 command-line options, a global config file, and more than a thousand environment variable names. The settings layers follow one precedence rule. The environment follows as many rules as it has variables. An OS should drive a session through two channels it controls completely, the command line and a generated settings file, and treat the rest as the user's.

**Figure 7. The settings ladder, and the two rungs a host can write for one session**

![Five stacked layers from highest to lowest precedence: managed policy, the command line including the settings flag, the project's local settings file, the project's shared settings file, and the user's settings file, with built-in defaults below. Arrows mark the two layers a host can write for a single session: managed policy through the SDK's managedSettings, and the command line through a generated settings file. A side column notes that environment variables are not a layer and are decided pair by pair.](2026-10-08-claude-code-session/fig-07-precedence.svg)

Order from the settings reference; scalars take the highest layer, lists such as `permissions.allow` merge, and a deny from any layer wins. The orange rung is the one an OS owns outright: a settings file generated per session and passed with `--settings` overrides every file on disk without editing any of them.

### Settings: write one file per session, edit none

The ladder has two consequences an OS can use. First, a generated `--settings` file is the cleanest place for everything per-session: hooks the OS needs, permission rules, the `crossSessionInbound` policy for a worker, an `apiKeyHelper`, `cleanupPeriodDays`. It overrides the user and project files for that run, and it is one of the flags that must be passed again on resume. Second, a host that embeds Claude Code can supply policy-tier settings of its own through the SDK's `managedSettings` option, carried on the hidden `--managed-settings` flag; on a machine with an administrator's managed settings they are ignored unless that policy opts into merging them \[[docs: permissions § Settings precedence](https://code.claude.com/docs/en/permissions#settings-precedence)\]. Neither requires writing to the user's files, which is what xo-space does today: it edits `~/.claude/settings.json` for its OpenRouter route and `~/.claude.json` to register an MCP server and to pre-accept the trust and Remote Control dialogs \[`adapters/claude_code/remote_control.py`, `registry/agent_settings.py`\] *[from the tree]*.

`~/.claude.json` deserves care because it is not a settings file. It is Claude Code's own state: the OAuth account profile, cached feature flags, usage counters, user- and local-scope MCP servers, and a `projects` map keyed by absolute path that holds each directory's trust decision. Every running Claude Code process rewrites it, under a lock that tools outside Claude Code do not take. The next section takes it apart \[[§ The state file](#08-the-state-file-claude-json)\], and the [explorer](../app/claude-json-explorer/) documents every key.

### The environment: at least 1,143 names

The 2.1.280 binary reads at least 1,143 distinct environment variable names, 1,030 of them from a typed registry. The environment variable reference documents 368; 816 of the names in the binary appear nowhere in it *[from the binary]*. The count is a floor: names built at run time, such as the per-model Vertex region variables, are documented but were not recovered from the code. By the registry's own grouping, the largest classes are session and runtime plumbing (299), feature toggles (279), and detection of the host environment (180). Most are internal. The ones a host should set deliberately are few:

| Variable                                                               | Default              | Why an OS sets it                                                        |
|------------------------------------------------------------------------|----------------------|--------------------------------------------------------------------------|
| `CLAUDE_CONFIG_DIR`                                                    | `~/.claude`          | one config root, credentials and transcripts per tenant or workspace     |
| `CLAUDE_CODE_PROJECT_DIR_NAME`                                         | derived from cwd     | a stable transcript folder; needs `CLAUDE_CONFIG_DIR`, shell env only    |
| `CLAUDE_CODE_TMPDIR`                                                   | `/tmp` on macOS      | where scratchpads and background output go                               |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN` | unset                | set exactly one, or none and use a login; they outrank `/login`          |
| `ANTHROPIC_BASE_URL`                                                   | the Anthropic API    | route through a gateway; the desktop sets it for its sessions *[measured]* |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`                                     | off                  | keep credentials out of Bash, hooks and MCP servers                      |
| `CLAUDE_CODE_SKIP_PROMPT_HISTORY`                                      | off                  | no transcript in any mode, for truly ephemeral work                      |
| `MCP_TIMEOUT`, `MCP_TOOL_TIMEOUT`                                      | 30 s; about 28 h     | startup wait; tool-call ceiling (HTTP requests also stop at 60 s)        |
| `MAX_MCP_OUTPUT_TOKENS`, `BASH_MAX_OUTPUT_LENGTH`                      | 25,000; 30,000 chars | how much of a tool's output Claude gets to read                          |
| `BASH_DEFAULT_TIMEOUT_MS`, `BASH_MAX_TIMEOUT_MS`                       | 2 min; 10 min        | how long a shell command may run in the foreground                       |
| `API_TIMEOUT_MS`                                                       | 10 min               | slow proxies                                                             |
| `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`                                 | 10 min               | how long `-p` waits for background subagents after the result            |
| `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY`                                    | unset                | let an idle SDK-mode process exit by itself                              |
| `DISABLE_AUTOUPDATER`                                                  | off                  | hold a pinned version; the desktop sets it *[measured]* |
| `CLAUDE_CODE_ENABLE_TELEMETRY`, `OTEL_*`                               | off                  | export metrics and events to the OS's collector                          |

Three variables cannot be set through a settings file's `env` block at all: `CLAUDE_CODE_PROJECT_DIR_NAME` is read once from the launching shell, and the inbox socket and its token are exported by Claude Code itself \[[docs: environment variables](https://code.claude.com/docs/en/env-vars)\].

### What Claude Code sets for its children

Every program Claude Code starts inherits a marked environment, which is how an app can tell it is running inside a session and which session it belongs to *[from the binary]*:

| Child                        | Variables added                                                                                                                                                                                                                                      |
|------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Bash and PowerShell commands | `CLAUDECODE=1`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_CHILD_SESSION=1`, `CLAUDE_CODE_SESSION_ATTENDED`, `CLAUDE_PID`, `CLAUDE_EFFORT`, `AI_AGENT`, `CLAUDE_CODE_EXECPATH`, `GIT_EDITOR=true`, the inbox socket and token, `CLAUDE_ENV_FILE` exports |
| Hook commands                | the same base, plus `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, plugin options, and `CLAUDE_ENV_FILE` for the hooks that may write it                                                                                          |
| Stdio MCP servers            | `CLAUDECODE=1`, `CLAUDE_CODE_SESSION_ID` (the ID at spawn), `CLAUDE_PROJECT_DIR`, and the server's own `env`; not the child-session marker                                                                                                           |
| Background sessions          | `CLAUDE_JOB_DIR`                                                                                                                                                                                                                                     |

Two details matter for an OS. `GIT_EDITOR=true` means a git command that would open an editor returns at once instead of hanging. And `CLAUDE_CODE_CHILD_SESSION` is inherited by anything those children start: an interactive `claude` launched from inside a session is kept out of `--resume`, `--continue` and the agent list, while `-p` sessions still persist, and `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE=1` overrides the exclusion \[[docs: environment variables](https://code.claude.com/docs/en/env-vars)\]. An OS server started from a Claude Code terminal passes the marker to every session it spawns unless it removes it. For `-p` children that changes nothing, but an interactive session spawned that way would be missing from the resume picker. xo-space copies its whole environment into each child \[`adapters/claude_code/adapter.py`, `_subprocess_env`\] *[from the tree]*.

## 08 · The state file: ~/.claude.json

Everything Claude Code remembers that is neither a setting nor a conversation sits in one JSON file it writes for itself. On this machine that is 82 top-level keys: an account profile, the trust decision and MCP servers of 72 project roots, 724 cached feature flags, and several dozen counters and one-shot markers. It is the file an OS must seed before the first session starts, and the one it must not edit carelessly while sessions run.

A companion explorer, [~/.claude.json, key by key](../app/claude-json-explorer/), documents every key of that file on its own page: one folder per object, recursively, with every scalar explained on its parent's page and every map whose keys are data (paths, names, ids) reduced to one placeholder entry. It also lists 129 more keys that 2.1.280 knows about and this file does not hold. This section is the summary an OS needs; the explorer is the reference.

- **82** top-level keys; 27 hold objects or arrays, 55 hold scalars
- **72** project entries, 62 of them trusted, never pruned
- **10** top-level keys that no installed build mentions at all
- **5** keys the docs present as yours to edit

**Figure 8. The 82 top-level keys of one ~/.claude.json, by what they hold**

- **Projects and trust** (2 keys · 2 folders): [`projects/`](../app/claude-json-explorer/projects/) (72 roots: trust, local MCP servers, last-session stats), [`githubRepoPaths/`](../app/claude-json-explorer/githubRepoPaths/)
- **MCP servers** (2 keys · 1 folder): [`mcpServers/`](../app/claude-json-explorer/mcpServers/) (user scope) and the claude.ai connectors that ever connected
- **Onboarding and answered dialogs** (5 keys): `hasCompletedOnboarding`, `remoteDialogSeen`, `lastOnboardingVersion`, the Chrome onboarding flag, `hasSeenTasksHint`
- **Preferences** (6 keys): `theme` (a legacy fallback now), Claude in Chrome on by default, `deepLinkTerminal`, three `unpin*LaunchEffort` flags
- **Account and organization** (7 keys · 4 folders): [`oauthAccount/`](../app/claude-json-explorer/oauthAccount/), [`cachedArtifactRoster/`](../app/claude-json-explorer/cachedArtifactRoster/), guest-pass and consumer-terms caches, Fast mode and usage-credit status
- **Flags and experiments** (5 keys · 3 folders): [724 cached feature flags](../app/claude-json-explorer/cachedGrowthBookFeatures/), experiment assignments, [`clientDataCacheSlots/`](../app/claude-json-explorer/clientDataCacheSlots/)
- **Models** (6 keys · 2 folders): extra `/model` options, costs and access, the organization's default model, auto-compact windows
- **Identity** (3 keys): `userID`, `machineID`: random 64-hex ids generated on first use; `firstStartTime`
- **Tips, notices and upsells** (15 keys · 4 folders): `numStartups` (the clock they count in), `tipsHistory/`, `seenNotifications/`, four impression counters
- **Usage and session bookkeeping** (3 keys · 3 folders): `skillUsage/`, `pluginUsage/`: counts per name; `replBridgePlaceholders/`: open Remote Control sessions
- **Install, updates and migrations** (16 keys): `installMethod`, `migrationVersion` (14), migration markers, marketplace auto-install, Terminal.app setup
- **Unread** (12 keys · 5 folders): five retired maps such as `cachedStatsigGates/` and `toolUsage/`, `anonymousId`, four old markers, and two keys 2.1.280 only deletes or resets

Green cards hold decisions that change behaviour; blue cards hold caches of server data; purple cards hold Claude Code's own bookkeeping; the white card holds keys no Claude Code build on this machine reads (2.1.183 through 2.1.281): ten that none of them mentions, and two that 2.1.280 only deletes from memory or resets at logout. They stay because saves keep keys they do not know. Counts were measured on one file on 28 September 2026 *[measured]*; meanings are read from the 2.1.280 binary. Folder links open the explorer.

### A cache, not a config file

The docs describe `~/.claude.json` as a file Claude Code "writes for itself": sign-in state, MCP servers, per-project state such as trust, and the few global keys that `/config` writes \[[docs: settings](https://code.claude.com/docs/en/settings)\]. Only five keys are documented as editable: `autoConnectIde`, `autoInstallIdeExtension`, `copyOnSelect`, `diffTool` and `externalEditorContext` \[[docs: settings reference § Global config settings](https://code.claude.com/docs/en/settings-reference#global-config-settings)\]. Sixteen keys that used to live here, `theme` and `verbose` among them, now live in `settings.json`; this file is only their fallback when no settings file sets them *[from the binary]*.

Two rules make the file hard to read by eye. Claude Code spreads the file over a built-in defaults object when it loads it, and drops every top-level key equal to its default when it saves, so a missing key usually means "default", not "never set". And every save keeps keys it does not recognise, so the file accumulates state from every release that ever ran against it. Ten top-level keys and four per-project keys here appear in no installed build at all, and two more are only ever deleted or reset *[measured]*. One of those per-project keys, `lastSessionFirstPrompt`, is by its name the first prompt of a project's last session, kept in plain text long after the release that wrote it.

Most of the per-project entry is not what it looks like either. The twenty `last*` keys 2.1.280 writes per project (cost, durations, tokens, lines changed, per-model usage, UI and hook latency histograms) look like a resume cache. In 2.1.280 they are written when an interactive session ends and read once, at the next startup in the same project, to send one analytics event. `/cost` and `--resume` do not use them *[from the binary]*. The keys that change behaviour are few: `hasTrustDialogAccepted`, the local-scope `mcpServers`, and `hasClaudeMdExternalIncludesApproved`.

### One file, many writers

Every Claude Code process on the machine shares the file. Each reads it once at startup, keeps it in memory, and polls its modification time every second to pick up other processes' writes. Each change is a function applied under a lock directory, `~/.claude.json.lock`, to a fresh read of the file, so two sessions changing different keys both land *[from the binary]*. Figure 9 draws the path and its two holes: when the lock cannot be had, the save falls back to an unlocked write in which the last writer wins for the whole file, and at exit, session stats are written synchronously with no lock at all.

**Figure 9. How one save reaches ~/.claude.json, and the two unlocked paths**

![A change is queued per file, takes the lock directory ~/.claude.json.lock, and under the lock re-reads the file, applies the change, puts back missing project entries, strips retired and default keys, backs up at most once a minute and writes through a temp file and rename. If the lock is not taken, a fallback writes without it, except when only counters changed or the login would be lost. At exit, stats are written with no lock. Other processes poll the file every second and reload it.](2026-10-08-claude-code-session/fig-09-state-write.svg)

The locked path is safe against other Claude Code processes, because each save re-applies its change to what it reads under the lock. The two red paths are not: the fallback and the exit write can replace a save that landed a moment earlier. Anything outside Claude Code that edits the file without taking the same lock is a third red path. Read from the 2.1.280 binary; nothing here was fault-injected.

A file that is not strict JSON stops Claude Code cold: a `-p` or SDK run exits with code 1, and an interactive start shows a "Configuration error" dialog that offers to exit or to reset the file to defaults. The broken copy is saved as `backups/.claude.json.corrupted.<ms>`; restoring an earlier backup is a manual `cp` *[from the binary]*.

### What an OS should do with it

The file's path is fixed once per process: `~/.claude.json` by default, `$CLAUDE_CONFIG_DIR/.claude.json` when that variable is set, which moves it even when the variable points at `~/.claude`. An OS should use that. xo-space today edits the user's own file from three places, a `jq` step in `setup.sh` and two Python helpers, to seed onboarding, the Remote Control dialog, and trust on the home directory. All three replace the file atomically; none takes the lock. The trust seed also relies on inheritance that stops short: the parent walk ends at the nearest repository root, so a repository under a trusted home directory still gets its own trust dialog, and its own permission grants still need its exact key \[`config/agents/claude_code/setup.sh`, `adapters/claude_code/remote_control.py`, `routers/auth/claude_setup_token.py`\] *[from the tree]*. The rules that follow from the binary:

| Do                                                                                                                                 | Why                                                                                                                                                                                                             |
|------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| One `CLAUDE_CONFIG_DIR` per workspace, set in the launching environment                                                            | Keeps identity, trust and the never-pruned `projects` map per workspace, and stops every process from re-parsing a file every other process rewrites. Anthropic's self-hosted runner does the same per session. |
| Seed before the first process starts: `hasCompletedOnboarding`, `projects[<repo root>].hasTrustDialogAccepted`, `remoteDialogSeen` | Onboarding runs until the first is true, even with valid credentials. A repository's own permission grants need trust on the exact key; a trusted parent does not count.                                        |
| Put `theme` and `skipDangerousModePermissionPrompt` in `settings.json`                                                             | Both moved out of this file; values here are migrated or used only as a fallback.                                                                                                                               |
| Leave out `userID`, `machineID`, `remoteControlMachineId`, `summonSidKey`, `oauthAccount`                                          | Claude Code generates or fetches them; a template that copies them makes many workspaces look like one machine and one account.                                                                                 |
| Edit a live file only under `~/.claude.json.lock`                                                                                  | An atomic rename without the lock can still lose a concurrent save, or be lost to one.                                                                                                                          |
| Treat the file as a secret                                                                                                         | It can hold an email address and organization name, MCP URLs and headers with tokens, the last 20 characters of approved API keys, and old prompt text.                                                         |

One more reason to generate settings rather than hand them over: until `migrationVersion` reads 14, every command first runs a set of thirteen migrations, and several of them rewrite `~/.claude/settings.json`. They turn an old `autoUpdates: false` into `DISABLE_AUTOUPDATER`, copy legacy preferences out of this file, and rename model ids *[from the binary]*. The explorer lists them \[[explorer: migrations](../app/claude-json-explorer/#migrations)\], along with the host rules above \[[explorer: what a host should do](../app/claude-json-explorer/#host)\] and what `claude project purge` removes \[[explorer: projects](../app/claude-json-explorer/projects/#purge)\].

## 09 · Permissions: the decision pipeline

Every tool call passes through one pipeline, and the last stage of that pipeline is a question someone has to answer. Whoever answers it owns the session's autonomy. For an OS built on Claude Code, that seat is the most important one to take.

The pipeline has seven stages, and the order is fixed by the permissions and hooks references \[[docs: permissions](https://code.claude.com/docs/en/permissions#extend-permissions-with-hooks), [hooks § PermissionRequest](https://code.claude.com/docs/en/hooks#permissionrequest)\] *[from the docs]*. Figure 10 draws it. Three facts about the order matter more than the rest.

**Deny wins everywhere.** A deny rule from any scope beats an allow from any other scope, including an allow passed on the command line, and deny rules apply even in `bypassPermissions`. Allow rules, on the other hand, do nothing in `bypassPermissions`, because there is nothing left for them to skip. Lists such as `permissions.allow` merge across files rather than override each other \[[docs: settings § Lists merge](https://code.claude.com/docs/en/settings#lists-merge-instead-of-overriding)\].

**Hooks run first, but cannot outvote a rule.** A `PreToolUse` hook sees every call before any rule is checked. Exit code 2 blocks the call outright, before the rules run. A hook that returns `allow` only skips the prompt: deny and ask rules are still evaluated afterwards. The hook can also rewrite the call with `updatedInput`, and the rules then judge the rewritten input, not the one Claude produced \[[docs: hooks § PreToolUse decision control](https://code.claude.com/docs/en/hooks#pretooluse-decision-control)\]. When several hooks disagree, the order is `deny` \> `defer` \> `ask` \> `allow`.

**The last stage is a transport, not a dialog.** In a terminal the question becomes a dialog. Under `-p` it goes to a *permission host*: an Agent SDK app's `canUseTool` callback, or an MCP tool named with `--permission-prompt-tool`. The desktop app passes the literal value `stdio`, which routes each question over the same stream-json pipe it already reads \[[§ Driving a session](#10-driving-a-session-the-stream-json-protocol)\] *[measured]*. With `--permission-prompts none` nobody is asked: anything that would have prompted is denied, Claude is told not to retry, and tools that need a human, such as `AskUserQuestion`, are removed from the session \[[docs: headless § Turn off permission prompts](https://code.claude.com/docs/en/headless#turn-off-permission-prompts-in-unattended-runs)\].

**Figure 10. One tool call, seven stages, three exits**

![Seven stages from left to right: tool in context, PreToolUse hooks, permission rules, mode baseline, the auto-mode classifier, PermissionRequest hooks, and asking the host. Green arrows rise from stages three to seven to a top lane where the tool runs. Red arrows fall from every stage to a bottom lane where the call is denied and the reason goes to Claude. A dashed purple arrow from the PreToolUse stage leads to a deferred exit that only exists in print mode.](2026-10-08-claude-code-session/fig-10-permission-pipeline.svg)

The order is sourced; the drawing is mine. Stages 2 and 6 (purple) are hooks, which an OS can install without touching Claude Code. Stage 7 (orange) is the seat an OS should occupy: it is the only stage that can bring a human, a policy engine, or a phone into the loop. A hook's `allow` at stage 2 does not skip stage 3, which is why deny rules are the one control a hook can never undo.

### Six modes, one of which is not a mode

The mode sets the baseline at stage 4. `default`, which the interface now labels Manual and which accepts `manual` as an alias since 2.1.200, runs reads and asks about everything else. `acceptEdits` adds file edits and a set of filesystem commands inside the working directories. `plan` keeps Claude read-only. `auto` sends what would have prompted to a classifier instead of a person. `dontAsk` denies whatever would have prompted, which is the right mode for a locked-down CI job. `bypassPermissions` skips prompts entirely \[[docs: permission modes](https://code.claude.com/docs/en/permission-modes#available-modes)\].

Even `bypassPermissions` keeps a short list of actions that no mode approves on its own: calls matched by an explicit ask rule, tools that need a human (`AskUserQuestion` and MCP tools flagged `requiresUserInteraction`), `rm` and `rmdir` on critical paths, and the cross-session messaging safeguards. That last item bites an OS directly, and [the section on other doors](#12-the-other-doors-into-a-session) returns to it: a session running in `bypassPermissions` holds messages from other sessions for approval by default, and a `-p` worker that cannot show the approval dialog drops them after `dialogExpiry`, five minutes unless changed \[[docs: cross-session messaging § Control inbound messages](https://code.claude.com/docs/en/cross-session-messaging#control-inbound-messages)\].

Which mode a new session starts in is decided by, in order: the `--permission-mode` flag, `--dangerously-skip-permissions`, `permissions.defaultMode` in settings, and then a built-in default. For `-p` the built-in default is Manual on every plan, so an unattended run that sets nothing will stop at the first write \[[docs: headless § Auto-approve tools](https://code.claude.com/docs/en/headless#auto-approve-tools)\]. A resumed session restores its mode only on some paths: a terminal `--resume` restores it, but `-p --resume` starts in whatever a fresh `-p` run would, and a session that ended in `bypassPermissions` never restores that mode \[[docs: sessions § Permission mode on resume](https://code.claude.com/docs/en/sessions#permission-mode-on-resume)\]. A host that resumes sessions must therefore pass the mode again on every launch.

### Who can sit in the host's seat

| Host            | How the question arrives                                                    | How the answer returns                                                                             |
|-----------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| Terminal        | A dialog in the TUI                                                         | Keystroke; "don't ask again" writes a rule to `.claude/settings.local.json` at the repository root |
| Agent SDK app   | `control_request` with subtype `can_use_tool` on stdout                     | `control_response` on stdin; the SDK surfaces it as the `canUseTool` callback                      |
| Desktop app     | Same pipe, launched with `--permission-prompt-tool stdio`                   | Same pipe *[measured]* |
| MCP prompt tool | A call to the tool named in `--permission-prompt-tool`                      | The tool's result; it cannot approve tools that require user interaction                           |
| Channel relay   | a channel `permission_request` notification with a five-letter `request_id` | a channel `permission` notification with `behavior`; first answer wins against the terminal        |
| Nobody          | `--permission-prompts none`                                                 | Denied; a `PermissionRequest` hook can still allow                                                 |

Two hook-level escapes complete the picture. A `PermissionRequest` hook fires exactly when a prompt is about to open, and can answer for the user with `decision.behavior`, attach `updatedPermissions` that add rules or switch the mode, and choose whether those changes persist to a settings file or last only for the session \[[docs: hooks § Permission update entries](https://code.claude.com/docs/en/hooks#permission-update-entries)\]. And under `-p`, a `PreToolUse` hook may return `defer`: the tool does not run, the process exits with `stop_reason: "tool_deferred"` and the pending call in `deferred_tool_use`, and the caller resumes the session later, when the same hook fires again and can answer. Deferral has no timeout; it lasts until the transcript ages out. It only works when the turn made a single tool call \[[docs: hooks § Defer a tool call for later](https://code.claude.com/docs/en/hooks#defer-a-tool-call-for-later)\]. That is the primitive an OS needs to turn a blocking question into an inbox item that someone answers tomorrow.

> **What XO does today**
>
> xo-space and xo-cowork-api launch every turn with `--dangerously-skip-permissions` \[`xo-space/services/cowork_agent/adapters/claude_code/adapter.py`\] *[from the tree]*. That collapses stages 4 to 7 into a single yes: hooks and deny rules still run, but nothing is ever asked, and nobody could answer if it were. It also puts every XO worker in the bypassing class for cross-session messaging, so a message from a session that does not bypass is held and, in a `-p` worker, dropped after five minutes. The fix is not a different flag. It is to take stage 7.

## 10 · Driving a session: the stream-json protocol

Exactly one process can steer a session in full: its parent, through stdin and stdout. The desktop app, the Agent SDK and xo-space all use that pipe. The difference between them is whether the process lives for one turn or for the whole conversation, and whether the parent answers the questions the process sends back.

### The reference host is already installed

The desktop app is the most complete host on this machine, and its launch line can be read from the process table. Shortened, with the model and effort it happened to use *[measured]*:

    claude --output-format stream-json --verbose --input-format stream-json
           --include-partial-messages --replay-user-messages
           --await-initialize --permission-prompt-tool stdio
           --permission-mode auto --effort max --model claude-opus-5-5
           --thinking-display omitted --setting-sources=user,project,local
           --allowedTools <38 of the app's own MCP tools>
           --disallowedTools SubscribePR
           --settings '{"deniedMcpServers":[<48 names>]}'

Read flag by flag, it is a design. Stream-json in both directions keeps one process alive for the whole conversation. With `--await-initialize` the process reads the host's `initialize` request before loading plugins, so the host can hand over hooks, in-process MCP servers, agents and plugins up front. `--permission-prompt-tool stdio` sends every permission question back up the pipe as a control request. `--replay-user-messages` echoes each input line as an acknowledgement, and `--include-partial-messages` streams tokens. The allowlist pre-approves the host's own tools, and the denylist in `--settings` stops the user's configured MCP servers from shadowing the app's built-in ones, such as `computer-use` and `claude-in-chrome`. The Agent SDK assembles the same line: it always passes the three stream flags, turns a `canUseTool` callback into `--permission-prompt-tool stdio`, and adds `--await-initialize` when plugins travel in the initialize request *[from the binary]*.

### The wire

Both directions carry one JSON object per line. The schema module in the binary names the allowed stdin types: `user` messages, `control_request`, `control_response`, `control_cancel_request`, `keep_alive`, `update_environment_variables`, and three bookkeeping types. It adds two rules: the `initialize` request is optional, and if the first line is a user message the session initializes with defaults; and closing stdin tells the process to finish the current turn and exit *[from the binary]*. Stdout carries 48 message types in the binary's schema, 36 of which the SDK reference documents, plus a handful of internal ones, and the schema tells consumers to ignore types they do not recognize, because the set grows.

    host → claude   {"type":"control_request","request_id":"r1","request":{"subtype":"interrupt"}}
    claude → host   {"type":"control_response","response":{"subtype":"success","request_id":"r1",
                     "response":{"still_queued":[]}}}
    either way      {"type":"control_response","response":{"subtype":"error","request_id":"r2",
                     "error":"Unsupported control request subtype: …"}}
    either way      {"type":"keep_alive"}          {"type":"control_cancel_request","request_id":"r3"}

A user line is `{"type":"user","message":{"role":"user","content":…}}` with optional `uuid`, `priority` (`now`, `next`, `later`) and `shouldQuery`. Setting `shouldQuery` to `false` appends the message without starting a turn; it is folded into the next message that does. That is the documented way for a host to add context it gathered out of band without paying for a model call \[[docs: TypeScript reference § SDKUserMessage](https://code.claude.com/docs/en/agent-sdk/typescript#sdkusermessage)\].

**Figure 11. One turn over the pipe, as a host sees it, including a permission question**

![A sequence diagram between the host on the left and the claude process on the right. The host spawns the process and sends initialize. Startup hook frames and the initialize response come back. The host sends a user message. The process reports it queued and started, emits system init, streams the assistant's tool call, and sends a can_use_tool control request. The host answers allow. The process emits the tool result, the final assistant text, the result message with usage and cost, and a completed lifecycle event. Later the host can send interrupt, and closing stdin ends the process.](2026-10-08-claude-code-session/fig-11-protocol.svg)

Observed on 2.1.280 with the short host below and in the other protocol runs made for this post *[measured]*: the whole exchange took 7.1 seconds and cost about two cents on the small model. Orange arrows are the permission round trip, the part a per-turn host with `--dangerously-skip-permissions` never sees. `system/init` is repeated at the start of each turn in this mode, and the `command_lifecycle` events appeared only in the run whose user line carried a `uuid`.

A host that holds the process can therefore do everything the SDK does. A version of this loop, with a model and a budget flag added, was run against 2.1.280 for this post. The `touch` it asks for is not on the read-only command list, so it produced a `can_use_tool` request, and the host's answer let it run; the same run with `echo` produced no request at all:

    import json, subprocess, uuid

    p = subprocess.Popen(["claude", "-p", "--input-format", "stream-json",
            "--output-format", "stream-json", "--verbose",
            "--permission-prompt-tool", "stdio", "--session-id", str(uuid.uuid4())],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
    send = lambda m: (p.stdin.write(json.dumps(m) + "\n"), p.stdin.flush())

    send({"type": "control_request", "request_id": "init-1",
          "request": {"subtype": "initialize"}})
    send({"type": "user", "message": {"role": "user",
          "content": "Run: touch host-test.txt && echo created"}})

    for line in p.stdout:
        m = json.loads(line)
        if m["type"] == "control_request" and m["request"]["subtype"] == "can_use_tool":
            req = m["request"]                       # tool_name, input, blocked_path, ...
            verdict = ({"behavior": "allow", "updatedInput": req["input"]}
                       if policy_allows(req) else {"behavior": "deny", "message": "policy"})
            send({"type": "control_response", "response": {"subtype": "success",
                  "request_id": m["request_id"], "response": verdict}})
        elif m["type"] == "result":
            print(m["result"], m["total_cost_usd"])
            break
    p.stdin.close(); p.wait()

`policy_allows` is the host's own function. A production host also answers `hook_callback` and `mcp_message` if its `initialize` registered hooks or in-process MCP servers, replies with an error to any control request it does not recognize, and keeps reading after the result instead of breaking, since the process now waits for the next user line.

### Sixty-six control requests

The binary's schema table lists 66 control-request subtypes and marks who sends each; the print loop handles about seventeen more that the table omits *[from the binary]*. The direction is the useful split. The process asks its host for permission decisions (`can_use_tool`), hook results (`hook_callback`), MCP traffic for servers that live in the host (`mcp_message`), answers to MCP elicitations and other dialogs (`elicitation`, `request_user_dialog`), and refreshed credentials (`oauth_token_refresh`, `host_auth_token_refresh`). Everything else flows the other way and maps onto the SDK methods of the next section: `interrupt`, `set_permission_mode`, `set_model`, `apply_flag_settings`, `rewind_files`, `get_context_usage`, `mcp_set_servers`, `stop_task`, `reload_skills`, and some forty more. A few of them are directly useful to an OS and absent from the SDK's documented surface: `get_session_cost`, `get_usage`, `get_settings` (the effective settings with their sources), `get_hooks_listing`, `list_permission_rules`, `register_repo_root` to add a directory mid-session, and `end_session`. Undocumented subtypes can change without notice; feature-detect with the `capabilities` array in `system/init`, which on 2.1.280 lists `interrupt_receipt_v1`, `interrupt_cancel_queued_v1`, `msg_lifecycle_v1`, `mcp_read_resource_v1` and `mcp_tool_ui_meta_v1`.

The `result` message is the host's ledger for the turn. Beyond the documented fields it carries a `terminal_reason` that says precisely why the turn ended, one of nineteen values: `completed`, `max_turns`, `budget_exhausted`, `tool_deferred`, `aborted_streaming`, `aborted_tools`, `stop_hook_prevented`, `prompt_too_long`, `api_error`, `model_error` and nine more *[from the binary]*. A host that records only `is_error`, as xo-space does, cannot tell a budget stop from a crash.

### One process per turn, or one per conversation

|                        | xo-space today: a process per turn                     | desktop app: a process per conversation           |
|------------------------|--------------------------------------------------------|---------------------------------------------------|
| prompt                 | argv, after `-p`                                       | a user line on stdin                              |
| boot cost              | every turn: settings, hooks, MCP connections           | once                                              |
| permission prompts     | bypassed                                               | `can_use_tool` answered by the app                |
| stopping a turn        | not implemented; the child is not killed on disconnect | `interrupt`, with a receipt                       |
| changing model or mode | only on the next spawn (and `--model` is never passed) | `set_model`, `set_permission_mode` mid-session    |
| background work        | shells stopped shortly after the result                | continues and reports through `task_notification` |
| inbox socket           | exists only while a turn runs                          | always bound                                      |
| session ID             | pre-allocated, then `--resume`                         | host record `local_<uuid>` mapped to the CLI's ID |

The per-turn design is simpler to write and survives a server restart without a supervisor, which is presumably why xo-space chose it. It pays for that on every turn, and it cannot host anything that needs the process to be there between turns: a permission question, a background job's completion, a message from another session. The long-lived design needs a process manager, which is the first thing an OS provides.

## 11 · The Agent SDK is the same protocol, wrapped

The Agent SDK is not a second runtime. `query()` spawns the same `claude` binary, one subprocess per session, and speaks the control protocol of the previous section on your behalf. What it adds is a place for your code to live inside the loop: permission callbacks, hook callbacks, and MCP tools that run in your process instead of a subprocess.

The hosting guide states the model in one line: each agent session is one CLI subprocess talking over stdio, and that subprocess owns the shell, the working directory, and the transcript on local disk \[[docs: Agent SDK hosting § The subprocess model](https://code.claude.com/docs/en/agent-sdk/hosting#the-subprocess-model)\] *[from the docs]*. N concurrent sessions are N processes, each needing on the order of a gigabyte of RAM as a floor, and a session never times out on its own. Everything an OS has to supervise for a raw CLI process, it still has to supervise for an SDK session.

### Options are flags; methods are control requests

Almost every SDK option lands on the spawned command line or in the `initialize` request, and almost every method on the returned `Query` object is one control request. Figure 12 pairs them; the right-hand names are the `subtype` strings present in the 2.1.280 binary *[from the binary]*.

**Figure 12. What the TypeScript SDK sends for each option and method**

| SDK surface                                                                         | On the wire                                                    | Note                                                |
|-------------------------------------------------------------------------------------|----------------------------------------------------------------|-----------------------------------------------------|
| `cwd`                                                                               | the subprocess's working directory                             | also the transcript's project folder                |
| `model`, `effort`, `fallbackModel`                                                  | `--model`, `--effort`, `--fallback-model`                      |                                                     |
| `permissionMode`, `allowedTools`, `disallowedTools`                                 | the matching flags                                             | bypass also needs `allowDangerouslySkipPermissions` |
| `canUseTool`                                                                        | prompts arrive as `can_use_tool`                               | stage 7 of the permission pipeline                  |
| `hooks`                                                                             | registered in `initialize`; fired as `hook_callback`           | same events as settings hooks                       |
| `mcpServers` (in-process)                                                           | tool traffic as `mcp_message`                                  | no subprocess for your tools                        |
| `resume`, `forkSession`, `continue`, `sessionId`                                    | `--resume`, `--fork-session`, `--continue`, `--session-id`     |                                                     |
| `resumeSessionAt`                                                                   | a resume that truncates at a message UUID                      | not in `--help`                                     |
| `persistSession: false`                                                             | `--no-session-persistence`                                     | TypeScript only                                     |
| `outputFormat`                                                                      | `--json-schema`                                                | result in `structured_output`                       |
| `settingSources`, `settings`                                                        | `--setting-sources`, `--settings`                              | `[]` reads no settings files                        |
| `interrupt()`                                                                       | `interrupt`                                                    | returns a receipt of queued turns                   |
| `setModel()`, `setPermissionMode()`                                                 | `set_model`, `set_permission_mode`                             | streaming input only                                |
| `applyFlagSettings()`                                                               | `apply_flag_settings`                                          | most keys apply next turn                           |
| `rewindFiles()`                                                                     | `rewind_files`                                                 | needs `enableFileCheckpointing`                     |
| `getContextUsage()`, `readFile()`                                                   | `get_context_usage`, `read_file`                               |                                                     |
| `mcpServerStatus()`, `setMcpServers()`, `reconnectMcpServer()`, `toggleMcpServer()` | `mcp_status`, `mcp_set_servers`, `mcp_reconnect`, `mcp_toggle` | MCP servers can change mid-session                  |
| `stopTask()`, `reloadSkills()`                                                      | `stop_task`, `reload_skills`                                   |                                                     |
| `reinitialize()`                                                                    | a second `initialize`                                          | re-delivers pending prompts after a reconnect       |

Left column from the TypeScript SDK reference; middle column matched by name against the control subtypes in the binary. The pairing itself is my reading of the two *[reconstruction]*, and it means anything the SDK can do, a host speaking stream-json can do too.

### Four options an OS should know by name

Beyond the flag equivalents, four options exist only because hosts asked for them \[[docs: TypeScript reference § Options](https://code.claude.com/docs/en/agent-sdk/typescript#options)\]:

- `spawnClaudeCodeProcess` replaces the spawn itself, so the subprocess can run in a container, a VM, or a remote sandbox while the SDK keeps speaking to its stdio. This is the seam for a Coder or Vercel Sandbox workspace.
- `toolAliases` maps a built-in tool to an MCP tool, for example `{ Bash: 'mcp__workspace__bash' }`, so Claude's shell calls run wherever the OS decides.
- `managedSettings` injects policy-tier settings from the host, above the user's own files, unless an administrator's managed settings say otherwise.
- `sessionStore` mirrors each transcript batch to an external backend, so another host can resume the session. The local file is still written first; a failed mirror emits `system/mirror_error` and the run continues.

One default deserves a warning. With no `systemPrompt` option the SDK uses a minimal prompt, not Claude Code's. A host that wants Claude Code's behaviour, including its tool guidance and CLAUDE.md handling, passes `{ type: 'preset', preset: 'claude_code' }`, optionally with `append`.

### Sessions without parsing JSONL

The docs are explicit that the transcript format is internal and may change on any release \[[docs: sessions § Where transcripts are stored](https://code.claude.com/docs/en/sessions#where-transcripts-are-stored)\]. The SDK ships the readers instead: `listSessions()`, `getSessionMessages()`, `getSessionInfo()`, `renameSession()`, `tagSession()`, and `resolveSettings()`, which reports the effective configuration and where each value came from, without running a session. Python has the same set in snake case. xo-space reads the files directly today, and has already paid for it: its reader derives the project folder by replacing only `/`, while Claude Code replaces every non-alphanumeric character. On this machine, all seven project folders whose working directory contains a dot resolve under XO's rule to a folder that does not exist, so their sessions show no history \[`adapters/claude_code/_project_encoding.py`, `sessions.py`\] *[measured]*.

The three hosting patterns in the SDK guide map directly onto an OS's choices. *Ephemeral*: one container per task, destroyed after. *Long-running*: containers that hold many live subprocesses, fed with `streamInput()`, pre-warmed with `startup()`, and pinned to a host by consistent hashing on `sessionId`. *Hybrid*: ephemeral containers that hydrate from a `sessionStore` when the user returns \[[docs: Agent SDK hosting § Choose a session pattern](https://code.claude.com/docs/en/agent-sdk/hosting#choose-a-session-pattern)\]. XO's per-turn spawn is the ephemeral pattern applied at the wrong granularity: it destroys the process after every turn, not after every task.

## 12 · The other doors into a session

The stream-json pipe is the front door, and only the process that spawned the session holds it. Six other doors let something else reach a running session: a supervisor, a per-session socket, MCP channels, Remote Control, the cloud, and the session's own hooks calling out. An OS will use at least three of them.

**Figure 13. Seven ways in or out of one running session, by who holds the handle**

![A central box, the session process, surrounded by seven doors. On the left, the stream-json pipe held by the spawning host, and the inbox socket used by child processes and other local sessions. On top, Remote Control through Anthropic's servers and the background supervisor. On the right, MCP channels and outbound hooks. At the bottom, the transcript file, which can only be read.](2026-10-08-claude-code-session/fig-13-doors.svg)

The live values in the centre box are this session's own registry file, `~/.claude/sessions/19680.json` *[measured]*. Only door 1 carries the control protocol; doors 2 and 5 can only add user turns; door 3 is a full client but routes through Anthropic and needs a subscription login; door 7 is for observers.

### Door 4: the background supervisor is already a process manager

`claude --bg "task"` starts a session that belongs to a supervisor process rather than to a terminal. The supervisor starts on first use, keeps a roster of its sessions in `~/.claude/daemon/roster.json` and per-session state in `~/.claude/jobs/<id>/state.json`, logs to `~/.claude/daemon.log`, restarts a session process that dies, parks an idle unattached one after about an hour, and moves idle sessions onto a new binary after an auto-update \[[docs: agent view § How background sessions are hosted](https://code.claude.com/docs/en/agent-view#how-background-sessions-are-hosted)\]. Each session gets `$CLAUDE_JOB_DIR`, and writes under `$CLAUDE_JOB_DIR/tmp` never prompt. `--bg --exec 'pytest -x'` runs a plain shell command as a supervised job instead of a Claude session.

The supported read interface is `claude agents --json` (add `--all` to keep finished sessions, `--cwd` to filter). Each entry carries `cwd`, `kind`, `startedAt`, and, when they apply, `id`, `state` (`working`, `blocked`, `done`, `failed`, `stopped`), `pid`, `status` (`busy`, `waiting`, `idle`), `waitingFor`, `sessionId` and `name`. The docs say plainly that the files under `jobs/` are not a stable interface. For an OS this is the cheapest process table available: poll one command, get every session on the machine with the reason it is stuck.

### Door 2: the inbox socket is how a program talks back

Every session with cross-session messaging on (the default since 2.1.224 on macOS and Linux, including `-p` sessions, but not `--bare` ones) binds a Unix domain socket and registers it in `~/.claude/sessions/<pid>.json`. On this machine the socket is `/tmp/cc-socks/19680.sock` *[measured]*. Claude Code exports the path and a per-session token to every hook and Bash command as `CLAUDE_CODE_MESSAGING_SOCKET` and `CLAUDE_CODE_MESSAGING_TOKEN` \[[docs: cross-session messaging § The session's inbox socket](https://code.claude.com/docs/en/cross-session-messaging#the-sessions-inbox-socket)\]. The wire format is newline-delimited JSON. The binary's own debug log prints the recipe: an optional auth line, then a user message *[from the binary]*:

    out=$(./long-job --summary)                 # finish the work first
    printf '%s\n%s\n' \
      "{\"type\":\"auth\",\"token\":\"$CLAUDE_CODE_MESSAGING_TOKEN\"}" \
      "$(jq -cn --arg t "$out" '{type:"user",message:{role:"user",content:$t}}')" \
      | nc -U "$CLAUDE_CODE_MESSAGING_SOCKET"

The handler accepts a `user` message whose `content` is a non-empty string, an optional `priority` of `now`, `next` (the default) or `later`, and optional `uuid` and `from` fields; a `session_id` that does not match the receiver is dropped *[from the binary]*. A connection that has not sent a complete line within 30 seconds is closed, so compute first and connect last. The receiving Claude reads the message between tool calls if a turn is running, and starts a new turn if the session is idle.

Delivery is filtered. `crossSessionInbound` set to `accept`, `hold` or `refuse` decides for messages from other sessions; with no setting, the decision depends on whether sender and receiver bypass permission prompts. A message from the session's own child process, such as a hook or a Bash command posting back, is delivered by default, verified by process evidence or by the token. On macOS the process evidence only exists while the poster is still running, so a detached job should always send the token line. A message can never approve a permission prompt, never changes configuration, and a slash command inside it arrives as plain text. Limits: about a million characters per message, 50 queued messages, 100 held \[[docs: cross-session messaging § Limitations](https://code.claude.com/docs/en/cross-session-messaging#limitations)\].

### Door 5: channels push events through MCP

A channel is an MCP server, spawned over stdio, that declares the capability `experimental['claude/channel']` and emits `notifications/claude/channel` with a `content` string and a flat `meta` map. The event reaches Claude wrapped in a `<channel source="…">` tag whose attributes are the meta keys. Nothing is acknowledged: if the session did not opt the server in with `--channels` (or `--dangerously-load-development-channels` while building one), the event is dropped silently, and events that arrive during a busy turn are delivered together on the next one \[[docs: channels reference § Notification format](https://code.claude.com/docs/en/channels-reference#notification-format)\]. A channel that also declares `claude/channel/permission` receives permission prompts and can answer them, which makes it a candidate host for stage 7 of the permission pipeline. Channels are a research preview, hidden from `--help`, and need claude.ai or Console authentication.

Door 2 and door 5 overlap. The difference is who is allowed to speak. The socket is for processes on the same machine, under the same OS user, and needs no configuration. A channel is for the outside world, needs an opt-in per session, and must gate senders itself, because an ungated channel is a prompt-injection path straight into the session.

### Doors 3, 6 and 7

**Remote Control** (`--remote-control`, `/remote-control`, or `claude remote-control` in server mode) registers the local session with the Anthropic API and polls for work over outbound HTTPS; no inbound port is opened. claude.ai/code, the mobile app, and sessions on your other machines then drive it as a full client. It requires a subscription login and does not work with an API key \[[docs: Remote Control § Connection and security](https://code.claude.com/docs/en/remote-control#connection-and-security)\]. **Cloud sessions** are the same shape on Anthropic's machines: `--cloud "task"` creates one, `-p --cloud <session-id> "msg"` queues a message into one, `--environment ccpool_…` targets a self-hosted runner pool, and `--teleport` pulls one into the local terminal.

**Hooks** are the door that opens outward: the session calls your command, URL, or MCP tool at 33 lifecycle points and waits for a decision where the event allows one. **The transcript** is the door that only opens for reading. It is append-only and written asynchronously, so a hook that needs the last assistant text of the current turn should read `last_assistant_message` from its `Stop` input rather than the file \[[docs: hooks § Common input fields](https://code.claude.com/docs/en/hooks#common-input-fields)\].

| Door             | Starts a turn | Answers prompts           | Leaves the machine       | Needs                          |
|------------------|---------------|---------------------------|--------------------------|--------------------------------|
| 1 stream-json    | yes           | yes (`can_use_tool`)      | no                       | be the parent process          |
| 2 inbox socket   | yes, if idle  | never                     | no                       | same OS user; token on Windows |
| 3 Remote Control | yes           | yes                       | yes, via Anthropic       | subscription login             |
| 4 supervisor     | via attach    | via attach                | no                       | `--bg` at launch               |
| 5 channel        | yes, if idle  | if it declares relay      | no (the server is local) | `--channels`, allowlist        |
| 6 hooks          | no            | yes (`PermissionRequest`) | only if the hook does    | settings, plugin or skill      |
| 7 transcript     | no            | no                        | no                       | read access to `~/.claude`     |

## 13 · How Claude hands work to your app

There are two ways to give Claude a capability: teach it to run your program, or register your program as a tool. Everything else in the extension system is packaging, policy, or timing layered on one of those two. The design question for an app is how tightly it wants to be coupled, and how it reports back when the work outlives the turn.

**Figure 14. Seven ways to hand work to an app, from loosest to tightest coupling**

![A staircase of seven steps rising from left to right. One, a CLI on PATH called through Bash. Two, a skill that teaches Claude when to call it. Three, an MCP server with typed tools. Four, a channel or socket post for asynchronous completion. Five, hooks that observe and gate. Six, a plugin that packages the rest. Seven, the app as the session's host. Each step lists what it gives the app and what it costs.](2026-10-08-claude-code-session/fig-14-coupling.svg)

Blue steps are the tool path (data into the loop), purple is the hook path (the loop calls out), orange is the host seat. The limits on the steps are sourced: Bash output is read back up to 30,000 characters by default, MCP results up to 25,000 tokens \[[docs: environment variables](https://code.claude.com/docs/en/env-vars)\]. The ordering is my own *[reconstruction]*.

### Step 1: a command-line program is already a tool

Anything on `PATH` is callable through Bash, gated by a rule like `Bash(mytool *)`; the space before the asterisk matters, because without it the rule also matches `mytool-admin`. What the program sees is documented and stable enough to design against \[[docs: environment variables](https://code.claude.com/docs/en/env-vars)\]:

| Variable                                 | Set in                                      | Use it to                              |
|------------------------------------------|---------------------------------------------|----------------------------------------|
| `CLAUDECODE=1`                           | Bash, hooks, status line, stdio MCP servers | switch to machine-readable output      |
| `CLAUDE_CODE_CHILD_SESSION=1`            | Bash, Monitor, hooks; not MCP servers       | tell a tool call from an IDE terminal  |
| `CLAUDE_CODE_SESSION_ID`                 | Bash, hooks, stdio MCP servers              | key your own state to the session      |
| `CLAUDE_CODE_MESSAGING_SOCKET`, `_TOKEN` | Bash, hooks                                 | post a result back later (door 2)      |
| `CLAUDE_PID`, `CLAUDE_EFFORT`            | Bash, hooks                                 | find the parent; scale your own effort |
| `CLAUDE_JOB_DIR`                         | background sessions                         | write scratch files that never prompt  |

The costs are the defaults: a two-minute timeout that the model can raise to ten, output truncated at 30,000 characters, and prose parsing. Long work should run with `run_in_background` and be watched with the `Monitor` tool, or should hand back a job ID and post the result through the socket when done.

### Step 2: a skill decides whether Claude ever calls you

A skill is a directory with a `SKILL.md`. Its `description` sits in context all the time; its body loads only when invoked. That split is what makes a skill the routing layer: the description is the only thing Claude reads when deciding whether your app is relevant. The frontmatter can pre-approve the tools the skill needs (`allowed-tools`), pin `model` and `effort`, run the skill in a subagent (`context: fork`), gate it to file paths (`paths`), and attach hooks \[[docs: .claude directory § Frontmatter fields](https://code.claude.com/docs/en/claude-directory#frontmatter-fields-by-file)\]. XO already uses this: xo-space turns an agent type into a `/skill-name` prefix on the prompt \[`adapters/claude_code/adapter.py`, `_build_cmd`\] *[from the tree]*.

### Step 3: MCP gives the work a type

An MCP server turns each operation into a tool with a JSON Schema, named `mcp__<server>__<tool>`, with its own permission rule. The limits to design around: startup waits up to `MCP_TIMEOUT` (30 s); an HTTP or SSE request times out after 60 s unless the per-server `timeout` is raised; results over 10,000 tokens warn and over 25,000 are cut, unless the tool declares `_meta["anthropic/maxResultSizeChars"]`. A tool flagged `requiresUserInteraction` always prompts, in every mode, and a server can ask the user a question in the middle of a call through elicitation. When your app is itself the host, the Agent SDK runs the server inside your process (`createSdkMcpServer`) and no subprocess is needed \[[docs: Agent SDK § Custom tools](https://code.claude.com/docs/en/agent-sdk/custom-tools)\].

### Step 4: when the work outlives the turn

A tool call blocks the loop. Real work (a build, a deploy, a human review) should not. The pattern that fits Claude Code's primitives is *acknowledge, then push*, and Figure 15 traces it.

**Figure 15. Acknowledge, then push: a job that finishes after the turn has ended**

![A sequence diagram with three lifelines: the session, your app's MCP server, and the job runner. The session calls submit_job and immediately receives a job ID, then ends its turn. The runner works for twenty minutes. On completion the MCP server emits a channel notification, or a child process posts to the inbox socket. The session starts a new turn, calls get_result, and continues.](2026-10-08-claude-code-session/fig-15-async-offload.svg)

The two push paths are sourced: channel notifications start a new turn in an idle session and batch into the next turn in a busy one, and the inbox socket does the same for a local child process. The tool names are illustrative. What the pattern buys is that the session holds no open tool call while it waits, so the wait costs nothing. If the process is replaced in the meantime, the app has to find the new one, by `sessionId` in the registry, before it can push *[reconstruction]*.

When the app is the host, a third path exists that needs no push at all: `PreToolUse` returns `defer`, the `-p` process exits with the call preserved, and the host resumes the session when it has the answer. It trades the push for a process restart, and it only works on single-call turns.

### Steps 5 to 7: policy, packaging, and the host seat

**Hooks** are how an app watches or constrains work without being asked. Five handler types exist: a shell `command` fed JSON on stdin, an `http` POST, an `mcp_tool` call to a connected server, a single-turn `prompt` to a model, and an experimental `agent`. Command, HTTP and MCP hooks time out after 600 seconds by default; `SessionEnd` hooks share a 1.5-second budget. Only exit code 2 blocks; exit 1 is a non-blocking error, which is the single most common way a policy hook silently fails \[[docs: hooks § Exit code output](https://code.claude.com/docs/en/hooks#exit-code-output)\]. For an OS, three events carry most of the value: `SessionStart` to inject context and bind the session to the OS's own records, `PostToolUse` to index what changed, and `Stop` to capture the turn's final answer from `last_assistant_message`.

**A plugin** is the unit of distribution: skills, agents, hooks, MCP and LSP servers, monitors, default settings, and a `bin/` directory that lands on `PATH`, under one manifest, installable from a marketplace or loaded for one session with `--plugin-dir` or `--plugin-url` \[[docs: plugins reference](https://code.claude.com/docs/en/plugins-reference)\]. If XO ships one thing to every workspace, it should be a plugin, because a plugin is the only artifact that carries steps 1 to 5 together and can be pinned to a version.

**Being the host** is the last step, covered in [the protocol section](#10-driving-a-session-the-stream-json-protocol) and [the SDK section](#11-the-agent-sdk-is-the-same-protocol-wrapped): the app that spawns the session owns the permission seat, the event stream, and the lifecycle, and can register tools in-process. The cost is that it must now keep the process alive, which is exactly the job an OS exists to do.

## 14 · Friction, and what the OS should own

Almost every point of friction in the previous twelve sections has one cause. Claude Code keeps exactly one thing durable, the conversation file, and keeps everything else (configuration, permissions, connections, background work) in a process that can end at any moment. Each host then rebuilds the second from the first, differently and incompletely. An OS reduces friction by owning precisely the things the process forgets.

XO Space already describes itself as an operating system, with a kernel, drivers, daemons, and agent sessions as its processes \[[XO Space: the architecture § The operating system](https://quirq.ai/xo-space-architecture/#project)\]. Read the other way round, a Claude Code session already has most of an OS's parts. The work is to connect them, not to reinvent them.

| OS concept                | Its Claude Code counterpart                                                                                            |
|---------------------------|------------------------------------------------------------------------------------------------------------------------|
| process table             | `~/.claude/sessions/<pid>.json` (status `busy` or `idle`); `claude agents --json` with `state` and `waitingFor`        |
| supervisor                | the background daemon: roster, restart on crash, park when idle, respawn onto a new version                            |
| system calls              | tools, built-in and MCP, each passing the permission pipeline                                                          |
| capabilities              | permission modes, rules, `PreToolUse` and `PermissionRequest` hooks, the permission host                               |
| signals                   | `interrupt`, `stop_task`, SIGINT, SIGTERM (exit 143)                                                                   |
| IPC                       | stream-json and the control protocol for the parent; the inbox socket for children and peers; channels for the outside |
| filesystem and namespaces | working directory, `--add-dir`, worktrees, `CLAUDE_CONFIG_DIR`, sandbox settings                                       |
| logs and accounting       | the transcript; `result` usage and `total_cost_usd`; OpenTelemetry                                                     |
| snapshots                 | file-history checkpoints, `rewind_files`, forks, `sessionStore`                                                        |
| modules and drivers       | plugins, MCP servers, skills                                                                                           |
| init scripts              | `Setup` and `SessionStart` hooks, `CLAUDE.md`, `--settings`                                                            |

**Figure 16. The friction map: symptom, cause in the anatomy, what the OS owns, and the primitive it builds on**

| Symptom                               | Cause                                                                  | The OS owns                                              | Primitive in 2.1.280                                                      |
|---------------------------------------|------------------------------------------------------------------------|----------------------------------------------------------|---------------------------------------------------------------------------|
| A resumed session behaves differently | resume restores the conversation, not the launch; `-p` resets the mode | a launch profile per session, re-applied on every launch | `--settings` file per session; `--session-id`; the recorded system prompt |
| Nobody can answer a prompt            | `-p` has no terminal                                                   | the permission broker, stage 7                           | `--permission-prompt-tool stdio`, `canUseTool`, `defer`, channel relay    |
| Every turn is slow to start           | boot is redone per launch, MCP included                                | long-lived processes, parked when idle                   | stream-json input; SDK `startup()`; supervisor parking                    |
| Sessions go missing                   | the ID is learned late; hosts keep their own pointers                  | the ID, chosen before launch                             | `--session-id`; `system/init`; `claude agents --json`                     |
| History readers break                 | internal format; forks copy; lossy folder names                        | live capture, one reader                                 | stream events; `Stop` and `PostToolUse` hooks; `getSessionMessages()`     |
| Indexed transcripts vanish            | a 30-day, mtime-based sweep                                            | retention and mirroring                                  | `cleanupPeriodDays`; `sessionStore`                                       |
| The wrong account is billed           | env tokens outrank `/login`                                            | one credential per workspace, injected explicitly        | `apiKeyHelper` in `--settings`; `CLAUDE_CONFIG_DIR`; env scrub            |
| A repo's hooks run unasked            | `-p` skips trust                                                       | the trust decision                                       | `--setting-sources`; `--bare`; `initialize.workspaceTrust`                |
| Long work blocks the turn             | tool calls are synchronous                                             | an async job interface                                   | inbox socket; channels; background tasks and `Monitor`                    |
| Parallel sessions collide             | many conversations, one directory; two writers interleave              | a lease per conversation, a worktree per writer          | `--worktree`; `isolation: worktree`                                       |
| Spend is invisible until the bill     | cost is only in results and transcripts                                | metering and budgets per task                            | `total_cost_usd`; `--max-budget-usd`; `taskBudget`                        |
| Behaviour shifts between machines     | two binaries here (2.1.260, 2.1.280); hidden flags                     | a pinned version per workspace                           | `claude install <version>`; `capabilities`                                |

Each cause is sourced in the section that covers it; the middle columns are my synthesis *[reconstruction]*. Read down the third column and it is a component list: launch profiles, a permission broker, a process manager, an ID authority, an event capture path, a retention policy, a credential store, a trust policy, a job interface, a lease manager, a meter, and a version pin.

### Where XO stands

Measured against that list, xo-space today owns three things well and delegates the rest to `--dangerously-skip-permissions`. It pre-allocates session IDs, it isolates each agent in its own project directory, and it keeps an index that stores pointers rather than messages. Against that: it spawns a new process per turn, so every turn pays the full boot, MCP connection included; nobody can answer a permission prompt; the `model` a user picks never reaches the command line; the child's stderr and exit code are not read on the streaming path; and nothing kills the child when the client disconnects \[`adapters/claude_code/adapter.py`, `_build_cmd`, `stream`\] *[from the tree]*. It reads history from the JSONL files with a folder-name rule that breaks on any path containing a dot, and it never reads `total_cost_usd`, estimating cost from a separate tool instead. None of these are hard to fix, and all of them come from treating the process as the session.

### A session manager, sketched

The design below uses only primitives this post has documented. It is a proposal, not a description of anything built *[reconstruction]*.

**Figure 17. A session manager for XO: what sits between the clients and the claude processes**

![Three tiers. At the top, clients: the phone OS, the Space UI, the desktop, and schedules. In the middle, the XO session manager with six components: a process table, launch profiles, a permission broker, an event bus, a job interface, and a store for indexes and budgets. At the bottom, one claude process per active conversation, each speaking stream-json and the control protocol to the manager, posting hook events to it, and reaching XO apps through a plugin with MCP servers, skills and command-line tools. Apps report finished work back through the inbox socket or a channel.](2026-10-08-claude-code-session/fig-17-session-os.svg)

The broker's three levels, silent, toast and prompt, are the ones the xo-phone-os plan already specifies for agent actions \[`prototypes/xo-phone-os/AGENT_PLAN.md`\] *[from the tree]*. Everything else is a proposal assembled from the primitives above *[reconstruction]*.

Concretely, for each component:

- **Process table.** Spawn sessions the OS owns itself, and read `claude agents --json` for the rest, so a session started from a terminal or the desktop still shows up with its `waitingFor`. Never parse `jobs/`.
- **Launch profiles.** Store, per conversation, the exact argv, a generated `--settings` file, the credential source, the config directory and the pinned version, and re-apply them on every launch. Choose the `sessionId` before the first launch and never learn it from the stream.
- **Permission broker.** Launch with `--permission-prompt-tool stdio` (or through the SDK with `canUseTool`), answer `can_use_tool` from policy first, and only escalate the remainder to a person; use `defer` for questions that can wait a day, and `--permission-prompts none` with `auto` for truly unattended work.
- **Event bus.** Take state from the stream (`--include-partial-messages`, `--include-hook-events`, `--replay-user-messages`) and from `http` hooks posted to the OS, not from tailing files.
- **Job interface.** Give apps one contract: return a job ID immediately, then post the outcome to the session's inbox socket or through a channel, as in Figure 15.
- **Store.** Keep the ID map, per-task budgets, and a transcript mirror or a raised `cleanupPeriodDays`, and reconcile pointers against the files that actually exist.

The desktop app is evidence that this shape works: it already runs every session as one long-lived process with stream-json in both directions, an initialize handshake, stdio permission prompts, a pre-approved tool list and a settings overlay, and it keeps its own record per session that points at the transcript *[measured]*. The difference for XO is where the processes run and who answers the questions.

## 15 · Sources

Four kinds of source, in the order of how much weight they carry.

### The installed program

- Claude Code 2.1.280, the build the Claude desktop app bundles for macOS arm64, at `~/Library/Application Support/Claude/claude-code/2.1.280/`: the output of `--help` for the command and every subcommand, and strings and schema descriptions from the JavaScript embedded in the executable. The same machine's `claude` on `PATH` is 2.1.260; nothing in this post depends on the difference unless it says so.
- The command line and environment with which the desktop app launched the session that wrote this post, read from the process table.
- `~/.claude/cache/changelog.md`, the changelog the program keeps locally, 399 versions from 0.2.21 to 2.1.276.
- The other Claude Code builds installed on the same machine, 2.1.183, 2.1.195, 2.1.260 and 2.1.281, searched only for the key names of `~/.claude.json` that 2.1.280 does not reference.

### The files on one machine

- `~/.claude/`, `~/.claude.json`, `/tmp/cc-socks/` and the desktop app's `claude-code-sessions/` directory, surveyed on 24 September 2026. Only structure was recorded: file and key names, value types, short categorical values, counts, sizes and date ranges. No message text, tool input or output, file contents, identifiers or credentials were read into this post.
- `~/.claude.json` again on 28 September 2026 for the explorer: key names, value types and presence counts only. Keys that are data, such as project paths, names and ids, were replaced by placeholders, and no value appears in the explorer.
- xo-space's own code at commit `59dcc5b`, for the three places that write `~/.claude.json`.

### Anthropic's documentation, as published on 24 September 2026

- [Manage sessions](https://code.claude.com/docs/en/sessions), [Explore the .claude directory](https://code.claude.com/docs/en/claude-directory), [CLI reference](https://code.claude.com/docs/en/cli-reference): session storage, resume and fork semantics, retention, and the flag list.
- [Run Claude Code programmatically](https://code.claude.com/docs/en/headless), [Agent SDK reference, TypeScript](https://code.claude.com/docs/en/agent-sdk/typescript), [Hosting the Agent SDK](https://code.claude.com/docs/en/agent-sdk/hosting), [Work with sessions](https://code.claude.com/docs/en/agent-sdk/sessions): print mode, stream-json messages, the SDK's options and methods, and hosting patterns.
- [Configure permissions](https://code.claude.com/docs/en/permissions), [Choose a permission mode](https://code.claude.com/docs/en/permission-modes), [Hooks reference](https://code.claude.com/docs/en/hooks), [Settings](https://code.claude.com/docs/en/settings), [Environment variables](https://code.claude.com/docs/en/env-vars), [Authentication](https://code.claude.com/docs/en/authentication): the permission pipeline, hook semantics, precedence rules and credentials.
- [Message your other Claude Code sessions](https://code.claude.com/docs/en/cross-session-messaging), [Channels](https://code.claude.com/docs/en/channels), [Channels reference](https://code.claude.com/docs/en/channels-reference), [Agent view](https://code.claude.com/docs/en/agent-view), [Remote Control](https://code.claude.com/docs/en/remote-control): every door into a running session.
- [Explore the context window](https://code.claude.com/docs/en/context-window) and [MCP](https://code.claude.com/docs/en/mcp): what loads at startup, what survives compaction, MCP limits.

### XO's own code

- `xo-space` on branch `feat/v2-kernel` and `xo-cowork-api` on branch `new-ui`: `services/cowork_agent/adapters/claude_code/`, above all `adapter.py`, `streaming.py`, `sessions.py`, `_project_encoding.py`, `visualizer_source.py` and `remote_control.py`.
- `prototypes/xo-phone-os/`: `AGENT_PLAN.md`, `CLAUDE_INTEGRATION.md` and `COWORK_WRAPPER.md` for what the OS is meant to do.
- The companion posts [Anatomy of an Agent Control Plane](https://quirq.ai/xo-space/) and [XO Space: the architecture](https://quirq.ai/xo-space-architecture/).

**Provenance.** Claims marked *[from the docs]* paraphrase Anthropic's documentation with a link to the section; it is paraphrased rather than quoted. Claims marked *[from the binary]* were read from the 2.1.280 executable and describe behaviour that is often undocumented and may change in any release; where the binary and the docs disagree, the text says so. Claims marked *[measured]* come from one machine and one user's history, so the counts describe that history, not Claude Code in general. Claims marked *[from the tree]* cite XO's repositories as of 24 September 2026. *[reconstruction]* marks inference, design and the proposal in the final section; nothing marked that way has been built or tested. Not verified: the behaviour of any flag on Linux or Windows, the Python SDK beyond its documentation, cloud sessions and self-hosted runners, and channels beyond their documented contract; no live channel was run for this post. The state file's locking, fallback and exit-write behaviour was read from the code, not provoked: no concurrent writes were fault-injected, and the claim that the first save into an empty config home is unlocked is an inference from the lock library.
