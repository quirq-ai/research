// Published output navigation comes from the README table, rather than the
// files beside a report (figures, deck sources and other supporting assets).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { basename, dirname, extname, join, relative, sep } from "node:path"
import { escapeHtml, icon } from "@research/theme"
import { marked } from "marked"
import { outputIconLink } from "./output-icons.js"
import { pdfReader } from "./pdf-reader.js"

export const formatLabels = { onepager: "One-pagers", slide: "Slides", report: "Reports" }
const urlPath = (path) => path.split(sep).join("/")
const relativeLink = (from, to) => urlPath(relative(dirname(from), to))
const fileTitle = (path) => basename(path).replace(/\.[^.]+$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ")

export function readOutputs(topicDir) {
  const readme = readFileSync(join(topicDir, "README.md"), "utf8")
  const section = readme.split(/^## Published outputs\s*$/m)[1]?.split(/^## /m)[0] ?? ""
  const table = marked.lexer(section).find((token) => token.type === "table")
  const outputs = Object.fromEntries(Object.keys(formatLabels).map((format) => [format, []]))
  const seen = new Set()
  for (const row of table?.rows ?? []) {
    const [format, , date] = row.map((cell) => cell.text.trim())
    if (!outputs[format]) continue
    const link = row[1].tokens.find((token) => token.type === "link")
    if (!link) continue
    const path = link.href.replace(/\/$/, "")
    const source = join(topicDir, path)
    if (!path.startsWith(`output/${format}/`) || !existsSync(source) || seen.has(path)) continue
    seen.add(path)
    const kind = statSync(source).isDirectory() ? "directory" : extname(path).slice(1).toLowerCase()
    const heading = kind === "md" ? readFileSync(source, "utf8").match(/^#\s+(.+)$/m)?.[1] : ""
    const name = link.text.startsWith("output/") || /\.[a-z0-9]+$/i.test(link.text) ? fileTitle(path) : link.text
    const title = heading || name
    const href = kind === "md" ? path.slice(0, -3) + ".html" : `output/${format}/_views/${basename(path)}.html`
    const label = `${title}${kind === "directory" ? " — source files" : kind !== "md" ? ` (${kind.toUpperCase()})` : ""}${date ? ` · ${date}` : ""}`
    outputs[format].push({ format, path, href, title, label, kind, date })
  }
  return outputs
}

export function outputSwitcher(outputs, current) {
  const format = Object.keys(formatLabels).find((name) => current.startsWith(`output/${name}/`))
  const entries = outputs[format]
  if (!entries?.length) return ""
  const tiles = entries.map((entry) => {
    const kind = entry.kind === "directory" ? "Source files" : entry.kind === "pdf" ? "PDF" : { report: "Report", onepager: "One-pager", slide: "Slides" }[format]
    return outputIconLink({ href: relativeLink(current, entry.href), name: fileTitle(entry.path), format, label: `${kind}${entry.date ? ` · ${entry.date}` : ""}`, detail: entry.label, active: entry.href === current })
  }).join("\n")
  return `<nav class="container output-switcher" aria-label="${formatLabels[format]} outputs">
<div class="output-switcher-head"><span>${formatLabels[format]}</span><span class="output-count">${entries.length} ${entries.length === 1 ? "output" : "outputs"}</span></div>
<div class="outputs">${tiles}</div>
</nav>`
}

function files(dir) {
  return readdirSync(dir).filter((name) => !name.startsWith(".")).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

// Non-Markdown outputs get a page shell so the format selector stays available.
// Their original files and URLs are kept for direct links and downloads.
export function outputResource(entry, topicDir) {
  const title = escapeHtml(entry.title)
  if (entry.kind === "directory") {
    const links = files(join(topicDir, entry.path)).map((file) => {
      const sourcePath = urlPath(relative(topicDir, file))
      const target = extname(file) === ".md" ? sourcePath.slice(0, -3) + ".html" : sourcePath
      return `<li><a href="${escapeHtml(relativeLink(entry.href, target))}">${escapeHtml(urlPath(relative(join(topicDir, entry.path), file)))}</a></li>`
    }).join("\n")
    return `<div class="container artifact-view"><h1>${title} — source files</h1><ul class="artifact-files">${links}</ul></div>`
  }
  const sourcePath = relativeLink(entry.href, entry.path)
  const source = escapeHtml(sourcePath)
  if (entry.kind === "pdf") {
    return `<div class="container artifact-view">
<div class="artifact-heading"><h1>${title}</h1><a class="button" href="${source}" download>Download PDF ${icon("download")}</a></div>
${pdfReader({ source: sourcePath, script: relativeLink(entry.href, "_pdfjs/reader.mjs"), title: entry.title })}
</div>`
  }
  const preview = entry.kind === "html" ? `<iframe class="artifact-preview" src="${source}" title="${title}"></iframe>` : ""
  return `<div class="container artifact-view">
<div class="artifact-heading"><h1>${title}</h1><a class="button" href="${source}" target="_blank" rel="noopener">Open ${escapeHtml(entry.kind.toUpperCase())} ${icon("external")}</a></div>
${preview}
</div>`
}
