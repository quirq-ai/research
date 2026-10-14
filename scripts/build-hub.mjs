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
import { basename, extname, join, resolve } from "node:path"
import { escapeHtml, fontLicenses, fonts, icon, page, repoUrl, siteFooter, siteHeader, statusBadge, topicMap } from "../packages/theme/index.mjs"
import { findTopics, published, readTopic, root } from "./lib/topics.mjs"

const outDir = join(root, "dist")

// Published work first, then work in progress, then the rest.
const statusOrder = ["Published", "Researching", "Proposed", "Paused", "Archived"]
const rank = (status) => (statusOrder.includes(status) ? statusOrder.indexOf(status) : statusOrder.length)

const formatLabels = { onepager: "One-pager", slide: "Slides", report: "Report", app: "App" }

// One entry in the contents list: number, title, summary, then status and formats.
function entry(t, n, placeholder) {
  const summary = t.summary && t.summary !== placeholder ? t.summary : "Scope being defined."
  const formats = t.formats.map((f) => icon(f, formatLabels[f] ?? f)).join("")
  return `<li class="entry">
<span class="entry-num" aria-hidden="true">${n}</span>
<div class="entry-body">
<h3 class="entry-title"><a href="${t.slug}/">${escapeHtml(t.title)}</a></h3>
<p class="entry-text">${escapeHtml(summary)}</p>
</div>
<div class="entry-meta">${statusBadge(t.status)}${formats ? `<span class="formats">${formats}</span>` : ""}</div>
</li>`
}

const workflow = [
  ["Create a topic", "Start from the topic template. Give it a name and define the research question."],
  ["Choose output formats", "Set the outputs in the topic goal: one-pagers, slides, reports or an app."],
  ["Publish the results", "Add the finished files and list them in the topic overview. The hub loads the topic and its outputs automatically on the next build."],
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
<ol class="contents">
${sorted.map((t, i) => entry(t, i + 1, placeholder)).join("\n")}
</ol>
<p class="propose"><a href="${repoUrl}/issues/new">${icon("plus")}<span>Propose a topic</span></a><span>: open an issue with a question.</span></p>
</div></section>
<section class="section" id="how-it-works" aria-labelledby="how-it-works-title"><div class="container">
<div class="section-head"><h2 id="how-it-works-title">How it works</h2></div>
<ol class="workflow">
${workflow.map(([title, text], i) => `<li><span class="workflow-step" aria-hidden="true">${i + 1}</span><h3>${title}</h3><p>${text}</p></li>`).join("\n")}
</ol>
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
  mkdirSync(join(outDir, "_fonts"))
  for (const font of fonts) cpSync(font, join(outDir, "_fonts", basename(font)))
  for (const [name, license] of Object.entries(fontLicenses)) cpSync(license, join(outDir, "_fonts", name))
  writeFileSync(join(outDir, "index.html"), indexPage(slugs.map((slug) => ({ ...readTopic(slug), formats: published(slug) }))))
  console.log(`build-hub: wrote ${slugs.length} topic(s) to dist/: ${slugs.join(", ")}`)
}

const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".wasm": "application/wasm", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".pdf": "application/pdf", ".woff2": "font/woff2" }

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
