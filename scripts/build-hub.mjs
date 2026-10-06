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
import { card, chips, escapeHtml, page, repoUrl, siteFooter, siteHeader, statusBadge } from "../packages/theme/index.mjs"
import { findTopics, published, readTopic, root } from "./lib/topics.mjs"

const outDir = join(root, "dist")

// Published work first, then work in progress, then the rest.
const statusOrder = ["Published", "Researching", "Proposed", "Paused", "Archived"]
const rank = (status) => (statusOrder.includes(status) ? statusOrder.indexOf(status) : statusOrder.length)

const formatLabels = { onepager: "One-pager", slide: "Slides", report: "Report", app: "App" }

function topicCard(t, placeholder) {
  const isPlaceholder = !t.summary || t.summary === placeholder
  const outputs = t.formats.map((f) => formatLabels[f] ?? f)
  return card({
    href: `${t.slug}/`,
    title: t.title,
    badge: statusBadge(t.status),
    text: isPlaceholder ? "Scope is still being defined." : t.summary,
    placeholder: isPlaceholder,
    foot: outputs.length ? chips(outputs) : `<span class="card-text">No outputs yet</span>`,
  })
}

function indexPage(topics) {
  // The template's one-line summary means the topic has not written its own yet.
  const placeholder = readTopic("_template").summary
  const sorted = [...topics].sort((a, b) => rank(a.status) - rank(b.status) || a.slug.localeCompare(b.slug))
  const count = (status) => topics.filter((t) => t.status === status).length
  const stats = [
    [topics.length, topics.length === 1 ? "topic" : "topics"],
    [count("Published"), "published"],
    [count("Researching"), "in research"],
  ]
  const body = `${siteHeader({ nav: [["#topics", "Topics"], ["#standards", "Standards"], [repoUrl, "GitHub"]] })}
<main>
<section class="hero"><div class="container">
<p class="eyebrow">Research hub</p>
<h1>Verified, shareable research from quirq.</h1>
<p class="lede">Everything here has been checked against its sources and is safe to share outside the team. Each topic presents its findings its own way.</p>
<ul class="stats">${stats.map(([n, label]) => `<li><strong>${n}</strong>${escapeHtml(label)}</li>`).join("")}</ul>
</div></section>
<section class="section" id="topics"><div class="container">
<div class="section-head"><h2>Topics</h2><p>Published work first.</p></div>
<div class="grid">
${sorted.map((t) => topicCard(t, placeholder)).join("\n")}
</div>
</div></section>
<section class="section" id="standards"><div class="container">
<div class="section-head"><h2>What every topic holds to</h2></div>
<ul class="principles">
<li><strong>Sourced</strong><span>Every claim traces to a source someone else can check.</span></li>
<li><strong>Reproducible</strong><span>Numbers are either reproduced or quoted with their source.</span></li>
<li><strong>Candid</strong><span>Limitations and open questions are stated, not hidden.</span></li>
<li><strong>Shareable</strong><span>No secrets, credentials, personal, customer or internal-only data.</span></li>
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
