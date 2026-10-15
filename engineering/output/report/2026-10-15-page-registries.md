# A Table With Two Columns

A page registry is a table: a shape name that appears in your data on the left, the code allowed to draw it on the right. This is a working design for that table — the three shapes a page can have, six ways to build the lookup, what one entry must carry, where to validate, how to version against two clocks, and the failure modes that arrive on schedule. Then a section on doing it with MagicPath, grounded in its CLI rather than its marketing, with an honest ledger of what that buys and what it costs.

By **Suraj Sharma**, XO Labs · Frontend Architecture. First published 28 September 2026 as *A Table With Two Columns* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/page-registries).

Source: [`page-registries/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/page-registries/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

> **How to read the badges**
>
> This page mixes two kinds of claim. *\[documented\]* marks something I read in a primary source — a vendor's own docs, an engineering blog, or the output of a command run on this machine, quoted with its path or URL. *\[house design\]* marks a recommendation of mine: a shape I would build, with reasons, which you should argue with. Where a number would have to come from someone's internal dashboard, or from a page I could not read, I have said so instead of inventing it.

## 01 · The shape and the table

A page registry is a table with two columns. On the left, a string that appears in your data. On the right, the code allowed to draw it. Everything else in this essay is bookkeeping around those two columns — but the bookkeeping is where the systems fail, so it is most of the work.

The problem it solves is always the same. You have documents whose structure varies — a CMS entry, an API response, a row your agent wrote — and you want one route in your application to render all of them without a deploy every time a new kind appears. The document carries its own shape. The renderer looks the shape up and draws it. Nobody edits a `switch` statement in a controller.

Production write-ups of this pattern converge on four layers, and it is worth naming them separately because teams routinely collapse two of them and then cannot explain their bugs. *\[documented\]*

- **Schema**: What is allowed to exist. The set of shapes, their fields, their types. Lives in one file, not in the components.
- **Resolver**: What should happen given the current conditions — which variant, which locale, which experiment, which permissions. Produces a concrete document from an abstract one.
- **Registry**: Which implementation is permitted to draw a given shape. The allow-list. The only place a string from data becomes executable code.
- **Renderer**: The walk. Takes the document, asks the registry per node, mounts components, handles the nodes it does not recognise.

The layer people most often skip is the resolver, by folding personalisation and permissions into components. The layer people most often under-build is the registry, by treating it as a plain object literal and nothing more. It is not nothing more. It is a trust boundary: the one point where an untrusted string decides which of your functions runs. Give it the respect you would give a router.

**Figure 1. The four layers, and what crosses each seam**

![A left-to-right pipeline. A source document enters a schema layer which validates it, then a resolver layer which selects variants, then a registry layer which looks up each shape name, then a renderer which mounts components and emits HTML. Below, three annotations mark what crosses each seam: parsed data, a concrete document, and a component reference. A dashed line marks the registry as the trust boundary.](2026-10-15-page-registries/fig-01-layers.svg)

Four layers, four different failure modes. Most teams ship two of them and debug the other two forever.

The pattern has enough production history that you do not need to invent the vocabulary. Airbnb's Ghost Platform wraps every unit of UI in a `SectionContainer` and carries a `SectionComponentType` enum which, in their words, "determines how to render the section data model" and allows "alternative renderings of the same section depending on the context" — with the section data itself typed as a GraphQL union, `union Section = HeroSection | TitleSection`. *\[documented\]* Yelp's CHAOS framework takes the looser route: a type string like `chaos.button.v1` plus a generic payload, chosen for iteration speed. *\[documented\]* Lyft's Canvas encodes the same idea in Protocol Buffers, picked for a compact binary encoding and built-in versioning. *\[documented\]* Payload CMS stores a `blockType` on every block, set to the block config's `slug`. *\[documented\]* Puck persists `{ "type": "HeadingBlock", "props": { "id": "HeadingBlock-1234", … } }` and hands it to a `<Render config={config} data={data} />`. *\[documented\]*

Five independent teams, five different transports, one idea: a tagged union on the wire and a lookup table in the client. If your design does not reduce to that, you are probably building something harder than you need.

## 02 · Three shapes a page can have

"Render the page based on the shape" hides a choice that decides most of the rest of the build: what, exactly, is keyed. There are three answers in use, they nest, and picking the smallest one you can live with is the single highest-leverage decision in this design.

### Shape A — the page-type registry

One key per page template. The document says `"type": "product"` and the registry hands back a `ProductPage` that knows its own layout. The registry has ten entries and fits on a screen.

This is the version most teams actually need and the version most teams skip past on the way to something more impressive. It is the right answer when the set of layouts is small, editors do not compose pages, and what varies is the content, not the arrangement. Its cost is real but bounded: a new layout is a code change. If you ship layouts monthly rather than hourly, that is not a problem, it is a review process.

### Shape B — the block list

The page is an ordered array of blocks, each a tagged object. The registry has one entry per block type and the renderer is a `map`. This is the page-builder default: Payload's blocks field, Sanity's portable-text and array-of-object page builders, Contentful's content-type references, Puck's `content` array.

Flat lists buy you a property worth more than it looks: *every block is independent*. It can be validated alone, rendered alone, error-bounded alone, cached alone, and lazily loaded alone. The moment blocks can contain blocks, all five of those get harder at once.

### Shape C — the recursive tree

Blocks contain slots; slots contain blocks. Now you can express a two-column layout with a card inside it, which is what a visual editor needs and what server-driven UI systems at Airbnb's scale end up with. You also inherit the whole tree problem set: cycles, depth limits, key stability under reordering, per-node data fetching, and a renderer that must recurse safely on data an author controls.

Puck's own history is instructive here: it originally expressed nested regions as a top-level `zones` object and is deprecating that in favour of slot fields on the components themselves. *\[documented\]* The lesson generalises — containment belongs to the node that contains, not to a side table keyed by path. Side tables keyed by path break the moment someone drags a block.

**Figure 2. The three shapes, drawn to the same scale**

![Three panels. Panel A: a single page node labelled type product pointing to one registry entry. Panel B: a page node containing an ordered list of four tagged blocks, each pointing to its own registry entry. Panel C: a page node containing a grid block whose two slots contain further blocks, drawn as a tree three levels deep, with slot edges dashed.](2026-10-15-page-registries/fig-02-shapes.svg)

A and B are cheap and stay cheap. C is where cycles, depth limits, key stability and per-node fetching all arrive at once — take it deliberately, not by drift.

### Nominal, not structural

There is a fourth axis hiding inside "shape": whether you dispatch on a declared tag (*nominal*) or on which fields happen to be present (*structural*). Structural dispatch — "it has a `headline` and an `image`, so it must be a hero" — is tempting because it needs no migration when you add a type.

Do not do it. *\[house design\]* Structural dispatch makes every field addition a potential mis-render, it cannot be validated cheaply, and it gives you no place to hang a version. A declared discriminant is one string per node and it buys you an O(1) lookup, a precise validation error, and a migration hook. Zod's `z.discriminatedUnion()` exists exactly because a discriminator key lets the parser "skip checking every union branch once it sees the discriminator" and report only the errors for the branch you meant. *\[documented\]*

> **The one rule that survives every version of this design**
>
> The discriminant is a **string constant chosen by a human**, it is **versioned in the string itself**, and it is **never derived from a file path, a class name, a component export name, or a generated id**. Every one of those four moves feels like it removes bookkeeping and every one of them couples your persisted data to your source tree. Rename a file, break a thousand rows.

## 03 · Six ways to build the table

The strategies below are ordered by how much machinery they add, not by how good they are. Most products should start at one and stop at three. The later ones are answers to specific pressures — bundle size, third-party authors, multi-platform clients — and they cost real money when adopted without that pressure.

### 1 · The object literal

A module that exports a frozen record from tag to component, plus a renderer that maps over the list. Twenty lines. This is the version to write first, always, because writing it tells you what the other columns need to be.

    // registry.ts
    import { Hero } from "./blocks/Hero";
    import { StatRow } from "./blocks/StatRow";

    export const registry = {
      "hero.v2":     Hero,
      "stat-row.v1": StatRow,
    } as const;

    export type BlockTag = keyof typeof registry;

    // Renderer.tsx
    export function Blocks({ blocks }: { blocks: Block[] }) {
      return blocks.map((b) => {
        const C = registry[b.tag];
        if (!C) return <Unknown tag={b.tag} key={b.id} />;
        return <C key={b.id} {...b.props} />;
      });
    }

Two details in those twenty lines are not optional. `registry[b.tag]` must be a lookup on an object you built, never `eval`, never `await import(b.tag)`, never a path join. And the `key` is `b.id` — a stable id minted when the block was created — not the array index. Index keys mean that reordering blocks in the editor silently swaps component state between them, which is one of the two or three bugs every team building this hits and nobody diagnoses quickly.

### 2 · Convention plus codegen

Scan `blocks/*/index.tsx` at build time, emit the map. Adding a block becomes adding a folder. The appeal is obvious and so is the trap: you have now made the tag a function of the filename, which the previous section said never to do.

The fix is cheap and worth stating, because it rescues the whole approach. *\[house design\]* Let each block folder export its own `tag` as a literal and have codegen collect the exports, not the paths. The generator then also gets to fail the build on a duplicate tag, which is the one class of registry bug that is otherwise invisible until production.

### 3 · Schema-first — the entry is the unit

Stop registering components and start registering *entries*: a record that carries the tag, the props schema, the component, and whatever else the system needs at that tag. The registry becomes the single source of truth from which both the parser and the renderer are derived.

    // blocks/hero.ts
    import { z } from "zod";

    export const hero = defineBlock({
      tag: "hero.v2",
      schema: z.object({
        headline: z.string().max(120),
        eyebrow:  z.string().optional(),
        media:    z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("image"), src: z.string().url() }),
          z.object({ kind: z.literal("none") }),
        ]),
      }),
      component: Hero,
    });

    // schema.ts — derived, not hand-written
    export const BlockSchema = z.discriminatedUnion(
      "tag",
      entries.map((e) => z.object({ tag: z.literal(e.tag), id: z.string(), props: e.schema })),
    );

This is the inflection point of the whole design. *\[house design\]* Once the schema and the component live in the same record, three things become free that are otherwise projects: precise validation errors that name the block and the field; an editor form generated from the same schema; and a compile-time guarantee that every tag in the union has something that can draw it. Note the constraint this imposes — in a discriminated-union design, every option must have a registered component, or the union and the table have drifted.

### 4 · The lazy registry

Same table, but the values are loaders rather than components, so a page only downloads the blocks it actually uses.

    const registry = {
      "hero.v2":   () => import("./blocks/Hero"),
      "chart.v1":  () => import("./blocks/Chart"),   // 90 kB of chart library
    } as const;

Builder.io's own documentation shows the same move inside `registerComponent()`, registering `dynamic(() => import('./components/heading'))` rather than the component itself. *\[documented\]* The cost is that a registry of promises is harder to reason about on the server, and that you have traded a bundle problem for a waterfall problem: a deeply nested tree of lazy blocks serialises its own loading. Flat block lists (Shape B) are the natural home for this; trees need preloading by tag before the walk.

### 5 · The remote manifest

The registry itself becomes data: a manifest fetched at runtime that maps tags to module URLs, loaded through import maps or module federation. This is the only design in which a shape can be added without deploying the host application, which is why it shows up in plugin marketplaces and multi-tenant platforms — and essentially nowhere else.

Be clear-eyed about what you are buying. *\[house design\]* You have moved code loading under the control of a network response, which means the trust boundary in Figure 1 is now the only thing between a compromised manifest and arbitrary script execution in your users' sessions. If you go here: sign the manifest, pin the origins, allow-list the tags, and give up on the idea that a Content Security Policy will save you afterwards.

### 6 · The typed transport

Push the union into the wire format and generate the client registry from it. Airbnb's single shared GraphQL schema across Web, iOS and Android is the canonical instance; Lyft's Canvas does the same job with protobuf "for its compact binary format and built-in versioning support." *\[documented\]*

This is a multi-platform answer to a multi-platform problem. If you have one web client, the schema-first registry of strategy 3 gives you the same type safety without a code-generation pipeline and a schema registry. If you have three clients that must agree, nothing else really works, and Airbnb's stated reason is worth repeating: the key decision that made the system scale was using *one* shared schema, not three that resemble each other. *\[documented\]*

**Figure 3. Six strategies, scored on what actually differs**

| Strategy | Add a shape without deploying? | Type safety | Code splitting | Main cost |
|----|----|----|----|----|
| 1 · Object literal | No | Full, free | None | Every new shape is a release |
| 2 · Convention + codegen | No | Full, generated | Possible | Build step; tag/path coupling if done naively |
| 3 · Schema-first entries | No | Full, plus runtime parse | Possible | One abstraction to learn; worth it |
| 4 · Lazy registry | No | Full, with async seams | Per tag | Loading waterfalls in nested trees |
| 5 · Remote manifest | Yes | Weak at the seam | Per tag | Code loading becomes a security surface |
| 6 · Typed transport | Partly — new data, not new renderers | Full, across platforms | Per platform | Schema registry, codegen, coordination |

Only strategy 5 actually answers "add a page type without shipping". Everything else is a trade between build complexity and bundle size — which means most teams adopting 5 or 6 are paying for a property they never use.

## 04 · What one entry must carry

A registry whose values are bare components will grow a second registry beside it within a quarter — a map of tags to editor forms, then a map of tags to default props, then a map of tags to data requirements. Those maps drift. Put the fields on the entry from the start; you can leave most of them undefined.

The list below is the one I would ship. *\[house design\]* The first four are mandatory. The rest are optional per entry but must have a defined place, because a field with no home gets invented three times.

- **tag**: The discriminant, version included: "hero.v2" . Unique across the registry, asserted at build time.
- **schema**: The props contract as a parser, not a type. Types vanish at runtime; the data does not.
- **component**: The renderer, or a loader that returns it. The only executable thing in the record.
- **defaults**: What an author gets when they add the block. Also what a failed migration falls back to.
- **slots**: Named child regions and what each accepts — { body: \["prose.v1", "media.v1"\] } . Absent means leaf.
- **migrate**: A function from the previous version's props to this one's. Lives next to the schema it produces.
- **resolve**: Server-side data this block needs, declared so the renderer can batch it. The cure for block-level N+1.
- **editor**: Label, icon, category, preview thumbnail, field overrides. Everything the authoring surface needs and the renderer ignores.
- **capabilities**: Flags the platform enforces: may this block run client JS, embed third-party frames, be used above the fold, appear on a public page?
- **status**: active · deprecated · removed . Deprecated still renders and warns; removed renders the fallback.

Two of these deserve an argument rather than a row.

**`resolve`** exists because block-level data fetching is the performance failure of this architecture. Twelve blocks that each fetch their own data is twelve round trips arranged in whatever order React happens to mount them. Declaring the requirement on the entry lets the renderer do one pass to collect requirements, one batched fetch, and then a render with everything in hand. Airbnb's platform pushes this further — sections are resolved server-side and the payload-size problem is managed with "operation registries, deferred responses (essentially UI pagination), and other optimizations." *\[documented\]*

**`capabilities`** exists because the registry is the last place where a policy can be enforced cheaply. Once a block is mounted, "this component must not appear on a logged-out page" is a code review comment. On the entry, it is an assertion the renderer makes before it mounts anything.

## 05 · Validating at the seam

The question is not whether to validate. It is *where*, and the answer is "at four places, doing four different jobs" — because a system that validates only at render time turns every authoring mistake into a production incident, and a system that validates only at author time trusts a database it does not control.

**Figure 4. Four validation points, and what each one is allowed to do about a bad block**

![Four stacked lanes. Lane one, author time: the editor refuses to save, showing a field error. Lane two, build or publish time: CI fails the publish and names the block. Lane three, request time: the server drops the bad block and logs it, rendering the rest of the page. Lane four, render time: an error boundary around the single block shows a placeholder while siblings render normally. An arrow on the right shows blast radius growing from one field to one block to one page.](2026-10-15-page-registries/fig-04-validation.svg)

The same schema runs at all four points. What changes is the remedy — and the remedy must get gentler as you move down, because by lane four the user is already watching.

### Parse once, at the edge

The discipline that makes this cheap is parsing at the boundary rather than checking inside components. One `BlockSchema.safeParse(doc)` immediately after the fetch, and from that line onward every block in the page is a typed value that the compiler will police. Components then contain zero defensive code, which is the actual payoff: a block that does not need `props.headline ?? ""` is a block whose rendering you can reason about.

### Unknown tags are a design decision, not an error

Every long-lived registry meets a tag it does not know: an older client reading a newer document, a rolled-back deploy, a block someone removed. Decide the policy once and write it down. *\[house design\]*

- **Must-ignore by default.** An unrecognised block is dropped, logged with its tag and id, and the page renders. This is the correct default for marketing pages, feeds, and anything where a missing section is survivable.
- **Must-understand by exception.** Some blocks may not be silently dropped — a legal disclosure, a price, a consent control. Mark those on the entry, and when one is unknown, fail the page rather than serve a page missing its disclosure.
- **Never render a generic fallback in production.** A grey box saying "unsupported block" is a development affordance. In production it is a defect that looks intentional.

The must-ignore/must-understand split is borrowed from protocol design and it is the single most useful idea to import here, because it converts an argument that recurs every quarter — "should we fail or skip?" — into a per-entry flag with a default.

## 06 · Versioning and the two-sided deploy

A page registry couples two things that deploy on different clocks: rows in a database that change when an editor clicks publish, and code that changes when you ship. Every serious problem in these systems is a consequence of that mismatch, and the fix is almost always to make the data say what it is rather than to make the code guess.

### Version in the tag, not beside it

`"hero.v2"`, not `{ tag: "hero", version: 2 }`. *\[house design\]* The reason is mechanical: a version inside the discriminant means `v1` and `v2` are different branches of the union, each with its own schema and its own component, and the type system checks that both are handled. A version beside the discriminant means one branch with a conditional inside it, which is the thing you were trying to avoid two layers ago. Yelp's `chaos.button.v1` has the version in the string for the same reason. *\[documented\]*

### Additive changes do not need a version

Adding an optional field with a default is not a new version. Making a field required, removing one, changing its type, or changing what an existing value *means* — those are. The distinction is worth enforcing in review, because teams that version on every change end up with `hero.v7` and six dead components, and teams that never version end up with a schema full of optionals that nobody can read.

**Figure 5. The two clocks, and the four states a block can be in between them**

![A timeline with two tracks. The upper track is code deploys, the lower is content publishes. Four labelled regions show the four states: code knows a tag no document uses yet, both agree, a document uses a tag the code has deprecated, and a document uses a tag the code no longer has. Arrows mark the safe ordering: ship the renderer first, migrate content second, remove the old renderer third.](2026-10-15-page-registries/fig-05-versions.svg)

State D is not hypothetical; it is what a rollback produces. A registry without an unknown-tag policy turns every rollback into an outage.

### Migrations belong in the registry, not in a script

A one-off script that rewrites rows works exactly once and then is deleted, which means the next person to restore an old backup gets a broken page. A `migrate` function on the `v2` entry that accepts `v1` props is permanent, is exercised on every read until the data is clean, and can be deleted for a real reason: a query says no documents contain `hero.v1` any more.

That query is the gate. *\[house design\]* Deleting a registry entry should require a count, and the count should be a dashboard panel, not a thing someone remembers to run. This is the one piece of operational tooling I would build early, because it is what converts "we can never remove a block type" into a normal piece of maintenance.

## 07 · Rendering: the walk, the bundle, the waterfall

With the table built, the renderer is twenty lines and four decisions. The decisions are: where the lookup happens, how identity is assigned, how children are passed, and when data is fetched. Get those wrong and the architecture is blamed for problems that belong to the walk.

### Where the lookup happens

In a React Server Components application the honest answer is "on the server, and then again on the client for anything interactive", and the registry has to be built to survive that. A single module that imports every block and is imported by both a server component and a client component drags every block into the client bundle, because the client boundary cannot tree-shake what it cannot see through.

The shape that works is two tables. *\[house design\]* A server registry holding server components and loaders, and a smaller client registry holding only the blocks that genuinely need interactivity, with the server registry pointing at client components where needed. The rule that keeps it honest: the client registry's key set must be a subset of the server's, asserted in a test. When a block moves from static to interactive, that test is what tells you the bundle just grew.

**Figure 6. One request, from document to painted page**

![Three horizontal lanes. Server lane: fetch document, parse with schema, collect data requirements from registry entries, one batched fetch, then walk the tree looking up each tag. Boundary lane: the serialised tree crosses to the client, with only interactive blocks marked. Client lane: hydrate only the marked blocks, each wrapped in its own error boundary. A callout marks the batched fetch as the cure for block-level N+1.](2026-10-15-page-registries/fig-06-render.svg)

The registry is consulted twice per request — once for requirements, once for components. Doing it in one pass is what produces block-level N+1.

### Identity, and the reordering bug

Every block needs an id minted at creation and persisted with it. Puck does this — its stored props carry an `id` like `"HeadingBlock-1234"` alongside the component's own props. *\[documented\]* Use that id as the React key, as the anchor for deep links, as the handle for analytics, and as the thing the editor's undo stack refers to. If you take one implementation detail from this essay, take this one: an id per block, minted once, never derived from position.

### Children, slots, and the depth limit

Pass child regions as data the renderer walks, not as pre-rendered React children handed down through props — otherwise the parent decides how deep the tree renders and lazy loading stops working. And bound the recursion. An author-controlled tree with no depth limit is a denial of service with a drag handle; a limit of eight, enforced at parse time with a clear error, costs nothing and has never been hit by legitimate content in any system I have looked at. *\[house design\]*

## 08 · The other table: URL to document

"A registry of pages" quietly contains two tables, and conflating them is the most common structural mistake I see. One maps a *shape* to the code that draws it. The other maps a *URL* to the document that should be drawn. They have different keys, different owners, different cache lifetimes, and different failure modes.

The route table is the one your framework already half-provides. In a Next.js application it is a single catch-all segment — `app/[[...slug]]/page.tsx` — whose job is exactly three lines: turn the path into a lookup key, fetch the document, hand it to the block renderer. Everything interesting about the page lives in the document; everything interesting about the registry lives one layer down. If your catch-all route has business logic in it, something from §01's resolver layer has leaked upward.

**Figure 7. Two tables, two keys, two clocks**

![Two tables side by side. The route table is keyed by path and its rows map slash pricing and slash blog slash x to document ids, owned by editors and invalidated on publish. The block registry is keyed by tag and its rows map hero dot v two and cta dot v three to components, owned by engineers and invalidated on deploy. An arrow runs from the route table's document to the block registry's lookup.](2026-10-15-page-registries/fig-07-two-tables.svg)

Different keys, different owners, different invalidation events. Keep them in separate modules even when they are both small, because they will not stay the same size.

### Four things the route table owns

**Static generation.** If pages are pre-rendered, the list of paths comes from the route table, not from the block registry — a query for published documents, returned from `generateStaticParams`. The two useful properties to preserve are that an unlisted path still renders on demand, and that an unpublished one 404s rather than leaking a draft.

**Invalidation.** A publish should invalidate that document's paths and nothing else, which means tagging the cache entry with the document id at fetch time and revalidating by tag from the CMS webhook. The anti-pattern is a time-based revalidation window chosen to feel responsive — it is a guess that is simultaneously too slow for editors and too aggressive for your origin.

**Redirects and 404s as data.** Editors move pages. If the only way to record that is a config file in the repository, moving a page is a deploy and the redirect will not exist for the week it matters most. Put redirects in the route table beside the pages.

**Metadata.** Title, description, canonical, Open Graph image and structured data come from fields on the document, resolved before the block walk — never scraped out of whichever block happens to be first. *\[house design\]* A registry-rendered page that derives its `<title>` from the hero block's headline is one reorder away from an SEO incident, and nobody will connect the two events.

Preview is the seam that ties both tables together: an editor viewing a draft must get the *same* registry, the same validation, the same error boundaries, and only a different document source. A preview path that renders through a different code path is a preview that lies, and the whole argument for schema-first authoring — that an editor cannot build a page the site cannot draw — depends on it telling the truth.

## 09 · One config, two consumers

The moment a human edits these documents, the registry acquires a second reader. Whether you build the editor or buy it, the rule is the same: the editor and the renderer must read the *same* record. Two records drift, and drift here looks like an editor that lets someone build a page the site cannot draw.

The established tools all encode this and they are worth reading as prior art even if you use none of them.

- **Puck**: config.components declares fields and render per component in one object, so the editor preview and production output are the same function. Editing is \<Puck\> ; production is \<Render config data /\> ; persistence is the host's problem via onPublish . \[documented\]
- **Builder.io**: registerComponent(component, { name, inputs, image }) — the inputs array is the field schema and the image is the palette thumbnail. The options "determine how your component appears in the Visual Editor." \[documented\]
- **Plasmic**: Also registerComponent , taking the component plus metadata with a name and typed prop definitions, so your own React components become building blocks inside the studio. \[documented\]
- **Payload**: A block config is a slug plus fields; the slug is saved on every instance as blockType . The docs recommend one block config per file, imported where needed — a registry assembled from modules, not scanned from a directory. \[documented\]

**Figure 8. One entry, read two ways**

![A central registry entry card lists tag, schema, component, defaults and editor metadata. An arrow left goes to the editor, which reads schema to generate a form, defaults to seed a new block, and editor metadata for the palette. An arrow right goes to the renderer, which reads schema to parse, component to mount, and ignores the editor metadata entirely.](2026-10-15-page-registries/fig-08-two-consumers.svg)

The editor reads five fields, the renderer reads three, and they overlap on the two that matter. Duplicate the schema into a separate form config and you have re-introduced the drift you built the registry to remove.

If you are generating the form rather than hand-writing it, the mature options are the JSON Schema form renderers — `react-jsonschema-form`, JSON Forms, uniforms — and they are worth reaching for when your schemas are plain data. The cost is that generated forms are generically usable and specifically mediocre; expect to override the important ones. That is what the `editor` field on the entry is for: overrides, in the same record, not in a parallel file.

## 10 · Failure modes, in rough order of frequency

These are the ones I would bet on seeing. None of them are exotic. Most are the result of a registry that was allowed to grow without anyone owning the question "what is a block?"

- **The god block**: One entry with thirty optional props and six layout variants. It happens because adding a prop is easier than adding a block. The tell is a schema where almost everything is .optional() . The cure is a rule: if two variants share less than half their fields, they are two tags.
- **Props as free JSON**: props: Record\<string, unknown\> "for flexibility". This deletes the validation layer, the generated form, and the migration hook in one line, and it is usually introduced to unblock a deadline. A generic payload is defensible at the transport layer — Yelp's descriptor model does exactly that \[documented\] — but only if a typed schema is applied per tag on arrival.
- **Registry drift**: A second map appears — for icons, for analytics names, for which blocks are allowed in which slot — keyed by the same tags and updated by a different person. Detect it with one test that asserts every auxiliary map's key set equals the registry's.
- **Style leakage**: A block sets a page-level margin, a z-index , or a background that assumes what is above it. Blocks must be composable in any order; the page owns vertical rhythm and the block owns its interior. This is a lint rule and a review habit, not an architecture.
- **Lazy above the fold**: Code splitting every entry means the hero — the largest contentful paint — arrives after a second round trip. Mark the entries that may appear first as eager, or preload by tag after parsing, before the walk.
- **Actions as code**: A payload field containing a URL, a handler name, or worse a snippet. Model interactions the way Airbnb does — a typed action object on the section, onTitleClickAction: IAction \[documented\] — resolved through a second allow-listed registry of handlers. Never href straight from data without a scheme check; javascript: is still a URL.
- **No gallery**: Nobody can see all the blocks at once. Build a route that renders every entry at its defaults, snapshot it, and you get visual regression, designer review and onboarding documentation from one page that costs an afternoon.
- **Everything is a block**: Navigation, footer, consent banner and error states get pulled into the registry because the registry is where components live now. They are not blocks — they are not author-ordered and they must not be droppable. Keep the page chrome outside the walk.

There is also a failure mode that is not technical. Server-driven and registry-driven architectures are adopted because someone wants to ship UI without a deploy — and then the organisation keeps requiring a review for every content change, at which point you have paid the whole cost and kept the whole latency. Decide who is allowed to publish before you decide what the registry looks like. If the answer is "engineers only", strategy 1 is your answer and this essay is mostly optional reading.

## 11 · Doing it with MagicPath

MagicPath describes itself, on its own home page, as "the shared workspace for humans and agents". *\[documented\]* In the shape of this essay it is a *component factory*, not a registry: it produces React components, on a canvas, from prompts and images and existing code, and it will write them into your repository. It has no concept of a tag, a schema, a version, or a slot. That is not a criticism — it is the fact that determines how you wire it in.

> **What I could and could not verify**
>
> MagicPath's documentation site renders client-side; fetching `/documentation/features/code-export` and `/pricing` returned the shell and no prose, so I have not read the vendor docs directly. What follows is grounded in two things I could check: the `magicpath-ai` CLI, run on this machine on 28 September 2026 and quoted verbatim below, and the MagicPath agent skill bundled at `~/.claude/skills/magicpath/SKILL.md`, which is published by MagicPathAI. Anything sourced from third-party reviews is marked as such and should be re-checked before you rely on it.

### The surface, verbatim

`npx -y magicpath-ai --help` lists 24 commands plus `help`. *\[documented\]* The ones that matter for this architecture:

    search [options] <query>              Search component names across all projects
    inspect [options] <generatedName>    Inspect a MagicPath component's source code without installing
    add [options] <generatedNames...>    Add a MagicPath component to your project
    list-installed [options]             List MagicPath components installed in the current project
    list-themes [options]                List all themes (design systems)
    get-theme [options] <themeIdOrName>  Get a theme definition (CSS variables, fonts, styling prompt)
    code                                 Create and edit canvas components from local code
    selection                            Get the currently selected component(s) from the web app canvas
    active-project                       Get the project(s) the user currently has open in the MagicPath web app

Three details from `add --help` and `code --help` shape the integration more than anything on the marketing site. *\[documented\]*

- Components are addressed by **generated name** — the help text's own examples are `wispy-river-5234` and `bold-moon-2031`. That is an opaque identifier, not a semantic tag.
- `add` writes source files into your project, defaulting to `src/components/magicpath`, with `--overwrite`, `--dry-run` and `-p/--path` flags. The output is ordinary source you own, not a runtime SDK call.
- `code` has five subcommands — `start`, `context`, `submit`, `create`, `status` — and a strict editable-file set. The skill states it plainly: only `src/App.tsx`, `src/index.css`, files under `src/components/generated/`, and temporary assets under `assets/` are editable in a code session. *\[documented\]*

&nbsp;

- **24** · CLI commands
- **5** · code subcommands
- **1** · default install path
- **0** · registry primitives

### The wiring that works

Because MagicPath hands you source rather than a render-time dependency, the integration is unusually clean — and the one rule that makes it hold is an adapter per block. *\[house design\]* The registry never points at a generated file. It points at a hand-owned wrapper that parses props and calls the generated component. That wrapper is the seam where an opaque `wispy-river-5234` becomes `"hero.v2"`, and it is what survives the next regeneration.

    // blocks/hero/entry.ts — hand-owned, ~20 lines, never regenerated
    import { z } from "zod";
    import WispyRiver5234 from "@/components/magicpath/wispy-river-5234";

    export const hero = defineBlock({
      tag: "hero.v2",                       // semantic, versioned, stable
      source: "magicpath:wispy-river-5234", // provenance, for the audit
      schema: z.object({ headline: z.string().max(120), eyebrow: z.string().optional() }),
      defaults: { headline: "Headline" },
      editor: { label: "Hero", category: "marketing" },
      component: ({ headline, eyebrow }) =>
        <div className="w-full">{/* strip canvas sizing here */}
          <WispyRiver5234 title={headline} kicker={eyebrow} />
        </div>,
    });

