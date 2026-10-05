# qq v0 in one page

One-pager, 2026-10-05. Requested by suraj.

**Question.** What is quirq infra (qq), what are its phases, and where does v0
stand today?

**Short answer.** qq is quirq's Chromium-style build, test and land system,
split across 13 public repos. v0 is a thin first version of every repo on
GitHub: v0 code is merged in all 13 repos except GAT-03 (waits on owners),
CFG-05 (partial) and suraj's items (CFG-04, ORG-02, ORG-04), and its repo
settings are applied, but its live exit tests have not passed yet (the unattended
7-day canary streak hasn't started yet; day 1 shipped but was started by
hand). v1 and v2 are plans.

## Key findings

1. **What qq is.** One config repo, infra-config, declares every repo,
   builder, gate rule and channel as TOML; small tools read it at a pinned
   commit and apply it. This topic groups the 13 repos into four stages
   (its own grouping, not one the repos declare): your machine (depot,
   sync, recipes, toolchains, remote-build), before landing (infra-config,
   gate, test-pipelines), after landing (gardener, rollers, perf) and
   shipping (release, installer). Two product repos use it: xo-space and
   innernet. ([org.toml](https://github.com/quirq-ai/infra-config/blob/310e3264f5de3cd9822b3a4712ae0a372b97dac3/config/org.toml))
2. **The phases.** v0 gives every repo a thin first version, end to end on
   GitHub, with only the canary channel. v1 (plan) makes the daily canary
   unattended and adds the dev channel, fuzzing and flake handling. v2 (plan)
   adds Launchpad, remote execution, perf bisection and the stable channel.
   ([v0 plan, infra-config `docs/v0.md`](https://github.com/quirq-ai/infra-config/blob/310e3264f5de3cd9822b3a4712ae0a372b97dac3/docs/v0.md); v1 and v2: quirq internal planning docs (not public))
3. **What is live.** Generated presubmit and post-submit builders in both
   product repos; repo rulesets applied at gate `6610664`; a `qq sync` of both
   repos on a fresh runner, scheduled daily; `lkgr` at both repos' current
   `main`; the first canary shipped both repos (started by hand);
   gardener tree status open for both; perf records per commit; suraj named
   owner of the org and all 13 infra repos.
   ([gate README](https://github.com/quirq-ai/gate/blob/c3721365186a35c4b2b5acdc0635e281e754ac13/README.md),
   [lkgr](https://github.com/quirq-ai/release/blob/d08a2fd01799d362da2d956e5122053f75cf8e23/pointers/xo-space/lkgr.json),
   [canary report](https://github.com/quirq-ai/release/blob/d08a2fd01799d362da2d956e5122053f75cf8e23/reports/2026-10-05.md),
   [tree status](https://github.com/quirq-ai/gardener/blob/6733e4c7940f6f25f3ca369d4d2357629c7d6764/status/README.md))
4. **What is left for v0.** suraj's open values and the remaining owners;
   toolchains' promotion gate as a required check (decided; turns on with the
   next settings run); switching the generated product builders from interim
   commands to the recipes adapters (exit test 2); then the live tests: a red
   PR refused, 7 unattended daily canaries, and an automatic revert, which
   needs the gardener's GitHub App. The unattended 7-day streak hasn't started
   yet; day 1 shipped but was started by hand. GitHub never fired the 06:17 UTC slot, and `lkgr`, scheduled every 10 minutes, ran only 4 times between 17:48 and 02:25 UTC and not again before 07:00 UTC. The hand-started run began at
   06:54 UTC, and both repos shipped at 06:59 UTC. Since 2026-10-05 a daily backstop is live: a routine at 07:37 UTC dispatches `lkgr` and then the canary watchdog. Its first run was green: `lkgr` run 37278808086, then watchdog run 37279000484, which reported "today's canary ran for every repo".
   ([phases report](../report/2026-10-05-qq-phases.md), [release-state `d08a2fd`](https://github.com/quirq-ai/release/tree/d08a2fd01799d362da2d956e5122053f75cf8e23))
5. **Limits.** Toolchains are Linux x86_64 only, so on a Mac `qq sync` stops
   and you bring your own Python or Node. Generated builders do not use
   recipes yet (open v0 work); nothing lands on its own (`auto_land_repos` is empty); only
   `qq` 0.1.0 exists; GitHub is the only backend.
   ([toolchains `qqtc.py`](https://github.com/quirq-ai/toolchains/blob/44f8f959458eab59baf46cbae5866a36657f7eeb/tools/qqtc.py),
   [auto_revert.toml](https://github.com/quirq-ai/infra-config/blob/310e3264f5de3cd9822b3a4712ae0a372b97dac3/config/auto_revert.toml))

More: [phases report](../report/2026-10-05-qq-phases.md),
[v0 status report](../report/2026-10-05-qq-v0-status.md),
[slides](../slide/2026-10-05-qq-v0-how-to-use.pdf).

## Sources

Repos at `main`, read 2026-10-05: [infra-config `310e326`](https://github.com/quirq-ai/infra-config/tree/310e3264f5de3cd9822b3a4712ae0a372b97dac3),
[gate `c372136`](https://github.com/quirq-ai/gate/tree/c3721365186a35c4b2b5acdc0635e281e754ac13), [toolchains `44f8f95`](https://github.com/quirq-ai/toolchains/tree/44f8f959458eab59baf46cbae5866a36657f7eeb),
[depot `741967c`](https://github.com/quirq-ai/depot/tree/741967cc7fba1e486a65856b05c4abb2b1486b8b), [xo-space `14b21a4`](https://github.com/quirq-ai/xo-space/tree/14b21a41668bc8124b4cf5cf9cd59fb44dc7d419),
[innernet `8f383a3`](https://github.com/quirq-ai/innernet/tree/8f383a3d6c28f1e4495ff177efe70dca43d17604); state branches
[release-state `d08a2fd`](https://github.com/quirq-ai/release/tree/d08a2fd01799d362da2d956e5122053f75cf8e23) (checked 2026-10-05 07:15 UTC) and
[tree-status `6733e4c`](https://github.com/quirq-ai/gardener/tree/6733e4c7940f6f25f3ca369d4d2357629c7d6764). Plans: v0, infra-config
[`docs/v0.md`](https://github.com/quirq-ai/infra-config/blob/310e3264f5de3cd9822b3a4712ae0a372b97dac3/docs/v0.md); v1 and v2, quirq internal planning docs (not public). Base: the
qq v0 one-pager and deck, 2026-10-04 (quirq internal planning docs (not public)).
