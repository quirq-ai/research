import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { EDGES, FLOW, LANES, ON_PRODUCTS, REPOS } from "@/repos"

const W = 150, H = 46, LANE_X = [44, 226, 408, 590], ROW_Y = (r: number) => 70 + r * 58
const PRODUCTS = { x: 44, y: 376, w: 696, h: 52 }

type Sel = { kind: "none" } | { kind: "repo"; id: string } | { kind: "flow"; at: number }

function box(id: string) {
  const r = REPOS[id], x = LANE_X[r.lane], y = ROW_Y(r.row)
  return { x, y, cx: x + W / 2, cy: y + H / 2 }
}

/** Where the line from b's centre towards a leaves box b. */
function exitPoint(a: ReturnType<typeof box>, b: ReturnType<typeof box>): [number, number] {
  const dx = a.cx - b.cx, dy = a.cy - b.cy
  const s = Math.min(dx ? W / 2 / Math.abs(dx) : Infinity, dy ? H / 2 / Math.abs(dy) : Infinity)
  return [b.cx + dx * s, b.cy + dy * s]
}

function edgePath(from: string, to: string) {
  const a = box(from), b = box(to), la = REPOS[from].lane, lb = REPOS[to].lane
  if (la === lb) return `M${a.x} ${a.cy}C${a.x - 34} ${a.cy} ${a.x - 34} ${b.cy} ${a.x - 2} ${b.cy}`
  if (Math.abs(la - lb) > 1) {
    const top = Math.min(a.y, b.y) - 14
    return `M${a.x} ${a.y + 10}C${a.x - 40} ${top} ${b.x + W + 40} ${top} ${b.x + W} ${b.y + 10}`
  }
  const p = exitPoint(b, a), q = exitPoint(a, b)
  return `M${p[0]} ${p[1]}L${q[0]} ${q[1]}`
}

function Chip({ id, onPick }: { id: string; onPick: (id: string) => void }) {
  return <Button variant="outline" size="sm" className="h-6 rounded-full px-2.5 font-mono text-xs" onClick={() => onPick(id)}>{id}</Button>
}

