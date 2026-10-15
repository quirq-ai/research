# Turborepo or Nx at a glance

suraj's comparison of Turborepo and Nx in one page: how each sees a
repository, what goes into a cache key, what each one costs, and a benchmark
of both on one twelve-package workspace. Both now call themselves the build
system for coding agents. It describes `turbo@2.11.6` and `nx@23.2.1`, as
read on 2 October 2026.

## The claim

> Turborepo runs the scripts your `package.json` files already declare, in
> dependency order, and skips any whose inputs it has seen before. Nx does the
> same, and then keeps going. It infers tasks from tool configs, generates
> code, enforces which projects may import which, rewrites your repo on
> upgrades, and sells a CI fleet that spreads tasks across machines. Pick the
> one whose extra surface you actually need.

From [Turborepo or Nx](../report/2026-10-15-turborepo-or-nx.md#01-the-short-answer), §01.

## In numbers

| | |
|---|---|
| **48 ms** | turbo, fully cached run (12 tasks) |
| **724 ms** | nx without its daemon, fully cached run |
| **1.9×** | as long for Nx cold runs with the daemon on, on a 2-vCPU machine |
| **92%** | cache hit after a one-line Nx config change; five packages shipped built against the old version of their dependency |
| **2 vs 126** | third-party npm packages installed (41 MB vs 69 MB) |
| **33M vs 12M** | npm downloads, week of 24 Sep 2026, CI installs included |
| **\$0** | Vercel Remote Cache, on all plans |
| **\$219** | a month at least, for ten people on Nx Cloud Team |
| **4 hours** | malicious `nx` versions were active on npm, 26 August 2025; Nx's fixes included npm Trusted Publishers |
| **66.6×** | cut in Nx 23.2's CLI output on all-green runs, to save agent tokens |

Rows one to five are *\[measured here\]* on one 2-vCPU container, with
synthetic 400 ms tasks for the timings. The rest are *\[from the docs\]*,
read 2 October 2026.

## Where to go next

| Read | For |
|---|---|
| [Turborepo or Nx](../report/2026-10-15-turborepo-or-nx.md) | The full comparison, with 13 figures |
| [§04 · The cache key is the product](../report/2026-10-15-turborepo-or-nx.md#04-the-cache-key-is-the-product) | What each tool hashes, and how a green Nx build ships stale output |
| [§05 · Measured on one workspace](../report/2026-10-15-turborepo-or-nx.md#05-measured-on-one-workspace) | The benchmark, and how to read it |
| [§12 · Choosing](../report/2026-10-15-turborepo-or-nx.md#12-choosing) | Four questions in order; the first "yes" decides |

## How it connects

In [§10](../report/2026-10-15-turborepo-or-nx.md#10-what-each-offers-a-coding-agent)
the report turns to quirq. For an agent loop like the one quirq measures, the
useful property is the one both tools share: a deterministic answer to
"which checks does this diff require?". It costs 48 ms in Turborepo on a warm
cache and about 0.7 s in Nx, and Nx adds a record of why CI failed.
*\[reconstruction\]*

This research repo is itself a Turborepo monorepo. Its root `turbo.json`
declares `build` as the canonical example in
[§03](../report/2026-10-15-turborepo-or-nx.md#turborepo-the-package-graph)
does. `infra` lists `infra-map` as a devDependency, so Turborepo builds the
app first.

## Open questions

The report names these as not measured or not verified:

- Remote caching, distributed execution, plugins, inferred targets, and
  repositories with thousands of projects
  ([§05](../report/2026-10-15-turborepo-or-nx.md#reading-it-honestly)).
- Why the daemon slowed a 2-vCPU machine; it was not profiled.
- Whether Turborepo lacks distributed execution, an MCP server and
  flaky-test retries; whether `turbo query` is stable; Turborepo's artifact
  signing and the year strict env mode became its default, both recalled
  rather than re-read ([§13](../report/2026-10-15-turborepo-or-nx.md#13-sources)).
- Vendor performance claims and paid Nx Cloud features.
- What Nx's 22 October event changes for an agent-first lab
  ([§12](../report/2026-10-15-turborepo-or-nx.md#three-cases)).

## Sources

By Suraj Sharma, first published 2 October 2026, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[turborepo-vs-nx](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/turborepo-vs-nx),
with its benchmark scripts, and its page
[`index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/turborepo-vs-nx/index.html).
This repo's Turborepo setup: the root `turbo.json` and `README.md`, and
`infra/package.json`.
