# Frontend architecture at a glance

suraj's frontend-architecture research in one page, from two posts.
*Next.js routing, taken apart* follows one route of a Next.js 16.4 app from
file to click, through `vercel/next.js` at v16.4.0 (released 6 October 2026),
with numbers from a lab run on 9 October 2026. *A Table With Two Columns*
(28 September 2026) designs a page registry, with a section on MagicPath
grounded in its CLI.

## The claim

> The file tree turns runtime questions into build-time facts. Which URLs
> exist, which code each needs, which layouts two URLs share and what a link
> will fetch are settled before the first request. That pays off in seven
> places. Each has a measured price, and some prices land on people who did
> not choose the feature.

From [Next.js routing, taken apart](../report/2026-10-15-nextjs-routing.md#11-why-it-is-efficient-and-what-it-costs), §11.

## In numbers

| | |
|---|---|
| **24** | prefetch requests for 12 visible links, 20,143 B on the wire; a click on a prefetched static link then makes 0 |
| **1.47–1.73×** | HTML against its decoded RSC payload: a hard load ships rendered output twice |
| **22–24 s** | of static generation at 401 routes on every build, while the cache cut compile from 25.2 s to 1.86 s |
| **7** | build workers on a 2-CPU container, because `os.cpus()` counts the host's 8; `experimental.cpus: 2` cut a cold 401-route build 21% |
| **0.93 ms** | added at p50 by a no-op `proxy.ts` to each request it matches, +39% on a static page |
| **85 µs** | for a dynamic-route hit among 1,000 dynamic routes |
| **≈490** | routes, above which the Pages Router ships more JS than the App Router (interpolated) |
| **4** | layers of a registry-driven page: schema, resolver, registry, renderer |
| **6** | ways to build the registry table; only the remote manifest adds a page type without shipping |
| **0** | registry primitives in MagicPath's 24-command CLI |

Rows 1 to 7 are lab numbers *\[measured here\]* from one shared 2-vCPU
container on localhost: "Carry the ratios, not the milliseconds." Rows 8 and
10 rest on sources the essay marks *\[documented\]*.

## Where to go next

| Read | For |
|---|---|
| [Next.js routing, taken apart](../report/2026-10-15-nextjs-routing.md) | The teardown, its 18 figures and every lab number |
| [Its §12 to §14](../report/2026-10-15-nextjs-routing.md#12-faster-cheaper-builds) | The practices that moved those numbers, and fifteen beliefs that fail at 16.4 |
| [A Table With Two Columns](../report/2026-10-15-page-registries.md) | The registry design: three page shapes, six ways to build the table, validation, versioning and failure modes |
| [Its §11 to §13](../report/2026-10-15-page-registries.md#11-doing-it-with-magicpath) | MagicPath as a block factory, its ledger, and what to build first |

## How it connects

The two posts meet at the route table. *A Table With Two Columns* keeps two
tables apart, shape to code and URL to document, and in Next.js puts the
second in one catch-all, `app/[[...slug]]/page.tsx`, fed by
`generateStaticParams` and invalidated by tag
([§08](../report/2026-10-15-page-registries.md#08-the-other-table-url-to-document)).
*Next.js routing, taken apart* shows how 16.4 sorts that catch-all
([§04](../report/2026-10-15-nextjs-routing.md#the-table)), runs
`generateStaticParams`
([§03](../report/2026-10-15-nextjs-routing.md#what-the-build-reads-without-running))
and turns `revalidatePath` into a tag
([§07](../report/2026-10-15-nextjs-routing.md#what-the-tree-lets-the-build-emit)).

The essay also counts "a row your agent wrote" among the documents a registry
renders ([§01](../report/2026-10-15-page-registries.md#01-the-shape-and-the-table)),
and finds MagicPath's CLI "built for agents"
([§12](../report/2026-10-15-page-registries.md#12-magicpath-what-you-gain-what-you-pay)).

## Open questions

Each report lists what it did not verify. The teardown
([provenance](../report/2026-10-15-nextjs-routing.md#e-the-lab-measured-here)):
whether a client component in a shared layout re-renders on sibling
navigation, inlining's request counts on a real network, PPR resume CPU, and
four more. The essay
([provenance](../report/2026-10-15-page-registries.md#14-sources)):
MagicPath's output quality, since no generation was run, and its pricing,
which is third-party and unverified.

## Sources

Both by Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:

- *Next.js routing, taken apart*, published 14 October 2026:
  [nextjs-routing](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/nextjs-routing)
  ([index.html](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/nextjs-routing/index.html)).
- *A Table With Two Columns*, published 28 September 2026:
  [page-registries](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/page-registries)
  ([index.html](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/page-registries/index.html)).
