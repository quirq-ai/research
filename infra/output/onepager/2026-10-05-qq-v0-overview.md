# qq v0 in one page

One-pager, 2026-10-05. Requested by suraj.

**Question.** What is quirq infra (qq), what are its phases, and where does v0
stand today?

**Short answer.** qq is quirq's Chromium-style build, test and land system,
split across 13 public repos. v0, a thin first version of every repo on GitHub,
is built and its repo settings are applied, but its live exit tests have not
passed yet. v1 and v2 are plans.

## Key findings

1. **What qq is.** One config repo, infra-config, declares every repo,
   builder, gate rule and channel as TOML; small tools read it at a pinned
   commit and apply it. The 13 repos cover four stages: your machine (depot,
   sync, recipes, toolchains, remote-build), before landing (infra-config,
   gate, test-pipelines), after landing (gardener, rollers, perf) and
   shipping (release, installer). Two product repos use it: xo-space and
   innernet. ([org.toml](https://github.com/quirq-ai/infra-config/blob/310e3264f5de3cd9822b3a4712ae0a372b97dac3/config/org.toml))
2. **The phases.** v0 gives every repo a thin first version, end to end on
   GitHub, with only the canary channel. v1 (plan) makes the daily canary
   unattended and adds the dev channel, fuzzing and flake handling. v2 (plan)
   adds Launchpad, remote execution, perf bisection and the stable channel.
   (quirq infra plans, vision/quirq-infra/v0.md, v1.md, v2.md, project files,
   2026-10-03)
3. **What is live.** Generated presubmit and post-submit builders in both
   product repos; repo rulesets applied at gate `6610664`; a daily `qq sync`
   of both repos on a fresh runner; `lkgr` at both repos' current `main`;
   gardener tree status open for both; perf records per commit; suraj named
   owner of the org and all 13 infra repos.
   ([gate README](https://github.com/quirq-ai/gate/blob/c3721365186a35c4b2b5acdc0635e281e754ac13/README.md),
   [lkgr](https://github.com/quirq-ai/release/blob/f89a9449fc512c05a0b91a11551d9ade0dfc7aa1/pointers/xo-space/lkgr.json),
   [tree status](https://github.com/quirq-ai/gardener/blob/6733e4c7940f6f25f3ca369d4d2357629c7d6764/status/README.md))
4. **What is left for v0.** suraj's open values and the remaining owners; a
   settings re-apply for toolchains' promotion gate; then the live tests: a red
   PR refused, 7 unattended daily canaries (the first was scheduled for
   2026-10-05 06:17 UTC; no canary record yet), and an automatic revert, which
   needs the gardener's GitHub App.
5. **Limits.** Toolchains are Linux x86_64 only, so on a Mac `qq sync` stops
   and you bring your own Python or Node. Generated builders do not use
   recipes yet; nothing lands on its own (`auto_land_repos` is empty); only
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
[release-state `f89a944`](https://github.com/quirq-ai/release/tree/f89a9449fc512c05a0b91a11551d9ade0dfc7aa1) (checked 2026-10-05 06:30 UTC) and
[tree-status `6733e4c`](https://github.com/quirq-ai/gardener/tree/6733e4c7940f6f25f3ca369d4d2357629c7d6764). Plans: vision/quirq-infra/v0.md,
v1.md, v2.md (project files). Base: the qq v0 one-pager and deck, 2026-10-04.
