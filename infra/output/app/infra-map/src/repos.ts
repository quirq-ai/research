// The 13 qq repos, how they use each other, and a walk-through of one change.
// Edges come from each repo's pinned dependencies (pyproject.toml, pins.toml) and README.

export type Lane = 0 | 1 | 2 | 3
export type Repo = { lane: Lane; row: number; sub: string; role: string; counterpart: string }

export const LANES = ["Your machine", "Before landing", "After landing", "Shipping"]

export const REPOS: Record<string, Repo> = {
  depot: { lane: 0, row: 0, sub: "the qq command", role: "The qq command line you run: fetch, sync, build, test, upload, try, land, status. Every repo pins the qq version it uses.", counterpart: "depot_tools" },
  sync: { lane: 0, row: 1, sub: "manifest + parser", role: "Defines infra/repo.toml, the manifest each product repo keeps, and is the only code allowed to read or edit it.", counterpart: "gclient and DEPS" },
  recipes: { lane: 0, row: 2, sub: "adapters per kind", role: "Adapters for each kind of repo (a Python service, a Next.js app) that plan and run fetch, build, test and bench. qq uses them on your machine; CI will use them once it runs through qq.", counterpart: "recipes" },
  toolchains: { lane: 0, row: 3, sub: "pinned Python, Node", role: "Builds Python, Node and pnpm, publishes them pinned by digest, and promotes a new build only through a reviewed PR. Linux x86_64 only so far.", counterpart: "CIPD toolchain packages" },
  "remote-build": { lane: 0, row: 4, sub: "executor + cache", role: "Runs one build action on your machine or on a runner, with a cache keyed by the action, so an unchanged cacheable action is a reported cache hit.", counterpart: "goma and RBE" },
  "infra-config": { lane: 1, row: 0, sub: "policy as code", role: "All policy in one place: which checks are required, revert caps, roll schedules, channels. It generates each product repo's CI workflows.", counterpart: "the infra/config repo" },
  gate: { lane: 1, row: 1, sub: "what must pass", role: "Works out the required checks from infra-config and the manifest, guards that no core repo names a language, and applies repo settings.", counterpart: "LUCI CV and commit-queue.cfg" },
  "test-pipelines": { lane: 1, row: 2, sub: "results + verdicts", role: "Stores every test result, files failure records and builds the scorecard. Its retry-then-compare-with-base verdict exists but is not switched on for the product repos yet.", counterpart: "ResultDB and LUCI Analysis" },
  gardener: { lane: 2, row: 0, sub: "keeps main green", role: "Watches every main commit, publishes tree status, groups failures, bisects to the culprit and opens revert PRs, at most 10 in any 24 hours. Opening reverts needs its own GitHub App, which does not exist yet; until then it reports what it would do.", counterpart: "Sheriff-o-Matic and LUCI Bisection" },
  rollers: { lane: 2, row: 1, sub: "moves pins forward", role: "Moves pins forward: configures Dependabot for lockfiles and runs the toolchain-pin roller. Roll PRs pass the same gate as yours.", counterpart: "AutoRoll" },
  perf: { lane: 2, row: 2, sub: "benchmarks + size", role: "Records one benchmark per product repo, plus innernet's Next.js build size, for each commit that lands on main. It polls main every 30 minutes rather than running inside post-submit.", counterpart: "the perf dashboard" },
  release: { lane: 3, row: 0, sub: "lkgr + channels", role: "Tracks lkgr, the newest all-green main commit, and the channel pointers with rollback. lkgr already moves for both product repos; canary is the only channel v0 can promote, once a day after build, tests and a health probe pass.", counterpart: "lkgr and release channels" },
  installer: { lane: 3, row: 1, sub: "follows channels", role: "Reads which commit and digest each channel names, so test installs can follow it. It resolves canary since the first one shipped on 5 October.", counterpart: "Omaha" },
}

