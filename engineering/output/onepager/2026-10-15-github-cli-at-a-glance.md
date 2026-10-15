# GitHub CLI at a glance

suraj's GitHub CLI research in one page: how gh works, what you can call,
where its data lives, and which system owns the result. All of it describes
gh 2.102.0, released on 30 September 2026, read at source commit `fc4b137`
and inspected on 13 October 2026.

## The claim

> In a system built around Codex sessions, Space projects, and background
> work, gh is a useful adapter executable. Your system should own durable job
> identity, scheduling, leases, authorization, attempts, outcomes, and
> artifacts. GitHub owns its service objects. gh translates one invocation
> into operations against those objects.

From [Anatomy of GitHub CLI, §24](../report/2026-10-15-github-cli.md#24-a-session-os-should-own-jobs-gh-should-perform-github-operations),
where it carries the label *Proposal*.

## In numbers

| | |
|---|---|
| **33** | top-level command families in the installed help |
| **228** | canonical command nodes, group nodes included; 196 are leaves |
| **61** | command nodes advertise `--jq`; 40 advertise field-selecting `--json`, 20 `--format json`; the sets differ |
| **4** | storage roots: configuration, installed data, state and cache; `GH_CONFIG_DIR` relocates configuration only |
| **14** | respected `config.yml` options in gh 2.102.0 |
| **8** | the exit code of `gh pr checks` while checks are still pending |
| **3** | agent-related preview families, `agent-task`, `copilot` and `skill`, with three owners |
| **4** | execution choices for offloading: workflow dispatch, agent-task creation, Codespace operation, local Copilot launch |
| **3** | public read-only queries verified repository and PR JSON shapes; no login, remote mutation or install was needed |

The command counts come from a measured help inventory. The roots, options,
exit codes and agent surfaces are read from installed help and pinned source.

## Where to go next

| Read | For |
|---|---|
| [The teardown](../report/2026-10-15-github-cli.md) | The full anatomy, 16 figures, and the session-OS adapter proposal |
| [§04 Command surface](../report/2026-10-15-github-cli.md#04-the-installed-command-surface-searchable-and-inspectable) | The captured command tree by family, with flags and JSON fields |
| [§13 Output and exit codes](../report/2026-10-15-github-cli.md#13-json-formatting-exit-codes-and-the-meaning-of-success) | JSON flags, exit codes, and what success means |
| [§14 Pull requests](../report/2026-10-15-github-cli.md#14-pr-utilities-span-observation-git-review-and-merge) | Observing, checking, reviewing and merging a PR in an agent workflow |
| [§20 Agent surfaces](../report/2026-10-15-github-cli.md#20-agent-tasks-copilot-cli-and-skills-have-different-lifetimes) | Where agent tasks, Copilot CLI sessions and skills belong |
| [§24 Session OS](../report/2026-10-15-github-cli.md#24-a-session-os-should-own-jobs-gh-should-perform-github-operations) | The proposed job record, receipt and retry rules |
| [§25 Inspection](../report/2026-10-15-github-cli.md#25-inspect-the-installed-system-without-confusing-its-layers) | Locating a failure before choosing a retry |
| [Command inventory](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli/assets/command-inventory.json) | All 228 advertised nodes as JSON, with flags, JSON fields and preview markers |

## How it connects

- **Codex sessions.** An ordinary gh command does not create the durable
  conversation described in
  [Anatomy of a Codex session](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/codex-session). It is not a
  resumable agent session.
- **Space projects.** A Space project can map to one or several repositories
  and GitHub Projects, and those links should be stored explicitly
  (*Integration*). Session and project IDs belong to the host product; gh has
  no built-in knowledge of them.
- **Agent skills.** In the pinned skill registry, project-scope Codex and
  Copilot skills use `.agents/skills` under the Git root, and Claude Code uses
  `.claude/skills`. Claude Code has its own [claude](../../../claude/) topic.

## Open questions

The teardown
[names what it did not exercise](../report/2026-10-15-github-cli.md#26-sources-experiments-and-boundaries-of-this-teardown).
Those parts rest on source or manual analysis, or are labeled proposals:

- authentication changes, keyring internals, GHES and Windows behavior;
- remote mutations, hosted agent dispatch and Copilot launch;
- extension and skill installation, and artifact verification;
- a deployed session-OS adapter.

On Windows the data, state and cache roots can coincide, so
`gh config clear-cache` may remove more than disposable HTTP responses. The
report infers this from the resolvers and deletion code; Windows execution
was not tested
([§06](../report/2026-10-15-github-cli.md#06-there-are-four-storage-roots-not-one-gh-data-directory)).

## Sources

By Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[gh-cli](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli)
([`index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli/index.html)), published on 13 October 2026 as
*Anatomy of GitHub CLI*. The teardown reads
[cli/cli at `fc4b137`](https://github.com/cli/cli/tree/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd)
and its pinned dependency
[go-gh v2.16.1](https://github.com/cli/go-gh/tree/v2.16.1).
