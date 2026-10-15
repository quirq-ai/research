# Anatomy of GitHub CLI

How gh works, what you can call, where its data lives, and which system owns the result: commands, YAML configuration, accounts, credentials, Git, REST, GraphQL, Projects, Actions, extensions, agents, and a durable adapter for a session operating system.

By **Suraj Sharma**, XO Labs · Tools and execution. First published 13 October 2026 as *Anatomy of GitHub CLI* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli).

Source: [`gh-cli/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

## 01 · GitHub CLI is a client with several kinds of effects

*\[Versioned teardown\]* `gh` is GitHub CLI: a program you run to query and change GitHub resources, coordinate Git operations, download artifacts, and launch related tools. Its core is written in Go. This writing examines the installed **gh 2.102.0**, released on 30 September 2026, and the matching source commit `fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd`. The inspection date is 13 October 2026. [Executable entry point](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/cmd/gh/main.go); [dependency manifest](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/go.mod).

A normal invocation starts a process, resolves a command and its context, performs work, returns output, and exits. It does not create the kind of durable conversation described in [Anatomy of a Codex session](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/codex-session). Some commands watch remote work, and some launch other programs. Those behaviors do not make ordinary `gh` commands resumable agent sessions.

**Figure 1. Separate the client, the checkout, and the service** *\[Source reconstruction\]*

| Owner | What belongs there | What it is not |
|----|----|----|
| **gh process** | Parsed arguments, clients, response objects, terminal formatting, exit status. | A durable queue or universal task database. |
| **Local gh storage** | Preferences, account metadata, installed tools, caches, small state records. | A complete mirror of GitHub issues, PRs, Projects, or Actions. |
| **Git checkout** | Commits, refs, worktree files, remotes, repository configuration. | A download of every collaboration object attached to a repository. |
| **GitHub services** | Issues, reviews, PR metadata, Project items, Actions executions, releases, Codespaces. | Processes that stop merely because the local gh client exits. |

A successful client invocation can start work whose lifetime belongs to another system. Record those two lifetimes separately.

The useful question is therefore broader than “what command exists?” Ask which object a command addresses, which credential it uses, where its durable result lives, and what side effects it can have. A PR query reads remote state. A PR checkout also changes local Git state. A workflow dispatch starts remote execution. An artifact download writes local files.

This article combines source observations, isolated local experiments, and a few read-only queries against the public `cli/cli` repository. Synthetic account names, paths, and object IDs are marked as examples. The final operating-system design is a proposal. No account login, private credential inspection, remote mutation, extension install, or skill install was needed for the research.

## 02 · The executable, command tree, and dependency graph

*\[Pinned source\]* The entry point calls `ghcmd.Main()`, then exits with the returned code. Main creates the command environment: configuration access, terminal streams, optional telemetry, dependency wiring, and the root command. The Cobra library matches command names and flags and dispatches the selected handler. [Main](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/internal/ghcmd/cmd.go); [NewCmdRoot](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/root/root.go).

**Figure 2. One invocation crosses several explicit boundaries** *\[Source reconstruction\]*

01

### Arguments

The shell passes an argument vector to the gh executable.

02

### Command

Cobra selects a handler and validates its flags.

03

### Dependencies

The handler obtains repository, HTTP, Git, and IO helpers.

04

### Effects / result

Requests or subprocesses run; output and an exit code return.

This is a conceptual call path. A command can make several requests, prompt, or take a browser-only branch; it is not necessarily one request per invocation.

The `Factory` is a bundle of dependencies, not a record of user projects. It exposes configuration, authenticated and other HTTP clients, a Git client, a browser launcher, an extension manager, input/output streams, a prompter, and functions for resolving the base repository, current branch, and remotes. Passing this bundle into commands also makes those commands testable with substituted clients. [`pkg/cmdutil/factory.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmdutil/factory.go); [`pkg/cmd/factory/default.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/factory/default.go).

The HTTP layer handles REST and GraphQL requests. The Git layer runs the actual `git` executable through subprocess calls. A browser command launches a local browser or prints a URL, depending on flags. Extensions and Copilot can execute separate programs. The implementation language of an extension need not be Go just because the main CLI is Go. [`api/client.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/api/client.go); [`git/client.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/git/client.go).

A useful source map is `cmd/gh` for the entry point, `internal/ghcmd` for process setup, `pkg/cmd/root` for registration, `pkg/cmd/<family>/<command>` for handlers, `api` for service clients and types, and `git` for Git subprocess operations. The pinned dependency `go-gh/v2 v2.16.1` supplies shared configuration, authentication, and HTTP facilities.

There can be short-lived background activity, including update checks and a detached telemetry sender. Neither provides a persistent worker that resumes your business task after the parent exits. When `gh run watch` waits, it is an attached polling process; the actual workflow belongs to GitHub Actions.

## 03 · A command needs a host, repository, and resource identity

The common shape is `gh <family> <operation> [arguments] [flags]`. But the target is not universal. A repository command may accept `--repo`; a Project command often needs an owner; an API request has a hostname and endpoint; an extension defines its own contract. There is no single global `--repo` flag accepted by everything.

```
gh pr view 42 --repo github.com/acme/widget --json number,url,state
gh project list --owner acme --format json
gh api --hostname github.com repos/acme/widget
```

These are illustrative commands against a hypothetical repository. The first number is repository-scoped. The owner in the second line can be a user or organization. The third line names the GitHub host independently of the REST endpoint. Explicit targets make automation easier to review than relying on the current directory.

Repository-dependent commands can infer context from Git remotes and a configured default repository. `GH_REPO` supplies a `[HOST/]OWNER/REPO` override for commands that support repository context. `GH_HOST` supplies a default host when a more specific context does not already identify one. A local working directory, a remote URL, and a GitHub repository identity are related, but they are different values. [BaseRepoFunc and SmartBaseRepoFunc](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/factory/default.go); [Environment reference](https://cli.github.com/manual/gh_help_environment).

GitHub.com normally uses `api.github.com` for REST and `api.github.com/graphql` for GraphQL. A typical GitHub Enterprise Server uses `HOST/api/v3` and `HOST/api/graphql`. Enterprise Cloud data-residency hosts under `ghe.com` have separate handling; do not equate every enterprise deployment with GHES. Server versions and enabled products can change which commands work. [`internal/ghinstance/host.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/internal/ghinstance/host.go).

For an adapter, bind host and resource at the boundary. Preserve the host alongside every repository, issue, run, or node ID. A number such as 42 has meaning only with an object type and its containing scope. A URL is useful for humans; a validated structured target is useful for execution.

## 04 · The installed command surface, searchable and inspectable

*\[Measured help inventory\]* The installed help reference exposes **33 top-level command families, 228 canonical command nodes, and 196 leaf nodes**. The counts come from parsing `gh help reference` and inspecting each node with `gh help <path>`. Group nodes are included, so 228 is not a count of independent operations. Hidden helpers, help topics, extensions, and configurable aliases—including the default `co` alias—are excluded.

Use the atlas to discover a utility, then inspect its exact synopsis, flags, and available JSON fields. The preview marker is version-specific. The controls only search this captured reference; they do not execute commands or contact GitHub. The complete [machine-readable inventory](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli/assets/command-inventory.json) includes parent/child relationships and inherited flags.

**Figure 3. Browse the captured built-in command tree** *\[Measured inventory\]*

Search commandsFamily

228 matching command entries in 33 families

Selected command · captured help

### gh pr view

View a pull request

```
gh pr view [<number> | <url> | <branch>] [flags]

FLAGS
-c, --comments          View pull request comments
-q, --jq expression     Filter JSON output using a jq expression
--json fields       Output JSON with the specified fields
-t, --template string   Format JSON output using a Go template; see "gh help formatting"
-w, --web               Open a pull request in the browser

INHERITED FLAGS
--help                     Show help for command
-R, --repo [HOST/]OWNER/REPO   Select another repository using the [HOST/]OWNER/REPO format

JSON FIELDS
additions, assignees, author, autoMergeRequest, baseRefName, baseRefOid, body, changedFiles, closed, closedAt, closingIssuesReferences, comments, commits, createdAt, deletions, files, fullDatabaseId, headRefName, headRefOid, headRepository, headRepositoryOwner, id, isCrossRepository, isDraft, labels, latestReviews, maintainerCanModify, mergeCommit, mergeStateStatus, mergeable, mergedAt, mergedBy, milestone, number, potentialMergeCommit, projectCards, projectItems, reactionGroups, reviewDecision, reviewRequests, reviews, state, statusCheckRollup, title, updatedAt, url
```

