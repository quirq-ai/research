# Next.js routing, taken apart

Next.js 16.4 turns an app/ folder tree into a sorted route table, one server entry per URL, prerendered segment files and per-segment prefetch hints, all before the first request. This teardown follows one route, app/sec0/a/[id]/page.tsx, from file to click through the code at v16.4.0, and prices each precomputation with numbers measured on a 2-vCPU machine. It ends with the practices that moved those numbers, and the beliefs the code contradicts.

By **Suraj Sharma**, XO Labs · Web Frameworks. First published 14 October 2026 as *Next.js routing, taken apart* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/nextjs-routing). Subject: `vercel/next.js@v16.4.0` (e273d5b2e869), released 6 October 2026 · Read from the source, the docs at the tag and the release posts; timings measured on this machine

Source: [`nextjs-routing/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/nextjs-routing/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

> **How to read the badges**
>
> *\[from the code\]* marks a fact read from `vercel/next.js` at tag v16.4.0 (commit `e273d5b2`), cited as a path and line range. Paths are relative to `packages/next/src/` unless they start with `crates/`. *\[from the docs\]* marks a fact from the `docs/` tree at the same tag, from nextjs.org, or from a dated release post or pull request. *\[measured here\]* marks a number produced by a named script in the lab built for this post. It ran on 9 October 2026 on one shared 2-vCPU Linux container, with next\@16.4.0 from npm, Node v24.21.0 and headless Chrome for Testing 151, over localhost, against synthetic apps of 21 to 1,001 routes. The ratios carry over to other machines; the absolute milliseconds do not. *\[reconstruction\]* marks a mechanism or judgement I have worked out from those sources rather than read in one place. Where the docs and the code disagree, the code at the tag wins, and the text says so.

## 01 · One rule, many precomputations

The App Router's grammar is one rule. Folders name URL segments, a closed set of file stems gives each segment its behaviour, and everything else in `app/` except metadata files is invisible to routing. Because the structure is declared in files, `next build` knows the whole tree before any request arrives. It enumerates the routes, compiles one entry per route, sorts a route table, prerenders the static parts, splits client code per segment and records per-segment prefetch hints. The server and the browser then read those artifacts instead of rediscovering structure. Every efficiency follows from that, and so does every cost.

Turbopack, the Rust bundler `next build` uses unless told otherwise (§03), classifies a file by the stem before its first dot, against a closed list of twelve: `page`, `layout`, `error`, `global-error`, `global-not-found`, `loading`, `template`, `forbidden`, `unauthorized`, `not-found`, `default` and `route` (`crates/next-core/src/app_structure.rs`:377-395) *\[from the code\]*. A segment, in this vocabulary, is one folder level of a route: static (`blog`), dynamic (`[slug]`), catch-all, group or slot. It is the unit of everything that follows. Layouts, loading states, error boundaries, client caching, prefetching and partial rendering are all per segment. Any other stem gives a segment nothing; metadata files such as `icon.png` are matched separately (§02). The docs add the other half: "a route is **not publicly accessible** until a `page.js` or `route.js` file is added to a route segment" (`docs/01-app/01-getting-started/02-project-structure.mdx`, § Colocation) *\[from the docs\]*.

The running example is the lab's `app/sec0/a/[id]/page.tsx`. Its `generateStaticParams` returns ids 1 to 5, and it sits under `app/layout.tsx` and `app/sec0/layout.tsx`, whose client component `SectionNav` renders ten `<Link>`s, in the 401-route Turbopack build `apps/scale-N400` (build ID `wFd3hpqcsr6vknDk6t3wj`). The second example is `/dyn`, a page that awaits `cookies()` and so renders on every request. Figure 1 follows the first from file to click, and ends on a navigation to the second.

The subject is next\@16.4.0, released 6 October 2026: tag v16.4.0, commit e273d5b2e869d0be06c0e86f788e1594f9dd40cf. Paths are relative to `packages/next/src/` unless they start with `crates/` or `docs/`. Numbers marked measured here come from a lab on one shared 2-vCPU container, where `nproc` reports 2 and `os.cpus()` reports 8 (cgroup `cpu.max` 200000 100000). Requests go over localhost, with no RTT, TLS, HTTP/2 or CDN; the pages are synthetic, with filler that gzips 8 to 10×; one `next start` process serves them; the browser is Chromium. Ratios carry to other machines. Milliseconds do not.

**Figure 1. One route, file to click: fifteen artifacts across build, server and browser**

![A wide diagram in three lanes that follows the lab route app/sec0/a/\[id\]/page.tsx from file to click in fifteen numbered boxes. Build lane: 01 the source files; 02 the discovery key /sec0/a/\[id\]/page; 03 the routes-manifest row whose named regex is ^/sec0/a/(?\<nxtPid\>\[^/\]+?)(?:/)?\$, third of 119 dynamic routes; 04 the LoaderTree literal, a nest of 4-tuples each ending in an empty array; 05 the prefetch hints 64, 96, 96, 96, 160; 06 the six files written per URL, 1.html 9,954 bytes, 1.rsc 5,866, 1.meta 1,036, \_tree 275, \_full 5,866 and the page segment 4,942; 07 the prerender-manifest rows, five complete static rows and a pattern row with fallback null that computes blocking. Server lane: 08 the boot tables built once by setupFsCheck; 09 the hard GET that misses check_fs, matches third, is served from the route-cache copy that the first hit promoted from the build seed, and returns x-nextjs-cache HIT with x-nextjs-prerender twice; 10 the document with two self.\_\_next_f pushes carrying the 5,866-byte payload again. Browser lane: 11 the viewport prefetch, a \_tree request with \_rsc nVRY9RLVAUtqyrUj then the page segment, 24 requests for 12 links; 12 a predicted router.prefetch that sends only the 4,942-byte page segment; 13 a warm soft navigation with 0 requests in 50 ms; 14 an unprefetched navigation that receives the whole 5,866-byte payload, 1,619 bytes on the wire; 15 a navigation to /dyn whose root comes back as a skipped node, 2,602 bytes against 4,433 without the state tree. Arrows are labelled with the functions that produce each next box or read a build file at runtime.](2026-10-15-nextjs-routing/fig-01-golden-trace.svg)

Bytes from one Turbopack build of the lab's 401-route app, captured by `e8-golden-trace.mjs` *\[measured here\]*; they are deterministic for that build. Only box 13 is timed, and its 50 ms includes Playwright polling. Function names are read at the tag *\[from the code\]*; boxes 05 to 07 follow `server/app-render/app-render.tsx`, which computes hints (:11121) before segment data (:11198), and `build/index.ts`:4619-4623, which writes both manifests after `exportApp` returns. Long literals are cut with …; segment files drop their `.segment.rsc` suffix. Green is a file `next build` wrote, purple in-memory state, blue bytes on the wire, grey the author's source.

### The price, stated first

Precomputation has a price. Four lab numbers give its shape, and the sections cited give the mechanism.

- **Rendered output ships twice on a hard load**, a full document request: as HTML, and as inline Flight data (the React Server Components wire format, the RSC payload) in `self.__next_f` pushes (box 10). In the lab's boundary app, moving `"use client"` from the top of a layout down to the leaves cut 38,489 B of JavaScript from every route, and made the RSC payload 5.6× larger (119,482 B against 21,174 B) and the HTML 2.3× larger (200,807 B against 87,754 B), all uncompressed *\[measured here\]* (`e2-boundary.mjs`). §06, §13.
- **Every visible link costs two requests**: a `/_tree` and a page segment that carries its layouts (box 11). A page with 12 visible links made 24 prefetch requests, 60,768 B decoded and 20,143 B on the wire *\[measured here\]* (`e3-nav.mjs`). §09.
- **The build cache does not skip prerendering.** At 401 routes, static generation took 22–24 s cold, warm and after a one-file edit, 58% of a 38.4 s warm build *\[measured here\]* (`build-bench.mjs`). §12.
- **A no-op `proxy.ts` adds 0.93 ms at p50 to each request it matches**. Proxy is 16.x's successor to middleware: user code that runs before a request is matched to a route (§02, §05). A static page went from 2.37 to 3.30 ms to first byte, +39% *\[measured here\]* (`e4-latency.mjs`). §05.

After the walk you should be able to open a `.next/` directory and name the function that wrote each file; predict what a visible link, a click, a `cookies()` call, a `"use client"` placement or a `proxy.ts` costs; and set `experimental.cpus`, the build cache, `experimental.prefetchInlining`, `cacheComponents` with `partialPrefetching`, and a Proxy `matcher` knowing what each did here.

The sections follow the boxes. §02 is box 01; §03 is box 02; §04 is boxes 03 to 07, the build's tables and files, among them the LoaderTree, the nested tuple each route compiles to. §05 is boxes 08 and 09, the request path in `next start`. §06 is boxes 10, 14 and 15, rendering and partial rendering. §07 is what Cache Components change in boxes 06, 07 and 15. §08 is boxes 12 and 13, the client router; §09 is boxes 05 and 11, prefetching. §10 is the client code the strip leaves out. Then the argument turns: §11 weighs what each precomputation saves against what it costs, §12 and §13 are the practices that moved those numbers, and §14 tests common beliefs against the strip and closes the account.

## 02 · What a folder means

Box 01 of the strip is the author's tree, and the build's first question is which of its files count. Discovery keeps four kinds of file; everything else in `app/` is invisible to it. Many file paths collapse onto one URL, groups (`(name)` folders) and slots (`@name` folders) vanish before the route table exists, and 16.4's strict route matching turns three structural mistakes into build errors. Figure 2 puts the grammar on one tree.

### What discovery keeps

In `next build`, `collectAppFiles` walks `app/` and keeps `page` and `route` files plus metadata files, the root `not-found`, `layout` and `default` (`build/route-discovery.ts`:101-131; `server/lib/find-page-file.ts`:100-106) *\[from the code\]*. `template`, `loading`, `error` and the access fallbacks are never discovered. The webpack loader looks them up per segment while it assembles one page's tree (`build/webpack/loaders/next-app-loader/index.ts`:73-92), so they decorate routes and cannot create one. Turbopack matches stems against §01's closed list of twelve.

Extensions come from `pageExtensions`, default `['tsx', 'ts', 'jsx', 'js']` (`server/config-shared.ts`:2308), for every convention *\[from the code\]*. The docs' table offers only `.js .jsx .tsx` for `page` (`02-project-structure.mdx` § Routing Files) *\[from the docs\]*. The code wins: `page.ts` works.

### Colocation and private folders

A folder is routable only when it holds a `page` or `route`, and "only the **content returned** by `page.js` or `route.js` is sent to the client" (§ Colocation) *\[from the docs\]*. A `card.tsx` beside a page needs no marker.

An underscore makes the exclusion structural. In `next build`, `recursiveReadDir` tests the `_` filter on each directory entry's name before handling it (`lib/recursive-readdir.ts`:81-86), so a private folder is never read *\[from the code\]*. `next dev` reads and watches it anyway, then drops paths containing `/_` (`server/lib/router-utils/setup-dev-bundler.ts`:402-417, 754-755). §12 measures what pruning saves. `%5F` spells a literal underscore; both bundlers decode it (`app_structure.rs`:29-33; `build/route-discovery.ts`:287-289). The Pages Router is the opposite: `collectPagesFiles` passes no `ignorePartFilter`, so every page-extension file under `pages/` is a route candidate (`build/route-discovery.ts`:136-143), as the figure's inset shows.

### From path to URL

Each discovered path is reduced by `normalizeAppPath`, in `shared/lib/router/utils/app-paths.ts`:23-52 (blank lines and one comment trimmed) *\[from the code\]*:

    export function normalizeAppPath(route: string) {
      return ensureLeadingSlash(
        route.split('/').reduce((pathname, segment, index, segments) => {
          if (!segment) {
            return pathname
          }
          // Groups are ignored.
          if (isGroupSegment(segment)) {
            return pathname
          }
          // Parallel segments are ignored.
          if (segment[0] === '@') {
            return pathname
          }
          // The last segment (if it's a leaf) should be ignored.
          if (
            (segment === 'page' || segment === 'route') &&
            index === segments.length - 1
          ) {
            return pathname
          }
          return `${pathname}/${segment}`
        }, '')
      )
    }

It deletes `(group)`, every `@slot` and a trailing `page` or `route`, and nothing else. `(shop)/@modal/cart/page` and `cart/page` both mean `/cart`. Groups and slots are gone before any route table is built, so no request ever pays to match them *\[reconstruction\]*. Interception markers survive this step. Metadata renaming happens elsewhere: `/robots` becomes `/robots.txt/route`, and a metadata file under a group or slot gets a base-36 djb2 hash suffix of at most six characters so two groups' images do not collide (`lib/metadata/get-metadata-route.ts`:16-52, 171-196) *\[from the code\]*.

`getSegmentParam` maps `[x]`, `[...x]` and `[[...x]]` to `dynamic`, `catchall` and `optional-catchall` (`shared/lib/router/utils/get-segment-param.tsx`:12-51). On the wire the 11 param types become short codes such as `d`, `c`, `oc` and `di(..)` (`get-short-dynamic-param-type.tsx`:6-21, in `server/app-render/`) *\[from the code\]*. The running example's `[id]` is `dynamic`, code `d`.

**Figure 2. One app/ tree, file by file: the URL each file serves, or why it serves none**

![An annotated project tree. Each row is a file, with a coloured pill naming the routing rule that applies and, to its right, the URL the file serves or the reason it serves none. Root files proxy.ts and instrumentation.ts sit beside app/. Under app/: the root layout, page and not-found; root-only metadata favicon.ico and robots.ts; a (marketing) group whose about page serves /about and whose opengraph-image.png gets a hash suffix; blog with an ignored card.tsx, a private \_lib folder never read by next build, and a \[slug\] dynamic segment with a page, a loading file that creates no route, and an icon prerendered once at /blog/-/icon.png; a catch-all, an optional catch-all, a %5Fdebug folder serving /\_debug, an API route handler; a dashboard with @team and @analytics slots in which @team/settings/page.tsx serves /dashboard/settings; a feed with an @modal slot holding a (..)photo/\[id\] interception page that serves /photo/:id only when the next-url header is /feed or below; the canonical photo/\[id\] page; and this post's sec0/a/\[id\] route serving /sec0/a/1 to /sec0/a/5. An inset shows a pages/ tree in which card.tsx and \_lib/data.ts are routes. A legend gives the colour families, and a box states that deleting dashboard/default.tsx or photo/\[id\]/page.tsx would fail strict route matching, naming the errors each deletion raises.](2026-10-15-nextjs-routing/fig-02-folder-tree.svg)

Annotations are read from the code cited in this section, plus `build/route-discovery.ts`:343-351 for `/_not-found` and `get-metadata-route.ts`:103-106 for the `-` placeholder *\[from the code\]*; the `register()` row is from `instrumentation.mdx` *\[from the docs\]*. The tree is a constructed example; nothing in it was built or measured. The red-bordered strict-matching box is worked out from `normalize-catchall-routes.ts` and `build/entries.ts`:436-526, not run *\[reconstruction\]*. Colour: purple deletes a segment from the URL, blue makes a param, orange rewrites or decodes, green is a non-page route, red never becomes an entry, grey has no URL of its own, white is a page.

### Slots and interception

An `@folder` is a named slot, passed as a prop to the parent layout and absent from the URL; `children` is an implicit slot (`parallel-routes.mdx` § Slots). Hiding a slot does not skip it: "The conditional decides what the user sees, not what runs" (§ Conditional Routes) *\[from the docs\]*. A layout that picks `admin` or `user` by role pays for both.

For a slot with no `default.js`, the docs say "a `404` is rendered" (`parallel-routes.mdx`), "an error is returned" (`default.mdx`), and "a build error" (`errors/slot-missing-default.mdx`) *\[from the docs\]*. All three happen. For a named slot, webpack throws `MissingDefaultParallelRouteError` unless the slot is under a catch-all or its segment has no child routes; there, a built-in default calls `notFound()` (`next-app-loader/index.ts`:754-813). Turbopack reports a missing default only with strict matching off (`app_structure.rs`:1918-1954, 1669-1678) *\[from the code\]*.

Interception markers count route segments, not folders: the intercepting side is normalized first, so `feed/@modal/(..)photo/[id]` climbs one level from `/feed` and intercepts `/photo/[id]` (`shared/lib/router/utils/interception-routes.ts`:166-192). Each interception path compiles to a `beforeFiles` rewrite that fires only when the `next-url` header, the page the user is on, matches the intercepting route or a descendant (`lib/generate-interception-routes-rewrites.ts`:9-60) *\[from the code\]*. A refresh sends no `next-url` and renders the canonical page.

### Strict route matching

16.4 requires every URL to build a complete tree. The switch is derived in `server/config.ts`:460-468 *\[from the code\]*:

      result.experimental.strictRouteMatching =
        !result.deprecated.looseRouteMatching

      // Pruning assumes that children only exists when it is backed by an
      // ordinary route branch. Restoring the legacy implicit children slot must
      // therefore also restore the legacy matcher behavior.
      if (!result.experimental.explicitParallelRouteChildren) {
        result.experimental.strictRouteMatching = false
      }

`explicitParallelRouteChildren` defaults to `true` (`server/config-shared.ts`:2485), so the check is on, and a user's own `experimental.strictRouteMatching` is overwritten. `build/entries.ts`:436-526 then throws `IncompatibleParallelRouteSlotsError` when a URL one slot matches has no page or default in a sibling, `MissingCanonicalInterceptionRoutesError` when an interception has no ordinary page to refresh into, and `UnmatchedAppPagesError` for a page in no complete route; two or more are joined into one `Error`. Catch-all matchers that can never fill every slot are pruned, and their URLs 404 (`normalize-catchall-routes.ts`:226-305) *\[from the code\]*. The opt-out, `deprecated.looseRouteMatching: true`, is documented nowhere under `docs/` or `errors/`; users meet it only in a build warning. Strict matching became the default in PR \#97397, merged 2026-09-21; the 16.4 release post does not mention it *\[from the docs\]*.

### Root conventions

`proxy.ts` and `instrumentation.ts` are found by a non-recursive listing of the parent of `pages/` if it exists, else of `app/` (`build/index.ts`:1486-1496), so with only `src/app` a `proxy.ts` beside `package.json` is missed. Proxy is not a renamed middleware: it always compiles for Node.js, while `middleware.ts` still targets edge unless it sets `nodejs` (`build/entries.ts`:339-352). With no `matcher` it runs on every request, `_next/static` included, because the default is `/:path*` (:603-607) *\[from the code\]*. §05 prices that.

The same discovery output becomes types: `.next/types/routes.d.ts` maps `[x]` to `string` and both catch-alls to `string[]`, the optional one with `?` (`server/lib/router-utils/typegen.ts`:80-135) *\[from the code\]*. One folder name is a URL segment, a layout prop and a type at once.

## 03 · From folders to entries

`next build` turns the folder tree into lists before it compiles anything: page keys, a validated path set, route types and a routes manifest, each but the validation in its own traced span. Then one entry per page goes to a compiler, and Turbopack reads the tree again. Validation misses one kind of slug conflict, which crashes `next start` instead. The prerender pool is sized from the host's CPUs, not the container's.

### Which compiler

With no flag, `next build` picks Turbopack and marks the choice as a default, `process.env.TURBOPACK = 'auto'` (`lib/bundler.ts`:99-103); `--webpack` opts out. A defaulted build that finds a `webpack` function and no `turbopack` key exits rather than ignore the config (`lib/turbopack-warning.ts`:146-166). The webpack loader's own comment calls Turbopack "the canonical implementation going forward" (`next-app-loader/index.ts`:1047-1054, under `build/webpack/loaders/`) *\[from the code\]*.

### The spans, in order

`build()` in `build/index.ts` is a chain of `traceChild` spans. Those that touch routes open in order: `discover-routes` (:1555), `generate-route-types` (:1650), `generate-routes-manifest` (:1786), the compile branch (:1889, whose own span, `run-turbopack` or `run-webpack`, opens in the bundler's module), `static-check` (:2349), `static-generation` (:3214) and, for Turbopack only, `write-route-bundle-stats` (:4839) *\[from the code\]*. Figure 3 adds what each one writes.

`clean` deletes `.next/` but keeps `cache`, `dev`, `diagnostics`, `lock` and `trace` (:1379-1388), so a second build can start warm (§12). The routes manifest is computed from discovery's page keys before compilation (:1785-1800), so its route list comes from the tree, not from compiler output *\[from the code\]*. And after JS `discoverRoutes` (:1554-1567), Turbopack's Rust side reads `app/` again through `get_directory_tree`, a `#[turbo_tasks::function]` that calls itself per subdirectory, one memoised task each (`crates/next-core/src/app_structure.rs`:331-343, 443-450) *\[from the code\]*. The repetition is inferred from both call sites, not traced *\[reconstruction\]*.

### What validation misses

Between discovery and the type step, without a span, `validateAppPaths(appPaths)` runs (:1635). It rejects syntax errors (`…` for `...`), semantic ones (a repeated slug) and ambiguity, found by rewriting every `[name]` to `[*]` and grouping (`build/validate-app-paths.ts`:16-139, 155-186, 211-278) *\[from the code\]*: `/blog/[id]` and `/blog/[slug]` collide, `/[category]/posts` and `/posts/[slug]` pass. The comment above the call says it duplicates the older `sorted-routes.ts` (:1631-1635).

It duplicates less than that. Whole paths hide two names at one level once the paths diverge: `/[*]/x` is not `/[*]/y`. The lab built `app/[a]/x` beside `app/[b]/y`. `next build` exited 0; `next start` printed "✓ Ready" and exited with code 1 after 509–843 ms, before serving a request (`e8-sortconflict.mjs`) *\[measured here\]*. The thrower is `getSortedRoutes`, a trie sorter marked `@deprecated` that `next start` still uses to order dynamic routes (`server/lib/router-utils/filesystem.ts`:134) *\[from the code\]*. Its check, in `shared/lib/router/utils/sorted-routes.ts`:121-134, with five comment lines trimmed:

    function handleSlug(previousSlug: string | null, nextSlug: string) {
      if (previousSlug !== null) {
        // Because currently multiple dynamic params on the same segment level are not supported
        if (previousSlug !== nextSlug) {
          throw new Error(
            `You cannot use different slug names for the same dynamic path ('${previousSlug}' !== '${nextSlug}').`
          )
        }
      }

Each trie node holds one `slugName`, so every dynamic folder under one parent must share a name *\[from the code\]*. A pipeline that gates on `next build` alone can ship an app that dies at boot *\[reconstruction\]*.

### One entry per page

Under webpack, `createEntrypoints` names each page's server entry `app/<key>`, here `app/sec0/a/[id]/page` (`build/entries.ts`:561-568), and gives App pages no client entry, to "let the server compiler inject them instead" (:629-639). So the `server` compile runs before `edge-server` and `client` (`build/webpack-build/index.ts`:14-18), and its `injectedClientEntries` become the client compile's entries (`impl.ts`:267-285, same directory) *\[from the code\]*.

Turbopack writes one server file per page, `server/app{original_name}.js` (`crates/next-api/src/app.rs`:2066-2083) *\[from the code\]*. In the lab's 401-route build that is `server/app/sec0/a/[id]/page.js`, beside a one-entry `app-paths-manifest.json` merged into a file of 405 keys (`build-bench.mjs` output) *\[measured here\]*. Each layout and page sits behind a lazy getter. Under webpack its `import` is `webpackMode: "eager"`, so the getter defers evaluation, not bundling (`next-app-loader/index.ts`:1316-1327) *\[from the code\]*. §04 reads that tree.

### What the build reads without running

Segment config is read from source. A regex, `PARSE_PATTERN`, skips files that mention none of twelve words such as `runtime` or `export const` (`build/analysis/get-page-static-info.ts`:50-51, 654-664). The rest are parsed by SWC through a 500-entry LRU keyed by the content's SHA-1 (`parse-module.ts`:6-15), and only an `export const` with a literal value counts (`extract-const-value.ts`:229-275) *\[from the code\]*.

`generateStaticParams` does run, top-down: one awaited call per parent param combination, inside a `for` loop (`build/static-paths/app.ts`:724-823) *\[from the code\]*. Calls multiply with the parents' fan-out and run in sequence. The running example's one call returns ids 1 to 5.

### The worker pool

Static checks and prerendering share a pool of `experimental.cpus` workers, by default `max(1, os.cpus().length - 1)`, with `CIRCLE_NODE_TOTAL` in place of the CPU count when set (`server/config-shared.ts`:2422-2426). The pool is capped at tasks + 1 (`build/index.ts`:979-1004), with at most 8 concurrent renders per worker and at least 25 pages per worker (:2476-2477 of the config file) *\[from the code\]*. `os.cpus()` counts the host. This container's 2-CPU quota sits on a host with 8, so the default is 8 − 1 = 7: "Generating static pages using 7 workers (756/756) in 21.7s" (`build-bench.mjs`) *\[measured here\]*. §12 prices the fix.

### Cost at a glance

Medians of three cold builds (two for webpack's quiet rerun), from `build-bench.mjs` *\[measured here\]*:

| Routes | Turbopack wall | webpack wall | Turbopack CPU-s | webpack CPU-s |
|----|----|----|----|----|
| 21 | 27.6 s | 52.2 s | 43.4 | 69.5 |
| 101 | 38.6 s | 69.3 s | 59.4 | 96.9 |
| 401 | 70.4 s (quiet) | 134.3 s (quiet) | 118.7 (117.8 quiet) | 189.8 (194.9 quiet) |

CPU-seconds survive a noisy box; wall time does not. The first N=400 Turbopack runs took 97.5 s under foreign load, the quiet rerun 70.4 s, at 118.7 and 117.8 CPU-s. webpack used 1.60–1.63× Turbopack's CPU at every size in the first runs, 1.65× in the quiet pair. From 101 to 401 routes Turbopack added (118.7 − 59.4) / 300 = 0.20 CPU-s per route, webpack 0.31–0.33 *\[measured here\]* (`build-bench.mjs`).

**Figure 3. next build lane by lane: the JS spans, one of two compilers, then the boot that can still fail**

![A swimlane of next build at v16.4.0. Top lane, the JS orchestrator in build/index.ts, shows nine boxes in source order with the line where each opens: clean at 1381, which wipes .next but keeps cache, dev, diagnostics, lock and trace; discover-routes at 1555, which reads app/ in JS; a red marker for validateAppPaths at 1635, which has no span; generate-route-types at 1650, writing .next/types; generate-routes-manifest at 1786, computed before compile and written at 3076; compile at 1889, the branch; TypeScript, serial after compile; static-check at 2349; static-generation at 3214, writing HTML, RSC and segment files and then the prerender manifest; and write-route-bundle-stats at 4839, Turbopack only. Orange measured labels give compile 25.2 s, TypeScript 13.8 s, static generation 21.7 s with 7 workers, and a whole-build wall of 70.4 s, for the 401-route app. Below, app/ on disk feeds both discover-routes and Turbopack's get_directory_tree, so the tree is read twice. A purple note says cache/ survives clean so the next build starts warm. A red note says validateAppPaths erases parameter names, rejecting /blog/\[id\] with /blog/\[slug\] but passing /\[a\]/x with /\[b\]/y. Inside compile, exactly one lane runs. Turbopack: get_directory_tree as one memoised task per directory, walk_tree emitting each LoaderTree as JS text, one server file per page such as server/app/sec0/a/\[id\]/page.js, and per-page app-paths manifests merged into 405 keys. Webpack: createEntrypoints with server entry app/sec0/a/\[id\]/page and no client entry for App pages, then server, edge-server and client compiles, with a dashed purple arc showing the server compile's injectedClientEntries feeding the client compile. Bottom lane, next start at boot: setupFsCheck sorts dynamic routes with the deprecated getSortedRoutes, and for /\[a\]/x plus /\[b\]/y the server prints Ready and exits with code 1 after 509 to 843 ms.](2026-10-15-nextjs-routing/fig-03-build-pipeline.svg)

Span names, order and opening lines are read from `build/index.ts` at v16.4.0, the lower lanes from the files named in each box *\[from the code\]*; "read twice" is inferred from two call sites *\[reconstruction\]*. Orange: medians of three cold QUIET Turbopack builds of the 401-route app, from the build log via `build-bench.mjs` *\[measured here\]*. Spans, not slices: compile, TypeScript and static generation sum to 60.7 of 70.4 s. One shared 2-vCPU container, localhost, synthetic pages: ratios carry over, seconds do not.

## 04 · The route table, the LoaderTree and the manifests

The build hands the server data structures, not a folder tree: a specificity-sorted table of anchored regexes, one LoaderTree literal per route, a prerender manifest that classifies every URL, six files per prerendered URL and a per-segment hint tree. This section opens each for `/sec0/a/[id]`.

### The table

`generateRoutesManifest` sorts every page key once with `sortPages`, then splits it into `dynamicRoutes` and `staticRoutes` (`build/generate-routes-manifest.ts`:69-95). A segment scores 0 if static, 1 for `[x]`, 2 for `[...x]`, 3 for `[[...x]]`. Paths compare left to right: at the first difference the lower score wins, a path that ends first wins, and equal scores fall to `localeCompare` (`shared/lib/router/utils/sortable-routes.ts`:20-58, 75-114) *\[from the code\]*. The older trie sorter is `@deprecated` (`sorted-routes.ts`:204-227) yet still orders `next start`'s matchers (`server/lib/router-utils/filesystem.ts`:118-135, 526). Sorting 1,000 routes with both sorters took 14–26 ms *\[measured here\]* (`bench.mts`).

Rows come from `pageToRoute` (`build/utils.ts`:1855-1869). A `[x]` segment becomes `/([^/]+?)`, every route gets an optional trailing slash and `^…$` anchors (`route-regex.ts`:120, 163-171, beside the sorter), and group names take the `nxtP` prefix (`lib/constants.ts`:6) *\[from the code\]*. The example's row in the lab build's `routes-manifest.json` *\[measured here\]*:

    { "page": "/sec0/a/[id]",
      "regex": "^/sec0/a/([^/]+?)(?:/)?$",
      "routeKeys": { "nxtPid": "nxtPid" },
      "namedRegex": "^/sec0/a/(?<nxtPid>[^/]+?)(?:/)?$" }

It is the 3rd of 119 dynamic rows, beside 285 static rows. The split is by URL shape, not render mode: `/dyn`, which reads `cookies()` per request, is a static row. §05 scans this list.

The `rsc` block fixes the wire contract (`generate-routes-manifest.ts`:121-136) *\[from the code\]*: the `.rsc` suffix, `.segments/` directories of `.segment.rsc` files, and this `Vary` value, plus `next-url` on interceptable paths (§05):

    rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch

### The LoaderTree

Each route compiles to one LoaderTree, the structure the renderer walks; `/sec0/a/1` to `/sec0/a/5` share one. At 16.4 it has four elements. `server/lib/app-dir-module.ts`:7-29, verbatim *\[from the code\]*:

    export type LoaderTree = [
      segment: string,
      parallelRoutes: { [parallelRouterKey: string]: LoaderTree },
      modules: AppDirModules,
      /**
       * At build time, for each dynamic segment, we compute the list of static
       * sibling segments that exist at the same URL path level. This is used by
       * the client router to determine if a prefetch can be reused.
       *
       * For example, given the following file structure:
       *   /app/(group1)/products/sale/page.tsx -> /products/sale
       *   /app/(group2)/products/[id]/page.tsx -> /products/[id]
       *
       * The [id] segment would have staticSiblings: ['sale']
       *
       * This accounts for route groups, which may place sibling routes in
       * different parts of the file system tree but at the same URL level.
       *
       * A value of `null` means the static siblings are unknown (e.g., in webpack
       * dev mode where routes are compiled on-demand).
       */
      staticSiblings: readonly string[] | null,
    ]

Figure 4 draws the literal Turbopack compiled for the example *\[measured here\]*. Five nodes nest through `children`: `""`, `sec0`, `a`, `[id]`, `__PAGE__`. Only the root and `sec0` carry a layout. Every module is a lazy getter, such as `instrumentModuleGetter(() => a.r(79741))` for the page. It defers evaluation, not loading: the server entry pulls in all 12 chunks first.

Every node ends in `[]`, and that is a claim. Turbopack's `walk_tree` writes it on every node, dev included: “An empty array means "known to have no siblings" which is distinct from not outputting the field (unknown)” (`crates/next-core/src/app_page_loader_tree.rs`:328-442). Only dynamic segments get a non-empty list (`app_structure.rs`:1818-1842, same directory), and `app/sec0/a/` has no other child. The webpack loader writes `null` in dev (`next-app-loader/index.ts`:701-711). The server forwards the list only under `experimental.optimisticRouting` (`server/app-render/app-render.tsx`:535-551), on by default in 16.4 (`server/config-shared.ts`:2411) *\[from the code\]*. §08 uses it.

Slots add tree levels, not URL levels: a named slot is a virtual `(__SLOT__)` segment, and a slot with nothing for the URL gets a synthesized `__DEFAULT__` leaf (`app_structure.rs`:1844-1848, 2043-2079, 2082-2138) *\[from the code\]*. The inset applies this to §02's `/dashboard/settings` *\[reconstruction\]*.

**Figure 4. The compiled LoaderTree of /sec0/a/\[id\] , and a tree with slots**

![Nested boxes showing the compiled LoaderTree for /sec0/a/\[id\]. A key row names the four tuple elements: segment, parallelRoutes (slots), modules and staticSiblings. Five nodes nest through their children slot: the root with an empty segment string, sec0, a, \[id\] and \_\_PAGE\_\_. The root's modules are its layout plus Next's built-in not-found, forbidden, unauthorized and global-error; sec0 has a layout; a and \[id\] hold only metadata; \_\_PAGE\_\_ has empty slots and a lazy page getter, instrumentModuleGetter of a.r(79741). Every node ends in an empty array. Notes explain that an empty array means known to have no static siblings, null means unknown in webpack dev, and the doc comment's example is \['sale'\]. An inset shows the /dashboard/settings tree from section 02: the dashboard node has three slots, children as a \_\_DEFAULT\_\_ leaf from dashboard/default.tsx, team as a (\_\_SLOT\_\_) level containing settings and then \_\_PAGE\_\_, and analytics as a \_\_DEFAULT\_\_ leaf from its default.tsx.](2026-10-15-nextjs-routing/fig-04-loader-tree.svg)

The main tree is the literal in the app-page template chunk (module 98110) of the lab's `apps/scale-N400` build, made by `build-bench.mjs`, reformatted *\[measured here\]*. The inset is worked out from the Rust tree builder *\[reconstruction\]*. The lab's `/dash` route, with an `@stats` slot, compiled both shapes: `(__SLOT__)` over a `__PAGE__` for `/dash`, a `__DEFAULT__` leaf for `/dash/settings` *\[measured here\]*. Nothing in either tree is decided per request.

### The manifests

`server/app-paths-manifest.json` maps 405 keys to server files, `/sec0/a/[id]/page` to `app/sec0/a/[id]/page.js`, merged from one Turbopack fragment per page (`shared/lib/turbopack/manifest-loader.ts`:330-347). `app-path-routes-manifest.json` maps the same keys to URLs, built from what the compiler emitted rather than what discovery found (`build/index.ts`:2286-2336) *\[from the code\]*.

`prerender-manifest.json`, version 4, classifies URLs: 754 rows and 118 patterns here. `/sec0/a/1` is `"complete"` and `"static"`, `initialRevalidateSeconds: false`. The pattern row covers ids outside `generateStaticParams`: `fallback: null`, classified `"empty"` and `"blocking"`, rendered on first request (`build/index.ts`:515-536, 4052-4058) *\[from the code\]*. `/dyn` is in neither map. The file is 647,564 B at 401 routes, about 859 B per prerendered row (647,564 / 754) *\[measured here\]* (`measure-dist.mjs`).

A grep of the tag finds no `app-build-manifest.json` *\[from the code\]*. Version 16 dropped the First Load JS column as "inaccurate in server-driven architectures using React Server Components" (`version-16.mdx`, § Performance Improvements) *\[from the docs\]*; `diagnostics/route-bundle-stats.json` carries it now (§10). `server/prefetch-hints.json` is §09's.

### Six files per URL

`exportAppPage` writes each id's `.rsc`, segment files, HTML and `.meta` record (`export/routes/app-page.ts`:181-254) *\[from the code\]*. For `/sec0/a/1`, `.segment.rsc` suffixes dropped *\[measured here\]* (`e8-golden-trace.mjs`):

| File | Bytes | Holds |
|----|----|----|
| `1.html` | 9,954 | hard-load document |
| `1.rsc` | 5,866 | full Flight payload |
| `1.meta` | 1,036 | replay headers, segment list, hints |
| `1.segments/_tree` | 275 | segment names and hints, no data |
| `1.segments/_full` | 5,866 | `1.rsc`, byte for byte |
| `1.segments/sec0/a/$d$id/__PAGE__` | 4,942 | page, layouts inlined |

Segment files are not a second render: `collectSegmentData` decodes the page's RSC buffer once, then writes `/_tree`, the `/_full` copy and one buffer per segment (`server/app-render/collect-segment-data.tsx`:157-175, 319-337) *\[from the code\]*. `1.meta` is what `next start` replays: `x-nextjs-stale-time: 300`, `x-nextjs-prerender: 1`, six implicit cache tags from `_N_T_/layout` to `_N_T_/sec0/a/1` (§07), and a route-cache key (§05).

`1.rsc` and `2.rsc` differ in 3 of 25 lines, so the root and `sec0` layout rows are stored once per id, and again inside each `__PAGE__` segment. At 401 routes the build wrote 756 HTML files (754 plus the Pages 404 and 500), 754 `.rsc` files and 2,268 segment files, none of them a layout's: every layout was inlined into its child (§09) *\[measured here\]* (`measure-dist.mjs`). Bytes are from one Turbopack build on the shared 2-vCPU container, deterministic for it.

## 05 · The request path in next start

§04's files are all the server needs. `next start` is one Node process. At boot it turns the manifests into Sets and a sorted regex list, and never reads `app/` again. Matching a URL costs microseconds. The costs sit elsewhere: the first request after boot, each prerendered path's first request, and Proxy.

### Boot

The router `require`s the render server (`server/lib/router-server.ts`:356-357) and calls its handler directly (:531-535), with no IPC. `setupFsCheck` reads seven manifests and nothing under `app/` (`server/lib/router-utils/filesystem.ts`:348-396). It lists `public/`, legacy `static/` and `.next/static/` into Sets (:309-346) and compiles regex matchers for the dynamic routes, ordered by `getSortedRoutes` (:102-135, 509-526). An App route gets two: one built from `app-paths-manifest.json` (:397-406, 466), one from `routes-manifest.json` (:513-524), with no de-duplication *\[from the code\]*. Page bodies still come from the file-system IncrementalCache, behind a 50 MB memory LRU by default (`server/config-shared.ts`:2304) *\[from the code\]*.

### Resolution

`resolveRoutes` walks one list, built once in production (:148-153). `server/lib/router-utils/resolve-routes.ts`:85-117, comments and blank lines trimmed *\[from the code\]*:

    const calculateRoutes = () => {
      return [
        { match: () => ({}), name: 'middleware_next_data' },
        ...(opts.minimalMode ? [] : fsChecker.headers),
        ...(opts.minimalMode ? [] : fsChecker.redirects),
        { match: () => ({}), name: 'middleware' },
        ...(opts.minimalMode ? [] : fsChecker.rewrites.beforeFiles),
        { match: () => ({}), name: 'before_files_end' },
        { match: () => ({}), name: 'check_fs' },
        ...(opts.minimalMode ? [] : fsChecker.rewrites.afterFiles),
        {
          check: true,
          match: () => ({}),
          name: 'after files check: true',
        },
        ...(opts.minimalMode ? [] : fsChecker.rewrites.fallback),
      ]
    }

`check_fs` is exact matching: it probes six Sets in a fixed order, behind an 8 MiB LRU that caches misses too (`filesystem.ts`:175-213, 757-764). The first hit wins, so in production a `public/` file shadows an app page *\[from the code\]*. `/sec0/a/1` misses all six, because `appFiles` holds patterns (:439-441).

Dynamic routes are tried only in `checkTrue`: the exact lookup again, then a `for…of` over the sorted matchers, first match wins (`resolve-routes.ts`:281-349) *\[from the code\]*. The example's pattern is the 3rd of 119 in the lab build's `routes-manifest.json` *\[measured here\]*. Each App pattern sits in the list twice, so it matches on the 5th of 238 regexes, and a miss tries all 238 *\[from the code\]*. Figure 5 follows it down the list.

The scan is linear, and cheap. `e6-match.mjs` rebuilt the loop around next/dist's own sorter and matchers. At 100 dynamic routes a hit cost 5.8 µs and a miss, which tries every regex, 8.0 µs; at 1,000, 85 and 168 µs. Hits tried 51.8, then 504.4 matchers: 9.7× the matchers, 14.6× the time. `Set.has` stayed under 0.1 µs *\[measured here\]*. The script compiles one regex per pattern; `next start` holds two per App pattern, so its scan runs up to twice as long. A miss at 1,000 App patterns would cost about 2 × 168 = 336 µs, 14% of a 2.37 ms static request (below) *\[reconstruction\]*.

**Figure 5. /sec0/a/1 down the phase list: six Sets miss, the 3rd pattern matches**

![Left: the ten entries of resolveRoutes in order, five blue sentinels and five grey config lists: middleware_next_data, headers, redirects, middleware (Proxy), beforeFiles rewrites, before_files_end, check_fs, afterFiles rewrites, after files check: true, and fallback rewrites. A thick arrow shows /sec0/a/1 walking rows one to nine: the Proxy matcher does not match, check_fs misses, and check: true matches the 3rd of 119 patterns. Right, top: check_fs expanded as an 8 MiB LRU over six Sets probed in order: dev virtual files, \_next/static, legacy static, public, appFiles, pageFiles; public beats app pages, and appFiles holds patterns, so the example misses. Right, middle: checkTrue as a left-to-right scan of 238 regexes, each of the 119 patterns listed twice: /gallery/(.)photo/\[id\] twice, no match; /gallery/photo/\[id\] twice, no match; /sec0/a/\[id\] matches on the 5th regex with id 1; 233 more not tried. Bottom: a bar chart of microseconds per lookup: Set.has under 0.1; 100 routes hit 5.8 and miss 8.0; 1,000 routes hit 85 and miss 168.](2026-10-15-nextjs-routing/fig-05-resolve-routes.svg)

Structure, and the doubled list, as cited above *\[from the code\]*. Outcomes and pattern order: the 401-route build, whose Proxy matches only `/mw/…` (`e8-golden-trace.mjs`). The inset times `e6-match.mjs`'s copy of the loop, one regex per pattern, on a shared 2-vCPU container; a rerun moved absolute times by up to 30%, so read the ratios *\[measured here\]*.

### Hand-off and the cache decision

The match is not repeated: `invokeRender` passes the route and params to `BaseServer` as request meta (`router-server.ts`:813-833) *\[from the code\]*. PR \#94157, merged 2026-08-15, deleted the server's own matcher stack because "The filesystem checker already owns the normalized route lookup path in production" *\[from the docs\]*.

`Vary` is the four router headers, plus `next-url` only where a path could be intercepted (`server/base-server.ts`:2359-2386). `_rsc` is the first 96 bits of SHA-256 over four request headers, not the URL (`cache-busting-search-param.ts`:24-77); by default a mismatch gets a 307 (`base-server.ts`:2446-2490) *\[from the code\]*. So all twelve `/_tree` prefetches from `/sec0/a/1` carried `nVRY9RLVAUtqyrUj` *\[measured here\]*.

Only a request for an SSG (statically generated) page that needs no dynamic response gets a cache key (`build/templates/app-page-runtime.ts`:677-698). Others get `null`, and `ResponseCache.get` just runs the renderer (`server/response-cache/index.ts`:246-253) *\[from the code\]*. Dynamic pages are neither cached nor coalesced: concurrent `/dyn` requests each render *\[reconstruction\]*.

### Seeds and the first request

New in 16.4, build output is a seed. The cache key is `/route-cache/<kind>/<sha256(sourceRoute)>/$<path>`, where `sourceRoute` is the App module name with its groups and slots (`server/lib/route-cache-key.ts`:14-18, 87-113). The first request for a path copies the build's `.rsc`, segments and `.meta` under it and writes `.html` last, "the publication marker" (`file-system-cache.ts`:477-606) *\[from the code\]*. That costs about 12 ms, once per path: medians of 15.7–17.2 ms against 3.95–4.24 ms for repeats *\[measured here\]* (`e8-seed-promotion.mjs`). The handler sets `x-nextjs-prerender: 1`, then appends the copy in `.meta`, so it arrives twice (`app-page-runtime.ts`:1995-2008, 2134-2155) *\[from the code\]*.

The first request after boot pays most. `experimental.preloadEntriesOnStart`, default `true` (`config-shared.ts`:2415), loads all 405 App entries in the background (`server/next-server.ts`:264-273, 331-375) *\[from the code\]*, on the thread the first request needs. That request took a median 1.24 s after a fresh start; 394 ms with preloading off; 146 ms after 4 s idle. 0.89–1.05 s of CPU ran under `unstable_preloadEntries` *\[measured here\]* (`e8-cold-prof.mjs`). Preloading paid off only for a server left idle first: a second script idled both configurations 4 s and measured medians of 103 ms with preloading against 205 ms without, about 100 ms saved *\[measured here\]* (`e8-preload-tradeoff.mjs`).

Warm time to first byte over localhost, 1,000 keep-alive requests per endpoint, 101-route build *\[measured here\]* (`e4-latency.mjs`):

| Endpoint                      | p50 ms | p95 ms |
|-------------------------------|--------|--------|
| static page                   | 2.37   | 3.67   |
| SSG param                     | 2.63   | 4.16   |
| route handler                 | 2.26   | 3.76   |
| `cookies()` page              | 5.55   | 9.84   |
| static, through a no-op Proxy | 3.30   | 5.35   |

### Proxy

Matchers are widened at build time to `/_next/data/`, `.json`, `.rsc` and `.segments/` forms (`build/analysis/get-page-static-info.ts`:486-534) *\[from the code\]*, and end-anchored: `'/about'` does not match `/about/team`, though the docs say it does (`proxy.mdx`, § Matcher) *\[from the docs\]*. The code wins. The runtime builds a fresh `RegExp` per try (`middleware-route-matcher.ts`:17-39), under 1 µs in three micro-benchmarks *\[measured here\]*.

The cost is elsewhere: +0.93 ms at p50 in the table, +39%; under the lab's CPU lock, +0.909 ms to first byte and 888 µs of CPU per matched request *\[measured here\]* (`e8-proxy-prof.mjs`, `e8-proxy-attrib.mjs`). Figure 6 follows the detour. A matched request re-enters the whole `handleRequest` with `middlewareInvoke` (`resolve-routes.ts`:589-613), and Proxy's result returns as an exception, `server/next-server.ts`:2006-2010 *\[from the code\]*:

    if ('response' in result) {
      if (isMiddlewareInvoke) {
        bubblingResult = true
        throw new BubbledError(true, result)
      }

`BubbledError` extends `Error` (`server/lib/trace/tracer.ts`:56-63); constructing one cost 69 µs, the largest extra self time of any function on the path *\[measured here\]* (`e8-proxy-attrib.mjs`). `resolveRoutes` catches it, decodes the `x-middleware-*` headers, and resolution resumes.

Excluded requests pay too. The App-only build's `.next/server/pages/` holds `404.html` and `500.html`, which enables Pages (`next-server.ts`:559-566), so every request that reaches `BaseServer` runs `handleNextDataRequest` (`base-server.ts`:2012-2024), which calls `getMiddleware()` before checking for a data URL (`base-server.ts`:740-748) *\[from the code\]*: 40–45 µs per request *\[measured here\]* (`e8-proxy-attrib.mjs`).

**Figure 6. Where a no-op Proxy's 0.9 ms goes: a re-entry and an exception**

![Left: a nine-step sequence across three columns, router layer, BaseServer and next-server, and the Proxy bundle. 1, the router tests the user matcher on the raw path, then the decoded path. 2, it re-enters BaseServer handleRequest with request meta middlewareInvoke. 3, handleNextDataRequest calls getMiddleware. 4, handleCatchallMiddlewareRequest re-checks a dot-star matcher. 5, the Proxy bundle's adapter builds NextRequest, runs proxy and NextResponse. 6, next-server throws new BubbledError carrying the result, 69 microseconds. 7, the router catches it and decodes the x-middleware headers. 8, normal resolution: beforeFiles, check_fs, check true, match. 9, invokeRender runs the normal pass to a cache hit. Steps are coloured by the CPU bucket they charge. Right: horizontal bars of median extra CPU per matched request in microseconds: Proxy bundle 437, Next plumbing 242 containing BubbledError 69 and require, path and fs 69, unattributed about 102, router layer 85, BaseServer re-entry 72, GC 25. Notes say the bucket medians sum to about 963, not the 888 total. Inset: the compiled matcher for '/about' and a truth table: /about, /about.rsc and /\_next/data/BUILD/about.json match; /about/team does not, though the docs say it does.](2026-10-15-nextjs-routing/fig-06-proxy-cost.svg)

Steps: `resolve-routes.ts`:566-631 and 668-808, `base-server.ts`:1657-1678, `next-server.ts`:2006-2010 *\[from the code\]*; for a Node Proxy, step 4 tests `'.*'`, not the user's matchers. Bars: the 401-route build's no-op `proxy.ts` under the CPU lock on a shared 2-vCPU container, each sample bucketed by its synchronous stack, so named buckets are lower bounds *\[measured here\]* (`e8-proxy-attrib.mjs`). Step colours follow its bucket rules as I read them *\[reconstruction\]*. Inset: `'/about'` compiled with the bundled `path-to-regexp` as the build does, then tested *\[measured here\]*.

## 06 · Rendering a segment tree

A route renders as a fixed stack of boundaries per segment, filled from the folder's files. An HTML request renders the whole tree and ships its output twice. A soft navigation, a client-side transition that fetches RSC data instead of a document, can start at the first segment that differs, but only for a dynamic target: there are three cases, not one.

### The render

For an HTML request, `getRSCPayload` builds the full tree from the root (`server/app-render/app-render.tsx`:2064-2222). `createComponentTree` takes one LoaderTree node at a time: it resolves the segment's `template`, `error` and `loading` modules, then loads the layout or page through its lazy getter (`create-component-tree.tsx`:191-260). Child slots are built with one `Promise.all` (:527-528), so siblings never wait for each other *\[from the code\]*.

### The stack

Each slot of a layout becomes one `LayoutRouter` client element, built by the segment that owns the slot with that segment's error component and template. Only the `children` slot also gets its not-found, forbidden and unauthorized elements (`create-component-tree.tsx`:532-546, 698-724). The client turns these into a fixed stack, outermost first: `TemplateContext.Provider` keyed by the child's state key, the template (a `Fragment` if none, :218-226), `ScrollHandler`, `ErrorBoundary`, `LoadingBoundary`, `HTTPAccessFallbackBoundary`, `RedirectBoundary`, then `InnerLayoutRouter` with the child (`client/components/layout-router.tsx`:666-729) *\[from the code\]*. Figure 7 draws it.

Since Layout X renders the `LayoutRouter`, X's boundaries sit below Layout X. A throw in Layout X escapes `X/error.js`, and `X/loading.js` cannot cover data Layout X awaits. `error.mdx` and `loading.mdx` both say their file "does **not** wrap the `layout.js`" of the same segment *\[from the docs\]*.

The server emits no `<Suspense>` for `loading.tsx`. It wraps the segment's output in `LoadingBoundaryProvider`, which only puts the loading element into context (`create-component-tree.tsx`:1300-1311); the client `LayoutRouter` wraps each child slot in `<Suspense fallback={loading}>` (`layout-router.tsx`:416-500). So loading lives on the parent and applies to all its slots, which the comment at :675-684 says "sort of smells like an implementation accident" *\[from the code\]*.

The Provider's key is the segment's state key. In the browser that is the router cache key, and a dynamic segment's key is `name|value|type`, so `/sec0/a/1` → `/sec0/a/2` turns `id|1|d` into `id|2|d` and remounts everything below. Search params are not in it, so `?q=` never remounts (`create-router-cache-key.ts`:3-11; `create-segment-key.browser.ts`:5; `layout-router.tsx`:558-567). The server's key leaves the value out, `name|type` (`create-segment-key.ts`:10-16) *\[from the code\]*.

**Figure 7. One segment's boundary stack, outermost first, with the child segment nested inside**

![Nested boxes for one segment X. Outermost is a dashed LoadingBoundaryProvider, which the server emits when X/loading.js exists and which only sets context. Inside it: Layout X, a server component; a LayoutRouter client element for the children slot; TemplateContext.Provider keyed by the state key, wrapping the template or a Fragment; ScrollHandler; ErrorBoundary fed by X/error.js; LoadingBoundary, a Suspense whose fallback is X/loading.js read from context; HTTPAccessFallbackBoundary fed by X/not-found.js, children slot only; RedirectBoundary; and InnerLayoutRouter, which holds an abbreviated copy of the same stack for child segment Y ending at Y/page.js. On the right, convention files feed their boundaries, and three notes say what X's boundaries cover: Layout Y, the page and everything below; not Layout X or X/template.js, which render above them; and that the Provider key for a dynamic child is name\|value\|type, so a new param value remounts while search params do not.](2026-10-15-nextjs-routing/fig-07-segment-stack.svg)

Order and props are read from `layout-router.tsx`:666-729 and `create-component-tree.tsx`:527-724 *\[from the code\]*; coverage matches `error.mdx` and `loading.mdx` *\[from the docs\]*. X and Y are placeholder folders with every convention file. Not drawn: the `<Activity>` per state key under Cache Components and the dev-only `SegmentStateProvider` (:731-753). Nothing here is measured.

### The payload, twice

An HTML render produces one Flight stream and uses it twice: `tee()` feeds the SSR `App` that Fizz, React's server HTML renderer, renders to HTML, and `consume()` is inlined into the same document as `self.__next_f.push(…)` scripts (`app-render.tsx`:4070-4083, 4207-4266) *\[from the code\]*. The hard GET of `/sec0/a/1` returned 9,954 B of HTML with exactly two pushes, the second holding all 5,866 B of `1.rsc`, byte-identical to the file on disk (`e8-golden-trace.mjs`). Across four E3 targets, HTML was 1.47–1.73× its decoded payload (`e3-nav.mjs`) *\[measured here\]*.

The payload is a tree of transport nodes `{s, h, d: {r, p, v}, c}`: segment, hint bitmask, data (rendered node, partial flag, params read) and children, a `Map` keyed by slot name so keyed access does not go megamorphic (`shared/lib/rsc-transport.ts`:122-146) *\[from the code\]*. The format is new in 16.4, from PR \#96439, merged 2026-08-07 *\[from the docs\]*.

### Partial rendering

A request for a dynamic target need not render from the root. `walkTreeWithFlightRouterState` walks the LoaderTree beside the client's `Next-Router-State-Tree`, a request header carrying the client's serialized state tree (§08), and decides per level, `server/app-render/walk-tree-with-flight-router-state.tsx`:143-154 *\[from the code\]*:

    const renderComponentsOnThisLevel =
      // No further router state available
      !flightRouterState ||
      // Route structure or path param changed
      didRouteOrPathParamChange(actualSegment, flightRouterState[0]) ||
      // Normal requests leave out the page's search params, so treat a missing
      // value as empty. HMR requests include them.
      (actualSegment === PAGE_SEGMENT_KEY &&
        getRenderedSearch(query) !==
          (flightRouterState[5] === undefined ? '' : flightRouterState[5])) ||
      // Explicit refresh
      flightRouterState[3] === 'refetch'

Above the first level that renders, nodes come back skipped, `{r: null, p: true, v: null}` (`rsc-transport.ts`:213-215). The layout is not rendered, but its module is still imported to compute prefetch hints (`create-transport-tree-from-loader-tree.ts`:72-80), and its `generateMetadata` still runs, because the head resolves metadata over the whole tree (`lib/metadata/resolve-metadata.ts`:85-86, 135-136) *\[from the code\]*.

### Three cases, not one

The docs say that between siblings Next.js "reuses the parent layout and only fetches the updated leaf page" (`prefetching.mdx` § Client cache) *\[from the docs\]*. That holds for one target type of three. Figure 8 draws all three on the lab build with Cache Components off; that flag, `cacheComponents`, changes the rendering model and is §07's subject.

**(a) Prefetched static target.** The client holds every segment, so the click sends nothing: `/sec0/a/1` → `/sec0/a/2` made zero requests and took 50 ms of wall time (`e8-golden-trace.mjs`; zero requests also for the prefetched static targets in `e3-nav.mjs`) *\[measured here\]*.

**(b) Unprefetched prerendered target.** For a non-dynamic RSC request to an SSG page, the handler deletes the Flight headers (`build/templates/app-page-runtime.ts`:521-532, 724-732). Without PPR (partial prerendering, §07) every RSC request is non-dynamic: `isDynamicRSCRequest` starts with `isRoutePPREnabled` *\[from the code\]*. The state tree is ignored and the cached `2.rsc` comes back whole: 5,866 B decoded, 1,619 B on the wire, every layout re-sent though not re-executed. Without a state tree the bytes were the same, 5,866 B (`e8-golden-trace.mjs`); for `/sec0/guide/g1`, 5,948 B both ways, both cache HITs (`e3b-replay.mjs`) *\[measured here\]*. The file-system cache reads a page as one entry, with a TODO for "separate cache entries for each segment" (`server/lib/incremental-cache/file-system-cache.ts`:291-330) *\[from the code\]*.

**(c) Dynamic target.** The server diffs. `/sec0/a/2` → `/dyn` returned 2,602 B (978 B wire) with the root skipped; without a state tree, 4,433 B. The skip saved 1,831 B, 41%. A dynamic sibling under the root, `sec0` and `guide` layouts fell from 5,894 B to 2,857 B, 52% (`e3b-replay.mjs`) *\[measured here\]*.

In all three the client keeps the shared `CacheNode`s, its per-segment render state (§08), because reuse is decided per segment on the client (`client/components/render-tree.ts`:513-522) *\[from the code\]*. The `<html>` and `sec0` `<section>` DOM nodes, tagged before the click, survived even case (b) *\[measured here\]*. That shows "not refetched and not remounted". "Not re-rendered" is not guaranteed (§08 quotes the TODO) and was not measured.

**Figure 8. Three soft navigations: what crosses the wire, what the server renders, what the client keeps**

![Three panels side by side. Panel a, a prefetched static target, /sec0/a/1 to /sec0/a/2: the click makes zero requests, the server is not contacted, the root, sec0 and a CacheNodes are reused and the \[id\] and page nodes are new from the client cache; html and section DOM nodes are kept; 0 bytes, 50 ms wall. Panel b, an unprefetched prerendered target, the same pair with prefetch aborted: one GET with rsc, state tree and next-url headers; the handler strips the Flight headers and serves the cached 2.rsc whole; every node is sent in full, yet the client reuses the root, sec0 and a nodes and keeps the html and section nodes; 5,866 bytes decoded, 1,619 on the wire, the same with or without a state tree. Panel c, a dynamic target, /sec0/a/2 to /dyn: walkTreeWithFlightRouterState finds the root unchanged and sends it as a skipped node with r null, then renders dyn and its page; the client reuses the root, adds dyn and the page, and removes the sec0 subtree and its section DOM node; 2,602 bytes against 4,433 without a state tree, a 41 percent saving.](2026-10-15-nextjs-routing/fig-08-soft-nav-cases.svg)

Bytes, request counts and DOM identity: `e8-golden-trace.mjs`, one browser session per mode, plus its Node replays without a state tree *\[measured here\]*. Strip rule `app-page-runtime.ts`:521-532, 724-732; skip rule `walk-tree-with-flight-router-state.tsx`:143-154 *\[from the code\]*. "Reused" means the `CacheNode` was kept, not that React skipped re-rendering it *\[reconstruction\]*. Only panel (c) matches "only the changed segment". The bytes are deterministic for the build; the 50 ms, on a shared 2-vCPU container, is not.

## 07 · Static shells and dynamic holes

§06 ran the lab build in the legacy model. Cache Components is the other one, and the two differ in what one request API costs. In the legacy model `cookies()` makes the whole route dynamic. Under Cache Components it makes one hole: a subtree whose data exists only per request. The build prerenders everything around it into a static shell, the HTML and RSC up to the nearest Suspense fallback, and the folder tree supplies the Suspense boundaries that make holes legal. Partial prerendering (PPR), a shell sent first with the holes streamed after it, then brings a dynamic page's first byte near a static page's, and pays in total time, bytes and CDN cacheability.

`cacheComponents` is `false` in the framework defaults (`server/config-shared.ts`:2345) *\[from the code\]*. `create-next-app` writes `cacheComponents: true` and `partialPrefetching: true` into new App Router projects: its defaults set `cacheComponents: true` (`packages/create-next-app/index.ts`:258) and the template writer adds both flags (`templates/index.ts`:155-171) *\[from the code\]*, and the 16.4 post says Cache Components "will become the default in Next.js 17" *\[from the docs\]*. The lab's `/dyn` awaits `cookies()` inside a `<Suspense>`, under both settings.

### One API, two costs

Request APIs dispatch on the store type. `server/request/cookies.ts`:75-90, with the Client Component branch (77-82) trimmed:

    case 'prerender':
      return makeHangingCookies(workStore, workUnitStore)
    case 'prerender-legacy':
      // We track dynamic access here so we don't need to wrap the cookies
      // in individual property access tracking.
      return throwToInterruptStaticGeneration(
        callingExpression,
        workStore,
        workUnitStore
      )

Without Cache Components the build runs in a `'prerender-legacy'` store, where `throwToInterruptStaticGeneration` sets `revalidate = 0` and throws `DynamicServerError`: the whole route goes dynamic (`server/app-render/dynamic-rendering.ts`:244-260). In a `'prerender'` store it returns a promise that never resolves; Next.js uses "promise resolution timing to determine which parts of a render can be included in a prerender" (`server/dynamic-rendering-utils.ts`:72-95) *\[from the code\]*.

Hanging promises are typed by data kind, each resolving at one rung of a stage ladder (`server/app-render/staged-rendering.ts`:4-42; `dynamic-rendering-utils.ts`:747-773) *\[from the code\]*. Cookies and headers resolve no earlier than `ShellRuntime` (20), the stage of a runtime shell: a per-session shell that a prefetch renders on request (§09). Known params resolve at `PrefetchStatic` (12), out of the App Shell, the per-route prefetch artifact every link to a route shares (§09). `searchParams` wait for `PrefetchRuntime` (22). `connection()` and an uncached `fetch()` never resolve in a prerender.

### The two-pass prerender

Pass 1 renders with a `CacheSignal`, lets every `"use cache"` read fill a per-page Resume Data Cache, and aborts after `cacheSignal.cacheReady()`. Pass 2 replays that cache with no signal and advances one stage per task, `ShellStatic` to `Static` (14). Anything still pending after the last task marks the result partial (`server/app-render/app-render.tsx`:9136-9148, 9684-9797) *\[from the code\]*. That is a hole. A cookie read is one: its promise never settles in a static pass, which ends at stage 14.

A hole is legal only under a Suspense frame, unless the page opts into a blocking shell with `instant = false` (`dynamic-rendering.ts`:1320-1328). The build tests the component stack against `/\n\s+at Suspense \(<anonymous>\)/`; with no match it fails with "Next.js encountered uncached or runtime data during prerendering" (`dynamic-rendering.ts`:545, 748-800; `blocking-route-messages.ts`:85-93) *\[from the code\]*. The folder tree supplies those frames: a folder's `loading.tsx` becomes a `<Suspense>` around each child slot of its layout (`client/components/layout-router.tsx`:479-494) *\[from the code\]*, so every such folder is a shell edge. Figure 9 draws both.

### Lifetimes decide placement

A cached value can be a hole too. `server/use-cache/constants.ts`:3-5:

    export const MIN_PRERENDERABLE_EXPIRE = 300 // 5 minutes
    export const MIN_PREFETCHABLE_STALE = 30 // 30 seconds
    export const MIN_SHELL_STALE = 300 // 5 minutes

`revalidate` 0 or `expire` under 300 s keeps an entry out of static prerenders. `stale` under 30 s keeps it out of every prerender; under 300 s, out of the App Shell, "which may be reused on the client for longer than the entry's stale time" (`use-cache-wrapper.ts`:2540-2630, 2691-2782). Lifetimes flow upward as a minimum, tags as a union (`use-cache-wrapper.ts`:986-1009), except through an enclosing cache with an explicit `cacheLife`, which keeps its own values (1273-1289). The collected `stale` reaches the client in `x-nextjs-stale-time` (`app-render.tsx`:3514-3517) or in-band, and the client floors it at 30 s (`client/components/segment-cache/cache.ts`:111-117) *\[from the code\]*.

### What the tree lets the build emit

The build knows every dynamic pattern, so it adds a "base route" shell for each, every param a placeholder, plus one per known-param prefix that keeps every root param (`build/static-paths/app.ts`:168-223, 1297-1370) *\[from the code\]*. In the lab's small app (N=20, three cold builds, `e7-build.mjs`), Cache Components took the HTML files from 35 to 41: `dyn.html` and five base-route shells such as `sec0/a/[id].html`. The route table went from ○17 ●13 ƒ4 to ○27 ◐8. Median build CPU was 34.52 against 33.70 CPU-s, inside the run-to-run spread *\[measured here\]*.

Invalidation follows the same tree. Every render carries one soft tag per folder level, plus the concrete path when no param is unknown (`server/lib/implicit-tags.ts`:26-57, 83-119), and `revalidatePath` is `revalidateTag` on one of them (`server/web/spec-extension/revalidate.ts`:110-136) *\[from the code\]*. The lab build's `sec0/a/1.meta` lists six, from `_N_T_/layout` to `_N_T_/sec0/a/1` *\[measured here\]*.

**Figure 9. One cookies() call in two models, the two-pass prerender, the PPR response, and where lifetimes place data**

![Four panels. A: the /dyn tree of root layout, page, Suspense and a component that awaits cookies(), drawn twice. In the legacy model every box is dynamic: cookies() throws DynamicServerError, revalidate becomes 0 and the whole route renders per request. Under Cache Components the call returns a hanging promise; only the subtree under the nearest Suspense is a hole and its fallback ships in the shell. B: pass 1 renders with a CacheSignal and fills a per-page Resume Data Cache; pass 2 replays it and advances one stage per task, ShellStatic 10, PrefetchStatic 12, NavigationStatic 13, Static 14; anything still pending is a hole, legal only with a Suspense frame above it, otherwise a build error. C: measured timeline of one request: PPR /dyn first byte 3.63 ms and last byte 15.35 ms at p50, the 2,298-byte shell arriving at 4.1 to 5.0 ms and the resumed part at 10.9 to 22.4 ms; the same page without Cache Components 6.45 to 7.92 ms; a static page 3.07 to 3.42 ms; the PPR response is private, no-store, with x-nextjs-postponed: 1. D: a schematic chart of stale against expire: stale under 30 s is out of every prerender, stale under 300 s is out of the App Shell, expire under 300 s or revalidate 0 is out of static prerenders; the seconds preset sits in the last region and every other preset in the shell.](2026-10-15-nextjs-routing/fig-09-shell-and-holes.svg)

The tree costs one hole instead of the route. A and B are read from `cookies.ts`:75-90, `dynamic-rendering.ts`:244-260 and 768-783, and `app-render.tsx`:9136-9148 and 9684-9797 *\[from the code\]*; `loading.tsx` as the same edge joins that test to `layout-router.tsx`:479-494 *\[reconstruction\]*. C is p50 first and last byte from `e7-latency.mjs` (900 pooled requests per row, CPU-locked) and chunk arrival from `e7-ppr-body.mjs` (five requests), on localhost in one shared 2-vCPU container *\[measured here\]*. D draws `constants.ts`:3-5 and the presets in `config-shared.ts`:2346-2381 as regions, not to scale.

### PPR on the wire

`next start` sends a postponed route as the cached shell plus a resumed render in one response, with `revalidate: 0` because its "dynamic parts are streamed to the client on the same request" (`build/templates/app-page-runtime.ts`:2377-2388) *\[from the code\]*. The lab saw:

    Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
    x-nextjs-postponed: 1

Over 900 pooled requests per endpoint (`e7-latency.mjs`, CPU-locked, on the N=20 app, so absolute times differ from §05's table), PPR `/dyn` reached its first byte at 3.63 ms p50, against 6.45 ms without Cache Components and 3.07 ms for a static page. Without Cache Components the `<Suspense>` bought no earlier byte: `cookies()` at the top of the page gave 6.44 ms. PPR pays at the end: 15.35 ms against 7.92 ms to the last byte, and 14,360 B decoded against 7,671 B, 1.9× on both *\[measured here\]*. In `e7-ppr-body.mjs` the first chunk is the 2,298-B shell, the size of `dyn.html`, at 4.1–5.0 ms; the resumed part follows at 10.9–22.4 ms with two `__next_f` flight streams, for a reason not traced *\[measured here\]*. No CDN that honours the header stores any of it.

### Per process

Without a configured handler, `ResponseCache` and `IncrementalCache` are per process, and the default `"use cache"` handler is one 50 MB LRU registered as both `default` and `remote`. In production it drops an entry once it is older than `revalidate` (`server/use-cache/handlers.ts`:62-114; `server/lib/cache-handlers/default.ts`:114-125) *\[from the code\]*. In the legacy model the minimum per-segment `revalidate` at render time reaches the prerender manifest, read across `create-component-tree.tsx`:347-357 and `build/index.ts`:3448-3471 but not confirmed with a build *\[reconstruction\]*. §09 follows the App Shell to the client; §13 prices adoption.

## 08 · The client router and the Segment Cache

On the other side of the wire, the browser keeps a serializable state tree, a render tree and the Segment Cache, a client cache of route trees and per-segment data. A navigation diffs the trees copy-on-write. Segment identity is structural: names and types, never values. That lets one cache entry serve many URLs. The client learns the route map from responses instead of downloading it.

### Two trees, outside React

The state tree is `FlightRouterState`, a positional tuple: segment, child slots, refresh state, refresh marker, prefetch-hints bitmask and, on pages, the rendered search (`shared/lib/app-router-types.ts`:143-183). It is written into `history.state` (`client/components/app-router.tsx`:128-153). Beside it sits a render tree of `CacheNode`s holding `rsc` and a static `prefetchRsc` to show first (`app-router-types.ts`:27-82). Client paths from here on are under `client/components/`. Both trees live outside React; a `useState` only mirrors them (`use-action-queue.ts`:12-14, 79-80). Router state reaches React through `use()` when it is a promise (`use-action-queue.ts`:106-141), and prefetching dispatches nothing: the Segment Cache "writes into a global mutable cache" (`prefetch.ts`:16-24) *\[from the code\]*.

### Identity is structural

A request key spells position, param names and param types. `[id]` travels as `$d$id`. A name outside `[a-zA-Z0-9\-_@]` becomes `!` plus base64url, so `(marketing)` is `!KG1hcmtldGluZyk` (`shared/lib/segment-cache/segment-value-encoding.ts`:13-35, 62-75). "Same segment?" compares request keys; values are compared separately (`segment-cache/cache.ts`:248-262; `segment-cache/vary-path.ts`:340-366) *\[from the code\]*. All five lab ids share `/sec0/a/$d$id/__PAGE__` (`e8-golden-trace.mjs`) *\[measured here\]*.

### The diff

`startPPRNavigation` builds the next render tree synchronously, betting that the server returns the tree it prefetched (`render-tree.ts`:206-296). Outside refreshes and same-URL navigations, a segment whose key and param values match takes this branch, `client/components/render-tree.ts`:513-522 *\[from the code\]*:

    } else {
      // This segment appears in both the old and new routes. Reuse the existing
      // data without triggering a request.
      // TODO: Consider adding a fast path where if this segment is unchanged and
      // all of its children are unchanged, we return the exact same RenderTree
      // object. Reusing the exact previous object gives React more of a chance to
      // bail out of rendering.
      newRenderTree = createRenderTree(newRouteTree, oldRenderTree.data)
      needsDynamicRequest = false
    }

The data is kept and the wrapper rebuilt. Not refetched and not remounted are guaranteed. Not re-rendered is not, as the TODO says. A changed path param yields a new `CacheNode`, reusing the old data only if it recorded reading none of the changed params (:419-487). New segments try the BFCache, the router's own cache of rendered segments for back and forward, then the Segment Cache, else take a deferred promise (:989-1177, 1238-1248). What is still missing goes into one request whose tree marks the top-most needing segment of each branch `'refetch'`; if nothing is missing, no request is sent (:880-914, 1349-1360). So `navigate()` "is not an async function" and returns synchronously when a prefetched route tree exists (`app-router-state.ts`:53-72) *\[from the code\]*. The bottom band of Figure 10 is `/sec0/a/1` → `/sec0/a/2`.

A root-layout change returns `null`: a full page load. The prefix is compared by segment name and param type, not value, so `/en` → `/fr` under `app/[lang]/layout.tsx` stays soft and `(group1)` → `(group2)` does not (`router-reducer/is-navigating-to-new-root-layout.ts`:4-69). A non-RSC or failed response, a build or deployment ID mismatch, or a server-sent MPA URL also reloads the document (`router-reducer/fetch-server-response.ts`:226-271) *\[from the code\]*.

### The Segment Cache

Two global maps, routes and segments (`segment-cache/cache.ts`:426-451), share one 50 MB LRU with the BFCache (`segment-cache/bfcache.ts`:64). Its TODO says the cap should be "customizable via the Next.js config, too" (`segment-cache/lru.ts`:11-14) *\[from the code\]*.

Route entries are keyed `{pathname, search, nextUrl}`. Unless the response varied on `Next-Url`, `nextUrl` is re-keyed to `Fallback`, a wildcard that matches any value, so a route that cannot be intercepted has one entry whatever the referrer (`segment-cache/cache-key.ts`:9-31; `cache.ts`:2050-2070). Segment entries are keyed by a vary path: request key, then search for pages only, then path params nearest first (`segment-cache/vary-path.ts`:85-99). Static prefetches put `Fallback` in the search slot (:212-283). With `experimental.varyParams` on, the default, params a segment reports not reading become `Fallback` (:411-439) *\[from the code\]*. The lab's `[id]` node reported reading none (`e8-golden-trace.mjs`) *\[measured here\]*, so one `[id]` entry serves every id *\[reconstruction\]*.

Stale time comes from the server, floored at 30 s; `staleTimes.static` (300 s) is only the fallback (`cache.ts`:111-117, 3872-3932; `server/config-shared.ts`:2467-2470) *\[from the code\]*. Documents carried `x-nextjs-stale-time: 300`; 0 of 1,775 completed tree and segment prefetch responses did (`e7-nav.mjs`). In the golden trace the stale time rides in the payload instead, an async iterable that yields 300 (`e8-golden-trace.mjs`) *\[measured here\]*.

**Figure 10. Two cache keys, and the render tree they feed on a sibling navigation**

![Three bands. Top, the route cache key: pathname /sec0/a/2, search, and nextUrl /sec0/a/1; when the response lands, nextUrl is re-keyed to Fallback unless the response varied on Next-Url, in which case the referrer stays in the key. Middle, four segment-cache vary paths, each a request key, then a search slot for pages only, then path params nearest first: row 1, /sec0/a/\$d\$id/\_\_PAGE\_\_ with search Fallback and id 2, a concrete page entry; row 2, /sec0/a/\$d\$id with no search slot and id re-keyed from 2 to Fallback because the segment reported reading no params; row 3, the route-group key /!KG1hcmtldGluZyk/about/\_\_PAGE\_\_ with no params; row 4, the App Shell path with search and id both Fallback. Bottom, the render tree before and after the soft navigation /sec0/a/1 to /sec0/a/2: the root layout, sec0 and a CacheNodes are reused and greyed, while \[id\] and \_\_PAGE\_\_ are new nodes; with every segment cached, no request is sent.](2026-10-15-nextjs-routing/fig-10-segment-cache-keys.svg)

Key formats, vary-path order and re-keying rules: `segment-value-encoding.ts`:13-35, `vary-path.ts`:85-99, 212-283, 411-463 and `cache.ts`:2050-2070 *\[from the code\]*. Keys in rows 1 and 3, the empty params report on `[id]` and the zero-request `router.push`: `e8-golden-trace.mjs` *\[measured here\]*. Whether the new `[id]` node took the old node's data or row 2's entry was not traced *\[reconstruction\]*. Inlining, not keys, decides what downloads (§09).

### Slots, interception, history

An unmatched slot arrives marked `__DEFAULT__`, and the client keeps its active segment unless a parent path param changed (`render-tree.ts`:591-611). Interception keys on `Next-Url`, computed from the changed part of the tree (`app-router-state.ts`:672-688). `router.refresh()` inside an intercepted tree resends the previous `Next-Url`, so the same interception matches again (`router-reducer/reducers/refresh-reducer.ts`:43-58); one e2e test covers the case, read but not run here. With Cache Components each slot level keeps up to 3 trees, inactive ones under `<Activity mode="hidden">`; otherwise 1 (`bfcache-state-manager.ts`:8-9; `layout-router.tsx`:743-753). Back and forward read the BFCache with staleness bypassed (`segment-cache/bfcache.ts`:156-172) *\[from the code\]*.

### Learning the map

Optimistic routing, on by default (`server/config-shared.ts`:2411), runs on a route-cache miss: it matches the URL against patterns learned from earlier trees and skips the `/_tree` request. Static siblings, the `[]` list from §04, mark where a pattern does not apply (`segment-cache/optimistic-routes.ts`:1-44). Interceptable patterns and closed params are refused (:760-784) *\[from the code\]*. Once the client held the `/_tree` for `/sec0/a/1`, `router.prefetch('/sec0/a/2')` sent only the 4,942-B page segment and no `/_tree` (`e8-golden-trace.mjs`) *\[measured here\]*.

The Pages Router ships its map up front (§10). The App Router's learned map costs code instead: `segment-cache/cache.ts` is 4,144 lines and `scheduler.ts` 2,845 *\[from the code\]*.

## 09 · What a visible link costs

A link in view costs what the build already decided: per-segment prefetch support, inlining hints, loading boundaries and, with Partial Prefetching (the `partialPrefetching` flag of §07), one App Shell per route. The client spends them through one queue. The trade is requests against bytes. On the lab's 12-link page the defaults made the fewest requests, at 16.5% above the cheapest wire total measured.

### One queue

Every prefetchable `<Link>` shares one `IntersectionObserver` with `rootMargin: '200px'` (`client/components/links.ts`:108-127). A `prefetch={false}` link is never observed, and hover ignores it (:180-209; `client/app-dir/link.tsx`:720-722). `true` maps to `FetchStrategy.Full`, every segment in one request; anything else to `FetchStrategy.PPR`, per-segment prefetching, a guess the first tree response corrects (`link.tsx`:381-383, 808-827) *\[from the code\]*.

The scheduler is `client/components/segment-cache/scheduler.ts`. Prefetches from one JS task are batched into one microtask pass (:365-372) and wait in one min-heap ordered by priority (Intent 2, Default 1, Background 0), then phase (RouteTree 2, Shell 1, Speculative 0), then newest first (`types.ts`:15-32; `scheduler.ts`:244-248, 2695-2716). The gate is :512-525, comments trimmed *\[from the code\]*:

    if (task.priority === PrefetchPriority.Intent) {
      // However, because we don't abort in-progress requests, it's still possible
      // we'll run out of bandwidth. When links are hovered in quick succession,
      // there could be multiple hover requests running simultaneously.
      return inProgressRequests < 12
    }
    return inProgressRequests < 4

The cap counts requests, not bytes, and a TODO admits it ignores an in-flight navigation (:505-508). A link that leaves the view is taken off the heap (:377-387), but a sent fetch runs to the end: none is given an abort signal (`segment-cache/cache.ts`:3663-3698) *\[from the code\]*. Figure 11 draws the queue and the `prefetch` matrix.

**Figure 11. One queue for every link, and the prefetch matrix**

![Top row, left to right: one IntersectionObserver with rootMargin 200px for every Link; a prefetch task scheduled at Default priority, topmost link last; a microtask batch, one queue pass per JS task; a min-heap ordered by priority, then phase, then newest; a bandwidth gate allowing fewer than 4 requests in flight, or fewer than 12 for the hovered link; and a fetch of the page URL with no abort signal. Middle row: three events that re-sift the heap, drawn as dashed purple arrows into it: hover or touchstart raises a task to Intent, one at a time; leaving the viewport or unmounting removes the task but does not abort a sent fetch; follow-up revalidation work is re-queued at Background. Bottom row: the three phases of a popped task: RouteTree fetches the tree and decides between per-segment PPR and LoadingBoundary from the x-nextjs-postponed header; Shell fetches one App Shell per route, only with partialPrefetching; Speculative fetches the per-link bundle, and under partialPrefetching only a Full task reaches it.](2026-10-15-nextjs-routing/fig-11-prefetch-scheduler-a.svg)

| prefetch | no CC · static | no CC, dynamic · no loading.tsx | no CC, dynamic · + loading.tsx | Cache · Components | CC + · partialPrefetching |
|----|----|----|----|----|----|
| `{false}` | none: never observed, hover ignored; 0 requests |  |  |  |  |
| default | PPR per segment: `/_tree` 110–282 B + one 3.9–5.5 KB bundle, decoded | LoadingBoundary: `/_tree` 178 B + head 548–550 B, wire | LoadingBoundary: `/_tree` 178 B + 750–751 B to the boundary, wire | PPR per segment, every link speculative; — | Shell only: 1 App Shell per route, 5,043 B decoded for 5 links; `cookies()` page: runtime shell, 1,205–1,211 B wire |
| `{true}` | Full: one request for all segments not kept; — |  |  | Full; — | Shell, then Speculative; — |

Queue, gate and phases: `links.ts`:108-127, 252-269; `scheduler.ts`:244-248, 365-372, 377-387, 512-525, 856-882, 2676-2716; `link.tsx`:381-383, 808-827 *\[from the code\]*. CC is Cache Components. Bytes: static column `e3-nav.mjs`, the rest `e7-nav.mjs` *\[measured here\]*. A dash: not measured; no lab link used `prefetch={true}`.

### One link, two GETs

By default each visible static link cost two GETs to its URL: a `/_tree` of 110–282 B, then one page segment of 3.9–5.5 KB with the layouts inlined, both decoded. The 12 links on `/sec0/guide/g0` cost 24 requests, 60,768 B decoded and 20,143 B on the wire, 8.7× the page's own 2,319-B HTML (`e3-nav.mjs`) *\[measured here\]*. Lab: one shared 2-vCPU container, localhost, synthetic pages, Chromium; localhost hides each request's round trip.

A segment prefetch never renders. The handler sets `x-nextjs-postponed: 2` and sends the stored segment or a 404 (`build/templates/app-page-runtime.ts`:2066-2121) *\[from the code\]*. Asked for the inlined `/sec0`, it sent an empty 404 with `s-maxage=31536000`, cacheable for a year (`e8-segment-probe.mjs`) *\[measured here\]*; the client never asks for it. These bytes are RSC only; chunks are §10's.

### Inlining against deduplication

The 16.0 post said "a page with 50 product links now downloads the shared layout once instead of 50 times" (nextjs.org/blog/next-16). 16.2 added the option and 16.3 made it a default size heuristic *\[from the docs\]*; at the tag `prefetchInlining` is `true` (`server/config-shared.ts`:2414). The build gzips each segment's would-be prefetch response (`server/app-render/collect-segment-data.tsx`:839-845). A parent is offered to its children only below `maxSize`, 2,048 B gzip (:621-624):

    const sizeToInline =
      currentGzipSize !== null && currentGzipSize < maxSize
        ? currentGzipSize
        : null

The first child that fits it under `maxBundleSize`, 10,240 B gzip, takes it (:792-800, a comment trimmed; defaults in `server/config.ts`:470-486) *\[from the code\]*:

    if (parentGzipSize !== null) {
      const canAcceptParent = !isStaticPrefetchDisabled || didInlineIntoChild
      if (canAcceptParent && inlinedBytes + parentGzipSize < maxBundleSize) {
        hints |= PrefetchHint.ParentInlinedIntoSelf
        inlinedBytes += parentGzipSize
      }
    }

The results are bits in `prefetch-hints.json`: 64 `InlinedIntoChild`, 32 `ParentInlinedIntoSelf`, 128 `HeadInlinedIntoSelf` (`shared/lib/app-router-types.ts`:228-236) *\[from the code\]*. At 401 routes the file was 168,796 B, every layout inlined (`e7-hints.mjs`) *\[measured here\]*.

So small layouts are not downloaded once: on the 12-link page the root layout rode in 12 of 12 page responses. Figure 12 compares four builds (`e7-nav.mjs`) *\[measured here\]*. Inlining off fetched each layout once and cut decoded bytes 30%, but took 53 requests, a `/_head` per link among them, and 3.9% more wire. A layout padded to 4.4 KB gzip failed the test, was fetched once, and gave the cheapest page, 17,235 B in 25 requests; forcing it inline cost 53,941 B to save one request. The docs name the trade: fewer requests "at the cost of duplicating some shared segment data across routes" (`prefetchInlining.mdx`:13) *\[from the docs\]*. The default sits 16.5% above the cheapest wire total (20,071 / 17,235) with the fewest requests, the right end once requests cost round trips *\[reconstruction\]*.

**Figure 12. Inlining against deduplication on one 12-link page**

![Left, the build-time hint chain for /sec0/guide/g1 in two builds. Defaults: root 64, sec0 96, guide 96, g1 96, page 160, every ancestor inlined into the page response. With sec0 padded to 4,366 bytes gzip: root 64, sec0 32, guide 64, g1 96, page 160, with a red cut between sec0 and guide because sec0 is not below 2,048 bytes gzip, so sec0 becomes its own response carrying the root. Right, prefetch traffic for the 12-link page: defaults 24 requests, 59,998 bytes decoded, 20,071 on the wire; inlining off 53 requests, 41,754 decoded, 20,860 wire; layout outlined 25 requests, 43,964 decoded, 17,235 wire, the lowest; maxSize 8,192 forcing the layout inline 24 requests, 102,179 decoded, 53,941 wire. Bottom, a grid of 12 links by three layouts per build: defaults carry the root layout in all 12 responses, sec0 in 10 and guide in 3; inlining off carries each layout in one response; the outlined build carries root in 3, sec0 in 1 and guide in 3.](2026-10-15-nextjs-routing/fig-12-inlining-tradeoff.svg)

Hint chains: v0 and v2 `prefetch-hints.json` via `e7-hints.mjs`; requests, bytes and carried layouts: `e7-nav.mjs` on the N=20 lab app (the e3 totals above are the N=100 build), three identical reps per build *\[measured here\]*. Thresholds: `collect-segment-data.tsx`:621-624, 792-800 *\[from the code\]*. Bodies only, on localhost: no headers or round trips, which flatters v1's 53 requests.

### One shell per route

With `cacheComponents` and `partialPrefetching`, a default link stops after the Shell phase (`scheduler.ts`:2676-2687), and the shell's vary path makes every non-root param `Fallback` (`segment-cache/vary-path.ts`:441-463), so one entry serves every link into a route *\[from the code\]*. Five hub links to `/sec0/a/[id]` made one shell request; the hub cost 15 requests and 9,016 B on the wire against 21 and 15,195 B by default, 41% less. The click to `/sec0/a/3` then needed one request, 1,698 B on the wire, that the default had not. The `cookies()` page `/dyn` got a per-session runtime shell (`next-router-prefetch: 3`, 1,205–1,211 B on the wire), and its click needed none (`e7-nav.mjs`) *\[measured here\]*, as `partialPrefetching.mdx`:55 describes *\[from the docs\]*.

### Without Cache Components

A `/_tree` without `x-nextjs-postponed: 2` means no per-segment support. The client then uses `LoadingBoundary` (`scheduler.ts`:856-882), and the server renders down to the first `loading.tsx` (`server/app-render/create-component-tree.tsx`:553-598) *\[from the code\]*. "Not prefetched" holds for segment data only: each `/dyn` link still cost a 178-B `/_tree` and a 548–550-B `metadata-only` request on the wire, both `no-store`. With `loading.tsx` the second became a 750–751-B boundary prefetch, and the click fell from 2,706 to 2,318 B decoded (`e7-nav.mjs`) *\[measured here\]*.

Intercepted routes miss segment prefetches for the same reason: their `/_tree` is a live render varied on `next-url` (`segment-cache/cache.ts`:1940-1963) *\[from the code\]*. They are not aborted. Chromium logged 50 `net::ERR_ABORTED` rows, all read to the end, with zero `cancel()` calls; 40 of 72 dynamic gzip responses without Cache Components drew one, 0 of 307 static (`e7-abort.mjs`). With Cache Components the route was prefetched through shared shells (`e7-nav.mjs`) *\[measured here\]*.

## 10 · What each route ships

Per-route splitting means per-route chunk lists, not files. First load is the union of a route's segment chunks, so a heavy dependency stays in the routes that import it; prefetch then spreads its download to every page that links there. The Pages Router ships a route map to every page instead, which stays cheaper below a few hundred routes.

### How a route gets its code

Under webpack, the server compile creates one client entry per user segment file, listing only the client modules reachable from it (`flight-client-entry-plugin.ts`:341-436, 893-948, in `build/webpack/plugins/`). Turbopack chains client chunk groups down the server-component walk, and each layout's group becomes the availability baseline for the segments after it (`app_client_references_chunks.rs`:258-294, in `crates/next-core/src/next_app/`). First load is the union of every segment's `entryJSFiles` plus `rootMainFiles` (`build/route-bundle-stats.ts`:155-175) *\[from the code\]*. For Turbopack App routes it equalled the HTML's script tags minus the `noModule` polyfill, to the byte (`e9-measure.mjs`) *\[measured here\]*.

Files follow chunker thresholds (for Turbopack, `minChunkSize` 50,000 B and `maxMergeChunkSize` 200,000 B; `turbopackChunking.mdx` § Size Thresholds) *\[from the docs\]*. With the lab's tiny pages, Turbopack emitted the same 10 client chunks, 591 KB, at 21, 101 and 401 routes, while webpack's grew from 47 to 503. The 422-B `SectionNav` chunk is all that separates `/sec0/a/[id]` (464,045 B) from `/dyn` (463,623 B) (`measure-dist.mjs`) *\[measured here\]*.

### One heavy dependency, six placements

The lab then generated a `node_modules` package, imported by a client component `HeavyWidget`, into a 31-route app with two sections and 53 prerendered pages. Minified, it is a 112,993-B chunk, 55,806 B gzipped; synthetic, it gzips only 2.0× (`e9-gen-split.mjs`, `e9-measure.mjs`). Figure 13 maps six placements, built under both bundlers, onto the 53 pages (`e9-measure.mjs`) *\[measured here\]*:

- Installed, never imported (v0): the baseline, with the same first-load bytes as the plain lab app, from 10 Turbopack chunk files.
- One leaf page imports it: that page only. `/sec0/p1` grew by exactly the chunk, 464,045 → 577,038 B under Turbopack.
- The `sec0` layout imports it: all 19 `sec0` pages, nowhere else.
- Two leaves in different sections: one shared file.
- `next/dynamic` called from the Server Component page: not split, and 3,260 B more than a plain import under Turbopack; the docs call splitting there "currently **not** supported" (`docs/01-app/02-guides/lazy-loading.mdx`:60) *\[from the docs\]*.
- `next/dynamic` in a client component, rendered on click: in no first load; the toggle and lazy wrapper cost the host page 5,051 B under Turbopack.

### Prefetch carries code

A prefetched page segment names its client chunks. `/sec0/p1`'s carries this import row *\[measured here\]*:

    10:"/_next/static/chunks/2id7man46-w8-.js"
    11:I[88762,["$2","$9","$10"],"HeavyWidget"]

React's vendored Flight client resolves every import row with `preloadModule` (line 1447), prefetch or not. Lines 86-95 of `react-server-dom-turbopack-client.browser.production.js`, in `compiled/react-server-dom-turbopack/cjs/` *\[from the code\]*:

    function preloadModule(metadata) {
      for (var chunks = metadata[1], promises = [], i = 0; i < chunks.length; i++) {
        var thenable = __turbopack_load_by_url__(chunks[i]);
        loadedChunks.has(thenable) || promises.push(thenable);
        if (!instrumentedChunks.has(thenable)) {
          var resolve = loadedChunks.add.bind(loadedChunks, thenable);
          thenable.then(resolve, ignoreReject);
          instrumentedChunks.add(thenable);
        }
      }

So under Turbopack `/sec0/p0`, whose `SectionNav` links to `/sec0/p1`, fetched the 55,806-B chunk before any click, and the click made no requests. With prefetch requests aborted, the click paid a waterfall instead: 1,604 B of RSC, then the chunk it named. With the import in the layout, `/sec1/p0` downloaded it too: its header links to `/sec0/p0`, whose prefetched segment inlines the `sec0` layout's script reference. The plain N=100 app did the same with a 302-B `Counter` chunk (`e9-nav.mjs`) *\[measured here\]*. The linking page pays so that the click costs no request *\[reconstruction\]*.

**Figure 13. One 113 KB dependency, six placements: who ships it, who downloads it**

![A heatmap and two timelines. The heatmap has twelve rows, six placements of one 113 KB client dependency times two bundlers, and 53 columns, the prerendered pages grouped into 15 pages outside the sections, 19 sec0 pages and 19 sec1 pages. Solid cells mark pages whose first-load JS contains the dependency: none for v0 and v3; only /sec0/p1 for v1 and v4; all 19 sec0 pages for v2; /sec0/p1 and /sec1/p1 for v5; identical for Turbopack and webpack. Dark hatched cells mark measured prefetch downloads: /sec0/p0 for v1, v4 and v5, and /sec1/p0 for v2 and v5. Pale hatched cells mark pages that, by the same links, would prefetch it: the other sec0 pages for v1 and v4, every non-error page outside sec0 for v2, and the other pages of both sections for v5. In v3 the target page fetches it only when the toggle is clicked. Below, two timelines for a click from /sec0/p0 to /sec0/p1 in v1 under Turbopack. With prefetch on, the page load fetches the route tree and page segment, whose import row makes preloadModule download the 55,806-byte chunk, and the click costs 0 requests. With prefetch blocked, the load costs 9 requests and 141,148 bytes, and the click fetches 1,604 bytes of RSC and then the 55,806-byte chunk.](2026-10-15-nextjs-routing/fig-13-what-ships.svg)

Solid cells: built HTML, 53 pages × 12 builds (`e9-measure.mjs`). Dark hatching: Chromium sessions on the two linking pages the lab loaded, `/sec0/p0` and `/sec1/p0`. Timelines: the v1 Turbopack sessions (`e9-nav.mjs`, one rep each) *\[measured here\]*. Pale hatching extends that along the generator's links; at the lab's 1280×4000 viewport nearly every link is visible *\[reconstruction\]*; error pages are left unmarked. Localhost, shared 2-vCPU container: bytes are exact; no timing is claimed.

### The route map the App Router does not ship

The Pages Router resolves routes in the browser, so every Pages page loads `_buildManifest.js` and `_ssgManifest.js` as `defer` scripts (`build-manifest-plugin.ts`:203-214; `pages/_document.tsx`:163-199). Under Turbopack the first holds `sortedPages`, built from Pages entries only, each page's chunks and per-page bootstrap params; when collecting those params the writer skips App entries "to keep `_buildManifest.js` (loaded on every page) small" (`shared/lib/turbopack/manifest-loader.ts`:558-566, 592-627) *\[from the code\]*.

On the lab's `pages/` twin it grew from 18,590 B (3,988 gzip) at 101 routes to 183,519 B (34,623) at 1,001: (183,519 − 18,590) / 900 ≈ 183 B per route, 54% of it bootstrap params. The App app's 488-B file was loaded by 0 pages. Pages first load for `/sec0/a/1` rose from 389,116 to 563,131 B, the route map from 5.1% to 34.4% of it; App stayed at 464,039–464,709 B. Interpolated, Pages costs more above roughly 490 routes raw, 600 gzip (`e9-measure.mjs`) *\[measured here\]*. `next build`'s route stats leave the map out for Pages (`build/route-bundle-stats.ts`:102-129) *\[from the code\]*: 369,400 B reported for `/sec0/p0` at 101 routes, where the HTML loaded 389,296 B *\[measured here\]*.

On a miss in `sortedPages`, the client's `resolveDynamicRoute` compiles a fresh regex per dynamic page until one matches, once per prefetched link (`shared/lib/router/router.ts`:204-221, 2571; `utils/route-regex.ts`:168-171) *\[from the code\]*. For a URL in the last section that cost 128 µs at 28 dynamic pages and 1,781 µs at 298 (`e9-resolve.mjs`), against 5.8 and 85 µs for the server's precompiled scan at 100 and 1,000 (`e6-match.mjs`, §05) *\[measured here\]*.

Pages wins at build time: the twin used 0.58–0.65× the App app's CPU-seconds at 101 and 401 routes (`build-bench.mjs`), and the cross-router Bloom filters cost only the Pages pages of a mixed app, +3,505 B raw (`e9-measure.mjs`) *\[measured here\]*. The Layouts RFC of 23 May 2022 named the problem: client-side routing "scales poorly when the number of potential routes is large because the client has to download a route map" (nextjs.org/blog/layouts-rfc § Server-Centric Routing) *\[from the docs\]*. Figure 14 prices it.

**Figure 14. The Pages route map at scale; the App Router ships none**

![Three panels. Top left, a line chart of the Pages Router \_buildManifest.js against routes in the app: raw 18,590, 73,527 and 183,519 bytes at 101, 401 and 1,001 routes; gzip 3,988, 14,424 and 34,623 bytes; the App Router app's file is a flat 488 bytes that no page loads. Top right, first-load JS of /sec0/a/1: Pages rises from 389,116 to 447,069 to 563,131 bytes, the route map being 5.1, 17.4 and 34.4 percent of it, while App stays at 464,039 to 464,709 bytes; a shaded band between about 490 and 600 routes marks the interpolated raw and gzip crossovers. Middle, a stacked bar of the 183,519-byte manifest at 1,001 routes: bootstrap params 99,833 bytes, 54.4 percent; page to chunk lists 50,699, 27.6 percent; sortedPages 15,684, 8.5 percent; the rest 17,303, 9.4 percent, nearly all indentation. Bottom, horizontal bars of microseconds per route lookup: the server scan costs 5.8 at 100 dynamic routes and 85 at 1,000; the Pages client costs 128 at 28 dynamic pages, 616 at 118, 1,781 at 298 and 5,148 at 1,198.](2026-10-15-nextjs-routing/fig-14-route-map-scale.svg)

Bytes: built files and HTML, Turbopack with `experimental.cpus: 2` (`e9-measure.mjs`) *\[measured here\]*; the crossover band is interpolated. The manifest's parts follow its writer, `manifest-loader.ts`:592-627 *\[from the code\]*. Client resolution: medians of 7 × 2,000 lookups in Node 24, not a phone (`e9-resolve.mjs`). The server's hits tried 51.8 and 504.4 regexes on average, 0.11–0.17 µs each, against the client's 4.3–6.0 µs per dynamic page (`e6-match.mjs`) *\[measured here\]*. Red is Pages, blue App, green the server. With real page code, the crossover moves.

## 11 · Why it is efficient, and what it costs

The file tree turns runtime questions into build-time facts. Which URLs exist, which code each needs, which layouts two URLs share and what a link will fetch are settled before the first request. That pays off in seven places. Each has a measured price, and some prices land on people who did not choose the feature.

- **0** · requests for a click on a prefetched static link
- **85 µs** · for a dynamic-route hit among 1,000 dynamic routes
- **22–24 s** · of static generation at 401 routes, on every build
- **0.9 ms** · of CPU a no-op Proxy adds per matched request

The first two tiles are what the precomputation buys, the last two what it charges *\[measured here\]* (`e3-nav.mjs`, `e6-match.mjs`, `build-bench.mjs`, `e8-proxy-attrib.mjs`). Figure 15 pairs every saving with its price.

### Seven precomputations

All seven follow one pattern. A question a framework would otherwise answer per request or per navigation (does this URL exist, what code does it need, what does the client already hold) has an answer fixed by the folder tree. So the build answers it once and writes the answer into a file that the server or the browser reads by lookup *\[reconstruction\]*.

1.  **Discovery happens once.** `next build` walks `app/` and skips a `_` folder before reading it (`lib/recursive-readdir.ts`:81-86). `next start` reads seven manifests at boot and nothing under `app/` (`server/lib/router-utils/filesystem.ts`:348-396) *\[from the code\]*. Pruning made a walk of 1,001 route files beside 10,000 helper files 2.5–5× faster *\[measured here\]*. §02, §03, §05.
2.  **Routing is a lookup.** The build sorts every route by specificity, static before `[x]` before `[...x]` before `[[...x]]`, and writes an anchored regex for each dynamic one (`sortable-routes.ts`:20-58; `route-regex.ts`:120, 163-171); `next start` compiles and orders its matchers once, at boot (§04). At request time a static URL costs a few `Set.has` probes behind an LRU. A dynamic URL costs a first-match scan that needs no tie-breaking, because the sort already put the specific pattern first (`filesystem.ts`:757-764; `resolve-routes.ts`:281-349) *\[from the code\]*. Static lookups took under 0.1 µs. A dynamic hit took 5.8 µs at 100 routes and 85 µs at 1,000, 3.6% of a 2.37 ms static request *\[measured here\]*. The renderer receives the match as request meta and does not repeat it. §04, §05.
3.  **Rendering starts below what the client holds.** Every route compiles to a LoaderTree of fixed shape. The client can therefore name what it holds, segment by segment, in `Next-Router-State-Tree`, and `walkTreeWithFlightRouterState` sends a skipped node for each level that matches (`walk-tree-with-flight-router-state.tsx`:143-154) *\[from the code\]*. A dynamic navigation came back 41% smaller with only the root layout shared, and 52% smaller with three layouts shared. For every target type the client kept the shared layouts' `CacheNode`s and DOM nodes *\[measured here\]*. §06, §08.
4.  **Each route ships its own segments' client code.** The server compile follows each segment file's imports and stops at every `"use client"` module, which becomes a client entry for that segment (`flight-client-entry-plugin.ts`:814-825 under webpack; Turbopack chains the same groups, `app_client_references_chunks.rs`:258-294). A route's first load is the union of its segments' chunks plus the shared runtime (`build/route-bundle-stats.ts`:155-175) *\[from the code\]*. A 113 KB dependency imported by one leaf page was in 1 of 53 first loads. Imported by a section layout, it was in that section's 19 *\[measured here\]*. §10.
5.  **Prefetches are file reads, and dynamic data is a hole.** For each prerendered URL the build re-encodes the page's RSC buffer into per-segment files, without a second render. It also records, per segment, whether the segment rides inside its child's response, in `prefetch-hints.json` (`collect-segment-data.tsx`:157-175; `build/index.ts`:4620-4623). A segment prefetch is then answered from that buffer or with a 404. The handler's comment says such requests "should never reach the application layer" (`app-page-runtime.ts`:2066-2121) *\[from the code\]*. A click on a prefetched static link made 0 requests *\[measured here\]*. With Cache Components the build also emits a shell for every dynamic pattern (`build/static-paths/app.ts`:1297-1370), and each `loading.tsx` is a Suspense edge where a hole can stop (`layout-router.tsx`:479-494) *\[from the code\]*. So `cookies()` costs one hole instead of the route: first byte at 3.63 ms against 6.45 ms *\[measured here\]*. §04, §07, §09.
6.  **The client needs no route map.** It learns route shapes from `/_tree` responses. Optimistic routing then predicts an unseen URL's tree from a learned pattern, and the build's `staticSiblings` mark where a pattern does not apply (`segment-cache/optimistic-routes.ts`:1-44) *\[from the code\]*. With `/sec0/a/1`'s tree known, prefetching `/sec0/a/2` sent one 4,942-B request and no `/_tree`. From 101 to 1,001 routes App first-load JS moved by under 0.15%, while the Pages twin, which ships its route map to every page, grew 45% *\[measured here\]*. §08, §10.
7.  **Invalidation follows the folders.** Every render is tagged once per folder level. `/sec0/a/1` carries `_N_T_/layout`, `_N_T_/sec0/layout` and four more, down to `_N_T_/sec0/a/1` *\[measured here\]*. `revalidatePath('/sec0', 'layout')` becomes a revalidation of the one tag `_N_T_/sec0/layout` (`server/lib/implicit-tags.ts`:26-57; `server/web/spec-extension/revalidate.ts`:110-136) *\[from the code\]*. One call therefore reaches every page under `app/sec0/` without a list of URLs. Not timed. §07.

### The prices

The savings arrive per request and per navigation. The prices arrive per build, per hard load and per visible link *\[reconstruction\]*. Static generation took 21.7 to 23.5 s at 401 routes cold, warm or after a one-file edit, 58% of a 38.4 s warm build, while compile fell from 25.2 s to 1.86 s (§12). Twelve visible links cost 24 prefetches, 20,143 B on the wire, 8.7× the page's own 2,319-B document (§09). HTML ran 1.47–1.73× its decoded RSC payload, because a hard load ships the output twice (§06) *\[measured here\]* (`build-bench.mjs`, `e3-nav.mjs`). The scan in item 2 is linear: `next start` holds two regexes per App pattern, so a miss at 1,000 patterns would cost about 336 µs (§05) *\[reconstruction\]*.

Three defaults suit a bigger machine (`server/config-shared.ts`:2422-2426, 2415, 2495) *\[from the code\]*. The worker pool counts the host's 8 CPUs, not the container's 2, and pinning `experimental.cpus: 2` cut a cold 401-route build 21%, from 70.4 to 55.9 s (§03, §12). The build cache cost 19% more CPU with nothing to restore it (§12). Preloading 405 entries made the first request after a start take 1.24 s, against 394 ms with it off (§05) *\[measured here\]* (`run-e1bc.sh`, `e8-cold-prof.mjs`).

**Figure 15. Seven precomputations and one contrast: what each saves, what it costs, who pays**

| Precomputation | Build computes | It saves | It costs | Who pays |
|----|----|----|----|----|
| **1. Discovery up front · §02, §03, §12** | A build-time walk; `_` folders skipped before `readdir`. | Walk 2.5–5× faster with pruning. | `/[a]/x` + `/[b]/y`: build exits 0, start exits 1. | The deployer, at start. |
| **2. Table lookups · §04, §05** | Sorted table: `Set`s for static URLs, regexes for dynamic. | Static under 0.1 µs; dynamic 85 µs at 1,000 routes. | Proxy: +0.93 ms p50 (+39%), 888 µs CPU. Preloading: first request 1.24 s. | Matched requests; first visitors after a start. |
| **3. Below shared layouts · §06, §08, §13** | A fixed-shape segment tree; the client sends its own. | Dynamic navigations 41–52% smaller; layout DOM nodes kept. | Output twice per hard load: HTML 1.47–1.73× RSC. Leaf `"use client"`: RSC 5.6× a layout-top boundary's. | Every hard load. |
| **4. Per-route client code · §10** | Client entries per segment; first load unions their chunks. | A 113 KB dependency in 1 of 53 first loads. | Prefetch downloads it, 55,806 B gzip, on pages that only link there. | Visitors of linking pages. |
| **5. Per-URL prerender · §04, §09, §12** | `.html`, `.rsc`, `.meta`, `.segments/` per URL; prefetch hints. | Prefetches served from stored buffers; prefetched click: 0 requests. | Static generation 22–24 s every build, 58% of warm; 7 workers on 2 CPUs; cache write +19% CPU. | Every build; small CI containers. |
| **6. No upfront route map · §08, §09, §10** | No map shipped; the client learns routes from `/_tree`. | App first load within 0.15% from 101 to 1,001 routes; Pages +45%. | 24 requests, 20,143 B for 12 visible links. Intercepted: extra `Vary`; no segment prefetch without Cache Components. | Visitors, for links never clicked. |
| **7. Tree-keyed invalidation · §07** | One soft tag per folder level: six on `/sec0/a/1`. | `revalidatePath` reaches a subtree. Not timed. | A partially prerendered page under `next start`: `private, no-store`, 1.9× the bytes. | CDNs, which may not store it. |
| **App vs Pages · §10** | App: Flight per URL. Pages: HTML plus a full route map. | Pages' map +183 B per route; Pages ships more JS above ≈490 routes. | App HTML 2.9× Pages'; App build CPU 1.53–1.74×. | Small apps. |

Blue cells are read at the tag *\[from the code\]*. Green and red cells are lab numbers from each row's sections *\[measured here\]*, by the `e2` to `e9` scripts, `build-bench.mjs` and `run-e1bc.sh`; row 1 times a verbatim copy of `recursive-readdir.ts`. The pairings and the last column are mine *\[reconstruction\]*. One shared 2-vCPU container, localhost, synthetic pages: ratios carry, milliseconds do not.

### Who pays

Some prices land on bystanders. A page that only links to a route with a 113 KB dependency downloads its chunk through prefetch while the page loads, and in a mixed app Pages pages carried 3,505 B of Bloom filters for 90 App routes (§10) *\[measured here\]*.

Built both ways, one app shows where the design pays (§10). App HTML for `/sec0/a/1` was 9,954 B against 3,472 B, 2.9×, because 6,848 B of it is inline Flight. App builds took 1.53–1.74× the CPU: 44.6 against 29.1 CPU-s at 101 routes, 88.8 against 51.1 at 401, both built with `experimental.cpus: 2`, so below §03's default-pool figures. Against that, item 6: by interpolation Pages ships less JavaScript per page only below about 490 routes *\[measured here\]* (`e9-measure.mjs`, `e9-run-b-builds.sh`).

So the design wins where the tree is large and shared: many routes, layouts over many pages, densely linked static pages. It did not pay here for a small app, which pays App's fixed costs before a route map would hurt; for a tight build budget, since prerendering is paid per page; or for CDN caching of dynamic pages, which `private, no-store` forbids *\[reconstruction\]*. §12 and §13 price the remedies.

## 12 · Faster, cheaper builds

A build splits into compilation, which the Turbopack cache makes nearly free, and static generation, which the cache never skips. On a container the defaults are wrong twice: the worker count and the cache write. `next dev` shows neither. Figure 16 has the numbers.

**Figure 16. Seven builds of the 401-route app: compile collapses, static generation does not**

![Horizontal stacked bars for seven builds of a 401-route app, 756 prerendered pages, on a scale of 0 to 140 seconds. Each bar lays compile, TypeScript and static generation end to end, with a thick tick at wall time. Turbopack cold with defaults: 25.2, 13.8 and 21.7 seconds, wall 70.4, with an 8.4-second cache write overlapping TypeScript. Warm with the cache restored: 1.86, 4.9 and 22.2, wall 38.4. One-file edit: 2.0, 5.7 and 23.5, wall 41.5. Cold with experimental.cpus 2: 23.8, 13.3 and 14.3, wall 55.9. Cold with the build cache off: 20.6, 9.4 and 21.8, wall 60.3. Webpack cold: 54, 13.65 and 25.65, wall 134.3, with a concurrent 51.5-second NFT pass. Webpack warm: 28.3, 4.8 and 25.2, wall 99.3, NFT 52.7. An inset shows the default worker formula, max of 1 and 8 minus 1, giving 7 workers inside a 2-CPU cgroup.](2026-10-15-nextjs-routing/fig-16-build-cost.svg)

Segments are the build log's phase timings, parsed by `build-bench.mjs` and summarized by `summarize.mjs` into `summary-builds.csv`; medians of three builds, two for webpack cold *\[measured here\]*. Spans overlap, so wall time is its own tick. Dashed: the `turbopack-persistence` span, starting with TypeScript. Grey: webpack's concurrent `collect-build-traces`, started after page-data collection and awaited before the build ends (`build/index.ts`:3017-3023, 4671) *\[from the code\]*; the wait inside the gap is *\[reconstruction\]*. QUIET rows are reruns (`run-e1-quiet.sh`, `run-e1bc.sh`); E1 rows are from the first sweep. The inset is `server/config-shared.ts`:2422-2426 *\[from the code\]*. One shared 2-vCPU container, synthetic pages: ratios carry over, seconds do not.

### Restore `.next/cache`, or stop writing it

Turbopack saves its build work to `.next/cache/turbopack`, by default since 16.3 (`turbopackFileSystemCache.mdx` § Options, § Version History) *\[from the docs\]*, and the clean step that empties `.next` spares `cache` (`build/index.ts`:1379-1388) *\[from the code\]*. With the cache restored, compile fell from 13 to 0.50 s, 15.2 to 0.69 s and 25.2 to 1.86 s at 21, 101 and 401 routes: 26×, 22× and 13.5×. Changing one page's text rebuilt like no change: compile 2.0 s, wall 41.5 s against 40.9 s for a no-change rebuild in the same first sweep; the quiet warm rerun took 38.4 s (`build-bench.mjs`) *\[measured here\]*.

CI keeps it only with a cache step (`ci-build-caching.mdx`) *\[from the docs\]*. Where nothing restores it, the write is pure cost: "If your build environment never preserves `.next/cache`, set `turbopackFileSystemCacheForBuild: false` to skip writing a cache that will not be read" (§ Build environments) *\[from the docs\]*. Off, the cold build took 60.3 s and 99.3 CPU-s against 70.4 and 117.8, so keeping the cache cost 10.1 s and 19% more CPU; the write span alone ran 8.1–9.0 s (`run-e1bc.sh`, `run-e1-quiet.sh`) *\[measured here\]*. The same flag sets Turbopack's `dependencyTracking` (`build/turbopack-build/impl.ts`:67-68, 118) *\[from the code\]*, so the 19% covers the write and that bookkeeping; the lab did not separate them *\[reconstruction\]*. When not: anywhere the cache is restored.

### Size the worker pool to the quota

Page-data collection and prerendering share one worker pool (§03), sized by `server/config-shared.ts`:2422-2426 *\[from the code\]*:

    cpus: Math.max(
      1,
      (Number(process.env.CIRCLE_NODE_TOTAL) ||
        (os.cpus() || { length: 1 }).length) - 1
    ),

`os.cpus()` lists the host's 8 CPUs, not the cgroup's 2, so the default is 7. Set to 2, the cold build went from 70.4 to 55.9 s (−21%) and 117.8 to 90.6 CPU-s (−23%). Static generation fell from 21.7 to 14.3 s, and the `static-check` span, where the pool collects page data, from 7.6 to 3.2 s. Summed peak RSS fell from 2.31 to 1.35 GiB (−41%), counting shared pages once per process. The cgroup's throttled time, other tenants included, was 49.6 against 19.4 s (`run-e1bc.sh`, `run-e1-quiet.sh`) *\[measured here\]*. The contended default run suggested 43%, an overstatement.

When not: on bare metal the default already fits. The split also depends on at least 25 pages per worker (`export/index.ts`:701-709) and at most 8 renders in flight per worker (`export/worker.ts`:432-433, 562-571) *\[from the code\]*: 7 workers get 108 pages each, up to 56 renders on 2 CPUs *\[reconstruction\]*. Only 2 and 7 were tested; the quota beat the default here, nothing more.

### Prerender what earns it

The cache skips compilation, not prerendering: every build rendered all 756 pages, 22.2 of 38.4 s of a warm one (`build-bench.mjs`) *\[measured here\]*. Page count is the warm-build floor. The docs advise listing in `generateStaticParams` only "the routes that benefit most from being ready ahead of time"; the rest are generated on demand (`incremental-static-regeneration-cache-components.mdx` § Choosing what to prerender) *\[from the docs\]*. Unlisted, `/sec0/a/7` answered `x-nextjs-cache: MISS` in 205 ms, then `HIT` (n=1, `e8-golden-trace.mjs`) *\[measured here\]*. When not: top-traffic pages, which must be fast on first visit.

### Take type-checking off the critical path

In an App Router build, type-checking is awaited between compile and prerendering (`build/index.ts`:2049-2056) *\[from the code\]*. It took 13.8 s cold and 4.9 s warm at 401 routes (`build-bench.mjs`) *\[measured here\]*; a parallel CI job takes them off the path. `typescript.ignoreBuildErrors` skips only the check, and still logs "Finished TypeScript config validation" (`build/type-check.ts`:115-170) *\[from the code\]*. And "`next build` no longer runs linting" (`version-16.mdx` § `next lint` Command) *\[from the docs\]*. When not: if no separate job gates the deploy.

### Bundler

A cold webpack build used 1.60–1.63× Turbopack's CPU-seconds at every size; its warm compile at 401 routes was 28.3 s against 1.86 s. Turbopack skips the separate Node File Trace pass that webpack runs (`build/index.ts`:3017-3023) *\[from the code\]*; webpack's trace-span medians were 20–53 s from 21 to 401 routes, cold and warm, running concurrently with the rest of the build (`build-bench.mjs`) *\[measured here\]*. When not: a config with a `webpack()` function and no `turbopack` key. A defaulted Turbopack build exits on it rather than ignore it (`lib/turbopack-warning.ts`:146-166) *\[from the code\]*, so that app stays on `--webpack` until the config is ported.

### What `next dev` hides

`next dev` compiles a route when it is first opened (`local-development.mdx` § Local dev vs. production) *\[from the docs\]* and turns viewport prefetch off "because it requires compiling the target page" (`client/components/links.ts`:271-277) *\[from the code\]*. On the 101-route app the first hit took 7.96 s with Turbopack and 14.66 s with webpack, a second route 1.33 and 4.96 s. The server logged `GET /sec0/p0 200 in 756ms` for a request the client timed at 7.05 s (`e5-dev.mjs`) *\[measured here\]*.

Stop dev with Ctrl-C. After SIGINT and 15 s idle, Turbopack left a 55 MB cache and the restart's first hit fell from 7.17 to 2.01 s; after SIGTERM and a kill, 7.42 against 7.96 s, no gain (`e5b-dev-cache.mjs`) *\[measured here\]*. Idle time and signal were not separated. `--debug-build-paths` compiles and prerenders only matching routes (`building.mdx` § Build specific routes) *\[from the docs\]*: a debugging tool. Pruning `_` folders (§02) saves milliseconds: a verbatim copy of `lib/recursive-readdir.ts` walked 1,001 route files beside 10,000 helper files 2.5–5× faster *\[measured here\]*.

## 13 · Bundles, data, rendering and navigation

§12's practices cut what a build costs. These cut what a request, a hard load and a visible link cost, in the order of the walk: Proxy, rendering, client code, prefetch, data, serving. Most moved a number in the lab; each rests on a cited code path or doc and has a case where it does not pay.

### Proxy and config routes

Narrow the matcher, or delete `proxy.ts`. With no `matcher` the build records `/:path*` (`build/entries.ts`:603-607) *\[from the code\]*, and a no-op Proxy cost +0.93 ms p50 per matched request, +39% (`e4-latency.mjs`) *\[measured here\]*. Write `'/about/:path*'`, not `'/about'`: the matcher is end-anchored (§05). Excluding a page also excludes its Server Functions (`proxy.mdx` § Execution order) *\[from the docs\]*.

Put static rules in `next.config`: `buildCustomRoute` compiles each redirect, rewrite and header source once into a regex and a match function (`server/lib/router-utils/filesystem.ts`:137-169) *\[from the code\]*. Rules that read the request, such as an auth cookie, still need Proxy or a layout.

### Request APIs and rendering

Without Cache Components, keep `cookies()` and `headers()` out of shared and root layouts. Both throw in a `prerender-legacy` store (`server/request/headers.ts`:106-115 for `headers()`; §07 for the mechanism) *\[from the code\]*, so one call makes the route dynamic; in the root layout, the whole app. The `cookies()` page took 5.55 ms p50 to first byte against 2.37 ms static, and came back `private` and `no-store` (`e4-latency.mjs`) *\[measured here\]*.

With Cache Components, push request reads below a `<Suspense>` and pass promises down unawaited (`streaming.mdx` § Push dynamic access down) *\[from the docs\]*. §07 measured the trade on `/dyn`: first byte at 3.63 ms p50 against 6.45 ms without Cache Components, but 1.9× the time to last byte and 1.9× the bytes, still `private` and `no-store` (`e7-latency.mjs`) *\[measured here\]*. On a tiny page the gain is first byte only.

List prerenderable params in `generateStaticParams`: the listed page answered in 2.63 ms p50, a cache `HIT` (`e4-latency.mjs`) *\[measured here\]*. Under Cache Components an empty list is a build error (`build/static-paths/app.ts`:794-795, 811-813) *\[from the code\]*. The cost is per build: every listed param renders on every build, warm or cold (§12).

### Client boundaries and heavy code

The docs put `'use client'` on interactive leaves rather than "large parts of your UI" (`server-and-client-components.mdx` § Reducing JS bundle size) *\[from the docs\]*. That rule counts code, not rendered output, which a hard load ships twice (§06). In the lab's boundary app, whose root layout holds a 400-entry nav, moving the boundary from two buttons to a client wrapper around the chrome added 38,489 B (6,303 B gzip) of JS to every route, and cut the RSC payload 82% and the HTML 56% (`e2-boundary.mjs`) *\[measured here\]*. Figure 17 draws all three.

Weigh code against rendered output. In gzip, the move cost 6,303 B of JS and saved 12,408 B of HTML and 12,089 B of RSC on `/`. The chunk is cached across pages; the rendered rows return with every hard load *\[reconstruction\]*.

**Figure 17. Three placements of "use client" : code against rendered output on /**

![Grouped horizontal bars on one byte axis from 0 to 500,000, for route / of the E2 boundary app built with Turbopack, three variants per group. First-load JS from route-bundle-stats: leaf 464,114, layout-top 502,603 (plus 38,489), page-top 505,869 (plus 41,755); the framework floor on /bare is 463,816. HTML document: leaf 200,807 (gzip 23,707), layout-top 87,754 (gzip 11,299, minus 56 percent), page-top 180,671 (gzip 22,169). Inline self.\_\_next_f flight data in that HTML, in characters: 136,601, 23,892 and 116,521. RSC payload: leaf 119,482 (gzip 14,831), layout-top 21,174 (gzip 2,742, minus 82 percent), page-top 101,548 (gzip 13,430).](2026-10-15-nextjs-routing/fig-17-boundary-tradeoff.svg)

High boundary: more JS, much smaller payload. Leaf: less JS, payload shipped twice. Sizes are from `e2-boundary.mjs`, one Turbopack build per variant (webpack moved the same way); first-load JS is `route-bundle-stats` *\[measured here\]*. Summed `<script src>` tags give 576,708 B for leaf, of which 112,594 B is a `noModule` polyfill. The synthetic filler gzips 7.6–8.5× here (HTML and RSC), so gzip deltas understate real prose. That the list is cheaper as code is my reading *\[reconstruction\]*.

Keep heavy libraries behind a client-side `next/dynamic` rendered on interaction, and import shared widgets in leaves unless the whole layout uses them. Figure 13 has the placements: loaded on click, the 113 KB dependency was in none of 53 first loads; from a section layout, in 19 (`e9-measure.mjs`) *\[measured here\]*. Do not reach for `next/dynamic` in a Server Component: it does not split there (§10; `lazy-loading.mdx`:60) *\[from the docs\]*. When not: UI above the fold, which would then wait for its chunk after hydration, and a widget every page under the layout uses, where the layout is the right place *\[reconstruction\]*.

### Prefetch and navigation

Leave `prefetchInlining` on, the default (`server/config-shared.ts`:2414) *\[from the code\]*. On the 12-link page it sent 24 requests where inlining off sent 53 and 3.9% more bytes on the wire. Do not raise `maxSize` to pull a large layout inline: for a 4.4 KB layout that took the wire from 17,235 to 53,941 B (`e7-nav.mjs`; §09, Figure 12) *\[measured here\]*.

Adopt Cache Components with `partialPrefetching` when many links share a pattern. The shell vary path replaces non-root params with `Fallback` (`client/components/segment-cache/vary-path.ts`:441-463) *\[from the code\]*, so five links to `/sec0/a/[id]` shared one shell request and the hub's prefetch wire fell 41%, from 15,195 to 9,016 B. The click then cost one request. When not: a page of distinct static links, where there is nothing to share; the 12-link page made 23 requests against 24. Without Cache Components, `loading.tsx` buys an instant fallback, not a free prefetch: each link still cost two uncacheable requests (`e7-nav.mjs`) *\[measured here\]*.

On long lists of links to dynamic, cookie-reading or heavy routes, use `prefetch={false}`, which in the App Router also stops hover prefetch (`link.mdx` § prefetch), or the docs' `HoverPrefetchLink` *\[from the docs\]*. A visible link also fetches the target's client chunks: 55,806 B gzipped for the heavy route. When not: static targets people are likely to click. They lose the zero-request click, and with prefetch blocked the heavy route's click became a waterfall, 1,604 B of RSC and then the chunk it named (`e9-nav.mjs`) *\[measured here\]*. Without Cache Components, `prefetch={true}` becomes `FetchStrategy.Full`, pulling dynamic data into the prefetch (`client/app-dir/link.tsx`:808-827). Interception appends `next-url` to `Vary` (`server/base-server.ts`:2359-2386) *\[from the code\]*, and the intercepted navigation was a `no-store` render of 2,687 B decoded (`e3-nav.mjs`) *\[measured here\]*; use it where the modal earns that.

### Data

Keep layouts stable and data-light. A layout cannot pass data to its children, so fetch again in the child (`layout.mdx` § Fetching Data) *\[from the docs\]*. The repeat is free within a request: `createDedupeFetch` keys GET and HEAD calls in a `React.cache`, except calls with a `signal` or `keepalive` (`server/lib/dedupe-fetch.ts`:44-89) *\[from the code\]*. Start independent requests together with `Promise.all`, and do not call your own Route Handler from a Server Component (`fetching-data.mdx`, `production-checklist.mdx`) *\[from the docs\]*. Not measured here. When not: an auth check. A layout the next URL shares does not run again on a soft navigation, in any of §06's three cases, so a session check there misses route changes; put it in the page or the data layer (`authentication.mdx` § Layouts and auth checks) *\[from the docs\]*.

### Serving

Decide `preloadEntriesOnStart` by traffic. On the 401-route build it made an immediate first request take 1,242 ms median instead of 394 ms, and saved about 100 ms only after 4 s of idle (§05; `e8-cold-prof.mjs`, `e8-preload-tradeoff.mjs`) *\[measured here\]*. Turn it off where traffic arrives at boot.

The default cache for incremental static regeneration (ISR) is per instance: 50 MB in memory (`server/config-shared.ts`:2304) *\[from the code\]*, plus local disk (§05, §07). For several instances, set `cacheHandler` with `cacheMaxMemorySize: 0`, and `cacheHandlers` for `'use cache'` (`self-hosting.mdx` § Configuring Caching). Behind a CDN, forward `rsc` and keep `_rsc` in the cache key; `revalidatePath` does not purge the CDN (`cdn-caching.mdx`) *\[from the docs\]*. Load fonts and scripts in the layout that needs them; font preloads are keyed by its file path (`server/app-render/get-preloadable-fonts.tsx`:11-41) *\[from the code\]*. When not: assets every page uses, which belong in the root layout.

## 14 · Anti-patterns and myths

§11 to §13 priced the design and the practices that move its numbers. This section tests what people believe about it. Fifteen beliefs about Next.js routing fail at 16.4, against the code or the lab. Several are in the docs. Most lead to an anti-pattern that costs requests, CPU or a security check. Figure 18 pairs each with one correction, its evidence and the section that explains it.

**Figure 18. Fifteen beliefs, what 16.4 does instead, and the evidence**

| Belief | What 16.4 does | Evidence |
|----|----|----|
| Next scans `app/` on each request. | `next start` reads the manifests once, at boot. Routing is `Set` probes, then a sorted regex scan. | *\[from the code\]* `filesystem.ts`:348-396, 484-526, 757-764 · §05 |
| Every file in `app/` is a route. | Only `page`, `route` and metadata files make entries. | *\[from the code\]* `route-discovery.ts`:101-131 · §02 |
| `proxy.ts` is `middleware.ts` renamed. | Proxy always compiles for Node.js, and `next build` rejects `runtime` config in it. `middleware.ts` still defaults to edge. | *\[from the code\]* `entries.ts`:339-352; `get-page-static-info.ts`:857-874 · §02 |
| Matcher `'/about'` covers `/about/team`. | The compiled regex is end-anchored. Write `'/about/:path*'`. | *\[from the code\]* `get-page-static-info.ts`:486-534 · §05 |
| A soft navigation fetches only the changed segment. | Only dynamic targets: 41–52% fewer bytes. A prerendered target costs its whole `.rsc`, or 0 requests if prefetched. | *\[measured here\]* `e3b-replay.mjs`, `e3-nav.mjs` · §06 |
| Next 16 fetches a shared layout once. | Segments below 2,048 B gzip ride inside each page prefetch: the root layout came in 12 of 12 page responses. | *\[from the code\]* `server/config.ts`:475; `collect-segment-data.tsx`:622; *\[measured here\]* `e7-nav.mjs` · §09 |
| A dynamic route without `loading.tsx` is not prefetched. | Without Cache Components, no segment data is. Each link still costs `/_tree` plus a metadata-only request, both `no-store`. | *\[measured here\]* `e7-nav.mjs` · §09 |
| The client aborts intercepted-route prefetches. | It never aborts. All 50 `net::ERR_ABORTED` rows, on intercepted and dynamic routes, were read in full, with 0 `cancel()` calls. | *\[from the code\]* `scheduler.ts`:518; *\[measured here\]* `e7-abort.mjs` · §09 |
| Scrolling a link away cancels its prefetch. | It drops the queued task, not a fetch in flight. | *\[from the code\]* `links.ts`:314-366; `scheduler.ts`:377-387, 518 · §09 |
| Server Components ship no JS, so put `'use client'` at the leaves. | Against a layout-top boundary, leaf placement saved 38,489 B of JS, but RSC grew 5.6× and HTML 2.3× (raw, Turbopack): on a hard load, rendered output ships twice. | *\[measured here\]* `e2-boundary.mjs` · §13 |
| A heavy component costs only its page. | Prefetch preloads linked routes' chunks: under Turbopack the linking page fetched the 55,806-B gzipped chunk. | *\[measured here\]* `e9-nav.mjs` · §10 |
| The Turbopack cache makes builds fast. | Compile fell 25.2 to 1.86 s; static generation stayed near 22 s. An unrestored cache write cost 19% more CPU. | *\[measured here\]* `build-bench.mjs` · §12 |
| `next build` uses the CPUs you give it. | `os.cpus()` saw 8, so 7 workers ran inside a 2-CPU cgroup. | *\[from the code\]* `config-shared.ts`:2422-2426; *\[measured here\]* `build-bench.mjs` · §03 |
| Cache Components is on by default. | Only `create-next-app` enables it. The framework default is `false`. | *\[from the code\]* `config-shared.ts`:2345 · §07 |
| PPR pages are CDN-cacheable. | A postponed route is sent `private, no-cache, no-store` under `next start`. | *\[from the code\]* `app-page-runtime.ts`:2377-2388; *\[measured here\]* `e7-latency.mjs` · §07 |

Code rows were read at v16.4.0; full paths are in the cited section. Measured rows ran on one shared 2-vCPU container, over localhost, with synthetic pages: ratios carry over, seconds do not. The selection is mine *\[reconstruction\]*.

### The anti-patterns they lead to

Work in a layout body runs at the wrong times. It may run on prefetch, so analytics count prefetches (`prefetching.mdx` § Triggering unwanted side-effects during prefetching). It does not re-render on navigation, so a session check skips route changes (`authentication.mdx` § Layouts and auth checks). Hiding a slot saves nothing: "Both slots render on the server, regardless of which one the layout returns" (`parallel-routes.mdx` § Conditional Routes). Without Cache Components, a request API in the root layout makes the whole app dynamic (`production-checklist.mdx` § Routing and rendering) *\[from the docs\]*.

Raising `prefetchInlining`'s `maxSize` to inline a 4.4 KB-gzip layout saved one request and cost 3.1× the prefetch wire, 53,941 against 17,235 B (§09). A `proxy.ts` without a `matcher` runs on every request, `_next/static` included, at 0.93 ms p50 each (§05) *\[measured here\]*.

Sibling dynamic folders with different parameter names pass the build and kill the server: `app/[a]/x` beside `app/[b]/y` built with exit code 0, and `next start` exited 1 with "You cannot use different slug names for the same dynamic path ('a' !== 'b')" (`e8-sortconflict.mjs`) *\[measured here\]*. A deploy gate that only builds will pass it (§03).

Measure a production build. `next dev` prefetches on neither viewport nor hover (`client/components/links.ts`:271-277; `client/app-dir/link.tsx`:720-722) *\[from the code\]*. Its log said 756 ms for a request the client timed at 7,050 ms (§12) *\[measured here\]*. In production HTML, summed `<script src>` tags include a 112,594-B `noModule` polyfill modern browsers skip; `route-bundle-stats.json` excludes it. On the boundary app's `/`, 576,708 − 112,594 = 464,114 B, the route-bundle-stats figure (`e2-boundary.mjs`) *\[measured here\]*.

### Where the docs and the code disagree

The docs at the tag *\[from the docs\]* and the code *\[from the code\]* differ in six places. The code wins.

- `proxy.mdx`:130 says `/about` matches `/about/team`. It does not (§05).
- Missing `default.js`: three pages say 404, named-slot error and build error. The code does each, by bundler, strict matching and slot position (`next-app-loader/index.ts`:754-813; `app_structure.rs`:1918-1954; §02).
- Strict route matching is on by default (`server/config.ts`:460-468). Its opt-out, `deprecated.looseRouteMatching` (`config-shared.ts`:501-509), is in no file under `docs/` or `errors/` (§02).
- `link.mdx` § scroll walks siblings, skipping sticky elements. The code reads the segment's top edge via a Fragment ref (`layout-router.tsx`:55-116, 144-278; §06).
- `self-hosting.mdx`:293 promises `Cache-Control: public` for static pages. `cache-control.ts`:30-34 emits `s-maxage=…` without it.
- `use-cache.mdx`:691 says the `"use cache"` timeout is 50 seconds. `server/config.ts`:1793-1799 sets 0.9 × the 60-s default page timeout (`config-shared.ts`:2339), 54 s.

### One rule, priced

The argument ends where §01 began. One rule, folders for segments and twelve stems for behaviour, lets `next build` settle before the first request which URLs exist, which code each needs, which layouts two URLs share and what a visible link will fetch. §11 named the seven lookups that replace runtime work, and their prices: 22–24 s of static generation at 401 routes whatever the cache holds, rendered output shipped twice, two requests per link. The practices that moved those numbers act on the same artifacts: size the worker pool and the cache write to the container (§12); keep request APIs, client boundaries and heavy imports where the tree scopes them; let inlining and shells set the prefetch bill (§13) *\[reconstruction\]*. Every number came from one 2-vCPU container on localhost. Carry the ratios, not the milliseconds.

## 15 · Sources

The main sources, and what each was used for. Code labels are paths under `packages/next/src/`, or from the repository root when they begin with `crates/`, often cut to the file name or its last folders; each links to the full path at the tag. Line ranges, and the further files the body cites, live in the body.

### A. The subject

- [`vercel/next.js` at `v16.4.0`](https://github.com/vercel/next.js/tree/v16.4.0), commit `e273d5b2e869d0be06c0e86f788e1594f9dd40cf` — where every *\[from the code\]* badge was read (a sparse checkout, plus raw files fetched at the tag).
- [Next.js 16.4](https://nextjs.org/blog/next-16-4), 6 October 2026 — the release date used throughout. The GitHub release object is timestamped 2026-10-07T10:03:29Z.

### B. Code at v16.4.0 *\[from the code\]*

- **Discovery.** [`build/route-discovery.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/build/route-discovery.ts), [`lib/recursive-readdir.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/lib/recursive-readdir.ts), [`app-paths.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/shared/lib/router/utils/app-paths.ts), [`get-segment-param.tsx`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/shared/lib/router/utils/get-segment-param.tsx), [`generate-interception-routes-rewrites.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/lib/generate-interception-routes-rewrites.ts), [`server/config.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/config.ts), [`crates/next-core/src/app_structure.rs`](https://github.com/vercel/next.js/blob/v16.4.0/crates/next-core/src/app_structure.rs) — the walk, params, interception, strict matching (§02–§03).
- **Build.** [`build/index.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/build/index.ts), [`build/entries.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/build/entries.ts), [`build/validate-app-paths.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/build/validate-app-paths.ts), [`next-app-loader/index.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/build/webpack/loaders/next-app-loader/index.ts), [`crates/next-core/src/app_page_loader_tree.rs`](https://github.com/vercel/next.js/blob/v16.4.0/crates/next-core/src/app_page_loader_tree.rs), [`crates/next-api/src/app.rs`](https://github.com/vercel/next.js/blob/v16.4.0/crates/next-api/src/app.rs), [`build/static-paths/app.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/build/static-paths/app.ts), [`server/config-shared.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/config-shared.ts) — phases, entries, conflicts, the LoaderTree, defaults (§03–§04, §12).
- **Route table.** [`sortable-routes.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/shared/lib/router/utils/sortable-routes.ts), [`sorted-routes.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/shared/lib/router/utils/sorted-routes.ts), [`route-regex.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/shared/lib/router/utils/route-regex.ts), [`build/generate-routes-manifest.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/build/generate-routes-manifest.ts), [`server/lib/app-dir-module.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/lib/app-dir-module.ts), [`export/routes/app-page.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/export/routes/app-page.ts), [`collect-segment-data.tsx`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/app-render/collect-segment-data.tsx) — sort order, regexes, manifests, segment files (§04, §09).
- **Server.** [`start-server.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/lib/start-server.ts), [`router-server.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/lib/router-server.ts), [`filesystem.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/lib/router-utils/filesystem.ts), [`resolve-routes.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/lib/router-utils/resolve-routes.ts), [`base-server.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/base-server.ts), [`next-server.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/next-server.ts), [`app-page-runtime.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/build/templates/app-page-runtime.ts), [`route-cache-key.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/lib/route-cache-key.ts), [`file-system-cache.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/lib/incremental-cache/file-system-cache.ts), [`response-cache/index.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/response-cache/index.ts), [`cache-busting-search-param.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/shared/lib/router/utils/cache-busting-search-param.ts) — one request through `next start` (§05).
- **Rendering and caching.** [`app-render.tsx`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/app-render/app-render.tsx), [`create-component-tree.tsx`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/app-render/create-component-tree.tsx), [`walk-tree-with-flight-router-state.tsx`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/app-render/walk-tree-with-flight-router-state.tsx), [`rsc-transport.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/shared/lib/rsc-transport.ts), [`request/cookies.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/request/cookies.ts), [`dynamic-rendering.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/app-render/dynamic-rendering.ts), [`dynamic-rendering-utils.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/dynamic-rendering-utils.ts), [`staged-rendering.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/app-render/staged-rendering.ts), [`use-cache/constants.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/use-cache/constants.ts), [`use-cache-wrapper.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/use-cache/use-cache-wrapper.ts), [`implicit-tags.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/lib/implicit-tags.ts), [`revalidate.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/server/web/spec-extension/revalidate.ts) — the segment render, dynamic holes, `use cache`, tags (§06–§07).
- **Client.** [`app-router-types.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/shared/lib/app-router-types.ts), [`render-tree.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/client/components/render-tree.ts), [`layout-router.tsx`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/client/components/layout-router.tsx), [`segment-cache/cache.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/client/components/segment-cache/cache.ts), [`scheduler.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/client/components/segment-cache/scheduler.ts), [`vary-path.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/client/components/segment-cache/vary-path.ts), [`lru.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/client/components/segment-cache/lru.ts), [`optimistic-routes.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/client/components/segment-cache/optimistic-routes.ts), [`links.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/client/components/links.ts), [`client/app-dir/link.tsx`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/client/app-dir/link.tsx) — router state, cache keys, the prefetch queue (§08–§09).
- **What ships.** [`flight-client-entry-plugin.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/build/webpack/plugins/flight-client-entry-plugin.ts), [`app_client_references_chunks.rs`](https://github.com/vercel/next.js/blob/v16.4.0/crates/next-core/src/next_app/app_client_references_chunks.rs), [`build/route-bundle-stats.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/build/route-bundle-stats.ts), [`turbopack/manifest-loader.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/shared/lib/turbopack/manifest-loader.ts), [`shared/lib/router/router.ts`](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/shared/lib/router/router.ts), the [vendored Flight client](https://github.com/vercel/next.js/blob/v16.4.0/packages/next/src/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.production.js) — client chunks, first-load sets, the Pages route map, Bloom filters (§10).

### C. Docs at the tag *\[from the docs\]*

- [`project-structure.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/01-getting-started/02-project-structure.mdx), [`layout.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/03-api-reference/03-file-conventions/layout.mdx), [`loading.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/03-api-reference/03-file-conventions/loading.mdx), [`parallel-routes.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/03-api-reference/03-file-conventions/parallel-routes.mdx), [`intercepting-routes.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/03-api-reference/03-file-conventions/intercepting-routes.mdx) — the documented grammar and where the code drifts from it (§02, §06).
- [`proxy.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/03-api-reference/03-file-conventions/proxy.mdx), [`self-hosting.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/02-guides/self-hosting.mdx), [`cdn-caching.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/02-guides/cdn-caching.mdx) — the Proxy matcher and serving headers (§05, §13–§14).
- [`prefetching.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/02-guides/prefetching.mdx), [`prefetchInlining.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/03-api-reference/05-config/01-next-config-js/prefetchInlining.mdx), [`partialPrefetching.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/03-api-reference/05-config/01-next-config-js/partialPrefetching.mdx) — prefetch behaviour; inlining thresholds in gzip bytes (§09).
- [`cacheComponents.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.mdx), [`cacheLife.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/03-api-reference/04-functions/cacheLife.mdx), [the ISR guide for Cache Components](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/02-guides/incremental-static-regeneration-cache-components.mdx) — shells, cache profiles, ISR (§07, §12).
- [`turbopackFileSystemCache.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopackFileSystemCache.mdx), [`upgrading/version-16.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/02-guides/upgrading/version-16.mdx) — build-cache defaults and what 16 removed (§04, §12).
- [`lazy-loading.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/02-guides/lazy-loading.mdx), [`server-and-client-components.mdx`](https://github.com/vercel/next.js/blob/v16.4.0/docs/01-app/01-getting-started/05-server-and-client-components.mdx) — the client-boundary advice §10 and §13 test.

### D. Posts and pull requests

- [The Layouts RFC](https://nextjs.org/blog/layouts-rfc) (2022-05-23) — the `app/` design, naming the Pages route map a scaling problem (§10).
- [Next.js 16](https://nextjs.org/blog/next-16) (2025-10-21) — the "50 links" prefetch claim §09 tests.
- [16.2](https://nextjs.org/blog/next-16-2) (2026-03-18), [16.3 Instant Navigations](https://nextjs.org/blog/next-16-3-instant-navigations) (2026-06-25), [16.3](https://nextjs.org/blog/next-16-3) (2026-08-03) — when inlining, Partial Prefetching and the build cache arrived or became defaults (§09, §12).
- Pull requests [\#96439](https://github.com/vercel/next.js/pull/96439) (one navigation response type, merged 2026-08-07), [\#94157](https://github.com/vercel/next.js/pull/94157) (route-matcher stack removed, 2026-08-15), [\#97397](https://github.com/vercel/next.js/pull/97397) (strict matching on, 2026-09-21) — the history in §06, §05 and §02. Background the body does not cite: [\#94311](https://github.com/vercel/next.js/pull/94311) (Node streams by default, merged 2026-06-02, first in v16.3.0) and [\#98762](https://github.com/vercel/next.js/pull/98762) (strict matching kept opt-in under a `future` key; closed unmerged 2026-09-17).

### E. The lab *\[measured here\]*

Scripts are in `scripts/`, `gen/` and `verify/`, outputs in `results/`. The lab itself is not published.

- **Machine.** Linux 6.12.85+, Xeon @ 2.20 GHz, `nproc` 2 while `os.cpus()` reports 8, cgroup `cpu.max 200000 100000`, 31 GB RAM; Node v24.21.0, next\@16.4.0 and react 19.3.0 from npm, TypeScript 6.0.3, playwright-core 1.62.1, Chrome for Testing 151.0.7922.34 headless shell. Run 9 October 2026 beside other agents. CONTENDED: foreign load, so CPU-seconds are the robust metric. QUIET: low-load reruns. LOCKED: under the lab's CPU lock.
- **E1** build cost against route count: `gen-scale.mjs`, `run-e1.sh`, `build-bench.mjs`, `measure-dist.mjs` → `builds.jsonl`; E1b/E1c via `run-e1bc.sh`, `run-e1-quiet.sh`.
- **E2** client-boundary placement: `gen-boundary.mjs`, `e2-boundary.mjs` → `e2-boundary.jsonl`.
- **E3** soft navigation and state-tree replay: `e3-nav.mjs`, `e3-analyze.mjs`, `e3b-replay.mjs` → `e3-summary.json`, `e3b-replay.jsonl`.
- **E4** `next start` latency: `e4-latency.mjs` → `e4-summary.json`; rerun `verify/e4-lite.mjs`.
- **E5** `next dev`: `e5-dev.mjs`, `e5b-dev-cache.mjs` → `e5-dev.jsonl`, `e5b-dev-cache.jsonl`.
- **E6** route matching: `e6-match.mjs` → `e6-match.jsonl`; rerun `verify/e6-match-rerun.mjs`.
- **E7** inlining, Partial Prefetching, PPR: `e7-gen.mjs`, `e7-build.mjs`, `e7-hints.mjs`, `e7-nav.mjs`, `e7-latency.mjs`, `e7-ppr-body.mjs`, `e7-abort.mjs`, `e7-summarize.mjs` → `e7-summary.json`.
- **E8** the golden trace and Proxy profile: `e8-golden-trace.mjs`, `e8-proxy-attrib.mjs` and eight more → `e8-*.json` and `e8-dyn-cancel.log`.
- **E9** what ships: three `e9-gen-*.mjs` generators, `e9-measure.mjs`, `e9-nav.mjs`, `e9-resolve.mjs`, `e9-analyze.mjs` → `e9-summary.json`.

**Provenance.** *Sourced.* Every `path:lines` citation was read at `e273d5b2`; doc quotes come from `docs/` at the tag or from the nextjs.org posts; dates from the posts and PR metadata. *Measured.* Localhost (no RTT, TLS or CDN), synthetic pages whose filler gzips 8–10×, one `next start` process, Chromium only, a shared 2-vCPU container that `os.cpus()` reports as 8. Ratios transfer; absolute numbers do not. *Mine.* The pairing of efficiency and price in §11, every figure layout, the §03 reading that a Turbopack build walks `app/` twice, and the judgement calls in §12–§13. *Not verified.* Whether a client component in a shared layout re-renders on sibling navigation (remounting was ruled out); whether the dev cache is written on idle or on SIGINT; inlining's request counts on a real network; how `staticGenerationMaxConcurrency` interacts with `experimental.cpus` (only 2 and 7 workers ran); the saving from removing a Node Proxy outright; stale year-cacheable 404s for inlined segment paths after a redeploy; PPR resume CPU. *Process.* Eleven research dossiers and a consolidation fed this post; the critic's 14 contradictions were resolved, and no refuted claim appears.