/** [from, to, why]: `from` uses `to`. */
export const EDGES: [string, string, string][] = [
  ["depot", "sync", "reads manifests through"], ["depot", "recipes", "builds and tests with"],
  ["depot", "gate", "asks for the verdict from"], ["depot", "toolchains", "downloads pinned toolchains from"],
  ["recipes", "sync", "reads targets through"], ["remote-build", "recipes", "runs actions planned by"],
  ["gate", "infra-config", "reads required checks from"], ["gate", "sync", "reads manifests through"],
  ["gardener", "test-pipelines", "files failure records through"], ["gardener", "infra-config", "reads revert caps from"],
  ["perf", "test-pipelines", "stores benchmarks in"], ["perf", "recipes", "runs benchmarks through"],
  ["perf", "sync", "reads manifests through"],
  ["infra-config", "test-pipelines", "has generated CI upload results with the sink of"],
  ["rollers", "toolchains", "rolls the digests promoted by"], ["rollers", "sync", "edits manifests through"],
  ["rollers", "infra-config", "reads its schedule from"],
  ["release", "gardener", "computes lkgr with"], ["release", "infra-config", "reads channels from"],
  ["release", "recipes", "builds canaries with"],
  ["release", "test-pipelines", "files held-canary failure records through"],
  ["installer", "release", "follows the channels of"],
]

/** What each repo does to the product repos. */
export const ON_PRODUCTS: Record<string, string> = {
  depot: "is how you work on them", "infra-config": "generates their CI workflows",
  gate: "decides what must pass in them", "test-pipelines": "stores the results of their runs",
  gardener: "watches their main and publishes tree status (reverts wait on its GitHub App)", rollers: "configures the Dependabot roll PRs in them",
  toolchains: "is pinned in their manifests", perf: "records their benchmarks",
}

export type FlowStep = { title: string; text: string; nodes: string[]; edges: [string, string][] }
export const FLOW: FlowStep[] = [
  { title: "You sync", text: "qq sync runs depot, which reads the repo's infra/repo.toml through sync and downloads each pinned toolchain from toolchains, checked against its digest. Toolchains are Linux x86_64 only so far; on a Mac you bring your own.", nodes: ["depot", "sync", "toolchains", "products"], edges: [["depot", "sync"], ["depot", "toolchains"]] },
  { title: "You build and test", text: "qq build and qq test hand the manifest to recipes, which plans and runs each build and test action. CI will use the same planner once it runs through qq. remote-build is the slot that will run those actions on shared machines later.", nodes: ["depot", "recipes", "sync", "remote-build"], edges: [["depot", "recipes"], ["recipes", "sync"], ["remote-build", "recipes"]] },
  { title: "You open a PR", text: "qq try pushes your branch, opens the PR on GitHub and returns at once with a run ID. A watcher reports the verdict later.", nodes: ["depot", "products"], edges: [] },
  { title: "The gate decides what must pass", text: "gate reads the required checks from infra-config and the repo's manifest. The workflows that run them were generated by infra-config.", nodes: ["gate", "infra-config", "sync", "products", "depot"], edges: [["gate", "infra-config"], ["gate", "sync"], ["depot", "gate"]] },
  { title: "Results become a verdict", text: "Each run's JUnit results go to test-pipelines. Today a single failing test fails the required check, with no retry; retrying and comparing with base is built but not switched on yet.", nodes: ["test-pipelines", "products"], edges: [] },
  { title: "You land", text: "qq land waits for a pass, then joins GitHub's merge queue, which tests your change on top of the ones ahead and squash-merges it into main. On xo-space, click Merge when ready instead.", nodes: ["products", "depot"], edges: [] },
  { title: "main stays green", text: "Post-submit runs on every main commit. gardener watches those runs, publishes tree status and will open a revert PR for a break, within infra-config's cap, once its GitHub App exists; a person merges each revert. perf records benchmarks.", nodes: ["gardener", "test-pipelines", "infra-config", "perf", "products"], edges: [["gardener", "test-pipelines"], ["gardener", "infra-config"], ["perf", "test-pipelines"], ["infra-config", "test-pipelines"]] },
  { title: "Pins move forward", text: "When toolchains promotes a new build, rollers edits the pin through sync and opens a PR, which goes through the same gate as yours.", nodes: ["rollers", "toolchains", "sync", "infra-config", "products"], edges: [["rollers", "toolchains"], ["rollers", "sync"], ["rollers", "infra-config"]] },
  { title: "Shipping", text: "release advances lkgr to the newest all-green commit, which already happens for both product repos. Once a day it builds that commit, runs the full tests, starts it and checks its health page; only then does the canary channel move to it. installer follows the channels for test installs.", nodes: ["release", "installer", "gardener", "infra-config"], edges: [["release", "gardener"], ["release", "infra-config"], ["installer", "release"]] },
]
