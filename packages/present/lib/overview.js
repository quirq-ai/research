// The topic overview page: README.md shown as a visual landing page.
//
// The README's fixed parts (title, summary, the Status/Owner/dates table, the
// "Status and progress" checklist and the "Published outputs" table) become a
// cover header, a progress stepper and output tiles. Everything else in the
// README renders as prose below them, unchanged.

import { cover, escapeHtml, icon, statusBadge } from "@research/theme"
import { marked } from "marked"

const formatLabels = { onepager: "One-pager", slide: "Slides", report: "Report", app: "App" }

const isSpace = (t) => t.type === "space" || (t.type === "html" && /^\s*<!--/.test(t.raw))
const headingIs = (t, depth, text) => t?.type === "heading" && t.depth === depth && t.text.trim().toLowerCase() === text

// Take the tokens of a "## <name>" section out of the list: its heading up to the next h1 or h2.
function takeSection(tokens, name) {
  const start = tokens.findIndex((t) => headingIs(t, 2, name))
  if (start < 0) return null
  let end = start + 1
  while (end < tokens.length && !(tokens[end].type === "heading" && tokens[end].depth <= 2)) end++
  return tokens.splice(start, end - start).slice(1)
}

// A readable name from an output path: 2026-10-05-qq-v0-overview.md -> "qq v0 overview".
function outputName(href) {
  const base = href.replace(/\/$/, "").split("/").pop().replace(/\.[a-z]+$/i, "")
  const name = base.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ")
  return name
}

function outputTiles(rows) {
  const tiles = rows
    .map((cells) => {
      const [format, file, date, notes] = cells.map((c) => c.text.trim())
      const href = file.match(/\]\(([^)\s]+)\)/)?.[1]
      if (!href) return ""
      const label = formatLabels[format] ?? format
      return `<article class="output">
<div class="output-icon">${icon(format)}</div>
<div class="output-body">
<p class="output-kind">${escapeHtml(label)}${date ? ` · <time>${escapeHtml(date)}</time>` : ""}</p>
<h3 class="output-title"><a href="${href}">${escapeHtml(outputName(href))}</a></h3>
${notes ? `<p class="output-notes">${marked.parseInline(notes)}</p>` : ""}
</div>
</article>`
    })
    .filter(Boolean)
  return tiles.length ? `<div class="outputs">${tiles.join("\n")}</div>` : ""
}

function progressSteps(items) {
  const done = items.filter((i) => i.checked).length
  const steps = items
    .map((i) => `<li class="${i.checked ? "done" : ""}"><span class="step-dot">${i.checked ? icon("check") : ""}</span><span>${marked.parseInline(i.text)}</span></li>`)
    .join("")
  return `<div class="progress-head"><h2>Progress</h2><span>${done} of ${items.length}</span></div>
<ol class="steps" style="--n:${items.length || 1};--done:${items.length > 1 ? Math.max(0, done - 1) / (items.length - 1) : done}">${steps}</ol>`
}

// Returns { title, html } for the README, or null if it lacks the template's shape.
export function overview(markdown, slug) {
  const tokens = marked.lexer(markdown)
  const links = tokens.links
  const titleAt = tokens.findIndex((t) => t.type === "heading" && t.depth === 1)
  if (titleAt < 0) return null
  const title = tokens[titleAt].text
  tokens.splice(titleAt, 1)

  // The summary is the paragraph right under the title.
  let summaryAt = titleAt
  while (summaryAt < tokens.length && isSpace(tokens[summaryAt])) summaryAt++
  const summary = tokens[summaryAt]?.type === "paragraph" ? tokens.splice(summaryAt, 1)[0] : null

  // The key/value table with an empty header row: Status, Owner, Started, Last updated.
  const metaAt = tokens.findIndex((t) => t.type === "table" && t.header.every((h) => !h.text.trim()))
  const meta = metaAt >= 0 ? Object.fromEntries(tokens.splice(metaAt, 1)[0].rows.map(([k, v]) => [k.text.trim(), v.text.trim()])) : {}
  const status = meta.Status ?? ""

  // "Status is one of: ..." is a legend for the badge, so it becomes the badge's tooltip.
  const legendAt = tokens.findIndex((t) => t.type === "paragraph" && /^Status is one of:/.test(t.text))
  const legend = legendAt >= 0 ? tokens.splice(legendAt, 1)[0].text : ""

  const progress = takeSection(tokens, "status and progress")
  const checklist = progress?.find((t) => t.type === "list" && t.items.some((i) => i.task))
  const outputs = takeSection(tokens, "published outputs")
  const outputsTable = outputs?.find((t) => t.type === "table")
  const outputsRest = outputs?.filter((t) => t !== outputsTable && !isSpace(t)) ?? []
  // Anything else in the progress section besides the checklist stays as prose.
  const progressRest = progress?.filter((t) => t !== checklist && !isSpace(t)) ?? []

  const parse = (list) => {
    const html = marked.parser(Object.assign(list, { links }))
    return html.trim() ? html : ""
  }
  const facts = [
    ["Owner", meta.Owner],
    ["Started", meta.Started],
    ["Updated", meta["Last updated"]],
  ].filter(([, v]) => v)

  const tiles = outputsTable ? outputTiles(outputsTable.rows) : ""
  const html = `<section class="topic-hero">
<div class="topic-cover">${cover(slug)}</div>
<div class="container"><div class="topic-head">
<div><span title="${escapeHtml(legend)}">${statusBadge(status)}</span>
<h1>${escapeHtml(title)}</h1>
${summary ? `<p class="lede">${marked.parseInline(summary.text)}</p>` : ""}</div>
${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${marked.parseInline(v)}</dd></div>`).join("")}</dl>` : ""}
</div></div>
</section>
<div class="container overview">
${checklist ? `<section class="progress">${progressSteps(checklist.items)}${parse(progressRest) ? `<div class="prose">${parse(progressRest)}</div>` : ""}</section>` : ""}
${outputs ? `<section class="outputs-section"><h2>Outputs</h2>${tiles || `<p class="empty">Nothing published yet.</p>`}${outputsRest.length ? `<div class="prose small">${parse(outputsRest)}</div>` : ""}</section>` : ""}
</div>
<div class="container"><div class="prose">
${parse(tokens)}
</div></div>`
  return { title, html }
}