The `source` field is not decoration. With it, `npx -y magicpath-ai list-installed` becomes an audit you can diff against the registry, which is how you catch the drift described in §10 before it is a quarter old.

**Figure 9. MagicPath as the factory, your registry as the contract**

![A left-to-right pipeline in three zones. Zone one, MagicPath: a canvas project holding components with generated names, plus a theme of CSS variables. Zone two, the CLI: search, inspect and add write source files into src slash components slash magicpath. Zone three, your repository: a hand-owned adapter per block carries tag, schema, defaults and editor metadata into the registry, which the renderer and the editor both read. A dashed return arrow from the repository back to the canvas is labelled code start and code submit.](2026-10-15-page-registries/fig-09-magicpath.svg)

MagicPath sits entirely to the left of the trust boundary in Figure 1. Everything the registry is for — tags, schemas, versions, slots, capabilities — remains yours to build.

### Three ways to use it, in order of how much I would trust them

**As a block factory (recommended).** Designers or agents build a block on the canvas; you run `inspect` to read it, `add` to install it, then hand-write the adapter and the schema. MagicPath owns the interior of one block; you own the page, the tags, and the contract. This composes with every strategy in §03 and costs you nothing architecturally.

**As the design-system source.** `list-themes` and `get-theme` return a design system as CSS variables, fonts, and a styling prompt. *\[documented\]* Generating every block against one theme is the mechanism that keeps a registry of thirty AI-authored blocks from looking like thirty different websites. If you use MagicPath at all, use this.