[Open official manual](https://cli.github.com/manual/gh_pr_view)

**gh agent-task 4 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh agent-task preview | Work with agent tasks (preview) | [Manual](https://cli.github.com/manual/gh_agent-task) |
| gh agent-task create preview | Create an agent task (preview) | [Manual](https://cli.github.com/manual/gh_agent-task_create) |
| gh agent-task list preview | List agent tasks (preview) | [Manual](https://cli.github.com/manual/gh_agent-task_list) |
| gh agent-task view preview | View an agent task session (preview) | [Manual](https://cli.github.com/manual/gh_agent-task_view) |

**gh alias 5 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh alias | Create command shortcuts | [Manual](https://cli.github.com/manual/gh_alias) |
| gh alias delete | Delete set aliases | [Manual](https://cli.github.com/manual/gh_alias_delete) |
| gh alias import | Import aliases from a YAML file | [Manual](https://cli.github.com/manual/gh_alias_import) |
| gh alias list | List your aliases | [Manual](https://cli.github.com/manual/gh_alias_list) |
| gh alias set | Create a shortcut for a gh command | [Manual](https://cli.github.com/manual/gh_alias_set) |

**gh api 1 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh api | Make an authenticated GitHub API request | [Manual](https://cli.github.com/manual/gh_api) |

**gh attestation 4 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh attestation | Work with artifact attestations | [Manual](https://cli.github.com/manual/gh_attestation) |
| gh attestation download | Download an artifact's attestations for offline use | [Manual](https://cli.github.com/manual/gh_attestation_download) |
| gh attestation trusted-root | Output trusted_root.jsonl contents, likely for offline verification | [Manual](https://cli.github.com/manual/gh_attestation_trusted-root) |
| gh attestation verify | Verify an artifact's integrity using attestations | [Manual](https://cli.github.com/manual/gh_attestation_verify) |

**gh auth 8 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh auth | Authenticate gh and git with GitHub | [Manual](https://cli.github.com/manual/gh_auth) |
| gh auth login | Log in to a GitHub account | [Manual](https://cli.github.com/manual/gh_auth_login) |
| gh auth logout | Log out of a GitHub account | [Manual](https://cli.github.com/manual/gh_auth_logout) |
| gh auth refresh | Refresh stored authentication credentials | [Manual](https://cli.github.com/manual/gh_auth_refresh) |
| gh auth setup-git | Setup git with GitHub CLI | [Manual](https://cli.github.com/manual/gh_auth_setup-git) |
| gh auth status | Display active account and authentication state on each known GitHub host | [Manual](https://cli.github.com/manual/gh_auth_status) |
| gh auth switch | Switch active GitHub account | [Manual](https://cli.github.com/manual/gh_auth_switch) |
| gh auth token | Print the authentication token gh uses for a hostname and account | [Manual](https://cli.github.com/manual/gh_auth_token) |

**gh browse 1 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh browse | Open repositories, issues, pull requests, and more in the browser | [Manual](https://cli.github.com/manual/gh_browse) |

**gh cache 3 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh cache | Manage GitHub Actions caches | [Manual](https://cli.github.com/manual/gh_cache) |
| gh cache delete | Delete GitHub Actions caches | [Manual](https://cli.github.com/manual/gh_cache_delete) |
| gh cache list | List GitHub Actions caches | [Manual](https://cli.github.com/manual/gh_cache_list) |

**gh codespace 16 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh codespace | Connect to and manage codespaces | [Manual](https://cli.github.com/manual/gh_codespace) |
| gh codespace code | Open a codespace in Visual Studio Code | [Manual](https://cli.github.com/manual/gh_codespace_code) |
| gh codespace cp | Copy files between local and remote file systems | [Manual](https://cli.github.com/manual/gh_codespace_cp) |
| gh codespace create | Create a codespace | [Manual](https://cli.github.com/manual/gh_codespace_create) |
| gh codespace delete | Delete codespaces | [Manual](https://cli.github.com/manual/gh_codespace_delete) |
| gh codespace edit | Edit a codespace | [Manual](https://cli.github.com/manual/gh_codespace_edit) |
| gh codespace jupyter | Open a codespace in JupyterLab | [Manual](https://cli.github.com/manual/gh_codespace_jupyter) |
| gh codespace list | List codespaces | [Manual](https://cli.github.com/manual/gh_codespace_list) |
| gh codespace logs | Access codespace logs | [Manual](https://cli.github.com/manual/gh_codespace_logs) |
| gh codespace ports | List ports in a codespace | [Manual](https://cli.github.com/manual/gh_codespace_ports) |
| gh codespace ports forward | Forward ports | [Manual](https://cli.github.com/manual/gh_codespace_ports_forward) |
| gh codespace ports visibility | Change the visibility of the forwarded port | [Manual](https://cli.github.com/manual/gh_codespace_ports_visibility) |
| gh codespace rebuild | Rebuild a codespace | [Manual](https://cli.github.com/manual/gh_codespace_rebuild) |
| gh codespace ssh | SSH into a codespace | [Manual](https://cli.github.com/manual/gh_codespace_ssh) |
| gh codespace stop | Stop a running codespace | [Manual](https://cli.github.com/manual/gh_codespace_stop) |
| gh codespace view | View details about a codespace | [Manual](https://cli.github.com/manual/gh_codespace_view) |

**gh completion 1 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh completion | Generate shell completion scripts | [Manual](https://cli.github.com/manual/gh_completion) |

**gh config 5 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh config | Manage configuration for gh | [Manual](https://cli.github.com/manual/gh_config) |
| gh config clear-cache | Clear the cli cache | [Manual](https://cli.github.com/manual/gh_config_clear-cache) |
| gh config get | Print the value of a given configuration key | [Manual](https://cli.github.com/manual/gh_config_get) |
| gh config list | Print a list of configuration keys and values | [Manual](https://cli.github.com/manual/gh_config_list) |
| gh config set | Update configuration with a value for the given key | [Manual](https://cli.github.com/manual/gh_config_set) |

**gh copilot 1 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh copilot preview | Run the GitHub Copilot CLI (preview) | [Manual](https://cli.github.com/manual/gh_copilot) |

**gh discussion 6 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh discussion preview | Work with GitHub Discussions (preview) | [Manual](https://cli.github.com/manual/gh_discussion) |
| gh discussion comment preview | Add, edit, or delete a comment or a reply on a discussion (preview) | [Manual](https://cli.github.com/manual/gh_discussion_comment) |
| gh discussion create preview | Create a new discussion (preview) | [Manual](https://cli.github.com/manual/gh_discussion_create) |
| gh discussion edit preview | Edit a discussion (preview) | [Manual](https://cli.github.com/manual/gh_discussion_edit) |
| gh discussion list preview | List discussions in a repository (preview) | [Manual](https://cli.github.com/manual/gh_discussion_list) |
| gh discussion view preview | View a discussion (preview) | [Manual](https://cli.github.com/manual/gh_discussion_view) |

**gh extension 9 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh extension | Manage gh extensions | [Manual](https://cli.github.com/manual/gh_extension) |
| gh extension browse | Enter a UI for browsing, adding, and removing extensions | [Manual](https://cli.github.com/manual/gh_extension_browse) |
| gh extension create | Create a new extension | [Manual](https://cli.github.com/manual/gh_extension_create) |
| gh extension exec | Execute an installed extension | [Manual](https://cli.github.com/manual/gh_extension_exec) |
| gh extension install | Install a gh extension from a repository | [Manual](https://cli.github.com/manual/gh_extension_install) |
| gh extension list | List installed extension commands | [Manual](https://cli.github.com/manual/gh_extension_list) |
| gh extension remove | Remove an installed extension | [Manual](https://cli.github.com/manual/gh_extension_remove) |
| gh extension search | Search extensions to the GitHub CLI | [Manual](https://cli.github.com/manual/gh_extension_search) |
| gh extension upgrade | Upgrade installed extensions | [Manual](https://cli.github.com/manual/gh_extension_upgrade) |

**gh gist 8 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh gist | Manage gists | [Manual](https://cli.github.com/manual/gh_gist) |
| gh gist clone | Clone a gist locally | [Manual](https://cli.github.com/manual/gh_gist_clone) |
| gh gist create | Create a new gist | [Manual](https://cli.github.com/manual/gh_gist_create) |
| gh gist delete | Delete a gist | [Manual](https://cli.github.com/manual/gh_gist_delete) |
| gh gist edit | Edit one of your gists | [Manual](https://cli.github.com/manual/gh_gist_edit) |
| gh gist list | List your gists | [Manual](https://cli.github.com/manual/gh_gist_list) |
| gh gist rename | Rename a file in a gist | [Manual](https://cli.github.com/manual/gh_gist_rename) |
| gh gist view | View a gist | [Manual](https://cli.github.com/manual/gh_gist_view) |

**gh gpg-key 4 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh gpg-key | Manage GPG keys | [Manual](https://cli.github.com/manual/gh_gpg-key) |
| gh gpg-key add | Add a GPG key to your GitHub account | [Manual](https://cli.github.com/manual/gh_gpg-key_add) |
| gh gpg-key delete | Delete a GPG key from your GitHub account | [Manual](https://cli.github.com/manual/gh_gpg-key_delete) |
| gh gpg-key list | Lists GPG keys in your GitHub account | [Manual](https://cli.github.com/manual/gh_gpg-key_list) |

**gh issue 16 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh issue | Manage issues | [Manual](https://cli.github.com/manual/gh_issue) |
| gh issue close | Close issue | [Manual](https://cli.github.com/manual/gh_issue_close) |
| gh issue comment | Add a comment to an issue | [Manual](https://cli.github.com/manual/gh_issue_comment) |
| gh issue create | Create a new issue | [Manual](https://cli.github.com/manual/gh_issue_create) |
| gh issue delete | Delete issue | [Manual](https://cli.github.com/manual/gh_issue_delete) |
| gh issue develop | Manage linked branches for an issue | [Manual](https://cli.github.com/manual/gh_issue_develop) |
| gh issue edit | Edit issues | [Manual](https://cli.github.com/manual/gh_issue_edit) |
| gh issue list | List issues in a repository | [Manual](https://cli.github.com/manual/gh_issue_list) |
| gh issue lock | Lock issue conversation | [Manual](https://cli.github.com/manual/gh_issue_lock) |
| gh issue pin | Pin an issue | [Manual](https://cli.github.com/manual/gh_issue_pin) |
| gh issue reopen | Reopen issue | [Manual](https://cli.github.com/manual/gh_issue_reopen) |
| gh issue status | Show status of relevant issues | [Manual](https://cli.github.com/manual/gh_issue_status) |
| gh issue transfer | Transfer issue to another repository | [Manual](https://cli.github.com/manual/gh_issue_transfer) |
| gh issue unlock | Unlock issue conversation | [Manual](https://cli.github.com/manual/gh_issue_unlock) |
| gh issue unpin | Unpin an issue | [Manual](https://cli.github.com/manual/gh_issue_unpin) |
| gh issue view | View an issue | [Manual](https://cli.github.com/manual/gh_issue_view) |

**gh label 6 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh label | Manage labels | [Manual](https://cli.github.com/manual/gh_label) |
| gh label clone | Clones labels from one repository to another | [Manual](https://cli.github.com/manual/gh_label_clone) |
| gh label create | Create a new label | [Manual](https://cli.github.com/manual/gh_label_create) |
| gh label delete | Delete a label from a repository | [Manual](https://cli.github.com/manual/gh_label_delete) |
| gh label edit | Edit a label | [Manual](https://cli.github.com/manual/gh_label_edit) |
| gh label list | List labels in a repository | [Manual](https://cli.github.com/manual/gh_label_list) |

**gh licenses 1 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh licenses | View third-party license information | [Manual](https://cli.github.com/manual/gh_licenses) |

**gh org 2 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh org | Manage organizations | [Manual](https://cli.github.com/manual/gh_org) |
| gh org list | List organizations for the authenticated user. | [Manual](https://cli.github.com/manual/gh_org_list) |

**gh pr 19 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh pr | Manage pull requests | [Manual](https://cli.github.com/manual/gh_pr) |
| gh pr checkout | Check out a pull request in git | [Manual](https://cli.github.com/manual/gh_pr_checkout) |
| gh pr checks | Show CI status for a single pull request | [Manual](https://cli.github.com/manual/gh_pr_checks) |
| gh pr close | Close a pull request | [Manual](https://cli.github.com/manual/gh_pr_close) |
| gh pr comment | Add a comment to a pull request | [Manual](https://cli.github.com/manual/gh_pr_comment) |
| gh pr create | Create a pull request | [Manual](https://cli.github.com/manual/gh_pr_create) |
| gh pr diff | View changes in a pull request | [Manual](https://cli.github.com/manual/gh_pr_diff) |
| gh pr edit | Edit a pull request | [Manual](https://cli.github.com/manual/gh_pr_edit) |
| gh pr list | List pull requests in a repository | [Manual](https://cli.github.com/manual/gh_pr_list) |
| gh pr lock | Lock pull request conversation | [Manual](https://cli.github.com/manual/gh_pr_lock) |
| gh pr merge | Merge a pull request | [Manual](https://cli.github.com/manual/gh_pr_merge) |
| gh pr ready | Mark a pull request as ready for review | [Manual](https://cli.github.com/manual/gh_pr_ready) |
| gh pr reopen | Reopen a pull request | [Manual](https://cli.github.com/manual/gh_pr_reopen) |
| gh pr revert | Revert a pull request | [Manual](https://cli.github.com/manual/gh_pr_revert) |
| gh pr review | Add a review to a pull request | [Manual](https://cli.github.com/manual/gh_pr_review) |
| gh pr status | Show status of relevant pull requests | [Manual](https://cli.github.com/manual/gh_pr_status) |
| gh pr unlock | Unlock pull request conversation | [Manual](https://cli.github.com/manual/gh_pr_unlock) |
| gh pr update-branch | Update a pull request branch | [Manual](https://cli.github.com/manual/gh_pr_update-branch) |
| gh pr view | View a pull request | [Manual](https://cli.github.com/manual/gh_pr_view) |

**gh preview 2 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh preview preview | Execute previews for gh features | [Manual](https://cli.github.com/manual/gh_preview) |
| gh preview prompter preview | Execute a test program to preview the prompter | [Manual](https://cli.github.com/manual/gh_preview_prompter) |

**gh project 20 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh project | Work with GitHub Projects. | [Manual](https://cli.github.com/manual/gh_project) |
| gh project close | Close a project | [Manual](https://cli.github.com/manual/gh_project_close) |
| gh project copy | Copy a project | [Manual](https://cli.github.com/manual/gh_project_copy) |
| gh project create | Create a project | [Manual](https://cli.github.com/manual/gh_project_create) |
| gh project delete | Delete a project | [Manual](https://cli.github.com/manual/gh_project_delete) |
| gh project edit | Edit a project | [Manual](https://cli.github.com/manual/gh_project_edit) |
| gh project field-create | Create a field in a project | [Manual](https://cli.github.com/manual/gh_project_field-create) |
| gh project field-delete | Delete a field in a project | [Manual](https://cli.github.com/manual/gh_project_field-delete) |
| gh project field-list | List the fields in a project | [Manual](https://cli.github.com/manual/gh_project_field-list) |
| gh project item-add | Add a pull request or an issue to a project | [Manual](https://cli.github.com/manual/gh_project_item-add) |
| gh project item-archive | Archive an item in a project | [Manual](https://cli.github.com/manual/gh_project_item-archive) |
| gh project item-create | Create a draft issue item in a project | [Manual](https://cli.github.com/manual/gh_project_item-create) |
| gh project item-delete | Delete an item from a project by ID | [Manual](https://cli.github.com/manual/gh_project_item-delete) |
| gh project item-edit | Edit an item in a project | [Manual](https://cli.github.com/manual/gh_project_item-edit) |
| gh project item-list | List the items in a project | [Manual](https://cli.github.com/manual/gh_project_item-list) |
| gh project link | Link a project to a repository or a team | [Manual](https://cli.github.com/manual/gh_project_link) |
| gh project list | List the projects for an owner | [Manual](https://cli.github.com/manual/gh_project_list) |
| gh project mark-template | Mark a project as a template | [Manual](https://cli.github.com/manual/gh_project_mark-template) |
| gh project unlink | Unlink a project from a repository or a team | [Manual](https://cli.github.com/manual/gh_project_unlink) |
| gh project view | View a project | [Manual](https://cli.github.com/manual/gh_project_view) |

**gh release 11 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh release | Manage releases | [Manual](https://cli.github.com/manual/gh_release) |
| gh release create | Create a new release | [Manual](https://cli.github.com/manual/gh_release_create) |
| gh release delete | Delete a release | [Manual](https://cli.github.com/manual/gh_release_delete) |
| gh release delete-asset | Delete an asset from a release | [Manual](https://cli.github.com/manual/gh_release_delete-asset) |
| gh release download | Download release assets | [Manual](https://cli.github.com/manual/gh_release_download) |
| gh release edit | Edit a release | [Manual](https://cli.github.com/manual/gh_release_edit) |
| gh release list | List releases in a repository | [Manual](https://cli.github.com/manual/gh_release_list) |
| gh release upload | Upload assets to a release | [Manual](https://cli.github.com/manual/gh_release_upload) |
| gh release verify | Verify the attestation for a release | [Manual](https://cli.github.com/manual/gh_release_verify) |
| gh release verify-asset | Verify that a given asset originated from a release | [Manual](https://cli.github.com/manual/gh_release_verify-asset) |
| gh release view | View information about a release | [Manual](https://cli.github.com/manual/gh_release_view) |

**gh repo 30 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh repo | Manage repositories | [Manual](https://cli.github.com/manual/gh_repo) |
| gh repo archive | Archive a repository | [Manual](https://cli.github.com/manual/gh_repo_archive) |
| gh repo autolink | Manage autolink references | [Manual](https://cli.github.com/manual/gh_repo_autolink) |
| gh repo autolink create | Create a new autolink reference | [Manual](https://cli.github.com/manual/gh_repo_autolink_create) |
| gh repo autolink delete | Delete an autolink reference | [Manual](https://cli.github.com/manual/gh_repo_autolink_delete) |
| gh repo autolink list | List autolink references for a GitHub repository | [Manual](https://cli.github.com/manual/gh_repo_autolink_list) |
| gh repo autolink view | View an autolink reference | [Manual](https://cli.github.com/manual/gh_repo_autolink_view) |
| gh repo clone | Clone a repository locally | [Manual](https://cli.github.com/manual/gh_repo_clone) |
| gh repo create | Create a new repository | [Manual](https://cli.github.com/manual/gh_repo_create) |
| gh repo delete | Delete a repository | [Manual](https://cli.github.com/manual/gh_repo_delete) |
| gh repo deploy-key | Manage deploy keys in a repository | [Manual](https://cli.github.com/manual/gh_repo_deploy-key) |
| gh repo deploy-key add | Add a deploy key to a GitHub repository | [Manual](https://cli.github.com/manual/gh_repo_deploy-key_add) |
| gh repo deploy-key delete | Delete a deploy key from a GitHub repository | [Manual](https://cli.github.com/manual/gh_repo_deploy-key_delete) |
| gh repo deploy-key list | List deploy keys in a GitHub repository | [Manual](https://cli.github.com/manual/gh_repo_deploy-key_list) |
| gh repo edit | Edit repository settings | [Manual](https://cli.github.com/manual/gh_repo_edit) |
| gh repo fork | Create a fork of a repository | [Manual](https://cli.github.com/manual/gh_repo_fork) |
| gh repo gitignore | List and view available repository gitignore templates | [Manual](https://cli.github.com/manual/gh_repo_gitignore) |
| gh repo gitignore list | List available repository gitignore templates | [Manual](https://cli.github.com/manual/gh_repo_gitignore_list) |
| gh repo gitignore view | View an available repository gitignore template | [Manual](https://cli.github.com/manual/gh_repo_gitignore_view) |
| gh repo license | Explore repository licenses | [Manual](https://cli.github.com/manual/gh_repo_license) |
| gh repo license list | List common repository licenses | [Manual](https://cli.github.com/manual/gh_repo_license_list) |
| gh repo license view | View a specific repository license | [Manual](https://cli.github.com/manual/gh_repo_license_view) |
| gh repo list | List repositories owned by user or organization | [Manual](https://cli.github.com/manual/gh_repo_list) |
| gh repo read-dir preview | List a directory in a repository (preview) | [Manual](https://cli.github.com/manual/gh_repo_read-dir) |
| gh repo read-file preview | Read a file from a repository (preview) | [Manual](https://cli.github.com/manual/gh_repo_read-file) |
| gh repo rename | Rename a repository | [Manual](https://cli.github.com/manual/gh_repo_rename) |
| gh repo set-default | Configure default repository for this directory | [Manual](https://cli.github.com/manual/gh_repo_set-default) |
| gh repo sync | Sync a repository | [Manual](https://cli.github.com/manual/gh_repo_sync) |
| gh repo unarchive | Unarchive a repository | [Manual](https://cli.github.com/manual/gh_repo_unarchive) |
| gh repo view | View a repository | [Manual](https://cli.github.com/manual/gh_repo_view) |

**gh ruleset 4 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh ruleset | View info about repo rulesets | [Manual](https://cli.github.com/manual/gh_ruleset) |
| gh ruleset check | View rules that would apply to a given branch | [Manual](https://cli.github.com/manual/gh_ruleset_check) |
| gh ruleset list | List rulesets for a repository or organization | [Manual](https://cli.github.com/manual/gh_ruleset_list) |
| gh ruleset view | View information about a ruleset | [Manual](https://cli.github.com/manual/gh_ruleset_view) |

**gh run 8 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh run | View details about workflow runs | [Manual](https://cli.github.com/manual/gh_run) |
| gh run cancel | Cancel a workflow run | [Manual](https://cli.github.com/manual/gh_run_cancel) |
| gh run delete | Delete a workflow run | [Manual](https://cli.github.com/manual/gh_run_delete) |
| gh run download | Download artifacts generated by a workflow run | [Manual](https://cli.github.com/manual/gh_run_download) |
| gh run list | List recent workflow runs | [Manual](https://cli.github.com/manual/gh_run_list) |
| gh run rerun | Rerun a run | [Manual](https://cli.github.com/manual/gh_run_rerun) |
| gh run view | View a summary of a workflow run | [Manual](https://cli.github.com/manual/gh_run_view) |
| gh run watch | Watch a run until it completes, showing its progress | [Manual](https://cli.github.com/manual/gh_run_watch) |

**gh search 6 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh search | Search for repositories, issues, and pull requests | [Manual](https://cli.github.com/manual/gh_search) |
| gh search code | Search within code | [Manual](https://cli.github.com/manual/gh_search_code) |
| gh search commits | Search for commits | [Manual](https://cli.github.com/manual/gh_search_commits) |
| gh search issues | Search for issues | [Manual](https://cli.github.com/manual/gh_search_issues) |
| gh search prs | Search for pull requests | [Manual](https://cli.github.com/manual/gh_search_prs) |
| gh search repos | Search for repositories | [Manual](https://cli.github.com/manual/gh_search_repos) |

**gh secret 4 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh secret | Manage GitHub secrets | [Manual](https://cli.github.com/manual/gh_secret) |
| gh secret delete | Delete secrets | [Manual](https://cli.github.com/manual/gh_secret_delete) |
| gh secret list | List secrets | [Manual](https://cli.github.com/manual/gh_secret_list) |
| gh secret set | Create or update secrets | [Manual](https://cli.github.com/manual/gh_secret_set) |

**gh skill 7 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh skill preview | Install and manage agent skills (preview) | [Manual](https://cli.github.com/manual/gh_skill) |
| gh skill install preview | Install agent skills from a GitHub repository (preview) | [Manual](https://cli.github.com/manual/gh_skill_install) |
| gh skill list preview | List installed skills (preview) | [Manual](https://cli.github.com/manual/gh_skill_list) |
| gh skill preview preview | Preview a skill from a GitHub repository (preview) | [Manual](https://cli.github.com/manual/gh_skill_preview) |
| gh skill publish preview | Validate and publish skills to a GitHub repository (preview) | [Manual](https://cli.github.com/manual/gh_skill_publish) |
| gh skill search preview | Search for skills across GitHub (preview) | [Manual](https://cli.github.com/manual/gh_skill_search) |
| gh skill update preview | Update installed skills to their latest versions (preview) | [Manual](https://cli.github.com/manual/gh_skill_update) |

**gh ssh-key 4 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh ssh-key | Manage SSH keys | [Manual](https://cli.github.com/manual/gh_ssh-key) |
| gh ssh-key add | Add an SSH key to your GitHub account | [Manual](https://cli.github.com/manual/gh_ssh-key_add) |
| gh ssh-key delete | Delete an SSH key from your GitHub account | [Manual](https://cli.github.com/manual/gh_ssh-key_delete) |
| gh ssh-key list | Lists SSH keys in your GitHub account | [Manual](https://cli.github.com/manual/gh_ssh-key_list) |

**gh status 1 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh status | Print information about relevant issues, pull requests, and notifications across repositories | [Manual](https://cli.github.com/manual/gh_status) |

**gh variable 5 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh variable | Manage GitHub Actions variables | [Manual](https://cli.github.com/manual/gh_variable) |
| gh variable delete | Delete variables | [Manual](https://cli.github.com/manual/gh_variable_delete) |
| gh variable get | Get variables | [Manual](https://cli.github.com/manual/gh_variable_get) |
| gh variable list | List variables | [Manual](https://cli.github.com/manual/gh_variable_list) |
| gh variable set | Create or update variables | [Manual](https://cli.github.com/manual/gh_variable_set) |

**gh workflow 6 entries**

| Command · select to inspect | Purpose | Reference |
|----|----|----|
| gh workflow | View details about GitHub Actions workflows | [Manual](https://cli.github.com/manual/gh_workflow) |
| gh workflow disable | Disable a workflow | [Manual](https://cli.github.com/manual/gh_workflow_disable) |
| gh workflow enable | Enable a workflow | [Manual](https://cli.github.com/manual/gh_workflow_enable) |
| gh workflow list | List workflows | [Manual](https://cli.github.com/manual/gh_workflow_list) |
| gh workflow run | Run a workflow by creating a workflow_dispatch event | [Manual](https://cli.github.com/manual/gh_workflow_run) |
| gh workflow view | View the summary of a workflow | [Manual](https://cli.github.com/manual/gh_workflow_view) |

The atlas is an offline reference. Selecting a command displays captured help; no shell command or API request is executed.

The four most useful discovery commands are `gh help`, `gh help reference`, `gh help <family>`, and `gh help <family> <operation>`. Prefer that explicit help form for wrappers such as `extension exec`, which can forward arguments to another executable. The local help is the contract for the binary you are actually running.

The inventory found 40 nodes advertising field-selecting `--json`, 20 advertising `--format json`, and 61 advertising `--jq`. These are different sets. A flag’s name is not enough to infer input/output behavior; [the output section](#13-json-formatting-exit-codes-and-the-meaning-of-success) explains the exceptions.

## 05 · Which utility to reach for, and what it can affect

**Figure 4. The top-level families cover distinct services and effects** *\[Installed help\]*

| Families | Use | Important boundary |
|----|----|----|
| `repo`, `ruleset` | Repositories, forks, settings, default target, branch rules, file reads. | Clone/sync can affect Git; ruleset exposes inspection rather than an editing API. |
| `issue`, `pr`, `discussion`, `label` | Work records, conversations, review, merge, classification. | Comments and reviews are remote writes; branch-related commands can also modify Git. |
| `project` | GitHub Projects, fields, items, drafts, repository links. | A GitHub Project is a service object, not a checkout or Codex project. |
| `workflow`, `run`, `cache` | Dispatch and inspect Actions; download artifacts; manage Actions caches. | The cache family addresses remote Actions caches, not the local HTTP cache. |
| `search`, `status`, `org`, `browse` | Find resources, inspect cross-repository activity, list organizations, open URLs. | Browser launch is an effect; searches have their own query and result limits. |
| `release`, `attestation`, `gist` | Distribute assets, verify attestations, manage snippets. | Downloads write files; verification has a trust policy beyond matching a filename. |
| `codespace` | Cloud environments, SSH, tunnels, copying, editors, lifecycle. | The execution environment is remote; gh supplies a client and local integrations. |
| `agent-task`, `copilot`, `skill` | Hosted agent work, a separate local agent CLI, reusable agent instructions. | These preview surfaces have different owners and persistence. |
| `secret`, `variable` | Manage supported service configuration scopes. | Secret listing returns metadata; variable retrieval can return its value. |
| `auth`, `ssh-key`, `gpg-key` | Credentials and hosted public keys. | Authentication state and Git transport authentication are separate concerns. |
| `api` | Direct REST or GraphQL calls beyond the convenience commands. | The endpoint and operation define permission needs and effects. |
| `alias`, `extension` | Shortcuts and independently installed programs. | An alias rewrites arguments; an extension can execute arbitrary local code. |
| `config`, `completion`, `licenses`, `preview` | Preferences, completion generation, notices, experimental UI. | The preview family is not a deployment-preview product. |

This groups all 33 families. Effects depend on the complete command and flags, not just the family name.

You can usually begin with a dedicated command because it handles endpoint selection, pagination within its contract, and readable output. Use `gh api` when the convenience layer does not expose a field or operation. Neither choice grants permissions absent from the credential.

For unattended use, distinguish remote reads, remote writes, local writes, process launches, and long-lived observation. A release download is a remote read and a local write. `issue develop --list` inspects linked branches; creating a development branch is a remote mutation, and checkout flags add local work. A family-level “read-only” label would miss those differences.

## 06 · There are four storage roots, not one gh data directory

*\[Source\]* The directory resolvers live in the pinned [go-gh configuration package](https://github.com/cli/go-gh/blob/v2.16.1/pkg/config/config.go). They independently choose configuration, installed data, state, and cache roots. A directory is created when needed; this list does not assert that every path exists on a fresh installation.

**Figure 5. Root resolution uses the first applicable nonempty value** *\[Pinned dependency\]*

| Root | Priority order | Typical macOS / Linux fallback |
|----|----|----|
| Configuration | `GH_CONFIG_DIR` → `XDG_CONFIG_HOME/gh` → Windows `AppData/GitHub CLI` → home fallback. | `~/.config/gh` |
| Installed data | `XDG_DATA_HOME/gh` → Windows `LocalAppData/GitHub CLI` → home fallback. | `~/.local/share/gh` |
| State | `XDG_STATE_HOME/gh` → Windows `LocalAppData/GitHub CLI` → home fallback. | `~/.local/state/gh` |
| Cache | `XDG_CACHE_HOME/gh` → Windows `LocalAppData/GitHub CLI` → home fallback. | `~/.cache/gh` |

GH_CONFIG_DIR relocates configuration only. It does not relocate installed extensions, state, caches, Git configuration, or agent skills.

```
CONFIG_ROOT/
  config.yml                 # global preferences and aliases
  hosts.yml                  # per-host account/configuration map
DATA_ROOT/
  extensions/gh-NAME/         # installed extension
  copilot/copilot            # downloaded CLI, when this route is used
STATE_ROOT/
  state.yml                  # CLI update-check record
  device-id                  # telemetry identity, when created
  extensions/gh-NAME/state.yml
CACHE_ROOT/
  ab/cd/HASH_REMAINDER        # sharded HTTP-response cache
  run-log-RUN-STARTED.zip     # cached Actions logs
  .sigstore/root/            # default attestation trust material
```

This is a combined schematic, not a literal single parent directory. macOS uses the Unix-style defaults above in this version, rather than automatically choosing `~/Library/Application Support`. The cache resolver alone can fall back to a temporary `gh-cli-cache` directory when a home directory cannot be resolved. These source resolvers do not expose a universal `GH_CACHE_DIR`, `GH_DATA_DIR`, or `GH_STATE_DIR`.

There are also writes outside these roots: cloned repositories and worktrees, selected artifact destinations, recovery files in the system temporary directory, global Git credential-helper configuration, and agent-specific skill directories. A third-party extension can choose additional paths. “Everything gh can write” cannot be reduced to one folder.

On Windows, the default data, state, and cache roots can coincide. In this source version, `gh config clear-cache` recursively removes the resolved cache directory. That combination means it should not be described as universally touching only disposable HTTP responses. This consequence is inferred from the resolvers and deletion code; Windows execution was not tested. [`pkg/cmd/config/clear-cache/clear_cache.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/config/clear-cache/clear_cache.go).

## 07 · config.yml: physical shape, effective values, and all settings

*\[Observed fixture\]* An isolated `GH_CONFIG_DIR` was used to run local configuration and alias commands. It produced `config.yml` and a host-scoped `hosts.yml` without authenticating. The commands changed only the temporary fixture, not the user’s real configuration. The sanitized [fixture report](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli/assets/local-config-fixture.json) records the results.

``` yaml
version: 1
git_protocol: ssh
editor: code --wait
prompt: enabled
prefer_editor_prompt: disabled
pager:
aliases:
  co: pr checkout
  prs: pr list --state open
http_unix_socket:
browser:
clipboard: enabled
color_labels: disabled
accessible_colors: disabled
accessible_prompter: disabled
spinner: enabled
```

Comments are omitted from this displayed fixture. `version: 1` is the configuration-schema version, not the installed CLI version. `aliases` is a map; most preference leaves are consumed as strings. Empty settings can serialize as empty YAML values. The `co` shortcut is supplied by the initial fallback configuration; it is configurable rather than a core command.

**Figure 6. Fourteen respected options in gh 2.102.0** *\[Installed help + source\]*

| Key | Meaning / default | Boundary |
|----|----|----|
| `api_host` | Experimental API hostname override; empty by default. | Host-scoped transport routing; canonical-host requests can remain authenticated. |
| `git_protocol` | `https` by default; can use `ssh`. | Git transport, not the protocol used for REST/GraphQL. |
| `editor` | Editor command; empty means consult environment/fallbacks. | May launch a local program. |
| `prompt` | `enabled`. | Interactive prompting preference; treated globally. |
| `prefer_editor_prompt` | `disabled`. | Preference for editor-based prompts; treated globally. |
| `pager` | Pager command; empty means consult environment/fallbacks. | Output presentation, not pagination of API results. |
| `http_unix_socket` | Empty by default. | HTTP transport through a local Unix socket when configured. |
| `browser` | Browser command; empty means consult environment/fallbacks. | Local URL-opening behavior. |
| `clipboard` | `enabled`. | Copy OAuth device codes; not host-overridable by config set. |
| `color_labels` | `disabled`. | Use label RGB colors where supported. |
| `accessible_colors` | `disabled`. | Accessible 4-bit color presentation. |
| `accessible_prompter` | `disabled`. | Accessible prompting behavior. |
| `spinner` | `enabled`. | Animated versus textual progress. |
| `telemetry` | `enabled`; also supports disabled/log. | Global telemetry policy, with environment overrides. |

The schema version and alias map are additional structure. Effective defaults need not all appear as keys in the physical YAML file.

The local fixture returned `telemetry=enabled` from `gh config list` even though the generated YAML did not contain a telemetry key. Its test process also had telemetry disabled through environment. This illustrates three distinct views: file contents, configuration/default resolution, and the environment-aware behavior of a consumer.

The configuration library loads both YAML files into an in-memory map and exposes the host map under a logical `hosts` key. Writing separates it again. Ordinary value lookup can consult host, global, and default values; particular accessors can intentionally use global settings. Do not invent a single precedence list that applies identically to editor choice, authentication, repository choice, and telemetry. [Configuration accessors, fallbackConfig, and Options](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/internal/config/config.go).

Use the supported setter to make an intentional preference change, for example `gh config set editor "code --wait"`. Use `--host` only where that option supports it. Unknown names can be written with a warning in this implementation; writing an arbitrary key does not add a feature. There is no automatic repository-level `.gh/config.yml` layer in these loaders.

Configuration is not a cross-process database. The library memoizes reads within a process, and its file writer does not provide a general transaction across competing invocations. For a service that runs many agents, prefer process-local environment choices over repeatedly changing shared global preferences.

## 08 · hosts.yml, accounts, tokens, and the credential store

*\[Synthetic shape\]* Physical `hosts.yml` begins with hostnames. It does not have an outer `hosts:` wrapper. A secure-storage account map can look like this; the names are invented and no credential is represented:

``` yaml
github.com:
  git_protocol: https
  users:
    example-user:
    example-bot:
  user: example-user
github.example.test:
  git_protocol: ssh
  users:
    example-enterprise-user:
  user: example-enterprise-user
```

`users` records known accounts; `user` identifies the active stored account. An empty user entry is compatible with credentials living in the operating system’s credential store. The Git protocol is host configuration, not a separate transport preference for each account. Host-specific preferences can also appear in this file.

When secure storage cannot be used, or `--insecure-storage` is chosen, plaintext `oauth_token` fields can appear under a user and at the active host level. The latter represents the active account in that layout. A writing or diagnostic tool should describe that shape without copying a real token. [AuthConfig.Login, activateUser, and SwitchUser](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/internal/config/config.go).

**Figure 7. Credential selection is separate from account labels** *\[Pinned source\]*

| Target | Environment precedence | Then, in this implementation |
|----|----|----|
| GitHub.com / applicable ghe.com tenant | `GH_TOKEN`, then `GITHUB_TOKEN`. | Stored host-level token, then OS credential-store lookup. |
| GitHub Enterprise Server host | `GH_ENTERPRISE_TOKEN`, then `GITHUB_ENTERPRISE_TOKEN`. | Stored host-level token, then OS credential-store lookup. |

An environment token can determine the real identity even when hosts.yml names a different active account. A stored username alone is not an authority check.

The keyring service name is `gh:<hostname>`; accounts are associated with logins, with compatibility handling for older entries. The dependency uses macOS Keychain, Secret Service on supported Unix systems, and Windows Credential Manager. Keyring layout is an implementation detail, not a reason to query and publish credential contents. [Keyring wrapper](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/internal/keyring/keyring.go); [TokenFromEnvOrConfig](https://github.com/cli/go-gh/blob/v2.16.1/pkg/auth/auth.go).

Interactive login, a classic personal access token, a fine-grained token, an Actions job token, and a GitHub App installation token are different authority models. Their repository access and operations differ. A successful repository read does not establish that Projects, workflow controls, or account-level commands will work. [Login reference](https://cli.github.com/manual/gh_auth_login).

Use `gh auth status --active --hostname github.com` to inspect authentication status without requesting token display. `gh auth token` and status with `--show-token` deliberately expose credentials. They are not routine existence checks. Also distinguish authentication from authorization: a valid credential may still lack access to the selected resource.

`gh auth switch` changes stored active-account state, while environment-token selection can override it; the command refuses relevant switches when the effective source is an environment credential. `gh auth logout` removes local authentication state but does not revoke the token at GitHub. These commands are mutations of credential configuration, not neutral inspection. [gh auth switch](https://cli.github.com/manual/gh_auth_switch); [gh auth logout](https://cli.github.com/manual/gh_auth_logout).

## 09 · Git owns the checkout and part of the configuration

A checkout has its own history, refs, index, files, and configuration. `gh` obtains repository context from Git and can invoke Git to clone, fetch, check out, or push. It does not replace the Git object database with a GitHub-specific JSON store.

`gh repo set-default` persists repository resolution through a Git configuration key such as `remote.origin.gh-resolved`. A selected remote can be marked `base`; other resolved repository values are possible. This is local repository configuration. It is not a global catalogue of all of your projects in `hosts.yml`. [SetRemoteResolution and Remotes](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/git/client.go); [gh repo set-default](https://cli.github.com/manual/gh_repo_set-default).

```
# Read the local repository's gh selection markers
git config --get-regexp '^remote\..*\.gh-resolved$'

# Print the chosen default repository
gh repo set-default --view

# Explicitly select the target for a remote query
gh pr list --repo github.com/acme/widget --json number,url,headRefOid
```

HTTPS Git authentication can be bridged through a credential helper. `gh auth setup-git` writes host-scoped helper entries into global Git configuration. Git subsequently calls the hidden `gh auth git-credential` helper and receives credentials through its protocol. By contrast, some Git operations invoked by gh inject helper configuration for that invocation only. [ConfigureOurs](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/auth/shared/gitcredentials/helper_config.go); [AuthenticatedCommand](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/git/client.go).

The helper’s credential output is intended for Git, not an article or general command log. Its `store` and `erase` actions are deliberately no-ops in this version. A failed Git credential exchange does not automatically mean gh logged the user out. [`pkg/cmd/auth/gitcredential/helper.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/auth/gitcredential/helper.go).

With `git_protocol: ssh`, Git transport can use SSH keys and an SSH agent. GitHub REST/GraphQL requests still need their own authentication. Being able to clone through SSH does not imply a `gh api` call has a usable token, and API login does not explain every SSH setup.

For concurrent workers, use isolated checkouts or managed worktrees when commands can change branches or files. Read-only API queries can often run without a checkout if all context is explicit. The need for a checkout belongs to the operation, not to every use of gh.

## 10 · The remote object shapes and their identity rules

There is no universal `gh.json` containing everything. GitHub stores several object families. gh can request a projection, convert it to internal Go types, and export selected JSON. That output is neither a local database schema nor necessarily identical to a REST response.

**Figure 8. An object identifier needs a type and a scope** *\[Service model\]*

| Resource | Identity / useful fields | Common mistake |
|----|----|----|
| Repository | Host; owner/name locator; service ID; URL; default branch. | Treating a local directory path as the repository’s durable identity. |
| Issue / pull request | Repository-scoped number; opaque node ID; state; URL; labels and participants. | Using number 42 without the repository, host, and resource type. |
| Pull request code | Base/head repository and ref; `headRefOid`; review/check state. | Treating a moving branch name as the exact code that was reviewed. |
| Project | Owner; project number; ProjectV2 ID; fields; items. | Confusing a Project item ID with the issue/PR it points to. |
| Workflow run | Run database ID; workflow ID; run number; attempt; head SHA; status/conclusion. | Confusing a rerun attempt with a newly numbered run. |
| Artifact / release asset | Containing run or release; resource ID; filename; download destination. | Using a filename alone as identity or integrity evidence. |

Persist compound references in your own system. Names and URLs help people navigate; IDs and commit SHAs help correlate exact objects.

For a pull request, a compact selected CLI result might have this shape. The values below are synthetic; the keys correspond to requested CLI export fields:

``` json
{
  "id": "PR_example",
  "number": 42,
  "title": "Document the worker",
  "state": "OPEN",
  "isDraft": false,
  "url": "https://github.com/acme/widget/pull/42",
  "baseRefName": "main",
  "headRefName": "docs/worker",
  "headRefOid": "<commit SHA>",
  "mergeable": "MERGEABLE"
}
```

`number` is the convenient repository-scoped address. `id` is an opaque GraphQL node identifier. `headRefOid` pins code. `mergeable` is a service-computed observation, not proof that every policy and required check allows immediate merging. Additional exported fields include review decisions, check rollups, timestamps, comments, and file metadata; available fields are visible in the atlas. [PullRequest type and export fields](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/api/queries_pr.go).

The same conceptual value can have different keys at different interfaces. A run’s CLI projection uses `databaseId` and `headSha`; raw REST commonly uses `id` and `head_sha`. GraphQL connections expose nodes or edges plus pagination metadata. Do not feed one representation into a parser expecting another without an explicit mapping. [Run type](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/run/shared/shared.go).

Issues and pull requests share some GitHub interfaces: a repository’s REST issues collection can include pull requests, identified by a `pull_request` member. Their issue and pull-request API IDs should not be assumed identical. Opaque global node IDs can bridge to GraphQL, but decoding their internal spelling is not a stable integration strategy. [Issues API](https://docs.github.com/en/rest/issues/issues#list-repository-issues); [Global node IDs](https://docs.github.com/en/graphql/guides/using-global-node-ids).

## 11 · Follow a PR query from argv to JSON

*\[Source trace\]* Consider a normal PR listing with an explicit repository and fields:

```
gh pr list --repo github.com/cli/cli \
  --state open --limit 20 \
  --json number,title,url,headRefOid
```

The shell supplies arguments. Cobra selects the list command and validates flags. Its handler resolves the base repository, obtains an HTTP client, and uses the selected export fields to choose data for the query. The ordinary path queries a repository’s pull-request connection through GraphQL and fetches pages until the requested limit or end. Results become Go values and then JSON on stdout. [NewCmdList and listRun](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/pr/list/list.go); [List](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/pr/shared/lister.go).

That is not the only route. Author, assignee, label, draft, or explicit search filters can switch PR listing to the GraphQL Search API. Search has different limits; increasing `--limit` does not promise an unlimited export. Feature detection or repository resolution can add requests. A single shell command is not necessarily a single network request. [shouldUseSearch](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/pr/list/http.go).

The shared HTTP client adds authentication for the target host and applies transport behavior such as caching or logging where configured. REST and GraphQL use the same broad client infrastructure but have distinct request and error shapes. Internal response structs are transient values, not evidence that gh stores a persistent PR object table on disk. [NewHTTPClient and AddAuthTokenHeader](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/api/http_client.go); [`api/client.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/api/client.go).

A measured read of `cli/cli` produced `nameWithOwner`, `isPrivate`, `url`, and `defaultBranchRef` through `gh repo view --json`. A REST request to the same repository produced `full_name`, `private`, and `default_branch`. The difference is interface shape, not a different repository.

Now contrast `gh pr checkout 42`. The handler resolves a PR, inspects remotes and protocol, constructs Git operations, and executes them. Depending on options and local state, these include fetching refs, creating or checking out branches, and worktree handling. Remote metadata lookup is only one phase. [checkoutRun and executeCmds](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/pr/checkout/checkout.go).

For a tool adapter, this trace determines where to observe completion. A query completes when its selected data is successfully returned. A checkout also needs the expected branch/files. A workflow dispatch completes its client request before the workflow completes. One generic “gh succeeded” flag loses those distinctions.

## 12 · gh api exposes REST and GraphQL directly

`gh api` is the escape hatch when a convenience command is insufficient. It resolves authentication, constructs a request, prints the response, and can filter or paginate it. It is not an unrestricted substitute for service permissions. The operation still must exist and be allowed for the credential. [API manual](https://cli.github.com/manual/gh_api).

### REST: make the intended method explicit

```
gh api --hostname github.com --method GET \
  repos/cli/cli/issues \
  -f state=open -F per_page=10 \
  --jq 'map({number, title, is_pull_request: has("pull_request")})'
```

With no body parameters, REST defaults to GET. Supplying `-f`, `-F`, or an input body changes the implicit method to POST unless you set it. A query example with fields should therefore use `--method GET`. Quote bracketed parameter names and endpoints containing placeholders so the shell does not interpret them first.

`-f` supplies a string. `-F` interprets integers, exact booleans, and null, and supports file/stdin values and the documented repository placeholders. A decimal such as `1.5` is not automatically a JSON floating-point number through this conversion. Likewise, `@payload.json` as a field reads text; it does not generally parse that text into an object. Use `--input payload.json` when the body’s JSON types matter. [magicFieldValue](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/api/fields.go).

With `--input`, additional field flags become query-string parameters rather than being merged into the body. Nested field syntax such as `labels[]=docs` can construct arrays in the field-driven mode. Repository placeholders include `{owner}`, `{repo}`, and `{branch}`; these are contextual expansion, not a general templating language. [apiRun](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/api/api.go); [`pkg/cmd/api/http.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/api/http.go).

### GraphQL: the query determines the operation

```
gh api --hostname github.com graphql \
  -f query='query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      nameWithOwner
      defaultBranchRef { name }
    }
  }' \
  -F owner=cli -F name=cli
```

The query and operation name are special fields; the other fields become GraphQL variables. GraphQL queries normally use HTTP POST while still being reads. Conversely, a GraphQL mutation can write. Classify the operation itself rather than equating every POST with a business mutation.

### Pagination is part of the data contract

```
gh api --hostname github.com --method GET \
  repos/cli/cli/releases -F per_page=100 \
  --paginate --slurp > releases-pages.json
```

REST pagination follows the next link in response metadata. `--slurp` cannot be combined with `--jq` or `--template`. With `--slurp`, pages are wrapped in one outer array; array-valued pages therefore yield an array of arrays. GraphQL pagination needs an `$endCursor: String` variable and a connection that uses `after: $endCursor` and returns `pageInfo { hasNextPage endCursor }`. The CLI advances that cursor; it does not independently exhaust every nested connection in an arbitrary graph. [`pkg/cmd/api/pagination.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/api/pagination.go).

`--jq` transforms each response page. For an aggregate across all pages, first collect a known page shape and then aggregate it in your program. A list limit, a connection’s nested limit, a search cap, and a network page size are different constraints.

An HTTP 200 GraphQL response can contain errors, sometimes alongside partial data. gh checks that error channel. `--silent` suppresses a body, not failure semantics. `--include` adds status and headers to stdout, so it is unsuitable when the next stage expects bare JSON. Debug/verbose modes should be treated as diagnostic streams that may contain sensitive request or response content. [processResponse](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/api/api.go).

## 13 · JSON, formatting, exit codes, and the meaning of success

**Figure 9. The same-looking flags can have different contracts** *\[Installed help\]*

| Command shape | Meaning | Adapter rule |
|----|----|----|
| `gh pr view … --json number,url` | Select supported CLI export fields. | Validate that command’s projection schema. |
| `gh project list … --format json` | Select a JSON output format. | Do not substitute a field-list flag. |
| `gh api …` | Print the API response body. | Parse the REST/GraphQL response shape. |
| `gh workflow run … --json` | Read workflow input JSON from stdin. | This flag does not request JSON output. |
| `--jq` / `--template` | Transform fetched data with embedded jq or Go templates. | These do not add permissions or expand server-side result limits. |

Check the exact help contract for each operation. There is no universal JSON mode across all gh families.

Field-selecting commands expose a finite list of supported JSON fields. The atlas includes that list where advertised. Embedded jq does not require a separate jq executable, and templates use Go’s template system plus documented helpers. Both operate after retrieval. A filter that removes rows is not a way to fetch rows the command never requested. [Formatting reference](https://cli.github.com/manual/gh_help_formatting).

Human output can vary with terminal detection, width, color, pager, and interactive behavior. Use structured output for a durable integration. Capture stdout, stderr, and the process exit code separately. Set explicit limits and a timeout, and use `GH_PROMPT_DISABLED` plus the command’s noninteractive arguments. Missing information can then fail rather than wait for a prompt.

**Figure 10. Exit status is only one part of the result** *\[Installed help\]*

| Status or command | Meaning | What still needs checking |
|----|----|----|
| General 0 | The command completed successfully. | Empty results or a remote workflow’s failure can require separate interpretation. |
| General 1 / 2 / 4 | Failure / cancellation / authentication required. | The reason and whether any side effect already happened. |
| `gh pr checks`: 8 | Checks are still pending. | Pending is neither a failed test nor a finished success. |
| `gh run watch --exit-status` | Translate the observed run outcome into failure status when appropriate. | Without this option, watcher completion is a different condition. |
| `gh auth status --json hosts` | Ordinary account-authentication problems can still produce exit 0. | Inspect the per-account JSON result, not just the exit code. |

Extensions and shell aliases can have their own exit conventions. Command-specific help takes precedence over a generic status table.

The broad exit conventions are documented in [exit-code help](https://cli.github.com/manual/gh_help_exit-codes). The exceptions above come from [PR checks](https://cli.github.com/manual/gh_pr_checks), [run watch](https://cli.github.com/manual/gh_run_watch), and [auth status](https://cli.github.com/manual/gh_auth_status).

A nonzero result does not prove nothing happened. In this release, PR creation can succeed while an attachment upload fails, leaving a printed PR URL and a nonzero exit. A lost response can also leave an uncertain remote outcome. Retrying a create blindly can duplicate work; inspect the remote state and preserve any returned identity first. [PR creation handler](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/pr/create/create.go).

## 14 · PR utilities span observation, Git, review, and merge

A pull request is a useful control object for an agent workflow because it links proposed code, discussion, review, and checks. It is not the same thing as the branch. The branch can move while the PR number remains stable. Store the PR identity and the head commit you observed.

```
# Remote observations
gh pr view 42 --repo acme/widget \
  --json number,url,state,headRefOid,reviewDecision,mergeStateStatus
gh pr diff 42 --repo acme/widget
gh pr checks 42 --repo acme/widget --required \
  --json name,bucket,state,link

# Changes local Git state: use the intended checkout/worktree
gh pr checkout 42 --repo acme/widget
```

Other commands create, edit, comment, review, mark ready, close, reopen, update a branch, revert, and merge. They are writes and may involve more than one service operation. `gh pr create` can infer a branch, offer to fork, or push, depending on arguments and local state. Its `--dry-run` is explicitly not a guarantee of zero Git side effects. Supplying `--head` skips the automatic forking/pushing path described by the command. [Creation contract](https://cli.github.com/manual/gh_pr_create).

For bodies and comments, an adapter can provide a prepared file through the relevant `--body-file` option. That keeps multiline content out of fragile shell interpolation. A human or upstream policy can review the actual text before the mutation, while the execution layer records the resulting URL or object ID.

Merging is also contextual. Branch rules, required checks, reviews, merge strategy, and merge queues can affect the result. `--auto` can arrange later completion rather than perform an immediate merge. `--match-head-commit` lets a merge request require the head SHA you evaluated. It does not replace server policy or grant a permission. [Merge contract](https://cli.github.com/manual/gh_pr_merge).

*\[Adapter design\]* A useful PR sequence is: observe identity and head SHA; produce or review artifacts; observe checks and reviews; request the authorized mutation with an expected head; then read back the resulting state. Record “merge requested,” “queued,” and “merged” as distinct outcomes. Do not mark a session complete merely because a client returned a PR URL.

## 15 · Issues, discussions, search, and labels are reusable utilities

`gh issue` provides work-record operations: create, view, edit, comment, close/reopen, lock/unlock, pin/unpin, transfer, delete, and develop a branch. A hypothetical job intake service can list assigned work and fetch a selected issue’s body and metadata. Reading an issue does not claim exclusive ownership of it; any lease or deduplication rule belongs to your product.

```
gh issue list --repo acme/widget --assignee @me --state open \
  --limit 50 --json number,title,url,labels,updatedAt
gh issue view 42 --repo acme/widget --json id,number,title,body,state
gh search issues 'is:open label:documentation' --repo acme/widget \
  --limit 50 --json number,title,url,repository
```

These are examples, not queries executed against acme. Search commands expose GitHub’s search semantics rather than an unrestricted scan of a local database. Search limits, visibility, indexing, and query language matter. The PR-specific search family helps avoid treating every issue-shaped search result as the same resource.

`discussion` is a preview family for category-based GitHub Discussions. It is distinct from issue comments and PR reviews. `label` manages repository labels; applying a label to an issue or PR is a separate operation. `status` summarizes relevant cross-repository work, while `org` lists organizations and `browse` helps navigate to a resource. [gh issue](https://cli.github.com/manual/gh_issue); [gh discussion](https://cli.github.com/manual/gh_discussion); [gh search](https://cli.github.com/manual/gh_search).

Read source material as data when feeding it into an agent. An issue body, comment, branch name, or downloaded document can contain instructions, but its presence in GitHub does not grant it authority to alter your executor’s permissions. This is a proposed integration boundary, not a special validation feature of gh.

For background work, normalize the target to a resource reference and preserve the fetched version or observation time. A label can be changed by another person between your read and your write. Treat a query result as an observation at a time, not an exclusive lock on the record.

## 16 · GitHub Projects are owner-scoped graphs of items and fields

A GitHub Project is not a Codex project, a local folder, or a Git repository. The current `gh project` surface works with Projects v2: a user- or organization-owned project containing items and typed fields. A project can link to repositories and contain issues or PRs from multiple repositories. It can also contain draft items.

**Figure 11. Project editing crosses several identities** *\[Source model\]*

01

### Project

Owner + project number identify a visible board; ProjectV2 has an opaque ID.

02

### Item

The project membership record has its own item ID.

03

### Content

That item can point to an issue, PR, or draft issue.

04

### Field value

A field ID and typed value belong to the item within the project.

A content ID, item ID, field ID, and single-select option ID are different objects. Resolve the correct one before editing.

```
gh project list --owner acme --format json
gh project view 7 --owner acme --format json
gh project field-list 7 --owner acme --format json
gh project item-list 7 --owner acme --limit 100 --format json
```

The command family can create/copy/edit/close/delete projects, create or delete fields, add existing content, create drafts, edit or archive items, and link repositories. Most machine output uses `--format json`. The `item-edit` interface accepts project/item/field identities and type-specific values; a field titled “Status” is not enough to identify a unique update.

The source models ProjectV2 objects and item content unions, then projects them into output. Nested connections have implementation bounds; for example, the inspected item field-value query requests a finite collection. A top-level `--limit` should not be described as exhausting every nested field/history relationship. [Project, ProjectItem, and field queries](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/project/shared/queries/queries.go); [gh project item-edit](https://cli.github.com/manual/gh_project_item-edit).

*\[Integration\]* Your Space project can map to one or several repositories and GitHub Projects. Store those links explicitly. Avoid inferring that two objects are the same because their titles match. A local session can update a project item as a result, but its internal job state should remain independent of the board’s presentation fields.

## 17 · Workflow definitions, executions, logs, artifacts, and caches

A workflow definition is a repository file, usually under `.github/workflows/`. A workflow run is a GitHub service record created from an event and a ref. A run contains jobs and steps, with status, conclusion, attempts, timestamps, logs, and potentially artifacts. These are separate objects with separate retention and identity.

```
gh workflow list --repo acme/widget
gh workflow view build.yml --repo acme/widget --yaml
gh run list --repo acme/widget --limit 20 \
  --json databaseId,workflowDatabaseId,number,attempt,headSha,status,conclusion,url
gh run view 80123 --repo acme/widget --log-failed
gh run download 80123 --repo acme/widget --dir ./run-artifacts
```

The last line writes local files. `gh run view --log` or `--log-failed` reads logs; downloaded artifacts are a different surface. `gh cache list/delete` addresses GitHub Actions caches on the service. It is unrelated to the CLI’s local HTTP-response cache or a downloaded ZIP of logs. [gh run](https://cli.github.com/manual/gh_run); [gh cache](https://cli.github.com/manual/gh_cache).

### Dispatch starts service-side execution

```
# Remote mutation: the workflow must support workflow_dispatch
gh workflow run build.yml --repo acme/widget --ref main \
  -f mode=verify

# Observe the correlated run, once its ID is known
gh run watch 80123 --repo acme/widget --exit-status
```

Dispatch does not interpret and execute the YAML on your laptop. It requests a GitHub Actions run. In 2.102.0, gh can ask supported servers for run details and print a run URL when available; older or unsupported paths can still return without those details. Do not correlate a dispatch by blindly selecting the latest run if several callers can dispatch simultaneously. [`pkg/cmd/workflow/run/run.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/workflow/run/run.go).

Watching keeps a local polling process alive. Stopping it does not cancel the remote workflow. `gh run cancel` is a separate authorized mutation. A rerun changes execution history and attempt information. Record the run ID, attempt, and head SHA so results can be attributed to the correct code and execution.

The current `run watch` help documents an authentication limitation for fine-grained personal access tokens. Test the actual operation with your intended identity; do not infer compatibility from a different command that happened to succeed. The `--exit-status` option is needed when the caller wants a failed workflow outcome reflected as a failed watcher result. [gh run watch](https://cli.github.com/manual/gh_run_watch).

Scheduling belongs to Actions or an external scheduler. A scheduled workflow can run even when the laptop is off, but it operates in its runner environment with its own checkout, token, network, and files. Local gh state is not automatically carried into that environment. A local cron process can invoke gh, but then host availability and job persistence are your responsibility.

## 18 · Repositories, releases, secrets, and verification tools

`gh repo` goes beyond clone and view: it can create, fork, edit, archive, rename, delete, synchronize, and inspect repository-related objects. It also exposes deploy keys, autolinks, license/gitignore templates, and preview file/directory reads. Each operation has a different effect. `repo sync`, for example, must be understood in terms of the selected destination rather than assumed to be a harmless metadata refresh. [gh repo](https://cli.github.com/manual/gh_repo).

`gh ruleset` inspects rulesets and checks which rules apply to a branch. Its existence does not imply a built-in ruleset creation or edit command in this release. When a missing administrative operation is needed, inspect the service API and its permissions rather than inventing a CLI subcommand.

`gh release` manages release records and assets. You can list/view, create/edit/delete, upload/download, and use available verification operations. A Git tag, a release object, and an attached asset are separate things. Store the tag or commit, release identity, asset identity, and content digest when those distinctions matter to reproducibility.

```
gh release view --repo cli/cli --json tagName,url,assets
gh release download v2.102.0 --repo cli/cli \
  --pattern 'gh_2.102.0_checksums.txt' --dir ./release-evidence
gh attestation verify ./artifact.bin --repo acme/widget
```

These illustrate observation, local download, and verification; the download and verification were not executed for this writing. Attestation verification can depend on signatures, identity constraints, artifact digests, and trust roots. A tool returning verified evidence does not remove your need to choose which builder or repository identity you trust. [gh attestation verify](https://cli.github.com/manual/gh_attestation_verify); [gh release](https://cli.github.com/manual/gh_release).

`gh secret` and `gh variable` expose supported repository, organization, environment, or application scopes according to their flags. A secret list provides metadata rather than returning stored plaintext secrets. Variables are not secret storage and can be read as values. For setting a secret, supply it through the supported standard input or a protected dotenv file via `--env-file` rather than embedding its value in a logged command string. [gh secret set](https://cli.github.com/manual/gh_secret_set); [gh variable get](https://cli.github.com/manual/gh_variable_get).

`ssh-key`, `gpg-key`, and deploy-key commands manage hosted public-key records; private key material still has its own lifecycle. `gist` manages snippets, with clone operations touching Git and the filesystem. `codespace` can start, stop, rebuild, connect, tunnel, copy, and open editors against remote environments. These are useful existing utilities, but none should be mistaken for a generic shell sandbox managed by gh.

## 19 · Aliases and extensions change what can be called

An alias is stored under `config.yml → aliases → name`. A normal alias expands to another gh command; it does not define a service endpoint or a job record. A shell alias—selected with `--shell` or represented with a leading exclamation mark—runs a shell expression and has shell quoting and execution semantics. [`pkg/cmd/alias/set/set.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/alias/set/set.go).

```
# Local preference mutation; illustrative
gh alias set reviews 'pr list --search "review-requested:@me"'

# Read existing shortcuts and installed extensions
gh alias list
gh extension list
```

Extensions are independent executable programs conventionally named `gh-NAME`. A script extension can be a cloned repository containing an executable; a binary extension can be downloaded from a release; a local extension can refer to a developer’s local directory. Installation and upgrades change executable code on the machine.

**Figure 12. Three extension storage forms under the data root** *\[Pinned source\]*

| Form | Shape | Implication |
|----|----|----|
| Script / Git extension | `extensions/gh-NAME/` contains a checkout and executable. | Installed revision can be identified through Git. |
| Binary extension | Executable plus `manifest.yml`. | Manifest fields include owner, name, host, tag, ispinned, and reserved path metadata. |
| Local extension | A link or platform-specific pointer to a local directory. | Editing that directory changes the code being invoked. |

The dispatcher does not impose a universal output schema or sandbox on extensions. Their own implementation defines behavior.

Dispatch forwards arguments and streams and supplies `GH_EXTENSION=1` and `GH_PATH` so the extension can call back into the same CLI. Environment and credential access therefore matter. Core command names win collisions, while `gh extension exec NAME` explicitly addresses an extension. [Dispatch, InstallLocal, and binManifest](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/extension/manager.go); [`pkg/cmd/extension/extension.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/extension/extension.go).

The command atlas intentionally excludes installed third-party commands: they are not part of the core version’s stable advertised tree. An operating system that allows extensions should record their origin and revision separately from the gh version, and evaluate their executable behavior. Installing an extension is not equivalent to merely granting another read API.

Completion is another local integration: `gh completion` generates shell completion text, which a user can install using their shell’s mechanism. It assists command discovery; it does not create authentication state or background execution. `gh licenses` reports bundled third-party notices.

## 20 · Agent tasks, Copilot CLI, and skills have different lifetimes

The installed release includes three preview families that deserve separate treatment. All involve agents, but they do not share one persistence model.

**Figure 13. Three agent-related surfaces, three owners** *\[Installed help + source\]*

| Surface | What gh does | Where the work or content belongs |
|----|----|----|
| `gh agent-task` | Create, list, or view a hosted Copilot agent task; optionally follow logs. | A remote Copilot service and its session/PR associations. |
| `gh copilot` | Find and launch a separate Copilot CLI, downloading when needed. | That separate local CLI owns its agent runtime and session storage. |
| `gh skill` | Search, preview, install, list, update, or publish instruction packages. | Agent-specific skill directories and installation metadata. |

A hosted task ID, a local agent session, and an installed skill are different kinds of object. Preview behavior should be pinned and tested.

`agent-task create` can take a task description, file input, base branch, and custom agent. The inspected code discovers a Copilot API endpoint through GraphQL and submits work to that service. Those internal endpoints are source observations, not a promise of a stable public adapter API. Prefer the documented CLI contract. A PR can be associated with multiple tasks, so a known session ID is less ambiguous for automation than a PR number. [`pkg/cmd/agent-task/shared/capi.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/agent-task/shared/capi.go); [`pkg/cmd/agent-task/capi/job.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/agent-task/capi/job.go).

Only create/list/view are advertised under `agent-task` here. Do not assume there is a generic task cancel, retry, or delete operation because another product supports one. Following logs is local observation; the remote task’s lifetime remains separate.

`gh copilot` is a built-in launcher in this version. It can use a `copilot` executable on PATH or a downloaded binary under `DataDir()/copilot`. The delegated program has its own behavior and storage. Use `gh help copilot` for launcher help; delegated arguments have the documented separator rules. This should not be confused with the historical extension of the same name. [`pkg/cmd/copilot/copilot.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/copilot/copilot.go).

Skills are instruction/resource directories rather than gh executables. Installation selects an agent, scope, or explicit directory. In this pinned registry, project-scope Codex/Copilot skills use `.agents/skills` under the Git root, while Claude Code uses `.claude/skills`. User-scope defaults differ by agent. An explicit directory and supported configuration can override those paths. [InstallDir](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/internal/skills/registry/registry.go).

Remote skill installations also record metadata in `~/.agents/.skill-lock.json`, even when skill files were installed into a project. The inspected schema has version 3 and a `skills` map, with fields for source, URL, installation/update times, content hash, and optional pin information. That is installation metadata, not an execution log. [`internal/skills/lockfile/lockfile.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/internal/skills/lockfile/lockfile.go).

These distinctions matter when offloading. A workflow dispatch, an agent-task creation, a Codespace operation, and a local Copilot launch are four different execution choices. A session OS must select the right adapter and record the remote or local identity returned by that specific choice.

## 21 · Caches, update records, recovery files, and saved outputs

The local HTTP cache stores serialized response headers and bodies. In the pinned dependency, its key is derived from the method, URL, selected headers including authorization, and request body, then hashed and sharded into directories. Credential participation partitions cache identity; it is not the same as writing a plaintext request token into each cache file. The cached response itself can still contain private data. [HTTP cache implementation](https://github.com/cli/go-gh/blob/v2.16.1/pkg/api/cache.go).

`gh api --cache 1h` sets a response-cache duration. Some built-in code uses caching internally, for example for feature or endpoint discovery. Freshness is a reuse policy, not a subscription to future changes. A cached PR state should not be your proof that a mutation has completed.

A subtle source detail is that the cache’s eligible-method logic recognizes POST requests to the GraphQL path without inspecting whether the GraphQL document is a query or mutation. Do not use response caching as a mutation-deduplication mechanism. Your adapter needs an explicit read/write policy before constructing the call.

**Figure 14. Local records that look like state have different purposes** *\[Pinned source\]*

| Record | Purpose | What not to infer |
|----|----|----|
| `STATE_ROOT/state.yml` | Last CLI update check and latest known release metadata. | It is not the last job or a command transcript. |
| `STATE_ROOT/extensions/gh-NAME/state.yml` | Extension update-check metadata. | It is not the extension’s complete state. |
| `STATE_ROOT/device-id` | Telemetry device identity when created. | It is not a session or repository ID. |
| `CACHE_ROOT/run-log-…zip` | Cached Actions run logs. | It is not all artifacts produced by that run. |
| `CACHE_ROOT/.sigstore/root` | Default attestation trust material. | It is not a repository’s signing policy. |
| System-temp `gh*.json` | Recoverable PR/issue creation input after certain failures. | It is not a complete persistent history of gh invocations. |
| Chosen download path | Release assets, run artifacts, exported responses, or file output. | It is not automatically indexed or retained by gh. |

The source of truth, retention, and sensitivity differ for each record. Cleaning or copying one directory does not migrate the whole system.

Update checking is conditional. The normal CLI notifier is gated by interactive/CI context, a recent-check interval, and `GH_NO_UPDATE_NOTIFIER`; extension notifications have a separate override. A notification is not an automatic CLI upgrade. [`internal/update/update.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/internal/update/update.go); [`internal/ghcmd/cmd.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/internal/ghcmd/cmd.go).

On some creation failures, gh serializes recoverable issue/PR input into a temporary JSON file and prints a recovery command. That file can contain a title, body, and metadata. It is intentionally different from a routine transcript and should not be assumed to exist for every failure. Editor temporary files and staged download ZIPs have still other lifecycles. [PreserveInput](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/pr/shared/preserve.go).

There is no reason to make an orchestrator depend on internal cache filenames. If a result matters to your product, save an explicit artifact with its command version, target, observation time, and remote identity. Treat gh’s caches as implementation-owned acceleration and diagnostics.

## 22 · Telemetry and diagnostics are part of the data flow

*\[Version-specific behavior\]* This gh release has telemetry, with the configuration default set to enabled. An explanation based on an older assumption that gh never emits telemetry would be wrong for this inspected version. The source defines sampling, an optional device identifier, invocation information, and a short-lived sending path. [`internal/telemetry/telemetry.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/internal/telemetry/telemetry.go); [Telemetry help](https://cli.github.com/manual/gh_help_telemetry).

The environment takes precedence: `GH_TELEMETRY=0` or `false` disables it; `GH_TELEMETRY=log` writes the would-be payload to stderr rather than sending it. When GH_TELEMETRY is unset, `DO_NOT_TRACK=1` or `true` disables it. The configuration value is another input below those environment decisions. A separate executable such as an extension or Copilot CLI can have its own policy.

The inspected implementation samples normal sending at the invocation level and records context such as CLI version, OS/architecture, terminal/CI state, command and flag names, and event timestamps. Command-specific context can exist, so “no resource information ever” would be too broad a claim. Its sender is a detached hidden helper with a bounded HTTP attempt; this path is not a durable telemetry queue or a general background-job engine. [`pkg/cmd/send-telemetry/send_telemetry.go`](https://github.com/cli/cli/blob/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd/pkg/cmd/send-telemetry/send_telemetry.go).

Debugging is a separate channel. `GH_DEBUG=api` enables HTTP-level diagnostics; API include/verbose modes expose more of the request/response exchange. Those are useful when resolving an endpoint, permission, or schema problem, but they change what your logs contain. Capture only the evidence needed, and apply your product’s redaction and retention rules.

For a session OS, observability should be designed independently: command identity, version, target, start/end, exit status, logical result, and artifact references are usually more useful than indiscriminately copying terminal output. Keep the process result and the remote task’s lifecycle as separate records.

## 23 · Calling gh from a program: explicit context and typed output

*\[Integration example\]* A program can invoke gh with an argument array and parse its documented JSON projection. Avoid constructing a shell command from issue titles, repository names, or other external text. Arguments, environment, working directory, timeout, and output validation should be explicit.

``` python
import json
import os
import subprocess

def read_pull_request(repository, number):
    # Authenticate this process separately; do not put a token in argv.
    argv = [
        "gh", "pr", "view", str(number),
        "--repo", repository,
        "--json", "number,url,state,headRefOid",
    ]
    env = os.environ.copy()
    env["GH_PROMPT_DISABLED"] = "1"
    env["GH_TELEMETRY"] = "0"
    result = subprocess.run(
        argv, env=env, text=True,
        capture_output=True, timeout=60, check=False,
    )
    if result.returncode != 0:
        # Store/redact diagnostics through the caller's logging policy.
        raise RuntimeError(f"gh exited with {result.returncode}")
    value = json.loads(result.stdout)
    if not isinstance(value, dict) or type(value.get("number")) is not int:
        raise ValueError("Unexpected PR response shape")
    if value["number"] != number:
        raise ValueError("Unexpected PR identity")
    for field in ("url", "state", "headRefOid"):
        if not isinstance(value.get(field), str):
            raise ValueError(f"Missing or invalid {field}")
    return value

# Illustrative target; caller owns allowed repositories and credentials.
# snapshot = read_pull_request("github.com/acme/widget", 42)
```

This is a small read adapter, not a complete executor. The caller must constrain allowed targets, provision credentials, handle missing executables, timeouts, and malformed output, and store a receipt if durability matters. There is deliberately no generic retry loop here: a read and a creation request have different recovery semantics.

For personal interactive work, an existing account can be suitable. For a product integration, a GitHub App installation identity can provide repository- and permission-scoped access. Installation tokens expire and must be renewed by the surrounding service; gh does not own the full app-token lifecycle. Only compatible commands should be invoked with that identity. [GitHub App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation).

Inside GitHub Actions, a step can expose an appropriately permitted job token as `GH_TOKEN`. That token’s authority is determined by the workflow and platform policy, not by the fact that the executable is named gh. Avoid making a shared global `gh auth switch` the identity selector for concurrent workers. [Actions token authentication](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token).

Pin the CLI version and test the command contract you use. Additive remote fields, preview changes, server-version differences, token capability differences, and platform behavior can all matter. Store an internal normalized result if your product needs a stable schema; retain the raw response as evidence only when justified.

## 24 · A session OS should own jobs; gh should perform GitHub operations

*\[Proposal\]* In a system built around Codex sessions, Space projects, and background work, gh is a useful adapter executable. Your system should own durable job identity, scheduling, leases, authorization, attempts, outcomes, and artifacts. GitHub owns its service objects. gh translates one invocation into operations against those objects.

**Figure 15. Keep orchestration state outside the disposable client process** *\[Proposed design\]*

01

### Trigger / queue

A schedule, event, or session creates a durable job.

02

### Worker

Acquire the job; resolve target and allowed credential.

03

### gh invocation

Execute explicit argv and collect a bounded result.

04

### Reconcile

Validate remote identity/outcome and store a receipt.

A remote workflow or agent task can continue after this invocation exits. Follow-up observation is another job or a durable controller responsibility.

``` json
{
  "jobId": "job-example-001",
  "sessionId": "session-example",
  "projectId": "space-project-example",
  "adapter": "github-cli",
  "toolVersion": "2.102.0",
  "target": {
    "host": "github.com",
    "repository": "acme/widget",
    "resourceType": "pullRequest",
    "number": 42
  },
  "execution": {
    "argv": ["gh", "pr", "view", "42", "--repo", "github.com/acme/widget",
             "--json", "number,url,state,headRefOid"],
    "timeoutSeconds": 60
  },
  "credentialRef": "vault://github/acme-installation",
  "state": "queued",
  "attempt": 0,
  "resultRef": null
}
```

This JSON is a proposed product record, not a gh configuration file or an existing Space API schema. The credential reference points to a secret manager; it does not serialize the secret. The session and project IDs belong to the host product. gh has no built-in knowledge of them.

A useful receipt records the exact argv, tool version, execution environment, start/end, exit code, timeout status, output artifact, normalized result, observed remote IDs, and relevant commit SHA or run attempt. The worker can then answer both “did the process finish?” and “did the intended remote change happen?”

For reads, a retry can often be bounded by freshness and rate policy. For writes, create an intent record before dispatch, then reconcile uncertain outcomes. A timeout after the server accepted a PR, comment, or workflow dispatch does not mean the write failed. There is no universal gh idempotency key that makes every repeat safe. Use operation-specific correlation and remote inspection.

Webhooks can wake the controller. The receiver, authentication, delivery deduplication, queue, and recovery are separate services; gh is not a webhook listener. Validate the event, enqueue work, and refresh authoritative state before taking a decision that requires current data. GitHub delivery IDs help track duplicate deliveries. [Webhook guidance](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks).

The controller should also respect rate limits and service backoff signals, including retry headers where supplied. Coalesce repeated observations and serialize conflicting writes. These are scheduling policies of your system. A response cache with a TTL is not a durable synchronization protocol. [REST integration guidance](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api).

Offloading is concrete when the receiving service owns execution: dispatch a workflow, create a supported hosted agent task, or run code in a managed environment. Merely launching `gh run watch` on a laptop does not move that watcher into the cloud. Choose the execution owner, then store the identity needed to reconnect.

## 25 · Inspect the installed system without confusing its layers

Start with the binary and command help, then inspect effective context. The following commands are a practical map; some display local preferences or repository configuration, so use their output selectively rather than publishing it wholesale.

```
gh version
gh help reference
gh help environment
gh config list
gh config get git_protocol --host github.com
gh alias list
gh extension list
gh auth status --active --hostname github.com
git config --get-regexp '^remote\..*\.gh-resolved$'
git config --show-origin --get-all credential.https://github.com.helper
```

**Figure 16. Locate a failure before choosing a retry** *\[Synthesis\]*

| Symptom | Layer to inspect | Useful next evidence |
|----|----|----|
| Unknown command or flag | Binary version, preview/extension availability. | `gh version` and that exact command’s help. |
| Wrong repository or account | Target resolution and credential precedence. | Explicit host/repo; environment source; masked auth status. |
| 403 / inaccessible resource | Permission, organization policy, token/resource scope, or rate limits. | Response diagnostics and the endpoint’s permission contract. |
| JSON parser fails | Output mode or response schema. | Headers mixed into stdout? Human output? Wrong --json meaning? |
| No expected rows | Filters, limits, search semantics, nested pagination. | Requested limit and connection/query shape. |
| Remote job still running | Service execution rather than client execution. | Run/session ID, attempt, current status and conclusion. |
| Nonzero after a create | Possible partial success or uncertain outcome. | Returned identity, remote read-back, mutation-specific recovery. |
| Different behavior on another host | Server version, platform paths, credentials, installed tools. | Pinned versions, resolved roots, host target, extension revision. |

A retry is a policy decision after classifying the failure. Authentication errors, pending checks, schema mismatches, and uncertain writes are not the same case.

The most useful operational record is small but precise: what was requested, which target and authority were used, what evidence came back, and whether the remote outcome is known. That is the information a session-based system must retain after gh exits.

## 26 · Sources, experiments, and boundaries of this teardown

The primary implementation is [cli/cli at the installed 2.102.0 source commit](https://github.com/cli/cli/tree/fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd). Storage and cache details additionally use its pinned dependency [go-gh v2.16.1](https://github.com/cli/go-gh/tree/v2.16.1). Individual sections cite the relevant files and function names. Online manuals can evolve; the recorded local help and pinned source identify the behavior examined here.

1.  [Command inventory](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli/assets/command-inventory.json): all 228 advertised canonical nodes, 33 top-level families, 196 leaves; command-local and inherited flags, supported JSON fields, preview markers, and manual links. Help text is covered by the included [GitHub CLI MIT license](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli/assets/gh-license.txt).
2.  [Isolated configuration experiment](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli/assets/local-config-fixture.json): configuration list/set and alias set under a temporary GH_CONFIG_DIR. The synthetic host is github.example.test. No user credential files were read.
3.  [Verification record](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/gh-cli/assets/verification.json): pinned version/source, public read-only query shapes, offline snippet checks, publication validation, and browser checks.
4.  [Environment](https://cli.github.com/manual/gh_help_environment), [formatting](https://cli.github.com/manual/gh_help_formatting), [exit codes](https://cli.github.com/manual/gh_help_exit-codes), and [API manual](https://cli.github.com/manual/gh_api): public command contracts, with version-specific caveats in the text.
5.  [GitHub object identity](https://docs.github.com/en/graphql/guides/using-global-node-ids), [App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation), and [webhook guidance](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks): service-side contracts for the integration proposal.

Verified directly: installed version and advertised help; synthetic YAML written by local-only configuration commands; selected repository/PR JSON shapes from three public read-only queries. The command catalogue records availability and contracts, not successful execution of all commands.

Not exercised: authentication changes, keyring internals on this machine, Windows behavior, remote mutations, GHES, hosted agent dispatch, Copilot launch, extension/skill installation, artifact verification, or a deployed session-OS adapter. Those sections are source/manual analysis or explicitly labeled design proposals. No live authorization or compatibility guarantee is inferred from command presence.

Provenance. Core behavior is sourced from the installed gh 2.102.0 help, its pinned source, the pinned go-gh dependency, and linked GitHub documentation. The command inventory reproduces licensed help text. Figures, explanations, synthetic data examples, the small read adapter, and the proposed session-OS records are original synthesis. Local configuration experiments used a temporary isolated directory; remote checks were read-only and limited to public cli/cli data. Platform-specific and mutating paths were inspected in source rather than executed. Reading time includes the static command catalogue and is measured at 225 words per minute, excluding scripts, styles, and SVG.
