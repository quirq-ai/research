# Turborepo or Nx

Both now call themselves the build system for coding agents. Under the shared tagline they are different tools. Turborepo is a small task runner and content-addressed cache on top of package-manager workspaces. Nx is a project-graph platform with plugins, generators, governance rules, and a paid CI fleet. This report compares them as they stand in October 2026. It covers how each sees a repository, what goes into a cache key, what each one costs, and a small benchmark of the two on the same twelve-package workspace.

By **Suraj Sharma**, XO Labs · Build Systems. First published 2 October 2026 as *Turborepo or Nx* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/turborepo-vs-nx).

Source: [`turborepo-vs-nx/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/turborepo-vs-nx/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

> **How to read the badges**
>
> *\[from the docs\]* marks a fact from turborepo.dev, nx.dev, a release post, a pricing page, or the npm and GitHub registries (read 2 October 2026). *\[measured here\]* marks a number produced by the scripts in `_bench/` beside this page, on a 2-vCPU Linux machine. The ratios carry over to other machines; the absolute milliseconds do not. *\[reconstruction\]* marks a judgement or mechanism I have worked out rather than read. Neither product's paid tier was exercised.

## 01 · The short answer

Turborepo runs the scripts your `package.json` files already declare, in dependency order, and skips any whose inputs it has seen before. Nx does the same, and then keeps going. It infers tasks from tool configs, generates code, enforces which projects may import which, rewrites your repo on upgrades, and sells a CI fleet that spreads tasks across machines. Pick the one whose extra surface you actually need.

Both homepages now make the same claim. Turborepo's reads "Turborepo is the build system for coding agents." Nx's reads "The build system for coding agents and developers. Made for teams that want fast builds and even faster CI." *\[from the docs\]* The shared phrase hides a real difference in scope. Turborepo is a Rust binary with two npm packages and one config file. Nx is a TypeScript-and-Rust platform with 126 transitive npm packages in a bare install, a plugin system, and a commercial cloud attached. *\[measured here\]*

If you stop reading here, take this:

- **Default to Turborepo** for a JavaScript or TypeScript monorepo whose CI is slow mainly because it rebuilds things that have not changed. It adds the least, its remote cache is free, and removing it later means deleting one file.
- **Choose Nx** when one of four needs is real: tasks spread over several CI machines, first-party Java, .NET or Gradle builds in the same graph, enforced import boundaries, or codemod-driven framework upgrades across hundreds of projects.
- **Either way, check your inputs.** Both tools trust the cache key you give them. In [§05](#05-measured-on-one-workspace) a one-line Nx config change keeps the build green and reports a 92% cache hit. It also ships five packages built against the old version of their dependency.

&nbsp;

- **48 ms** · turbo, fully cached run (12 tasks)
- **724 ms** · nx, fully cached run (12 tasks)
- **2 vs 126** · third-party npm packages installed
- **33M vs 12M** · npm downloads, week of 24 Sep 2026

**Figure 1. The two tools at a glance, October 2026**

|  | Turborepo | Nx |
|----|----|----|
| Latest | `turbo@2.11.6` (1 Oct 2026) | `nx@23.2.1` (9 Sep 2026) |
| Owner · licence | Vercel · MIT | Nx (GitHub org `nrwl`) · MIT |
| Written in | Rust | TypeScript, with a Rust core |
| Unit of work | a package and its `package.json` scripts | a project and its targets, explicit or inferred by plugins |
| Config | `turbo.json` (root, optional per package) | `nx.json` + optional `project.json` + plugins |
| Changed-only runs | `turbo run --affected`, `--filter` | `nx affected -t` |
| Remote cache | Vercel Remote Cache (free), or self-host the OpenAPI spec | Nx Cloud (Nx Replay), or self-host the OpenAPI spec |
| Spread tasks over CI machines | no first-party feature | Nx Agents (Nx Cloud) |
| Languages, first-party | JS/TS; Rust, Python, Go experimental since 2.11 | JS/TS, Gradle, Maven, .NET, Docker |
| Codegen · boundaries | Plop-based `turbo gen` · Boundaries (experimental) | generators, `nx migrate` · lint-enforced module boundaries |
| Agent surface | managed `AGENTS.md` block, agent skill, `turbo docs`, `llms.txt` | MCP server, agent skills, Nx Console, AI fixes in CI |

Every row comes from each project's own docs, the npm registry, or GitHub, read on 2 October 2026. The asymmetry runs down the right-hand column: from row four on, Nx answers each question with a mechanism, where Turborepo usually answers with a convention or "not ours".

## 02 · Two tools behind one tagline

The two projects started from opposite ends. Turborepo started as a fast runner for scripts a repository already had. Nx started as a way to structure a large Angular codebase. Ten years of convergence have not erased that origin.

### Turborepo

Turborepo is owned by Vercel, licensed MIT, and written in Rust. The repository `vercel/turborepo` had 31,157 GitHub stars on 2 October 2026. The latest release was `turbo@2.11.6`, published to npm on 1 October 2026; the 2.11 feature release shipped on 18 September. *\[from the docs\]* The homepage puts its job in one sentence: "It provides incremental task running, local and remote caching, and parallel execution." That sentence is the whole product. Everything else in the docs serves one of those three verbs.

The 2025–2026 release train shows where the effort goes. The list comes from turborepo.dev/blog. *\[from the docs\]*

- **2.4** (Jan 2025): Boundaries, and caching in watch mode.
- **2.5** (Apr 2025): sidecar tasks and `turbo.jsonc`.
- **2.6** (Oct 2025): microfrontends and stable Bun support.
- **2.7** (Dec 2025): a browser devtools graph viewer and composable per-package config.
- **2.8** (Jan 2026): an agent skill, cache sharing across git worktrees, `turbo docs`.
- **2.9** (Mar 2026): "up to 96%" faster time to first task, and deprecations ahead of 3.0 (`turbo-ignore`, `--parallel`, the daemon).
- **2.10** (Jun 2026): `--affected` combinable with `--filter`, and local cache eviction.
- **2.11** (Sep 2026): experimental native Rust, Python and Go workspaces.

### Nx

Nx is developed by the company behind the `nrwl` GitHub organisation, also licensed MIT. The repository had 29,388 stars on the same day. Its primary language on GitHub is TypeScript, and the task-hashing and file-watching core has been moving to Rust; issue \#28434 is titled "Migrating Nx core to Rust & deprecating custom runners". The `latest` npm tag pointed at `nx@23.2.1`, published 9 September 2026, and the `next` tag at 23.3.0-beta.7. *\[from the docs\]*

Nx 23 (17 June 2026) shows the other direction of travel. It brought Nx Agents "4x faster", an agentic mode for `nx migrate`, `@nx/dotnet` out of experimental, and a daemon whose memory dropped "from around 1.5GB to roughly 200MB". Nx 23.2 (3 September) added Oxlint and Oxfmt plugins and cut CLI output by 66.6× on all-green runs, explicitly to save agent tokens. *\[from the docs\]* The CI fleet, upgrades, more languages and the agent are each a new subsystem, not a faster version of an old one.

### Adoption, as each side counts it

The Nx homepage claims "3.5 million+ developers use Nx daily", use at "over 75% of Fortune 500" companies, and "44 million+ downloads on NPM monthly". Turborepo's homepage carries no numbers; its 2.11 post claims "20 million weekly downloads". *\[from the docs\]* The npm registry's own counter for the week of 24–30 September 2026 gives `turbo` 32,849,135 downloads and `nx` 12,083,084. *\[from the docs\]* Both figures count CI installs as well as people, and Turborepo's include every `create-turbo` template and Vercel build. The ratio says Turborepo is installed more often. It does not say it is used more seriously. *\[reconstruction\]*

**Figure 2. Surface area: what each tool takes responsibility for**

![Two stacked columns of capability layers. Both columns share the bottom three layers: task graph and scheduling, content-hashed local cache, and remote cache protocol. Turborepo's column then adds pruning for Docker, generators, and experimental boundaries, drawn thin. Nx's column adds inferred tasks from plugins, generators and migrations, lint-enforced module boundaries, release versioning, distributed CI agents, self-healing CI, and an MCP server.](2026-10-15-turborepo-or-nx/fig-02-scope.svg)

The bottom three layers do the same job in both tools, and on a single machine they are what makes a repository fast. Nx's extra layers address coordination rather than speed: how projects are created, upgraded, constrained and spread across CI machines.

## 03 · How each one sees a repository

Both tools build a graph before they run anything. Turborepo reads it from your package manager. Nx builds its own, from `package.json` files plus whatever its plugins find. That one choice drives most of the differences that follow.

### Turborepo: the package graph

Turborepo is "built on top of JavaScript package manager workspaces", in the words of its own migration guide. *\[from the docs\]* A node in its graph is a workspace package, and an edge is a dependency declared in a `package.json`. A task is a script name. `turbo.json` says how tasks relate across that graph, and the docs' canonical example is three lines:

    { "tasks": { "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] } } }

"The `^` microsyntax tells Turborepo to run the task in direct dependencies before the target package." *\[from the docs\]* Without the caret, `dependsOn` names a task in the same package: `"dependsOn": ["codegen"]`. Packages can carry their own `turbo.json` that extends the root one. Since 2.8 a task can also carry a `description`, so that an agent reading the file knows what it does. *\[from the docs\]*

Turborepo makes no task up. If a package has no `build` script, `turbo run build` skips it. If a dependency is imported but not declared in `package.json`, the graph does not know about it. Boundaries, still experimental, exists to catch exactly that case. *\[from the docs\]*

### Nx: the project graph

Nx's node is a *project* and its unit of work a *target*. Projects can come from `package.json` files, from `project.json` files, or from plugins. Since Nx 18 ("Project Crystal"), plugins infer targets from tool configs. A `vite.config.ts` yields `build`, `serve` and `preview` targets, and a `jest.config.ts` yields `test`, with inputs and outputs pre-filled from what the plugin knows about the tool. *\[from the docs\]* Plugins must be listed: "in order for a plugin to configure tasks for Nx, it needs to be registered in the `plugins` array." A trimmed `nx.json` from the reference docs:

    {
      "plugins": ["@nx/eslint/plugin"],
      "namedInputs": {
        "default":    ["{projectRoot}/**/*"],
        "production": ["!{projectRoot}/**/*.spec.ts"]
      },
      "targetDefaults": {
        "build": {
          "dependsOn": ["^build"],
          "inputs":    ["production", "^production"],
          "outputs":   ["{projectRoot}/dist"],
          "cache": true
        }
      }
    }

The `^` in `dependsOn` means the same thing as in Turborepo. The `^` in `inputs` has no Turborepo equivalent, because Turborepo does the same work implicitly. [§04](#04-the-cache-key-is-the-product) shows why that matters. Nx also gets imports right that a manifest misses. Its JS plugin reads source imports as well as `package.json`, so an undeclared import still becomes an edge. *\[reconstruction\]*

**Figure 3. Where each tool's graph comes from**

![Two pipelines. Top: Turborepo reads the package manager's workspace list and each package.json, plus turbo.json, and produces a package graph whose tasks are package.json scripts. Bottom: Nx reads package.json and project.json files, runs registered plugins over tool configs such as vite.config.ts and jest.config.ts and over source imports, plus nx.json, and produces a project graph whose targets are partly inferred.](2026-10-15-turborepo-or-nx/fig-03-graph.svg)

Turborepo's graph is only as good as your manifests, and it adds nothing to them. Nx's graph can know more than your manifests do. The price is a plugin layer that has to stay in step with every tool it reads.

### Selecting what changed

Both tools answer "what does this branch touch?" from git. Turborepo's `--affected` will "Filter to only packages that are affected by changes on the current branch", and is equivalent by default to `--filter=...[main...HEAD]`. The base and head can be overridden with `TURBO_SCM_BASE` and `TURBO_SCM_HEAD`. Since 2.10 it combines with `--filter`. *\[from the docs\]* Nx's `nx affected -t build` does the same in three steps: "Use Git to determine the files you changed… Use the project graph to determine which projects the files belong to. Determine which projects depend on the projects you modified." Base and head come from `--base`/`--head` or `NX_BASE`/`NX_HEAD`. *\[from the docs\]*

The defaults for lockfile changes differ, and the difference matters. Out of the box, Turborepo follows the package graph. Opting into `futureFlags.affectedUsingTaskInputs` makes it match changed files against each task's `inputs` instead. Nx, by default, marks every project affected when the lockfile changes. Setting `"auto"` narrows that to projects whose resolved dependencies actually moved. *\[from the docs\]* On a repo with Renovate or Dependabot, that one setting decides whether a weekly bump rebuilds everything. *\[reconstruction\]*

## 04 · The cache key is the product

Both tools hash a task's inputs, look the hash up, and restore the outputs on a hit. Speed comes from hitting often. Correctness comes from the hash changing whenever the output would have changed. The two tools put different things into that hash by default.

### What Turborepo hashes

Turborepo computes a global hash and then a per-task hash. Its caching page lists what goes into the global one. That covers the resolved root `turbo.json` and changes to the root lockfile. It also covers "`globalDependencies` file contents", "Values of variables listed in `globalEnv`", and pass-through arguments. Each task hash adds the package's config, its slice of the lockfile, its `package.json`, and the files matched by `inputs`. With no `inputs` listed, that is every tracked file in the package. *\[from the docs\]*

When a task has `dependsOn: ["^build"]`, Turborepo also folds the hashes of those upstream tasks into the downstream hash. You do not write this down. A change to a leaf package therefore invalidates every package that builds on it. *\[measured here\]* (§05 confirms it: one leaf edit, six cache misses.)

Environment variables are strict by default. `--env-mode` defaults to "Only allow explicitly listed environment variables". A variable that is not listed in `env` or `globalEnv` is not visible to the task at all. It cannot change the output without changing the hash. *\[from the docs\]* This default was a 2.0 change, and it is the single most effective guard against poisoned caches in either tool. *\[reconstruction\]*

### What Nx hashes

Nx hashes whatever the target's `inputs` say. Inputs are built from `namedInputs`, file globs, `{ "env": "VAR" }` entries, runtime commands, and external dependency versions. The `^` prefix on an input means "the same named input, in every project I depend on". *\[from the docs\]* If you leave inputs unset, the default named input covers the whole project root plus `^default`. The default is safe. The trap is in narrowing it.

Narrowing it is exactly what a team tuning cache hits does. Write `"inputs": ["src"]` to stop README edits from busting the cache, forget the matching `"^src"`, and the downstream hash no longer depends on upstream sources. `dependsOn: ["^build"]` still orders the tasks, but ordering is not hashing. Nx sees an unchanged downstream hash and restores last week's output. Last week's output was built against last week's dependency. *\[measured here\]*

**Figure 4. One edit to leaf package p01: what each config invalidates**

![Three copies of the benchmark's dependency chain from p01 through p05 and p08, then p09 and p11, to p12. In Turborepo, all six packages are re-run because upstream hashes are folded in. In Nx with inputs src and caret src, all six re-run. In Nx with inputs src only, only p01 re-runs, and the other five are restored from cache, marked stale.](2026-10-15-turborepo-or-nx/fig-04-hash.svg)

Measured on the §05 workspace. All three runs exit 0. The third one prints "Cache: 11/12 hit (92%)" and is wrong. Turborepo cannot be configured into this state through `inputs`, because upstream hashes are not an input you list.

This is not a bug in Nx. The docs say what `^` means, and the default is correct. It is a sharper tool with one more way to cut yourself. Turborepo's sharper edge is somewhere else. Because the package graph comes only from manifests, an import missing from `package.json` drops an edge, and the same staleness follows. Boundaries reports that case, but it is still experimental. *\[reconstruction\]*

> **Rule of thumb**
>
> In Nx, every narrowed `inputs` list that names a named input should also name its `^` twin, unless you can say why the upstream sources do not reach the output. In Turborepo, keep `--env-mode=strict`, and treat a Boundaries warning as a cache-correctness bug, not a lint nit.

## 05 · Measured on one workspace

The same twelve packages, the same build script, the same parallelism, timed under both tools. Turborepo adds less overhead per task and returns a full cache hit fifteen times sooner. On this machine, the Nx daemon made things slower, not faster. None of it matters once a real task takes minutes.

### Setup

`_bench/make-ws.sh` beside this page builds an npm workspace of twelve packages in a four-layer graph. Four leaves feed four mid-layer packages, which feed three more, which feed one app. Every package's `build` script runs the same `build.js`. It reads `src/index.js`, spends 400 ms of real CPU hashing it, and writes `dist/index.js`. The two configs say the same thing:

    // turbo.json
    { "tasks": { "build": { "dependsOn": ["^build"], "inputs": ["src/**"], "outputs": ["dist/**"] } } }

    // nx.json
    { "namedInputs": { "src": ["{projectRoot}/src/**/*"] },
      "targetDefaults": { "build": { "dependsOn": ["^build"], "inputs": ["src", "^src"],
                                     "outputs": ["{projectRoot}/dist"], "cache": true } } }

`_bench/run-bench.sh` times four scenarios five times each. **Cold** starts from an empty cache. **Warm** re-runs with nothing changed. **Leaf** edits `p01`, which six packages depend on transitively. **App** edits only `p12`. Both tools run with parallelism pinned to 2 (`--concurrency=2`, `--parallel=2`), the machine's vCPU count. Both are called through `node_modules/.bin`, not `npx`. Telemetry and Nx Cloud are off. Nx runs twice, with and without its daemon. The machine is a 2-vCPU Linux 6.12 container with Node 24.21.0 and npm 11.19.0, running turbo 2.11.6 and nx 23.2.1. *\[measured here\]* Raw runs are in `_numbers.json`.

**Figure 5. The benchmark workspace: twelve packages, four layers**

![Dependency graph. Leaves p01 to p04 on the left. p05 depends on p01 and p02, p06 on p02 and p03, p07 on p03 and p04, p08 on p01 and p04. p09 depends on p05 and p06, p10 on p06 and p07, p11 on p07 and p08. p12 depends on p09, p10 and p11. The six packages reached from p01 are highlighted: p01, p05, p08, p09, p11, p12.](2026-10-15-turborepo-or-nx/fig-05-bench-graph.svg)

Even with unlimited workers, the leaf scenario cannot finish faster than four sequential 400 ms builds, 1.6 s. With two workers, the cold run's floor is twelve builds over two cores, 2.4 s. Anything above those floors is tool overhead, process start-up, or scheduling slack.

### Results

**Figure 6. Wall-clock time per scenario, median of five runs**

![Grouped horizontal bar chart, milliseconds, median of five runs. Cold: turbo 4,748, nx without daemon 6,555, nx with daemon 12,299; floor 2,400. Warm: turbo 48, nx without daemon 724, nx with daemon 770. Leaf edit: turbo 2,455, nx without daemon 3,983, nx with daemon 5,599; floor 1,600. App edit: turbo 624, nx without daemon 1,550, nx with daemon 1,563; floor 400.](2026-10-15-turborepo-or-nx/fig-06-bench.svg)

Turborepo is closest to the floor in every scenario. Its overhead is about 200 ms per executed task cold, and 48 ms to confirm that nothing changed. Nx without the daemon adds about 350 ms per task and 724 ms to confirm a full hit. With the daemon on, a 2-vCPU machine got slower: cold runs took 1.9× as long. *\[measured here\]*

| Scenario           | Floor | turbo | nx (no daemon) | nx (daemon) | nx ÷ turbo |
|--------------------|-------|-------|----------------|-------------|------------|
| Cold, 12 tasks     | 2,400 | 4,748 | 6,555          | 12,299      | 1.4×       |
| Warm, 0 tasks      | 0     | 48    | 724            | 770         | 15×        |
| Leaf edit, 6 tasks | 1,600 | 2,455 | 3,983          | 5,599       | 1.6×       |
| App edit, 1 task   | 400   | 624   | 1,550          | 1,563       | 2.5×       |

The last column compares the no-daemon Nx run with turbo, so it is the conservative ratio. Spread across the five runs was small, apart from the daemon runs. Nx-with-daemon cold ranged 11,338–12,638 ms. The next widest was Turborepo's cold run, 4,354–4,952 ms. *\[measured here\]*

### Reading it honestly

**The gap is a constant, not a multiplier.** Every number above is overhead on 400 ms tasks. Real builds and test suites take tens of seconds to minutes, and there a fixed 0.3–1 s per run disappears. Nx's own "Run duration" line for a leaf run read 3.3 s against a 4.0 s wall clock. The remaining 0.7 s goes to building the project graph and starting up, and is paid once per invocation, not once per task. *\[measured here\]* The 15× warm-run ratio is real and visible in an editor loop or a pre-commit hook. It is invisible in a 20-minute CI pipeline.

**The daemon result is specific to small machines.** The Nx daemon keeps a warm project graph and file watcher in memory. On two vCPUs it competes with the builds for CPU, and it was started fresh after each `nx reset`. Both effects would shrink on a laptop with more cores and a long-lived daemon. I did not profile it. *\[reconstruction\]* With `CI=1` set, as most CI providers set it, the "daemon on" numbers matched the "no daemon" ones. That suggests Nx does not start its daemon under CI. *\[measured here\]*

**Footprint.** A bare install of `turbo` adds two packages and 41 MB to `node_modules`: a launcher and one platform binary. A bare install of `nx` adds 126 packages and 69 MB. `turbo --version` returns in 42 ms and `nx --version` in 61 ms. *\[measured here\]* Package count is also attack surface, and that comes back in [§11](#11-price-lock-in-and-supply-chain).

**What was not measured.** Remote caching, distributed execution, plugins, inferred targets, and repositories with thousands of projects, where graph construction cost grows and the daemon earns its keep. Neither vendor's published case studies were reproduced.

## 06 · Remote caching and who runs it

A local cache speeds up one developer. A remote cache speeds up CI and the whole team, because a task built once anywhere is restored everywhere. Both tools speak an HTTP cache protocol with a published OpenAPI spec. They differ in who hosts it by default, and in what that host is paid for.

### Turborepo: Vercel, free, or your own server

"Vercel Remote Cache is free to use on all plans, even if you do not host your applications on Vercel." It has been free since 20 December 2024. *\[from the docs\]* Vercel's fair-use limits are 100 GB of uploads a month on Hobby, 1 TB on Pro, and 4 TB on Enterprise. The request limit is 100 a minute on Hobby and 10,000 a minute on Pro and Enterprise. Artifacts expire after seven days. *\[from the docs\]*

Self-hosting is a first-class path. Turborepo documents the Remote Cache API as an OpenAPI spec, offers `turbo login --manual` to point at any server, and lists community servers: `ducktors/turborepo-remote-cache`, `brunojppb/turbo-cache-server`, and Tapico's. *\[from the docs\]* Since 2.10, local cache eviction (`cacheMaxAge`, `cacheMaxSize`) is available. It is slated to be on by default in 3.0. *\[from the docs\]*

### Nx: Nx Cloud, and a self-hosting story that changed twice

Nx's remote cache is "Nx Replay", included on every Nx Cloud plan, the free Hobby tier among them. *\[from the docs\]* Self-hosting has had a turbulent two years:

- **September 2024.** Nx announced Powerpack, a commercial package whose self-hosted cache plugins (S3, GCS, Azure, shared filesystem) required "a dedicated commercial license". *\[from the docs\]*
- **December 2025.** An update to the same post: "Self-hosted caching remains free for everyone". Conformance and Owners moved into the Enterprise plan. *\[from the docs\]*
- **21 May 2026.** "`@nx/s3-cache`, `@nx/gcs-cache`, `@nx/azure-cache`, and `@nx/shared-fs-cache` are deprecated as of 2026-05-21… The CREEP vulnerability (CVE-2025-36852) affects all four packages. The flaw is in their design and cannot be patched." *\[from the docs\]*

CREEP is a cache-poisoning class. A bucket-backed cache lets any CI job that can write to the bucket write any key, including one that a protected branch will later read. Nx's write-up rates it critical and says Nx Cloud is not affected. *\[from the docs\]* The current self-hosted route is to implement Nx's remote-cache OpenAPI spec yourself and point `NX_SELF_HOSTED_REMOTE_CACHE_SERVER` at it. *\[from the docs\]*

The same attack applies to any shared cache that trusts writers. That includes a self-hosted Turborepo cache that accepts uploads from pull-request builds. Turborepo's mitigations are signed artifacts (`remoteCache.signature` with `TURBO_REMOTE_CACHE_SIGNATURE_KEY`) and a read-only token for untrusted jobs. Vercel's own docs suggest clearing the remote cache "if you believe there are poisoned artifacts". *\[reconstruction\]* The signing option is recalled from Turborepo's config reference, not re-read for this report. The quote is from Vercel's remote-caching page.

**Figure 7. Remote cache options, side by side**

|  | Turborepo | Nx |
|----|----|----|
| Hosted default | Vercel Remote Cache, free on all plans | Nx Cloud (Nx Replay), on every plan including Hobby |
| Hosted limits | uploads 100 GB / 1 TB / 4 TB a month; 7-day expiry | metered in credits (§11) |
| Self-host | any server implementing the OpenAPI spec; community servers listed | implement the OpenAPI spec yourself; bucket plugins deprecated |
| Poisoning guard | artifact signing; read-only tokens for untrusted jobs | Nx Cloud's access model; bucket plugins "cannot be patched" |

Both now converge on "speak our HTTP spec". Turborepo got there first and never left. Nx got there after a licensing reversal and a CVE. If you want a cache you run yourself, Turborepo's path is shorter and better trodden.

## 07 · CI beyond the cache

Caching makes the unchanged part of a pipeline free. It does nothing for the part that did change. That part still runs on whatever machines the CI config gives it. Here the two tools stop being comparable. Nx sells a fleet; Turborepo stops at the cache.

### Nx Agents

With Nx Agents, "the tasks in your CI run spread across several machines. Dynamic task packing keeps each machine close to its CPU and memory limits". Nx claims "about 50% fewer machine-minutes than remote caching alone". You enable it by adding `npx nx-cloud start-nx-agents` to the pipeline, with a `.nx/ci-config.yaml` describing agent sizes. *\[from the docs\]* The Nx 23 release post gives a worked number: "Wall-clock time dropped from 48 minutes to 12. Cost per run went from \$0.66 to \$0.46." The pricing page adds "Nx Agents now 4× faster and 30% cheaper than GitHub Actions". *\[from the docs\]* These are vendor figures. Nothing here reproduces them.

Two features make distribution fine-grained. The Atomizer splits a large test target into per-file tasks that can land on different agents. It depends on inferred targets, which is one reason Nx pushes the move to plugins. *\[from the docs\]* And because Nx Cloud sees every task's history, it can tell a flaky failure from a real one.

### Self-healing CI

Self-Healing CI is "an AI-powered system that automatically detects, analyzes, and proposes fixes for CI failures". It can commit fixes to the pull request itself. A separate setting, "Auto-retry flaky tasks", will "automatically re-run tasks that are detected as flaky". *\[from the docs\]* It is the first build-system feature in either product that changes code, not just runs it.

### Turborepo in CI

Turborepo's CI offering is the remote cache, `--affected`, and `turbo prune --docker`. Prune emits a minimal sub-monorepo for one target, so a Docker build copies only the packages and lockfile slice that the target needs. *\[from the docs\]* I found no first-party distributed execution, flaky-test detection, or retry in the Turborepo docs or its `llms.txt`. That absence is not confirmed by a statement from Vercel. To spread work, you shard by hand: split `--filter` sets across CI matrix jobs and let the remote cache stitch the results together. *\[reconstruction\]*

**Figure 8. Three ways to run the same affected set in CI**

![Three timelines of the same nine tasks of mixed length. Top: one machine runs them with a remote cache, finishing last. Middle: a hand-written CI matrix splits them into three fixed shards; one shard finishes much later than the others, so the run waits for the slowest. Bottom: Nx Agents assigns tasks dynamically to three machines, which finish close together, earliest of the three.](2026-10-15-turborepo-or-nx/fig-08-ci.svg)

An illustration, not a measurement. A static matrix is as slow as its unluckiest shard. Dynamic assignment, which Nx Agents provides and Turborepo does not, closes that gap. The more uneven your task durations, the more it is worth. *\[reconstruction\]*

## 08 · Beyond JavaScript

Most monorepos that outgrow JavaScript add a JVM or .NET service first, and a Python or Rust one second. Nx covers the first group with first-party plugins. Turborepo began covering the second group, experimentally, two weeks before this report.

Nx's own comparison page: "Nx provides first-party plugins for Maven, Gradle, .NET, and Docker, plus community plugins for Python, Rust, Go, and PHP." *\[from the docs\]* The community plugins are named in its multi-language docs: `@nxlv/python`, `@nx-go/nx-go`, `@monodon/rust`. `@nx/dotnet` left experimental in Nx 23. *\[from the docs\]* A Gradle project in an Nx workspace is a node in the same graph as a React app. `nx affected` walks across the boundary, and the Gradle plugin infers the targets from the build.

Turborepo 2.11 announced "Native support for Rust, Python, and Go (Experimental)". Go needs `"experimentalGoWorkspaces": true`. For everything else, the documented pattern is still to "add a `package.json` beside each independently cacheable project and invoke its toolchain from package scripts". *\[from the docs\]* That shim works, and plenty of repos run `cargo` or `uv` behind an npm script. The cost is that dependency edges between non-JS projects have to be mirrored by hand in `package.json`, or the graph misses them. *\[reconstruction\]*

**Figure 9. Language support by tier, October 2026**

| Ecosystem          | Turborepo 2.11       | Nx 23.2               |
|--------------------|----------------------|-----------------------|
| JS / TS            | native (workspaces)  | first-party plugins   |
| Gradle · Maven     | package.json shim    | first-party plugins   |
| .NET               | package.json shim    | first-party, GA in 23 |
| Docker             | prune --docker       | first-party plugin    |
| Rust · Python · Go | experimental, native | community plugins     |
| PHP                | package.json shim    | community plugin      |

Green is supported by the vendor, orange is experimental or community-maintained, and blue is a related feature, not full support. Uncoloured means you write the glue. For a JVM or .NET estate, Nx is the only one of the two with a supported answer today.

## 09 · Generators, boundaries, upgrades

A repository with forty teams needs more than speed. It needs new projects that look like old ones, imports that respect architecture, and upgrades that land everywhere at once. Nx treats these as core features. Turborepo provides lighter versions and leaves the rest to other tools.

### Generators

Nx generators "can read and modify the project graph, perform AST-level TypeScript transforms, and compose with other generators". *\[from the docs\]* Every official plugin ships them, so `nx g @nx/react:library` produces a library already wired into lint, test and build targets. Turborepo's `turbo gen` wraps Plop (its config exposes `PlopTypes.NodePlopAPI`). It is a template copier with prompts, not a graph-aware transform. *\[from the docs\]*

### Boundaries

Nx enforces architecture through a lint rule, `@nx/enforce-module-boundaries`. Projects carry tags, and `depConstraints` say which tags may depend on which, for example `type:feature` may import `type:ui` but never the reverse. *\[from the docs\]* Turborepo's Boundaries, experimental since 2.4, check two things. The first is "Importing a package that is not specified as a dependency". The second is tag rules with allow and deny lists in `turbo.json`. *\[from the docs\]* The first check protects cache correctness (§04). The second is the start of what Nx already has.

### Upgrades

`nx migrate latest` writes a `migrations.json` of codemods collected from every installed plugin, and `--run-migrations` applies them. Since Nx 23, if Claude Code, Codex or OpenCode is present, Nx offers an agentic flow and "creates a commit for each migration". *\[from the docs\]* This is Nx's strongest lock-in and its strongest feature. If you upgrade React, Jest, Vite and Nx itself across 300 projects in one pull request, migrations decide whether that takes a day or a quarter. Turborepo ships codemods for its own config (`@turbo/codemod`) but not for your frameworks. *\[reconstruction\]*

### Smaller tools

Turborepo has caught up on introspection. `turbo query` runs "GraphQL queries against your monorepo", and `turbo ls` is "a shorthand for a `packages` query". The 2.9 notes say query "has graduated from Experimental status to Stable", while the reference page still shows an experimental badge. `turbo devtools` (2.7) draws the graph in a browser, and `turbo watch` re-runs tasks on change, with caching in watch mode still experimental. *\[from the docs\]* Nx has `nx graph`, Nx Console's project-details view in VS Code and JetBrains, and `nx release` for versioning, changelogs and publishing. *\[from the docs\]*

**Figure 10. Governance features, by maturity**

| Need | Turborepo | Nx |
|----|----|----|
| Scaffold a project | `turbo gen` (Plop templates) | generators per plugin, graph-aware |
| Enforce imports | Boundaries (experimental) | `enforce-module-boundaries` lint rule |
| Upgrade frameworks | own-config codemods only | `nx migrate` + optional agent |
| Version and publish | use Changesets | `nx release` |
| Ownership, conformance | — | Owners, Conformance (Enterprise plan) |
| Inspect the graph | `turbo query`, `ls`, `devtools` | `nx graph`, Nx Console |

Turborepo's answer for anything outside running tasks is "use the ecosystem tool", such as Changesets, Plop or eslint plugins. Nx's answer is "use ours". The first keeps you portable, and the second keeps you consistent.

## 10 · What each offers a coding agent

Both now lead with agents, for a sound reason. An agent that edits a monorepo needs to know what a change touches and how to check it. A build system already knows both. The tools differ in how they hand that knowledge over: Turborepo through files an agent reads, Nx through a server an agent calls.

### Turborepo: documents and a small CLI

Turborepo maintains "a managed block in the repository-root `AGENTS.md`" with docs matched to the installed version. It ships an agent skill (`npx skills add vercel/turborepo`) and a `turbo docs "query"` command. It shares caches across git worktrees, so parallel agents in separate worktrees reuse each other's builds. *\[from the docs\]* The site publishes `/llms.txt`, `/llms-full.txt`, `/sitemap.md` and `/agents.md`. Task `description` fields (2.8) exist "so AI understands what each task does". *\[from the docs\]* I found no first-party MCP server. *\[reconstruction\]*

### Nx: an MCP server and a CI loop

`npx nx configure-ai-agents` writes `CLAUDE.md` and `AGENTS.md` guidance, installs agent skills, and registers the Nx MCP server. That server gives an agent the project graph, generators, docs, and "Nx Cloud CI pipelines, self-healing fixes, running processes, and documentation". *\[from the docs\]* Nx 23.2 cut CLI output by 66.6× on all-green runs, a change aimed squarely at agent context budgets. Agentic `nx migrate` (§09) and Self-Healing CI (§07) close the loop. The agent can be told what broke in CI, propose the fix, and have it committed. *\[from the docs\]*

**Figure 11. How an agent learns what its change touches**

![Two flows. Turborepo: the agent reads AGENTS.md and llms.txt, then shells out to turbo query or turbo run with affected, and parses the text output. Nx: the agent calls the Nx MCP server, which answers from the project graph and Nx Cloud, including CI failures and proposed fixes, and the agent can apply generators and migrations through it.](2026-10-15-turborepo-or-nx/fig-11-agent.svg)

Turborepo makes the agent a better-informed user of a small CLI. Nx makes the build system a tool the agent calls, with CI history behind it. The second approach knows more, and it requires the agent's harness to speak MCP and your CI to run on Nx Cloud. *\[reconstruction\]*

For an agent loop like the one quirq measures, where every task is verified and every intervention counted, the useful property is the one both share: a deterministic answer to "which checks does this diff require?". Turborepo's answer costs 48 ms on a warm cache and Nx's about 0.7 s (§05). Nx adds a record of why CI failed, which is exactly the evidence an audit wants. Turborepo leaves that record to whatever CI you run. *\[reconstruction\]*

## 11 · Price, lock-in and supply chain

Both cores are MIT and free. The bills come from the hosted services: Vercel's cache, which is free, and Nx Cloud, which is metered. The risks come from how much of your repository each tool comes to own, and from what you install to get it.

### What you pay

**Figure 12. Hosted pricing as published, 2 October 2026**

| Plan | What it costs | What you get |
|----|----|----|
| Vercel Remote Cache | \$0 on Hobby, Pro, Enterprise | fair use: 100 GB / 1 TB / 4 TB uploads a month; 7-day expiry |
| Nx Cloud Hobby | "Free forever" | 50,000 credits a month, 5 contributors, 10 concurrent CI connections |
| Nx Cloud Team | \$29 a month, plus \$19 per contributor | \$29 of included credit; \$5.50 per extra 10,000 credits |
| Nx Cloud Enterprise | custom | adds Conformance, Owners, flaky-task analytics, single-tenant or on-prem |

From vercel.com/docs/monorepos/remote-caching and nx.dev/pricing. A ten-person team on Nx Team pays at least \$29 + 10 × \$19 = \$219 a month before overage credits. That is cheap if Nx Agents removes even a few CI machines, and expensive if all you use is the cache. *\[from the docs\]*

### What it costs to leave

Removing Turborepo means deleting `turbo.json` and replacing `turbo run build` with your package manager's recursive run. The scripts were always yours. Removing Nx means re-creating every inferred target as an explicit script, replacing generators, the boundaries rule, and `nx release`, and re-plumbing CI if it used Nx Agents. *\[reconstruction\]* The vendors' migration guides reflect this asymmetry. Nx's `npx nx@latest init` "detects `turbo.json`, writes an equivalent `nx.json`". Turborepo's guide from Nx is ten manual steps, pitched as leaving "layers of plugins, dependencies, and Nx-specific code". *\[from the docs\]*

### What you install

On 26 August 2025, malicious versions of `nx` were published to npm. They covered 21.5.0–21.8.0 and 20.9.0–20.12.0, plus some `@nx/*` packages. "The malicious packages were active for 4 hours." The root cause was a GitHub workflow using `pull_request_target` with an unsanitised PR title, which leaked the npm publish token. *\[from the docs\]* Third-party analysis found the payload tried to drive locally installed AI CLIs to search the machine for secrets. *\[from the docs\]* Nx's fixes were npm Trusted Publishers (OIDC), manual 2FA approval for releases, and provenance checks. *\[from the docs\]*

The lesson is not "Nx is unsafe". The project disclosed fully and fixed the process that failed. The lesson is that a build tool runs with every credential a developer has, and its install footprint is attack surface. Two packages versus 126 (§05) is a real difference in how much code you have to trust. Pin versions, install with lockfile enforcement, and prefer packages with npm provenance, whichever tool you pick. *\[reconstruction\]*

## 12 · Choosing

Start from the problem, not the tool. Four questions settle almost every case, and the first "yes" decides.

**Figure 13. Four questions, in order**

![Decision chain of four questions, each with a yes branch to Nx. One: do Gradle, Maven or .NET projects need to share the graph? Two: is CI wall-clock or compute the bottleneck even with a warm remote cache? Three: do you need enforced import boundaries or codemod upgrades across many teams? Four: do you want an agent wired to CI history through MCP? If all four are no, choose Turborepo.](2026-10-15-turborepo-or-nx/fig-13-decide.svg)

Most JavaScript and TypeScript monorepos of a few dozen packages answer "no" four times. Most organisations with a JVM back end, or CI bills in the thousands a month, answer "yes" at question 1 or 2. *\[reconstruction\]*

### Three cases

- **A product team, Next.js plus shared packages**: 20 packages · GitHub Actions · deploys on Vercel Turborepo. Add turbo.json and the free remote cache, and use --affected in CI. The whole adoption is one afternoon and one file. Revisit if CI time stops falling once the cache is warm.
- **A platform group, React front ends plus Spring services**: 300 projects · 40 engineers · Gradle and pnpm Nx. The Gradle plugin puts both halves in one graph, so nx affected is honest across the language line. Boundaries and nx migrate pay for themselves at this headcount. Price Nx Agents against your current runner bill.
- **An agent-first lab, many worktrees, small repo**: parallel agents · tight CPU · fast inner loop Turborepo, on today's evidence. A 48 ms no-op check and shared worktree caches suit many agents on small machines. Re-evaluate after Nx's 22 October event, which promises "faster caching, smarter distribution, up to 50% less CI compute".
- **Already on one, unhappy**: migration in either direction Turborepo to Nx is mostly automated by nx init . Nx to Turborepo is ten manual steps and is cheapest before you adopt inferred targets. Either way, port the cache-key rules first and check them with a deliberate leaf edit, as in §04.

## 13 · Sources

All pages were read on 2 October 2026.

### Turborepo

- [turborepo.dev](https://turborepo.dev): tagline and the three core capabilities.
- [Configuring tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks): `dependsOn`, `^`, `inputs`, `outputs`.
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching): global and task hash inputs.
- [turbo run reference](https://turborepo.dev/docs/reference/run): `--affected`, `--filter`, `--env-mode`.
- [Remote caching](https://turborepo.dev/docs/core-concepts/remote-caching): Vercel Remote Cache, self-hosting, community servers.
- [turbo query](https://turborepo.dev/docs/reference/query.md), [Boundaries](https://turborepo.dev/docs/reference/boundaries.md), [prune](https://turborepo.dev/docs/reference/prune.md), [gen](https://turborepo.dev/docs/reference/turbo-gen.md), [watch](https://turborepo.dev/docs/reference/watch.md), [devtools](https://turborepo.dev/docs/reference/devtools.md).
- [AI guide](https://turborepo.dev/docs/guides/ai.md) and [llms.txt](https://turborepo.dev/llms.txt): the agent features.
- [Multi-language guide](https://turborepo.dev/docs/guides/multi-language.md): Rust, Python and Go, and the `package.json` shim.
- [Migrating from Nx](https://turborepo.dev/docs/guides/migrating-from-nx.md).
- [Blog](https://turborepo.dev/blog): releases 2.4–2.11, especially [2.9](https://turborepo.dev/blog/2-9), [2.10](https://turborepo.dev/blog/2-10) and [2.11](https://turborepo.dev/blog/2-11).
- [Vercel remote caching](https://vercel.com/docs/monorepos/remote-caching): pricing, limits, expiry.
- [github.com/vercel/turborepo](https://github.com/vercel/turborepo) and [registry.npmjs.org/turbo](https://registry.npmjs.org/turbo): licence, stars, version.

### Nx

- [nx.dev](https://nx.dev): tagline and adoption claims.
- [nx.json reference](https://nx.dev/docs/reference/nx-json): plugins, `namedInputs`, `targetDefaults`.
- [Inferred tasks](https://nx.dev/docs/concepts/inferred-tasks): Project Crystal (read from search snippets; the direct fetch returned 404).
- [Affected](https://nx.dev/docs/features/ci-features/affected): algorithm, base and head, lockfile behaviour.
- [Distribute task execution](https://nx.dev/docs/features/ci-features/distribute-task-execution) and [Self-Healing CI](https://nx.dev/docs/features/ci-features/self-healing-ci).
- [Deprecated self-hosted cache packages](https://nx.dev/docs/reference/deprecated/self-hosted-cache-packages), [self-hosted caching](https://nx.dev/docs/kb/self-hosted-caching), [Powerpack](https://nx.dev/blog/introducing-nx-powerpack), and [CVE-2025-36852](https://nx.dev/blog/cve-2025-36852-critical-cache-poisoning-vulnerability-creep).
- [Nx vs Turborepo](https://nx.dev/docs/kb/nx-vs-turborepo) and [multi-language support](https://nx.dev/docs/features/multi-language-support).
- [Module boundaries](https://nx.dev/docs/features/enforce-module-boundaries) and [nx migrate](https://nx.dev/docs/features/automate-updating-dependencies).
- [Enhance AI](https://nx.dev/docs/features/enhance-ai) and the [Nx MCP reference](https://nx.dev/docs/reference/nx-mcp).
- [Pricing](https://nx.dev/pricing).
- [Nx 23](https://nx.dev/blog/nx-23-release), [Nx 23.2](https://nx.dev/blog/nx-23-2-release), and the [October 2026 product event](https://nx.dev/events/2026-oct-product-event).
- [Adopting Nx from Turborepo](https://nx.dev/docs/guides/adopting-nx/from-turborepo).
- [s1ngularity postmortem](https://nx.dev/blog/s1ngularity-postmortem) and [Wiz's analysis](https://www.wiz.io/blog/s1ngularity-supply-chain-attack).
- [github.com/nrwl/nx](https://github.com/nrwl/nx), [issue \#28434](https://github.com/nrwl/nx/issues/28434), and [registry.npmjs.org/nx](https://registry.npmjs.org/nx).

### Measured here

- `_bench/make-ws.sh`: builds the twelve-package workspace (`turbo`, `nx`, or `nx-naive` variant).
- `_bench/run-bench.sh`: the four scenarios, five repetitions each.
- `_numbers.json`: every run, the medians, and the footprint and start-up numbers.
- [npm downloads: turbo](https://api.npmjs.org/downloads/point/last-week/turbo) and [nx](https://api.npmjs.org/downloads/point/last-week/nx), week of 24–30 September 2026.

**Provenance.** Versions, licences, star counts and download counts come from the npm and GitHub APIs. Features, quotes and prices come from each vendor's own pages, gathered with a fetch tool that summarises pages. A quoted string is therefore the wording as that tool returned it, and should be checked against the live page before it is quoted elsewhere. Two Nx pages (inferred tasks, adopting from Turborepo) were read only through search-result snippets. The timings in §04 and §05 were measured here, on one 2-vCPU container, with synthetic 400 ms tasks. They measure tool overhead, not real build speed. The judgements, the CI illustration in Figure 8, the decision chain, and the explanation of the daemon slowdown are mine. Not verified: the absence of Turborepo features (distributed execution, MCP server, flaky-test retries); the stability status of `turbo query`, where the docs contradict themselves; Turborepo's artifact-signing option and the year strict env mode became its default, both recalled rather than re-read; any vendor performance claim; and any paid Nx Cloud feature, none of which was exercised.