**As a two-way canvas.** `code start` / `code submit` push local components up as canvas revisions, and the skill documents importing from local paths or from GitHub, GitLab and Bitbucket repositories. *\[documented\]* The appealing version of this is your block gallery from §10, living on a canvas where designers can edit it. The caution is that you now have two systems that both believe they own the component's source, and the editable-file restriction (`src/App.tsx`, `src/index.css`, `src/components/generated/`) means the round trip is not arbitrary — it is a single-component sandbox, not your repo.

## 12 · MagicPath: what you gain, what you pay

**Figure 10. The ledger**

| What you gain | What it costs |
|----|----|
| **Source, not a runtime.** `add` writes React/TypeScript files into your tree. No render-time SDK, no vendor in the request path, no lock-in at the layer that matters. This is the substantive difference from Builder.io and Plasmic, where the visual editor is also a runtime dependency. | **No registry primitives.** Zero of §04–§06 is provided. Tags, schemas, versions, slots, capabilities, migrations, unknown-tag policy — all yours. MagicPath shortens one step of the pipeline, the one that was already the least structural. |
| **Agent-drivable end to end.** The CLI is built for agents — `-o json` on every data command, `selection` and `active-project` to read what the human is looking at. "Add a new block type" is genuinely one agent task. | **Opaque identity.** Components are `wispy-river-5234`. Any mapping from that to a semantic tag is a second table you maintain — precisely the drift risk from §10. Keep it on the entry (`source:`) or it will end up in a spreadsheet. |
| **A shared theme.** `get-theme` returns CSS variables, fonts and a styling prompt, so generated blocks can inherit one token layer instead of inventing thirty. | **Canvas-shaped output.** The skill's own "Design Defaults" section exists because generated components drift toward fixed widths, device mockups and absolute positioning. Blocks must be layout-neutral. Budget an adapter per block to strip outer sizing. |
| **Round-trip to design.** Pull repo components in, push canvas revisions back, and let designers work on the real thing rather than a picture of it. | **Model-authored prop interfaces.** The props of a generated component were chosen by a model for a canvas, not by you for authors. Your Zod schema is the real contract; expect it to disagree with the generated interface and expect the adapter to absorb that. |
| **Fast first draft.** The expensive part of a new block type has always been producing something on-brand that a designer will sign off. That step compresses to minutes. | **Metered, and React-only.** Third-party reviews from 2026 report credit-based pricing with a free tier, a Pro tier and Teams, credits that do not roll over, and React/TypeScript/Tailwind as the only code output — no plain HTML/CSS, no native. *\[third-party, unverified\]* I could not read the vendor's own pricing page; check it before budgeting. |
| **Cheap to try, cheap to leave.** Because the output is source, abandoning MagicPath leaves your registry intact. The blocks keep working; you just stop regenerating them. | **Single-platform.** If your registry exists to feed iOS, Android and web from one schema (§03, strategy 6), MagicPath addresses none of that problem. It is a web component factory. |

