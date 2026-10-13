// Shared quirq look for the research hub and topic pages.
//
// The CSS in quirq.css holds the tokens and components. The helpers below
// return small HTML strings (a page shell, header, footer, badge), so
// the hub and any topic build can compose the same pieces without a framework.
// Pages inline the CSS, so they work from any path and offline.

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

export * from "./visuals.mjs"

export const css = readFileSync(new URL("./quirq.css", import.meta.url), "utf8")

// Font files the hub copies to /_fonts/, which quirq.css points at: Source Serif 4
// for reading, Geist for the small interface text around it. Each family's OFL
// licence is copied alongside as <family>-OFL.txt.
const fontDir = (pkg) => dirname(createRequire(import.meta.url).resolve(`${pkg}/package.json`))
const serif = fontDir("@fontsource-variable/source-serif-4")
const sans = fontDir("@fontsource-variable/geist")
export const fonts = [
  ...["source-serif-4-latin-wght-normal.woff2", "source-serif-4-latin-ext-wght-normal.woff2", "source-serif-4-latin-wght-italic.woff2"].map((name) => join(serif, "files", name)),
  ...["geist-latin-wght-normal.woff2", "geist-latin-ext-wght-normal.woff2"].map((name) => join(sans, "files", name)),
]
export const fontLicenses = { "source-serif-4-OFL.txt": join(serif, "LICENSE"), "geist-OFL.txt": join(sans, "LICENSE") }

export const repoUrl = "https://github.com/quirq-ai/research"

export function escapeHtml(text) {
  return String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
}

// Status tone for a badge: Published is done, Researching is active,
// Paused needs attention, the rest are quiet.
const tones = { published: "good", researching: "primary", paused: "warn" }

export function statusBadge(status) {
  if (!status) return ""
  const tone = tones[status.toLowerCase()] ?? "muted"
  return `<span class="badge badge-${tone}">${escapeHtml(status)}</span>`
}

// home: link to the hub root. nav: [[href, label, current?]].
export function siteHeader({ home = "/", nav = [] } = {}) {
  const links = nav
    .map(([href, label, current]) => `<a href="${href}"${current ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`)
    .join("")
  return `<header class="site-header"><div class="container">
<a class="brand" href="${home}"><span class="brand-mark" aria-hidden="true">q</span>quirq <span class="brand-sub">research</span></a>
${links ? `<nav class="site-nav" aria-label="Site">${links}</nav>` : ""}
</div></header>`
}

export function siteFooter() {
  return `<footer class="site-footer"><div class="container">
<span>quirq research</span>
<a class="spacer" href="${repoUrl}">GitHub</a>
</div></footer>`
}

export function page({ title, description = "", head = "", body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${description ? `<meta name="description" content="${escapeHtml(description)}">` : ""}
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#fbf9f4">
<link rel="preload" href="/_fonts/source-serif-4-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#b0478c"/><text x="16" y="22" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">q</text></svg>')}">
<style>
${css}</style>
${head}
</head>
<body>
${body}
</body>
</html>
`
}
