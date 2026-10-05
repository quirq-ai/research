#!/usr/bin/env node
// Default presentation for a research topic.
//
// Run from a topic folder:
//   present build   render README.md, GOAL.md and output/{onepager,slide,report}
//                   into a static site in dist/
//   present dev     build, then serve dist/ on $PORT (default 3000)
//
// Markdown files become .html pages; any other file under those output folders
// (a PDF, an image, an HTML deck) is copied as-is. The README.md in each
// output folder only describes the format, so it is skipped.

import { createServer } from "node:http"
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path"
import { marked } from "marked"

const topicDir = process.cwd()
const outDir = join(topicDir, "dist")
const topic = basename(topicDir)
const formatDirs = ["onepager", "slide", "report"]

function walk(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

function collect() {
  const pages = []
  for (const name of ["README.md", "GOAL.md"]) {
    const path = join(topicDir, name)
    if (existsSync(path)) pages.push(path)
  }
  const assets = []
  for (const format of formatDirs) {
    for (const path of walk(join(topicDir, "output", format))) {
      if (basename(path) === "README.md" && dirname(path) === join(topicDir, "output", format)) continue
      ;(extname(path) === ".md" ? pages : assets).push(path)
    }
  }
  return { pages, assets }
}

function outPath(src) {
  const rel = relative(topicDir, src)
  if (rel === "README.md") return "index.html"
  return extname(rel) === ".md" ? rel.slice(0, -3) + ".html" : rel
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
}

// Point relative links at the rendered pages: foo.md -> foo.html, README.md -> index.html.
// Links that leave the published set (other topics, app source) go to GitHub-style
// relative paths unchanged, which is the best a static site can do.
function rewriteLinks(html, fromRel, published) {
  return html.replace(/href="([^"#:]+\.md)(#[^"]*)?"/g, (match, href, hash = "") => {
    const target = join(dirname(fromRel), href).split(sep).join("/")
    const mapped = published.get(target)
    if (!mapped) return match
    const link = relative(dirname(outPath(join(topicDir, fromRel))), mapped).split(sep).join("/") || "index.html"
    return `href="${link}${hash}"`
  })
}

function layout({ title, body, nav, depth }) {
  const up = depth ? "../".repeat(depth) : ""
  const links = nav.map(([href, label]) => `<a href="${up}${href}">${escapeHtml(label)}</a>`).join("")
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; --fg: #1b1b1f; --muted: #5f6068; --bg: #fdfdfc; --line: #e3e3e0; --accent: #2f5bd3; }
@media (prefers-color-scheme: dark) { :root { --fg: #ececee; --muted: #a0a1a8; --bg: #141416; --line: #2c2c31; --accent: #8aa8ff; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
header { border-bottom: 1px solid var(--line); }
header div, main { max-width: 760px; margin: 0 auto; padding: 0 16px; }
header div { display: flex; flex-wrap: wrap; gap: 16px; align-items: baseline; padding-block: 14px; }
header strong { margin-right: auto; }
header a { color: var(--muted); text-decoration: none; }
header a:hover { color: var(--fg); }
main { padding-block: 24px 64px; overflow-wrap: anywhere; }
a { color: var(--accent); }
table { border-collapse: collapse; display: block; overflow-x: auto; }
th, td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; }
pre { overflow-x: auto; padding: 12px; border: 1px solid var(--line); border-radius: 6px; }
code { font-size: 0.92em; }
</style>
</head>
<body>
<header><div><strong>${escapeHtml(topic)}</strong>${links}</div></header>
<main>
${body}
</main>
</body>
</html>
`
}

function build() {
  const { pages, assets } = collect()
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const published = new Map(pages.map((src) => [relative(topicDir, src).split(sep).join("/"), outPath(src)]))
  const nav = [["index.html", "Overview"]]
  if (published.has("GOAL.md")) nav.push(["GOAL.html", "Goal"])
  for (const format of formatDirs) {
    const first = [...published.entries()].find(([rel]) => rel.startsWith(`output/${format}/`))
    if (first) nav.push([first[1], format[0].toUpperCase() + format.slice(1)])
  }

  for (const src of pages) {
    const rel = relative(topicDir, src)
    const markdown = readFileSync(src, "utf8")
    const title = markdown.match(/^#\s+(.+)$/m)?.[1] ?? topic
    const body = rewriteLinks(marked.parse(markdown), rel, published)
    const dest = join(outDir, outPath(src))
    mkdirSync(dirname(dest), { recursive: true })
    const depth = outPath(src).split("/").length - 1
    writeFileSync(dest, layout({ title, body, nav, depth }))
  }
  for (const src of assets) {
    const dest = join(outDir, outPath(src))
    mkdirSync(dirname(dest), { recursive: true })
    cpSync(src, dest)
  }
  console.log(`present: wrote ${pages.length} page(s) and ${assets.length} file(s) to ${relative(process.cwd(), outDir)}/`)
}

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".pdf": "application/pdf" }

function serve() {
  const port = Number(process.env.PORT) || 3000
  createServer((req, res) => {
    let path = resolve(outDir, "." + decodeURIComponent(new URL(req.url, "http://x").pathname))
    if (!path.startsWith(outDir)) return res.writeHead(403).end()
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html")
    if (!existsSync(path)) return res.writeHead(404).end("Not found")
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" })
    res.end(readFileSync(path))
  }).listen(port, () => console.log(`present: serving ${topic} at http://localhost:${port}`))
}

const command = process.argv[2]
if (command === "build") build()
else if (command === "dev") {
  build()
  serve()
} else {
  console.error("usage: present <build|dev>")
  process.exit(2)
}
