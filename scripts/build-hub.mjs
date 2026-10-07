#!/usr/bin/env node
// Assemble the research hub: one static site with every topic under /<topic>/
// and an index page listing the topics.
//
// Usage, from the repo root, after `turbo run build`:
//   node scripts/build-hub.mjs          write the site to dist/
//   node scripts/build-hub.mjs serve    then serve dist/ on $PORT (default 3000)
//
// A topic is a top-level folder with a package.json, except _template/ and
// packages/. Each topic's own build must already have written <topic>/dist/.
// Title, one-line summary and status come from the topic's README.md.

import { createServer } from "node:http"
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { extname, join, resolve } from "node:path"
import { cover, escapeHtml, icon, page, repoUrl, siteFooter, siteHeader, statusBadge, topicMap } from "../packages/theme/index.mjs"
import { findTopics, published, readTopic, root } from "./lib/topics.mjs"

const outDir = join(root, "dist")

// Published work first, then work in progress, then the rest.
const statusOrder = ["Published", "Researching", "Proposed", "Paused", "Archived"]
const rank = (status) => (statusOrder.includes(status) ? statusOrder.indexOf(status) : statusOrder.length)

const formatLabels = { onepager: "One-pager", slide: "Slides", report: "Report", app: "App" }

function tile(t, placeholder) {
  const summary = t.summary && t.summary !== placeholder ? t.summary : "Scope being defined."
  const formats = t.formats.map((f) => icon(f, formatLabels[f] ?? f)).join("")
  return `<article class="tile">
${cover(t.slug)}
<div class="tile-body">
<div class="tile-head"><h3 class="tile-title"><a href="${t.slug}/">${escapeHtml(t.title)}</a></h3>${statusBadge(t.status)}</div>
<p class="tile-text">${escapeHtml(summary)}</p>
<div class="tile-foot"><span class="formats">${formats}</span><span class="go">${icon("arrow")}</span></div>
</div>
</article>`
}

const standards = [
  ["sourced", "Sourced", "Every claim links to a source."],
  ["reproducible", "Reproducible", "Numbers are re-run or cited."],
  ["candid", "Candid", "Limits and open questions stated."],
  ["shareable", "Shareable", "No secrets or private data."],
]

function indexPage(topics) {
  // The template's one-line summary means the topic has not written its own yet.
  const placeholder = readTopic("_template").summary
  const sorted = [...topics].sort((a, b) => rank(a.status) - rank(b.status) || a.slug.localeCompare(b.slug))
  const count = (status) => topics.filter((t) => t.status === status).length
  const legend = [
    ["published", count("Published"), "published"],
    ["researching", count("Researching"), "in research"],
    ["", topics.length - count("Published") - count("Researching"), "proposed"],
  ]
  const body = `${siteHeader({ nav: [["#topics", "Topics"], [repoUrl, "GitHub"]] })}
<main>
<section class="hero"><div class="container">
<div>
<p class="eyebrow">quirq research hub</p>
<h1>Research, <em>verified.</em></h1>
<p class="lede">Checked against sources. Safe to share.</p>
<div class="actions"><a class="button button-primary" href="#topics">Explore topics ${icon("arrow")}</a><a class="button" href="${repoUrl}">${icon("github")} GitHub</a></div>
<ul class="legend">${legend.map(([kind, n, label]) => `<li><span class="dot${kind ? ` dot-${kind}` : ""}"></span><strong>${n}</strong> ${label}</li>`).join("")}</ul>
</div>
${topicMap(sorted)}
</div></section>
<section class="section" id="topics"><div class="container">
<div class="section-head"><h2>Topics</h2></div>
<div class="tiles">
${sorted.map((t) => tile(t, placeholder)).join("\n")}
</div>
</div></section>
<section class="section" id="standards"><div class="container">
<ul class="standards">
${standards.map(([name, title, text]) => `<li>${icon(name)}<div><strong>${title}</strong><br><span>${text}</span></div></li>`).join("\n")}
</ul>
</div></section>
</main>
${siteFooter()}`
  return page({
    title: "quirq research",
    description: "Verified, shareable research outcomes from quirq.",
    body,
  })
}

function build() {
  const slugs = findTopics()
  const missing = slugs.filter((slug) => !existsSync(join(root, slug, "dist", "index.html")))
  if (missing.length) {
    console.error(`build-hub: no dist/index.html for: ${missing.join(", ")}. Run \`npx turbo run build\` first.`)
    process.exit(1)
  }
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })
  for (const slug of slugs) cpSync(join(root, slug, "dist"), join(outDir, slug), { recursive: true })
  writeFileSync(join(outDir, "index.html"), indexPage(slugs.map((slug) => ({ ...readTopic(slug), formats: published(slug) }))))
  console.log(`build-hub: wrote ${slugs.length} topic(s) to dist/: ${slugs.join(", ")}`)
}

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".pdf": "application/pdf" }

function serve() {
  const port = Number(process.env.PORT) || 3000
  createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname)
    let path = resolve(outDir, "." + pathname)
    if (!path.startsWith(outDir)) return res.writeHead(403).end()
    if (existsSync(path) && statSync(path).isDirectory()) {
      // Match Vercel's trailingSlash: true, so relative links inside a topic resolve.
      if (!pathname.endsWith("/")) return res.writeHead(308, { location: pathname + "/" }).end()
      path = join(path, "index.html")
    }
    if (!existsSync(path)) return res.writeHead(404).end("Not found")
    res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" })
    res.end(readFileSync(path))
  }).listen(port, () => console.log(`build-hub: serving the hub at http://localhost:${port}`))
}

build()
if (process.argv[2] === "serve") serve()
