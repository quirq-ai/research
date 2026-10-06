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
import { findTopics, readTopic, root } from "./lib/topics.mjs"

const outDir = join(root, "dist")

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
}

function indexPage(topics) {
  const items = topics
    .map(
      (t) => `<li>
<a href="${t.slug}/"><strong>${escapeHtml(t.title)}</strong></a>${t.status ? ` <span class="status">${escapeHtml(t.status)}</span>` : ""}
${t.summary ? `<p>${escapeHtml(t.summary)}</p>` : ""}
</li>`,
    )
    .join("\n")
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>quirq research</title>
<style>
:root { color-scheme: light dark; --fg: #1b1b1f; --muted: #5f6068; --bg: #fdfdfc; --line: #e3e3e0; --accent: #2f5bd3; }
@media (prefers-color-scheme: dark) { :root { --fg: #ececee; --muted: #a0a1a8; --bg: #141416; --line: #2c2c31; --accent: #8aa8ff; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 760px; margin: 0 auto; padding: 48px 16px 64px; }
h1 { margin: 0 0 4px; }
.lede { color: var(--muted); margin: 0 0 32px; }
ul { list-style: none; padding: 0; margin: 0; }
li { border-top: 1px solid var(--line); padding: 16px 0; }
li a { color: var(--accent); text-decoration: none; font-size: 1.1em; }
li a:hover { text-decoration: underline; }
li p { margin: 4px 0 0; color: var(--muted); }
.status { font-size: 0.8em; border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; margin-left: 8px; color: var(--muted); }
</style>
</head>
<body>
<main>
<h1>quirq research</h1>
<p class="lede">Verified, shareable research outcomes. Each topic presents its findings its own way.</p>
<ul>
${items}
</ul>
</main>
</body>
</html>
`
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
  writeFileSync(join(outDir, "index.html"), indexPage(slugs.map(readTopic)))
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
