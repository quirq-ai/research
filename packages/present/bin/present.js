#!/usr/bin/env node
// Default presentation for a research topic.
//
// Run from a topic folder:
//   present build   render README.md, GOAL.md and output/{onepager,slide,report}
//                   into a static site in dist/, and add each built app
//   present dev     build, then serve dist/ on $PORT (default 3000)
//
// Markdown files become .html pages; any other file under those output folders
// (a PDF, an image, an HTML deck) is copied as-is. The README.md in each
// output folder only describes the format, so it is skipped.
//
// Each app in output/app/<name>/ that has been built to output/app/<name>/dist/
// is copied to dist/output/app/<name>/, so links to output/app/<name>/ open the
// running app. List the app as a devDependency of the topic so Turborepo builds
// it first, and give it relative asset paths (Vite: base: "./").

import { createServer } from "node:http"
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path"
import { escapeHtml, page, repoUrl, siteFooter, siteHeader } from "@research/theme"
import { marked } from "marked"
import { overview } from "../lib/overview.js"
import { readingLayout } from "../lib/reading.js"

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

// Apps under output/app/ that have a built dist/index.html, by folder name.
function collectApps() {
  const appsDir = join(topicDir, "output", "app")
  if (!existsSync(appsDir)) return []
  return readdirSync(appsDir)
    .filter((name) => statSync(join(appsDir, name)).isDirectory())
    .filter((name) => {
      if (existsSync(join(appsDir, name, "dist", "index.html"))) return true
      if (existsSync(join(appsDir, name, "package.json"))) {
        console.warn(`present: output/app/${name}/ has no dist/index.html; build it first (list it as a devDependency)`)
      }
      return false
    })
    .sort()
}

function outPath(src) {
  const rel = relative(topicDir, src)
  if (rel === "README.md") return "index.html"
  return extname(rel) === ".md" ? rel.slice(0, -3) + ".html" : rel
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

// Tables sit in a scroll box, so wide ones scroll instead of squeezing their columns.
const wrapTables = (html) => html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>")

// Pages use the shared quirq theme: the site header links back to the hub,
// and a topic bar lists this topic's pages.
function layout({ title, body, nav, current }) {
  const depth = current.split("/").length - 1
  const up = depth ? "../".repeat(depth) : ""
  const links = nav
    .map(([href, label]) => {
      const active = href === current || (href.endsWith("/") && current.startsWith(href))
      return `<a href="${up}${href}"${active ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`
    })
    .join("")
  return page({
    title: title === topic ? `${topic} · quirq research` : `${title} · ${topic}`,
    body: `${siteHeader({ nav: [["/#topics", "Topics"], [repoUrl, "GitHub"]] })}
<div class="topic-bar"><div class="container">
<span class="crumb"><a href="/">Research</a> / <a href="${up}index.html" class="here">${escapeHtml(topic)}</a></span>
<nav class="site-nav" aria-label="${escapeHtml(topic)}">${links}</nav>
</div></div>
<main>
${wrapTables(body)}
</main>
${siteFooter()}`,
  })
}

function build() {
  const { pages, assets } = collect()
  const apps = collectApps()
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const published = new Map(pages.map((src) => [relative(topicDir, src).split(sep).join("/"), outPath(src)]))
  const nav = [["index.html", "Overview"]]
  if (published.has("GOAL.md")) nav.push(["GOAL.html", "Goal"])
  for (const format of formatDirs) {
    const first = [...published.entries()].find(([rel]) => rel.startsWith(`output/${format}/`))
    if (first) nav.push([first[1], format[0].toUpperCase() + format.slice(1)])
  }
  if (apps.length) nav.push([`output/app/${apps[0]}/`, apps.length > 1 ? "Apps" : "App"])

  for (const src of pages) {
    const rel = relative(topicDir, src)
    const markdown = readFileSync(src, "utf8")
    // The README becomes a visual overview; other pages get the reading layout.
    const visual = rel === "README.md" ? overview(markdown, topic) : null
    const title = visual?.title ?? markdown.match(/^#\s+(.+)$/m)?.[1] ?? topic
    const body = visual ? rewriteLinks(visual.html, rel, published) : readingLayout(rewriteLinks(marked.parse(markdown), rel, published), markdown)
    const dest = join(outDir, outPath(src))
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, layout({ title, body, nav, current: outPath(src) }))
  }
  for (const src of assets) {
    const dest = join(outDir, outPath(src))
    mkdirSync(dirname(dest), { recursive: true })
    cpSync(src, dest)
  }
  for (const name of apps) {
    cpSync(join(topicDir, "output", "app", name, "dist"), join(outDir, "output", "app", name), { recursive: true })
  }
  console.log(`present: wrote ${pages.length} page(s), ${assets.length} file(s) and ${apps.length} app(s) to ${relative(process.cwd(), outDir)}/`)
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