The gains are concentrated in one step — producing the interior of a block. The costs are concentrated in the seam between an AI-authored component and a contract that has to be stable for years. The adapter is where you pay.

The summary judgement: *\[house design\]* MagicPath is a good fit for the *block factory* role in a registry you own, and a bad fit for anything load-bearing. Use it where the cost of a bad output is "regenerate it", which is the interior of a single block. Do not let it own the tag, the schema, the version, or the page. The strongest reason to reach for it over Builder.io or Plasmic is also the simplest: those tools want to own the registry and the runtime, and MagicPath does not want to own either, which leaves the architecture in this essay intact.

## 13 · What to build first

If you take nothing else, take the order. Almost every expensive mistake in this space is a late decision made early or an early decision made late. *\[house design\]*

- **Day one**: A frozen object literal, a flat block list, ids minted at creation, unknown tags dropped and logged. Twenty lines. Ship it and render three real pages through it.
- **Week one**: Move to entries: tag, schema, component, defaults. One safeParse at the edge. A gallery route that renders every entry at its defaults. A test asserting no duplicate tags.
- **Month one**: Generated editor forms from the same schema. Per-block error boundaries. The four validation points from §05, with the remedies written down. Versioned tags and the first migrate .
- **When it hurts**: Lazy entries — when the bundle says so, not before. Slots — when authors ask, not before. A resolver — when personalisation arrives. Remote manifests — when someone outside your repo must ship a block.
- **Probably never**: A typed cross-platform transport, unless you have three clients that must agree. A generic payload type. A structural dispatcher. A registry that can load code from a URL you do not sign.

