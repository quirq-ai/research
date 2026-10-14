import { escapeHtml, icon } from "@research/theme"

// Overview tiles and format navigation share one output link.
export function outputIconLink({ href, name, format, label, detail = label, active = false, newTab = false }) {
  const accessibleName = `${name}, ${label}${newTab ? " (opens in a new tab)" : ""}`
  return `<a class="output" href="${escapeHtml(href)}"${active ? ' aria-current="page"' : ""}${newTab ? ' target="_blank" rel="noopener"' : ""} aria-label="${escapeHtml(accessibleName)}" title="${escapeHtml(detail)}">
<span class="output-icon">${icon(format)}${newTab ? `<span class="output-launch">${icon("external")}</span>` : ""}</span>
<span class="output-title">${escapeHtml(name)}</span>
<span class="output-kind">${escapeHtml(label)}</span>
</a>`
}
