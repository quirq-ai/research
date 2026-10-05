import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RepoMap } from "@/RepoMap"
import { EDGES, LANES, ON_PRODUCTS, REPOS } from "@/repos"

/** Where a claim comes from: a path in this repo at `sha` (optionally with a #L anchor), or a full
 *  https URL pinned to a commit in another repo. */
type Source = string | string[]

/** One repo's page content, written from the repo at `sha` (see src/pages/*.json). */
export type PageData = {
  id: string; sha: string; language: string; summary: string
  how_it_works: { title: string; text: string; source: Source }[]
  key_files: { path: string; what: string }[]
  try_it: { commands: string[]; source: string; note?: string }
  status: { text: string; source: Source }[]
  readme_url: string
}

const PAGES = Object.fromEntries(Object.values(import.meta.glob<PageData>("./pages/*.json", { eager: true, import: "default" })).map(p => [p.id, p]))

/** Repos in map order: lane by lane, top to bottom. */
export const ORDER = Object.keys(REPOS).sort((a, b) => REPOS[a].lane - REPOS[b].lane || REPOS[a].row - REPOS[b].row)

function Src({ repo, sha, path }: { repo: string; sha: string; path: string }) {
  if (path.startsWith("https://")) {
    const m = path.match(/github\.com\/quirq-ai\/([^/]+)\/blob\/[0-9a-f]{40}\/(.+)$/)
    return <a href={path} target="_blank" rel="noreferrer" className="font-mono text-xs">{m ? `${m[1]}: ${m[2]}` : path}</a>
  }
  return <a href={`https://github.com/quirq-ai/${repo}/blob/${sha}/${path}`} target="_blank" rel="noreferrer" className="font-mono text-xs">{path}</a>
}

function Srcs({ repo, sha, source }: { repo: string; sha: string; source: Source }) {
  const list = Array.isArray(source) ? source : [source]
  return <>{list.map((s, i) => <span key={s}>{i > 0 && ", "}<Src repo={repo} sha={sha} path={s} /></span>)}</>
}

function RepoLink({ id }: { id: string }) {
  return <a href={`#repo/${id}`} className="font-mono">{id}</a>
}

export function RepoPage({ id }: { id: string }) {
  const r = REPOS[id], p = PAGES[id]
  const i = ORDER.indexOf(id), prev = ORDER[(i + ORDER.length - 1) % ORDER.length], next = ORDER[(i + 1) % ORDER.length]
  const uses = EDGES.filter(e => e[0] === id), by = EDGES.filter(e => e[1] === id)

  return (
    <article className="grid gap-5">
      <nav className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild><a href="#repos" className="no-underline hover:no-underline"><ArrowLeftIcon /> All repos</a></Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild><a href={`#repo/${prev}`} className="no-underline hover:no-underline" aria-label={`Previous repo: ${prev}`}><ArrowLeftIcon /> {prev}</a></Button>
          <Button variant="outline" size="sm" asChild><a href={`#repo/${next}`} className="no-underline hover:no-underline" aria-label={`Next repo: ${next}`}>{next} <ArrowRightIcon /></a></Button>
        </div>
      </nav>

      <header className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{LANES[r.lane]}</Badge>
          {p && <Badge variant="outline">{p.language}</Badge>}
          <Badge variant="outline">Chromium: {r.counterpart}</Badge>
        </div>
        <h2 className="font-mono text-[26px] leading-tight font-semibold">{id}</h2>
        <p className="text-lg">{p ? p.summary : r.role}</p>
        <a href={`https://github.com/quirq-ai/${id}`} target="_blank" rel="noreferrer">github.com/quirq-ai/{id}</a>
      </header>

      <section className="grid gap-2">
        <h3 className="text-lg font-semibold">Where it sits</h3>
        <p className="text-sm text-muted-foreground">{id} and the repos it is linked to are lit. Tap another box to look around, or open its page from the card below the map.</p>
        <RepoMap key={id} focus={id} />
      </section>

      {(uses.length > 0 || by.length > 0 || ON_PRODUCTS[id]) && (
        <section className="grid gap-2">
          <h3 className="text-lg font-semibold">Links to other repos</h3>
          <ul className="list-disc pl-5 [&_li]:mb-1">
            {uses.map(([, to, why]) => <li key={"u" + to}>{id} {why} <RepoLink id={to} />.</li>)}
            {by.map(([from, , why]) => <li key={"b" + from}><RepoLink id={from} /> {why} {id}.</li>)}
            {ON_PRODUCTS[id] && <li>In the product repos, {id} {ON_PRODUCTS[id]}.</li>}
          </ul>
        </section>
      )}

      {p && (<>
        <section className="grid gap-3">
          <h3 className="text-lg font-semibold">How it works</h3>
          {p.how_it_works.map(h => (
            <Card key={h.title} className="gap-2 py-4 shadow-none">
              <CardHeader className="px-4"><CardTitle className="text-base">{h.title}</CardTitle></CardHeader>
              <CardContent className="grid gap-1 px-4 text-[15px] leading-relaxed">
                <p>{h.text}</p>
                <div className="text-muted-foreground">Source: <Srcs repo={id} sha={p.sha} source={h.source} /></div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-2">
          <h3 className="text-lg font-semibold">Key files</h3>
          <Table>
            <TableHeader><TableRow><TableHead>File</TableHead><TableHead>What it is</TableHead></TableRow></TableHeader>
            <TableBody>{p.key_files.map(f => (
              <TableRow key={f.path}><TableCell className="align-top"><Src repo={id} sha={p.sha} path={f.path} /></TableCell><TableCell className="whitespace-normal">{f.what}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </section>

        {p.try_it.commands.length > 0 && (
          <section className="grid gap-2">
            <h3 className="text-lg font-semibold">Try it</h3>
            <p className="text-sm text-muted-foreground">Paste in a terminal at the top of a clone of {id}. It needs python3 at 3.11 or newer (3.11.4 for depot) and works in a virtual environment, .venv, inside the clone.{p.try_it.note && <> {p.try_it.note}</>} Source: <Src repo={id} sha={p.sha} path={p.try_it.source} /></p>
            <pre className="m-0 overflow-x-auto rounded-lg bg-code p-4 font-mono text-[13px] leading-relaxed text-code-foreground">{p.try_it.commands.join("\n")}</pre>
          </section>
        )}

        <section className="grid gap-2">
          <h3 className="text-lg font-semibold">Status and limits</h3>
          <ul className="list-disc pl-5 [&_li]:mb-1.5">
            {p.status.map(s => <li key={s.text}>{s.text} <span className="text-muted-foreground">(<Srcs repo={id} sha={p.sha} source={s.source} />)</span></li>)}
          </ul>
        </section>

        <p className="text-[13px] text-muted-foreground">Written from {id} at <a href={`https://github.com/quirq-ai/${id}/tree/${p.sha}`} target="_blank" rel="noreferrer" className="font-mono">{p.sha.slice(0, 12)}</a>. Start with its <a href={p.readme_url} target="_blank" rel="noreferrer">README</a>.</p>
      </>)}
    </article>
  )
}
