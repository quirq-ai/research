import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RepoMap } from "@/RepoMap"
import { ORDER, RepoPage } from "@/RepoPage"
import { AlphaChecklist, BeforeAlpha } from "@/Alpha"
import { LANES, REPOS } from "@/repos"

/* ---------- content ---------- */

const COMMANDS: [string, string][] = [
  ["qq --version", "Shows the qq this repo pins (installed on first use)."],
  ["qq fetch URL [DIR]", "Clones a repo, then runs qq sync in it."],
  ["qq sync", "Downloads every pinned toolchain and dependency, checks digests, links them under .qq/."],
  ["qq build [TARGET…]", "Builds targets through recipes."],
  ["qq test [TARGET…]", "Builds and tests; results in .qq/out."],
  ["qq upload [--draft]", "Pushes this branch and opens or updates its PR."],
  ["qq try", "Uploads, prints a run ID, returns; the verdict arrives later."],
  ["qq status", "The verdict now: exit 0 pass or landed, 1 refused or closed, 3 pending; 2 means qq could not get one and says why."],
  ["qq land", "Lands through the merge queue once the checks pass; returns at once."],
]

const GLOSSARY: [string, string][] = [
  ["Gate", "The set of checks a change must pass before it may land."],
  ["Verdict", "The answer for a change: pass, refused or pending from qq status (landed or closed once the PR is merged or closed); the watcher can also report dequeued (the queue dropped it), superseded (a newer push replaced it), timed-out or error."],
  ["Merge queue", "GitHub's line of PRs waiting to land; each is tested on top of the ones ahead of it."],
  ["Manifest", "infra/repo.toml: what a repo is, which toolchains and dependencies it pins, which targets it has."],
  ["Pin", "An exact toolchain or dependency version, fixed by a digest so everyone gets the same bytes."],
  ["Roll", "A PR that moves a pin forward."],
  ["Post-submit", "The build and tests that run on each push to main, after a change lands."],
  ["Tree status", "Open when every post-submit builder is green, closed while any is red, unknown while one has no result."],
  ["Gardener", "The agent and service that keeps main green: tree status, bisection, revert PRs."],
  ["Failure record", "A stored note for each revert or held canary, linking culprit and fix, mirrored to a GitHub issue."],
  ["lkgr", "Last known good revision: the newest main commit whose post-submit is all green."],
  ["Canary", "The daily build from lkgr: tested and health-checked before the canary channel moves to it."],
]

const LIMITS = [
  "Toolchains are built for Linux x86_64 only; on macOS, qq sync stops at the toolchains and you install Node and pnpm or Python yourself.",
  "CI installs its own tools instead of running through qq, so local and CI tools can differ (innernet: pnpm 10 in CI, 11.28.2 in qq).",
  "A single failing test fails the required check (no retry); retry and compare-with-base exist in test-pipelines but are not switched on for the product repos.",
  "perf polls main every 30 minutes instead of running in post-submit, so its records can lag.",
  "There is no qq run yet.",
  "On xo-space, auto-merge is off, so qq land cannot queue there; changes land with Merge when ready on GitHub.",
  "gardener cannot open revert PRs until its GitHub App exists; even then, a person merges each revert.",
  "No review is required on product PRs yet.",
  "Only the canary channel can move in v0; dev and stable are declared but refused. The installer resolves nothing until the first canary ships.",
]

/** The commits this page was checked against on 5 October 2026. */
const SOURCES: [string, string][] = [
  ["depot", "741967cc7fba1e486a65856b05c4abb2b1486b8b"], ["sync", "d97e2f747cfa7dd04fac3cd8e9973eb7eab091dd"], ["recipes", "db6ce0a19ea0adb6bc71cd553524064bdd18d5b0"],
  ["toolchains", "44f8f959458eab59baf46cbae5866a36657f7eeb"], ["remote-build", "62b2f04865ffbba5dafd0ab23ce4c1ae253de33e"], ["infra-config", "310e3264f5de3cd9822b3a4712ae0a372b97dac3"],
  ["gate", "c3721365186a35c4b2b5acdc0635e281e754ac13"], ["test-pipelines", "a642399644ee4a463168773cacd5eabd48ac5a16"], ["gardener", "bf7d24d0fd81ec02c51051e63f46971455b596f2"],
  ["rollers", "4285aa4dd3211eda2df28d2bd4bebb2267a01f0d"], ["perf", "d1d9765ea65df2b7d4824fd3845fdf371907857c"], ["release", "83ef917771375ae0d1ed51829c9e762a57e01e7e"],
  ["installer", "d39f30201c32d41052f61d2e592bc0fd7f295440"], ["innernet", "8f383a3d6c28f1e4495ff177efe70dca43d17604"], ["xo-space", "14b21a41668bc8124b4cf5cf9cd59fb44dc7d419"],
]

const TABS = ["map", "repos", "alpha", "before", "reference"]

/** The view lives in the URL hash (#map, #repos, #reference or #repo/<name>), so every view can be linked. */
function useRoute() {
  const read = () => location.hash.slice(1) || "map"
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => { setRoute(read()); scrollTo(0, 0) }
    addEventListener("hashchange", on); return () => removeEventListener("hashchange", on)
  }, [])
  return route
}

/* ---------- page ---------- */

