# engineering

How quirq engineers build software: how the repos fit together, how changes are tested and reviewed, how AI agents take part, and suraj's teardowns of the systems it builds with.

| | |
|---|---|
| Status | Published |
| Owner | suraj |
| Started | 2026-10-06 |
| Last updated | 2026-10-15 |

Status is one of: Proposed, Researching, Published, Paused, Archived.

## What this topic is

This topic looks at engineering practice across the quirq repos: their
structure and dependencies, testing and code review, and where AI agents fit
in the dev loop. It also compares agent and UI integration frameworks
(CopilotKit/AG-UI, LangGraph's React SDK, the Vercel AI SDK, assistant-ui).
How qq builds, tests and lands changes is covered by the
[infra](../infra/) topic instead. Purpose and research action live in
[GOAL.md](GOAL.md).

It also holds suraj's engineering research from his writings: teardowns and field guides on the systems quirq builds with, such as web frameworks, data formats, compression and developer tools, each published here as a report with a one-pager.

## Research and findings so far

### Frontend architecture

Each finding is suraj's, from his writings at `a5a356d`.

- **The App Router's grammar is one rule, folders for URL segments and a closed set of file stems for behaviour, so `next build` knows the whole tree before any request arrives; every efficiency follows from that, and so does every cost.** Source: [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md#01-one-rule-many-precomputations), §01. Verified: 2026-10-15.
- **Every visible link costs two requests, a `/_tree` and a page segment that carries its layouts: a page with 12 visible links made 24 prefetch requests, 20,143 B on the wire, 8.7× the page's own HTML \[measured here\].** Source: [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md#one-link-two-gets), §09. Verified: 2026-10-15.
- **Moving `"use client"` from the top of a layout down to the leaves cut 38,489 B of JavaScript from every route but made the RSC payload 5.6× and the HTML 2.3× larger, uncompressed: on a hard load, rendered output ships twice \[measured here\].** Source: [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md#the-price-stated-first), §01. Verified: 2026-10-15.
- **The build cache does not skip prerendering: at 401 routes it cut compile from 25.2 s to 1.86 s, while static generation took 22–24 s on every build, 58% of a 38.4 s warm build \[measured here\].** Source: [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md#12-faster-cheaper-builds), §12. Verified: 2026-10-15.
- **Sibling dynamic folders with different parameter names pass the build and kill the server: `app/[a]/x` beside `app/[b]/y` built with exit code 0 and `next start` exited 1 \[measured here\], so a pipeline that gates on `next build` alone can ship an app that dies at boot \[reconstruction\].** Source: [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md#what-validation-misses), §03. Verified: 2026-10-15.
- **A page registry is a table with two columns, a string from your data on the left and the code allowed to draw it on the right, and it is a trust boundary: the one point where an untrusted string decides which of your functions runs.** Source: [A Table With Two Columns](output/report/2026-10-15-page-registries.md#01-the-shape-and-the-table), §01. Verified: 2026-10-15.
- **The one rule that survives every version of the registry design: the discriminant is a string constant chosen by a human, versioned in the string itself, as in `"hero.v2"`, and never derived from a file path, a class name, a component export name or a generated id \[house design\].** Source: [A Table With Two Columns](output/report/2026-10-15-page-registries.md#nominal-not-structural), §02. Verified: 2026-10-15.
- **MagicPath has no concept of a tag, a schema, a version or a slot, and suraj judges it a good fit for the block-factory role in a registry you own and a bad fit for anything load-bearing \[house design\].** Source: [A Table With Two Columns](output/report/2026-10-15-page-registries.md#12-magicpath-what-you-gain-what-you-pay), §12. Verified: 2026-10-15.

### Data formats

Each finding is suraj's, from his writings at `a5a356d`.

- **Of the 12 YAML loaders suraj measured, 4 hear the country code `NO` as `false` and all 12 hear the version `3.10` as the float 3.1, with no error, because each loader picks the type of an unquoted scalar from its own list of patterns.** Source: [What the Parser Hears](output/report/2026-10-15-what-the-parser-hears.md#05-yaml-the-type-you-did-not-write), §05. Verified: 2026-10-15.
- **A `debug = true` appended at the end of a TOML file, under a comment calling it a top-level setting, lands at `server.debug` in all 10 TOML parser configurations measured, with no error, because a table's keys run until the next header or the end of the file.** Source: [What the Parser Hears](output/report/2026-10-15-what-the-parser-hears.md#08-toml-obvious-until-the-second-table), §08. Verified: 2026-10-15.
- **A TOML file cannot say which version it uses, and in suraj's measurements the two parsers people get by default, `tomllib` before Python 3.15 and npm's `latest` @iarna/toml, refuse all four TOML 1.1 features with errors that never mention a version.** Source: [What the Parser Hears](output/report/2026-10-15-what-the-parser-hears.md#09-toml-1-1-and-the-version-nobody-declares), §09. Verified: 2026-10-15.
- **In suraj's load, change one value and save test, each of the 21 writers that dump plain data produced 52 to 144 diff lines and PyYAML's `safe_dump` wrote `NO` back as `false`; only tomlkit and jsonc-parser's `modify` reproduced the hand edit byte for byte.** Source: [What the Parser Hears](output/report/2026-10-15-what-the-parser-hears.md#11-when-the-program-writes-back), §11. Verified: 2026-10-15.
- **suraj's rule, which he marks as his judgement, is TOML for configuration people edit in a tool you control, strict JSON validated by JSON Schema for configuration a program writes or that crosses language boundaries, and YAML only where the ecosystem expects it, with a named and pinned parser, a schema and a loader that rejects duplicate and unknown keys for all three.** Source: [What the Parser Hears](output/report/2026-10-15-what-the-parser-hears.md#the-answer-up-front), §01. Verified: 2026-10-15.
- **A valid `.toml` file leaves its behaviour undecided until an application supplies a contract: the application decides where the file lives, what an absent key means, how relative paths resolve, whether later files merge, and when edits take effect.** Source: [What is a TOML file?](output/report/2026-10-15-toml-files.md#12-the-application-owns-defaults-paths-and-overrides), §12. Verified: 2026-10-15.
- **For a system that loads and stores JSON all day, suraj's default, which he marks as his judgement, is PostgreSQL 18 with `jsonb` when there is a server or SQLite in WAL mode when there is one node and one process tree, with real columns for anything filtered, joined or constrained and `jsonb` for the long tail.** Source: [Where the JSON Lives](output/report/2026-10-15-where-the-json-lives.md#the-answer-up-front), §01. Verified: 2026-10-15.
- **Measured on one machine, the fsync sets the cost of a durable JSON write: rewriting a 2,879-byte document as a whole file cost 1,464.5 µs, 84% of it the fsync, and 100 SQLite inserts sharing one commit cost 8.4 µs each, 49 times cheaper per row than committing each one.** Source: [Where the JSON Lives](output/report/2026-10-15-where-the-json-lives.md#08-five-ways-to-keep-a-document-current-measured), §08. Verified: 2026-10-15.

### Compression

Each finding is suraj's, from his writings at `a5a356d`.

- **Compression keeps all the information and spends fewer bits on it, while compaction keeps only the present state a reader can still observe and, as a rule, cannot be undone \[reconstruction\].** Source: [What Compression Keeps](output/report/2026-10-15-what-compression-keeps.md#01-fewer-bits-or-fewer-things), §01. Verified: 2026-10-15.
- **On one generated 200,000-record update log, compacting before zstd 19 left 86,914 bytes, 31.99 times smaller than zstd 19 alone, but only compression kept the history \[measured here\].** Source: [What Compression Keeps](output/report/2026-10-15-what-compression-keeps.md#one-log-three-treatments), §01. Verified: 2026-10-15.
- **An agent's context compaction is the one compaction without an invariant or a distortion metric, so keep the transcript beside the summary, record each boundary with its token counts and log each summary \[reconstruction\].** Source: [What Compression Keeps](output/report/2026-10-15-what-compression-keeps.md#the-one-compaction-without-an-invariant), §11. Verified: 2026-10-15.
- **On held-out synthetic agent messages, gzip -6 made 1,216 of the 1,409 under 200 bytes bigger, and a 110 KiB trained dictionary took zstd 3's per-message ratio from 1.98× to 3.21× \[measured here\].** Source: [What Each File Wants](output/report/2026-10-15-what-each-file-wants.md#04-small-messages-and-dictionaries), §04. Verified: 2026-10-15.
- **Block size sets a log's ratio more than the codec does: zstd 3 gives 2.08× in 1 KiB blocks of a real 6 MB JSONL audit log and 8.68× in 1 MiB blocks \[measured here\].** Source: [What Each File Wants](output/report/2026-10-15-what-each-file-wants.md#block-size-before-codec), §07. Verified: 2026-10-15.
- **For tabular data, encoding beats compression: Parquet with dictionary encoding and zstd 3 came out 35.2% smaller than gzipped CSV on one million synthetic rows \[measured here\].** Source: [What Each File Wants](output/report/2026-10-15-what-each-file-wants.md#08-tables-let-the-format-do-the-work), §08. Verified: 2026-10-15.
- **Wrapping already-compressed files in four general-purpose codecs saved at most 4.66% on any media file, while re-doing the inner coding saved up to 41% \[measured here\].** Source: [What Each File Wants](output/report/2026-10-15-what-each-file-wants.md#12-already-compressed-leave-it), §12. Verified: 2026-10-15.
- **xo-space's project backup sorts its paths "for reproducible-ish tars", but its gzip header carries the time of each run, so the bytes change with it; the post gives a fix that sets `mtime=0` \[from the tree\] \[reconstruction\].** Source: [What Each File Wants](output/report/2026-10-15-what-each-file-wants.md#one-fix-in-the-xo-tree), §06. Verified: 2026-10-15.

### GitHub CLI

Each finding is suraj's, from his writings at `a5a356d`.

- **A normal gh invocation starts a process, performs work, returns output and exits, while work it starts can have a lifetime that belongs to another system, so the two lifetimes should be recorded separately \[Source reconstruction\].** Source: [Anatomy of GitHub CLI](output/report/2026-10-15-github-cli.md#01-github-cli-is-a-client-with-several-kinds-of-effects), §01. Verified: 2026-10-15.
- **gh 2.102.0 advertises 33 top-level command families and 228 canonical command nodes, 196 of them leaves, in a help inventory that excludes hidden helpers, help topics, extensions and aliases \[Measured help inventory\].** Source: [Anatomy of GitHub CLI](output/report/2026-10-15-github-cli.md#04-the-installed-command-surface-searchable-and-inspectable), §04. Verified: 2026-10-15.
- **gh resolves four separate storage roots, for configuration, installed data, state and cache, and `GH_CONFIG_DIR` relocates configuration only, as read from the pinned go-gh dependency \[Pinned dependency\].** Source: [Anatomy of GitHub CLI](output/report/2026-10-15-github-cli.md#06-there-are-four-storage-roots-not-one-gh-data-directory), §06. Verified: 2026-10-15.
- **Exit status is only one part of the result: `gh pr checks` exits 8 while checks are still pending \[Installed help\], and in this release a PR create can succeed yet exit nonzero, so a retry should first inspect remote state.** Source: [Anatomy of GitHub CLI](output/report/2026-10-15-github-cli.md#13-json-formatting-exit-codes-and-the-meaning-of-success), §13. Verified: 2026-10-15.
- **An agent workflow should store a PR's identity with the head commit it observed, because the branch can move while the PR number stays stable, and should record merge requested, queued and merged as distinct outcomes \[Adapter design\].** Source: [Anatomy of GitHub CLI](output/report/2026-10-15-github-cli.md#14-pr-utilities-span-observation-git-review-and-merge), §14. Verified: 2026-10-15.
- **gh 2.102.0 has three agent-related preview families with three owners: `agent-task` submits work to a hosted Copilot service, `copilot` launches a separate local CLI that owns its agent runtime and session storage, and `skill` installs instruction packages into agent-specific directories \[Installed help + source\].** Source: [Anatomy of GitHub CLI](output/report/2026-10-15-github-cli.md#20-agent-tasks-copilot-cli-and-skills-have-different-lifetimes), §20. Verified: 2026-10-15.
- **A session OS should own durable job identity, scheduling, leases, authorization, attempts, outcomes and artifacts, while GitHub owns its service objects and gh translates one invocation into operations against them \[Proposal\].** Source: [Anatomy of GitHub CLI](output/report/2026-10-15-github-cli.md#24-a-session-os-should-own-jobs-gh-should-perform-github-operations), §24. Verified: 2026-10-15.

### Foundations

Each finding is suraj's, from his writings at `a5a356d`.

- **A Markov process is a bet that you can choose a description of "now" so complete that the past adds nothing, and naming that state well is the engineering.** Source: [The State Is Enough](output/report/2026-10-15-markov-processes.md#the-question-is-never-is-it-markov), §01. Verified: 2026-10-15.
- **Markov models are excellent at telling you which way things move and unreliable about how far, so use them for structure and comparisons and take tails from measurement.** Source: [The State Is Enough](output/report/2026-10-15-markov-processes.md#what-to-do-about-all-of-it), §14. Verified: 2026-10-15.
- **In an agent session the state is the environment and the context window is an observation, so evidence about what an agent did has to be captured from the environment \[my framing\].** Source: [The State Is Enough](output/report/2026-10-15-markov-processes.md#13-agent-loops-as-processes), §13. Verified: 2026-10-15.
- **The rule timer games run on, as suraj reconstructs it from play, is to never schedule work for something that is a pure function of elapsed time and to derive it on read from a timestamp and a rate; in his model that is 28,800 times less work than a tick loop \[computed here\].** Source: [Nothing Runs While You're Gone](output/report/2026-10-15-game-timers.md#03-nothing-runs-while-you-are-gone), §03. Verified: 2026-10-15.
- **A battle replay is a snapshot plus a command list plus a deterministic engine, so it can be re-executed to check a claim, while agent sessions are usually stored the wrong way round, as a transcript.** Source: [Nothing Runs While You're Gone](output/report/2026-10-15-game-timers.md#the-audit-case-which-is-where-i-actually-use-this), §09. Verified: 2026-10-15.
- **A timer loop turns extractive where revenue depends on regret, and that point is visible in the data model as a field whose only purpose is to be taken away.** Source: [Nothing Runs While You're Gone](output/report/2026-10-15-game-timers.md#the-structural-problem-not-the-individual-trick), §08. Verified: 2026-10-15.
- **No single conjecture is NP-hard, because NP-hardness belongs to families of problems with an input; bounded-length proof search is the canonical NP-complete problem, and Gödel asked about it in a 1956 letter to von Neumann.** Source: [The ten hardest open problems in mathematics](output/report/2026-10-15-hardest-problems.md#01-what-hard-means-and-why-the-riemann-hypothesis-is-not-np-hard), §01. Verified: 2026-10-15.
- **As of August 2026 no machine has produced a proof of a first-rank open conjecture; machines have done search, verification and bookkeeping, and none of those roles is conception.** Source: [The ten hardest open problems in mathematics](output/report/2026-10-15-hardest-problems.md#the-machine-question), §15. Verified: 2026-10-15.

<!--
Add one bullet per verified finding:
- **Finding in one sentence.** Source: [title](link). Verified: YYYY-MM-DD.
Keep inferences and open questions in the sections below, not here.
-->

### Open questions

_None recorded yet._

## Status and progress

- [x] GOAL.md filled in and agreed with the requester
- [x] AGENTS.md filled in
- [x] Research under way
- [x] Findings verified against sources
- [x] Requested outputs published

## Published outputs

| Format | File | Date | Notes |
|---|---|---|---|
| onepager | [Frontend architecture at a glance](output/onepager/2026-10-15-frontend-architecture-at-a-glance.md) | 2026-10-15 | Key numbers and findings from suraj's two frontend-architecture reports |
| report | [Next.js routing, taken apart](output/report/2026-10-15-nextjs-routing.md) | 2026-10-15 | suraj's teardown of Next.js 16.4 routing, read at v16.4.0 and measured in a 2-vCPU lab, with its 18 figures |
| report | [A Table With Two Columns](output/report/2026-10-15-page-registries.md) | 2026-10-15 | suraj's design for a page registry, with its 10 figures and a MagicPath section from its CLI as run on 28 September 2026 |
| onepager | [Data formats at a glance](output/onepager/2026-10-15-data-formats-at-a-glance.md) | 2026-10-15 | Key numbers from the three data-format reports, and where each one leads |
| report | [What the Parser Hears](output/report/2026-10-15-what-the-parser-hears.md) | 2026-10-15 | suraj's field guide to JSON, YAML and TOML as configuration, as of October 2026: 71 cases through 34 parser configurations, with its 21 figures |
| report | [What is a TOML file?](output/report/2026-10-15-toml-files.md) | 2026-10-15 | suraj's guide from a `.toml` file to program behaviour, TOML 1.0 and 1.1; examples checked with CPython 3.13.0, with its 14 figures |
| report | [Where the JSON Lives](output/report/2026-10-15-where-the-json-lives.md) | 2026-10-15 | suraj's guide to storing JSON written all day, as of 1 October 2026: writes measured on SQLite 3.46.1, PostgreSQL 18 cited from its docs, with its 17 figures |
| onepager | [Compression at a glance](output/onepager/2026-10-15-compression-at-a-glance.md) | 2026-10-15 | Key numbers from both compression posts, how they connect to the XO trees, and where to read each part |
| report | [What Compression Keeps](output/report/2026-10-15-what-compression-keeps.md) | 2026-10-15 | suraj's explainer of compression and compaction, sources as of 9 October 2026, with its 22 figures |
| report | [What Each File Wants](output/report/2026-10-15-what-each-file-wants.md) | 2026-10-15 | suraj's measured guide to the codec, level or format each kind of file wants, October 2026, with its 21 figures |
| onepager | [GitHub CLI at a glance](output/onepager/2026-10-15-github-cli-at-a-glance.md) | 2026-10-15 | Key numbers from the GitHub CLI teardown and the sections to read next |
| report | [Anatomy of GitHub CLI](output/report/2026-10-15-github-cli.md) | 2026-10-15 | suraj's teardown of GitHub CLI 2.102.0 at source commit `fc4b137`, with its 16 figures |
| onepager | [Foundations at a glance](output/onepager/2026-10-15-foundations-at-a-glance.md) | 2026-10-15 | Key numbers from three of suraj's explainers, and their passages on agents |
| report | [The State Is Enough](output/report/2026-10-15-markov-processes.md) | 2026-10-15 | suraj's explainer on Markov processes in computing, first published 28 September 2026, with its 21 figures |
| report | [Nothing Runs While You're Gone](output/report/2026-10-15-game-timers.md) | 2026-10-15 | suraj's note on how timer-driven mobile games store state, reconstructed from play and first published 28 September 2026, with its 10 figures |
| report | [The ten hardest open problems in mathematics](output/report/2026-10-15-hardest-problems.md) | 2026-10-15 | suraj's survey of ten open problems as of August 2026, with a dated forecast to 2050 and its 15 figures |
