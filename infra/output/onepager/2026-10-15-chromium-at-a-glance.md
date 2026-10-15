# Chromium at a glance

suraj's Chromium research in one page: three teardowns (CI and releases,
dependency sync and the distributed build, the Blink engine) read at
`chromium/src@f288fed6` (Chrome 156.0.8067.0), with live readings from
2026-09-18 to 2026-09-22, and two pieces on V8's Sea of Nodes (Click and
Paleczny, 1995).

## The claim

> `//infra/config` is a compiler. 125 Starlark files go in, 3,555 generated
> files come out, and the LUCI services read those files back out of git.
> Nothing is deployed. A change to the fleet is a CL.

From [The tree that configures the fleet](../report/2026-10-15-chromium-ci-cd-and-releases.md#02-the-tree-configures-the-fleet).

## In numbers

| | |
|---|---|
| **1,211** | builders in 18 buckets, generated from Starlark in the repository they build |
| **604 → 32** | commit-queue builder entries, and the required ones that can block a landing |
| **24h** | age limit on a tryjob LUCI CV reuses; one live CL reused 32 of 34 |
| **~20,000** | unique flaky tests in the commit queue, by Chromium's docs |
| **10 / 4** | reverts LUCI Bisection may create and submit a day; submitting needs a culprit under 21,600 seconds old |
| **451** | dependencies in a 5,188-line `src/DEPS`: 273 git, 147 CIPD, 31 GCS |
| **20.8%** | of one week's 4,513 commits on `main`, from two autoroll accounts |
| **2 weeks** | between milestones since Chrome 153 reached stable on 2026-09-08; it was four |
| **256** | builders on the M155 branch, from the Starlark that gives trunk 1,211 |

Counts come from the tree or live readings; ~20,000 and the cadence from
Chromium's docs.

## Where to go next

| Read | For |
|---|---|
| [The tree that configures the fleet](../report/2026-10-15-chromium-ci-cd-and-releases.md) | The fleet, the commit queue, tree closing and releases |
| [DEPS, gclient and what replaced goma](../report/2026-10-15-chromium-deps-and-goma.md) | Build sync: DEPS, `gclient sync`, toolchain pins, rollers, goma to Siso |
| [Blink, taken apart](../report/2026-10-15-chromium-blink.md) | The rendering engine and how tooling enforces its layers |
| [The Sea of Nodes, explained simply](../report/2026-10-15-sea-of-nodes.md) | V8 TurboFan's dependency-only IR, and why V8 left it |
| [One Graph, No Boxes](../report/2026-10-15-sea-of-nodes-paper.md) | The 1995 paper, read closely, and its recipe |

## How it connects

The [phases report](../report/2026-10-05-qq-phases.md) names each qq repo's
Chromium counterpart; the teardowns describe eight of them:

| qq repo (counterpart) | What the teardowns say |
|---|---|
| sync (gclient, DEPS) | DEPS is parsed, never run ([§03](../report/2026-10-15-chromium-deps-and-goma.md#03-a-grammar-that-is-parsed-never-run)); bots run hooks in their own step, separating infra from product failures ([CI §04](../report/2026-10-15-chromium-ci-cd-and-releases.md#04-materialising-a-checkout)) |
| toolchains (clang upload/promote flow) | The compiler is pinned in text, and GN asserts the pin ([§06](../report/2026-10-15-chromium-deps-and-goma.md#06-pinning-a-toolchain-in-text)) |
| infra-config (lucicfg) | A misconfigured fleet is "a red trybot, reviewed and reverted like any other bad CL" ([§02](../report/2026-10-15-chromium-ci-cd-and-releases.md#02-the-tree-configures-the-fleet)) |
| gate, test-pipelines (LUCI CV, LUCI Analysis) | "A 24-hour-old result stands for a tree that moved"; "a real failure can be exonerated" ([§12](../report/2026-10-15-chromium-ci-cd-and-releases.md#12-what-the-pipeline-optimises-for)) |
| gardener (LUCI Bisection) | Reverts on a daily budget; declines culprits written by an autoroller ([§09](../report/2026-10-15-chromium-ci-cd-and-releases.md#09-the-waterfall-and-its-humans)) |
| rollers (AutoRoll) | Rewrites the pinned string in place, without gclient ([§08](../report/2026-10-15-chromium-deps-and-goma.md#08-the-roller-fleet)) |
| release (lkgr finder) | A release branch is trunk's configuration with `is_main` false ([§10](../report/2026-10-15-chromium-ci-cd-and-releases.md#branch-day-is-a-config-event)); V8 releases from `lkgr`, a ref a builder moves every six minutes ([§11](../report/2026-10-15-chromium-ci-cd-and-releases.md#11-the-release-scripts)) |

The Blink teardown calls machine-checkable boundaries, stages and generated
surfaces "a transferable design decision"
([§12](../report/2026-10-15-chromium-blink.md#12-what-it-teaches)); the paper
reading maps the graph onto build systems and agent orchestration
([§13](../report/2026-10-15-sea-of-nodes-paper.md#13-the-general-technique)).

## Open questions

[#25](https://github.com/quirq-ai/research/issues/25) asks which of these
mechanisms qq should adopt, and their cost for agent-authored changes;
[#41](https://github.com/quirq-ai/research/issues/41),
[#42](https://github.com/quirq-ai/research/issues/42) and
[#43](https://github.com/quirq-ai/research/issues/43) take up exoneration,
reuse staleness and pinned runners. The CI teardown names its limit: the part
of Chromium that runs, such as the internal `chrome` project and GardenerAI, is
closed ([§12](../report/2026-10-15-chromium-ci-cd-and-releases.md#where-this-teardown-stops)).

## Sources

All by Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[chromium/ci-cd-and-releases](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/chromium/ci-cd-and-releases),
[chromium/deps-and-goma](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/chromium/deps-and-goma),
[chromium/blink](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/chromium/blink),
[chromium/sea-of-nodes](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/chromium/sea-of-nodes) and
[chromium/sea-of-nodes-paper](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/chromium/sea-of-nodes-paper).