export default function App() {
  const route = useRoute()
  const repo = route.startsWith("repo/") ? route.slice(5) : null
  const tab = TABS.includes(route) ? route : "map"
  const byLane = LANES.map((lane, i) => ({ lane, repos: Object.entries(REPOS).filter(([, r]) => r.lane === i).sort((a, b) => a[1].row - b[1].row) }))

  return (
    <main className="mx-auto max-w-3xl px-4 pt-7 pb-16">
      <header className="mb-5 grid gap-2.5">
        <span className="font-mono text-xs font-medium tracking-[0.12em] text-primary uppercase">quirq research · infra</span>
        <h1 className="text-[28px] leading-tight font-semibold">How quirq infra fits together</h1>
        <p className="text-muted-foreground">quirq infra (<b>qq</b>) is the build, test and land system behind the quirq repos, modelled on Chromium's. It is 13 public repos. This page maps what each one does, how they use each other, and how one change travels through them. If you are in the qq alpha, the <a href="#alpha">Alpha checklist</a> takes you from install to your change shipping in the canary.</p>
      </header>

      {repo && ORDER.includes(repo) ? <RepoPage id={repo} /> :
      <Tabs value={tab} onValueChange={v => { location.hash = v }} className="gap-5">
        <TabsList className="sticky top-[env(safe-area-inset-top,0px)] z-10 w-full flex-wrap justify-start group-data-[orientation=horizontal]/tabs:h-auto">
          <TabsTrigger className="flex-none text-muted-foreground" value="map">Map</TabsTrigger>
          <TabsTrigger className="flex-none text-muted-foreground" value="repos">All repos</TabsTrigger>
          <TabsTrigger className="flex-none text-muted-foreground" value="alpha">Alpha checklist</TabsTrigger>
          <TabsTrigger className="flex-none text-muted-foreground" value="before">Before alpha</TabsTrigger>
          <TabsTrigger className="flex-none text-muted-foreground" value="reference">Commands and terms</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="grid gap-4">
          <div><h2 className="text-xl font-semibold">The 13 repos and their links</h2>
            <p className="mt-1 text-muted-foreground">Tap a repo to see its job and what it uses, then open its page. Press <b>Follow a change</b> to watch one PR travel through the system, one step at a time.</p></div>
          <RepoMap />
        </TabsContent>

        <TabsContent value="repos" className="grid gap-5">
          <p className="text-muted-foreground">The same 13 repos as a list, grouped by when they act on a change. Tap a name to open that repo's own page: how it works, its key files, how to try it and its limits. The last column names the Chromium piece each one is modelled on.</p>
          {byLane.map(({ lane, repos }) => (
            <section key={lane} className="grid gap-2">
              <h2 className="text-lg font-semibold">{lane}</h2>
              <Table>
                <TableHeader><TableRow><TableHead>Repo</TableHead><TableHead>What it does</TableHead><TableHead>Chromium</TableHead></TableRow></TableHeader>
                <TableBody>{repos.map(([id, r]) => (
                  <TableRow key={id}>
                    <TableCell className="align-top"><a href={`#repo/${id}`} className="font-mono">{id}</a></TableCell>
                    <TableCell className="align-top whitespace-normal">{r.role}</TableCell>
                    <TableCell className="align-top whitespace-normal text-muted-foreground">{r.counterpart}</TableCell>
                  </TableRow>))}
                </TableBody>
              </Table>
            </section>
          ))}
          <p className="text-sm text-muted-foreground">The product repos that use them, <a href="https://github.com/quirq-ai/innernet" target="_blank" rel="noreferrer">innernet</a> (Next.js) and <a href="https://github.com/quirq-ai/xo-space" target="_blank" rel="noreferrer">xo-space</a> (Python), each keep a manifest, <code>infra/repo.toml</code>, plus CI workflows generated by infra-config and roll workflows generated by rollers.</p>
        </TabsContent>

        <TabsContent value="alpha" className="min-w-0"><AlphaChecklist /></TabsContent>

        <TabsContent value="before" className="min-w-0"><BeforeAlpha /></TabsContent>

        <TabsContent value="reference" className="grid gap-4">
          <h2 className="text-xl font-semibold">Commands</h2>
          <Table>
            <TableHeader><TableRow><TableHead>Command</TableHead><TableHead>What it does</TableHead></TableRow></TableHeader>
            <TableBody>{COMMANDS.map(([c, d]) => <TableRow key={c}><TableCell className="align-top"><code>{c}</code></TableCell><TableCell className="whitespace-normal">{d}</TableCell></TableRow>)}</TableBody>
          </Table>
          <h2 className="text-xl font-semibold">Terms</h2>
          <dl className="grid gap-2.5">{GLOSSARY.map(([t, d]) => <div key={t}><dt className="font-semibold">{t}</dt><dd className="text-muted-foreground">{d}</dd></div>)}</dl>
          <h2 className="text-xl font-semibold">Known limits</h2>
          <ul className="list-disc pl-5 [&_li]:mb-1">{LIMITS.map(l => <li key={l}>{l}</li>)}</ul>
        </TabsContent>
      </Tabs>}

      <Separator className="mt-10 mb-4" />
      <footer className="grid gap-2 text-[13px] text-muted-foreground">
        <p>Sources: each repo's README, pinned dependencies (pyproject.toml, pins.toml) and live repo settings, checked on 5 October 2026 at these main commits:</p>
        <div className="flex flex-wrap gap-1.5">{SOURCES.map(([r, sha]) =>
          <a key={r} href={`https://github.com/quirq-ai/${r}/tree/${sha}`} target="_blank" rel="noreferrer"><Badge variant="outline" className="font-mono">{r} {sha.slice(0, 12)}</Badge></a>)}</div>
        <p>Part of the <a href="https://github.com/quirq-ai/research/tree/main/infra" target="_blank" rel="noreferrer">infra topic</a> in quirq-ai/research.</p>
      </footer>
    </main>
  )
}