/** focus: start with this repo selected (used on a repo's own page). */
export function RepoMap({ focus }: { focus?: string }) {
  const [sel, setSel] = useState<Sel>(focus ? { kind: "repo", id: focus } : { kind: "none" })

  let litNodes: string[] | null = null, litEdges: [string, string][] = []
  if (sel.kind === "flow") { litNodes = FLOW[sel.at].nodes; litEdges = FLOW[sel.at].edges }
  if (sel.kind === "repo") {
    if (sel.id === "products") { litNodes = [...Object.keys(ON_PRODUCTS), "products"] }
    else {
      const touching = EDGES.filter(([a, b]) => a === sel.id || b === sel.id)
      litEdges = touching.map(([a, b]) => [a, b])
      litNodes = [sel.id, ...touching.flatMap(([a, b]) => [a, b]), ...(ON_PRODUCTS[sel.id] ? ["products"] : [])]
    }
  }
  const isLit = (id: string) => litNodes === null || litNodes.includes(id)
  const edgeLit = (a: string, b: string) => litEdges.some(([x, y]) => x === a && y === b)
  const selected = sel.kind === "repo" ? sel.id : null
  const pick = (id: string) => setSel({ kind: "repo", id })
  const nodeKeys = (id: string) => ({
    tabIndex: 0, role: "button", "aria-label": id === "products" ? "Product repos: innernet and xo-space" : `${id}: ${REPOS[id].sub}`,
    onClick: () => pick(id),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(id) } },
  })

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {sel.kind === "flow" ? (<>
          <Button variant="secondary" disabled={sel.at === 0} onClick={() => setSel({ kind: "flow", at: sel.at - 1 })}>Back</Button>
          <Button onClick={() => setSel({ kind: "flow", at: (sel.at + 1) % FLOW.length })}>{sel.at === FLOW.length - 1 ? "Start again" : "Next step"}</Button>
          <Badge variant="outline" className="self-center font-mono">Step {sel.at + 1} of {FLOW.length}</Badge>
        </>) : <Button onClick={() => setSel({ kind: "flow", at: 0 })}>Follow a change</Button>}
        <Button variant="ghost" onClick={() => setSel({ kind: "none" })}>Show everything</Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <svg viewBox="0 0 760 452" className="block h-auto w-full min-w-[640px]" role="group" aria-label="Map of the qq repos and how they use each other">
          <defs>
            {(["dim", "lit"] as const).map(k => (
              <marker key={k} id={`qq-arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" className={k === "lit" ? "fill-primary" : "fill-border"} />
              </marker>))}
          </defs>
          {LANES.map((l, i) => <text key={l} x={LANE_X[i]} y={46} className="fill-muted-foreground font-mono text-[11px] font-semibold uppercase tracking-widest">{l}</text>)}
          <g fill="none">
            {EDGES.map(([a, b]) => {
              const on = edgeLit(a, b), dim = litNodes !== null && !on
              return <path key={a + b} d={edgePath(a, b)} markerEnd={`url(#qq-arrow-${on ? "lit" : "dim"})`}
                className={cn("transition-opacity", on ? "stroke-primary" : "stroke-border", dim && "opacity-20")} strokeWidth={on ? 2 : 1.2} />
            })}
          </g>
          {Object.entries(REPOS).map(([id, r]) => {
            const b = box(id), on = selected === id
            return (
              <g key={id} {...nodeKeys(id)} className={cn("cursor-pointer outline-none transition-opacity [&:focus-visible_rect]:stroke-primary", !isLit(id) && "opacity-30")}>
                <rect x={b.x} y={b.y} width={W} height={H} rx={8} className={cn(on ? "fill-accent stroke-primary" : "fill-card stroke-border hover:stroke-primary")} strokeWidth={on ? 2.5 : 1.25} />
                <text x={b.x + 12} y={b.y + 20} className="fill-foreground font-mono text-[13px] font-medium">{id}</text>
                <text x={b.x + 12} y={b.y + 36} className="fill-muted-foreground text-[10.5px]">{r.sub}</text>
              </g>)
          })}
          <g {...nodeKeys("products")} className={cn("cursor-pointer outline-none transition-opacity [&:focus-visible_rect]:stroke-primary", !isLit("products") && "opacity-30")}>
            <rect x={PRODUCTS.x} y={PRODUCTS.y} width={PRODUCTS.w} height={PRODUCTS.h} rx={8} className={cn(selected === "products" ? "fill-accent stroke-primary" : "fill-muted stroke-border")} strokeWidth={selected === "products" ? 2.5 : 1.25} />
            <text x={60} y={398} className="fill-foreground font-mono text-[13px] font-medium">innernet · xo-space</text>
            <text x={60} y={415} className="fill-muted-foreground text-[10.5px]">the product repos you work on: a manifest, infra/repo.toml, plus CI workflows generated by infra-config</text>
          </g>
        </svg>
      </Card>

      <Card aria-live="polite">
        {sel.kind === "none" && (<CardHeader>
          <CardTitle>13 repos, one loop</CardTitle>
          <CardDescription>The left lanes run before your change lands; the right lanes keep main green and, later, ship it. Arrows point from a repo to what it uses. Tap any box, or follow a change step by step.</CardDescription>
        </CardHeader>)}
        {sel.kind === "flow" && (<CardHeader>
          <CardDescription className="font-mono text-xs uppercase tracking-wider">Step {sel.at + 1} of {FLOW.length}</CardDescription>
          <CardTitle>{FLOW[sel.at].title}</CardTitle>
          <p className="text-sm leading-relaxed">{FLOW[sel.at].text}</p>
        </CardHeader>)}
        {sel.kind === "repo" && sel.id === "products" && (<>
          <CardHeader><CardTitle className="font-mono">innernet and xo-space</CardTitle>
            <CardDescription>The repos you change. Each keeps a manifest, infra/repo.toml, and CI workflows generated by infra-config that must not be hand-edited. xo-space still has a few hand-written workflows from before qq.</CardDescription></CardHeader>
          <CardContent className="grid gap-1.5 text-sm">
            <Label>What acts on them</Label>
            {Object.entries(ON_PRODUCTS).map(([id, what]) => <div key={id} className="flex flex-wrap items-center gap-2"><Chip id={id} onPick={pick} />{what}</div>)}
          </CardContent></>)}
        {sel.kind === "repo" && sel.id !== "products" && <RepoDetail id={sel.id} onPick={pick} here={focus === sel.id} />}
      </Card>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{children}</div>
}

function RepoDetail({ id, onPick, here }: { id: string; onPick: (id: string) => void; here?: boolean }) {
  const r = REPOS[id], uses = EDGES.filter(e => e[0] === id), by = EDGES.filter(e => e[1] === id)
  return (<>
    <CardHeader><CardTitle className="font-mono">{id}</CardTitle><CardDescription className="text-foreground/90">{r.role}</CardDescription></CardHeader>
    <CardContent className="grid gap-1.5 text-sm">
      {uses.length > 0 && <><Label>Uses</Label>{uses.map(([, to, why]) => <div key={to} className="flex flex-wrap items-center gap-2">{why}<Chip id={to} onPick={onPick} /></div>)}</>}
      {by.length > 0 && <><Label>Used by</Label>{by.map(([from, , why]) => <div key={from} className="flex flex-wrap items-center gap-2"><Chip id={from} onPick={onPick} />{why} it</div>)}</>}
      {ON_PRODUCTS[id] && <><Label>In the product repos</Label><div>{ON_PRODUCTS[id]}</div></>}
      <Label>Chromium counterpart</Label><div>{r.counterpart}</div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!here && <Button asChild><a href={`#repo/${id}`} className="no-underline hover:no-underline">Open the {id} page</a></Button>}
        <a href={`https://github.com/quirq-ai/${id}`} target="_blank" rel="noreferrer">github.com/quirq-ai/{id}</a>
      </div>
    </CardContent></>)
}