The registry is a table with two columns. Everything else in this essay is an argument about how to keep it honest for longer than a year.

## 14 · Sources

- [A deep dive into Airbnb's server-driven UI system](https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5) — Ghost Platform: `SectionContainer`, `SectionComponentType`, the GraphQL section union, typed actions. Read here via the [InfoQ summary](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/), which carries the quoted phrases; the Medium original returned 403 to this machine.
- [The journey to server-driven UI at Lyft Bikes and Scooters](https://eng.lyft.com/the-journey-to-server-driven-ui-at-lyft-bikes-and-scooters-c19264a0378e) — Canvas, and the protobuf choice for compact encoding and versioning.
- [Server-driven UI: a 2026 guide to architecture and examples](https://www.weweb.io/blog/server-driven-ui-guide-architecture-examples) — the registry-as-lookup-table framing, the explicit-type vs generic-descriptor split, and Yelp's CHAOS (`chaos.button.v1`).
- [Schema-driven UI: what it actually looks like in production](https://medium.com/@gokulgangadharanp/schema-driven-ui-what-it-actually-looks-like-in-production-8372e01424d5) — the schema / resolver / registry / renderer four-layer decomposition used in §01. (Fetched 403; the layering is quoted from the search index summary.)
- [Puck — Data](https://puckeditor.com/docs/api-reference/data) and the [Puck README](https://github.com/puckeditor/puck) — `config.components` with `fields` + `render`, the `content`/`root`/`zones` data format, `props.id`, and the deprecation of `zones` in favour of slot fields.
- [Payload CMS — Blocks field](https://payloadcms.com/docs/fields/blocks) — `slug` saved as `blockType`, one block config per file.
- [Builder.io — Register custom components](https://www.builder.io/c/docs/custom-components-setup) — `registerComponent(component, { name, inputs, image })` and the `dynamic(() => import(...))` registration.
- [Plasmic — Registering code components](https://docs.plasmic.app/learn/registering-code-components/) — component plus metadata with typed prop definitions.
- [Zod — defining schemas](https://zod.dev/api) — `z.discriminatedUnion()` and why a discriminator key makes parsing cheaper and errors precise.
- [magicpath.ai](https://www.magicpath.ai/) — the tagline quoted in §11. The documentation and pricing pages render client-side and returned no prose to a plain fetch on 28 September 2026.
- `npx -y magicpath-ai --help`, `add --help`, `code --help` — run on this machine, 28 September 2026. Source of every command name, flag, default path and example generated name in §11–§12.
- `~/.claude/skills/magicpath/SKILL.md` — the MagicPath agent skill published by MagicPathAI ([MagicPathAI/agent-skills](https://github.com/MagicPathAI/agent-skills)). Source of the editable-file restriction, the design defaults, themes-as-design-systems, and the repository-import flow.
- [MagicPath 2.0 review](https://www.banani.co/blog/magicpath-ai-review) (Banani, 2026) — the third-party source for pricing tiers, credit metering, and React-only code output. Competitor-authored; treat accordingly.

**Provenance.** The architecture in §01–§10 is a synthesis: the four-layer decomposition, the Airbnb/Lyft/Yelp/Puck/Payload/Builder/Plasmic details and the Zod behaviour are sourced above; the entry field list, the adapter pattern, the must-ignore/must-understand split, the two-registry RSC rule, the depth limit and the build order in §13 are my recommendations, marked *\[house design\]*, and are not claims about what any named company does. §11 is grounded in CLI output I produced on 28 September 2026 and in MagicPath's own published agent skill; I did not read MagicPath's documentation site, which renders client-side and returned no prose to a plain fetch, and I have not run a MagicPath generation or installed a component, so nothing here is a measurement of output quality. Pricing is third-party and unverified. Two sources — the Airbnb Medium post and the schema-driven-UI Medium post — returned 403 to this machine and are quoted through summaries, which is a weaker citation than I would like and is marked as such at each use.
