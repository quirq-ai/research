// Visual partials: icons and the topic map. All are inline SVG
// strings, generated from data, so they need no image files and stay sharp.

import { escapeHtml } from "./index.mjs"

// 20px line icons. Each takes the current text colour.
const paths = {
  onepager: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  slide: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>',
  report: '<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
  app: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/>',
  sourced: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  reproducible: '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/>',
  candid: '<circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>',
  shareable: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  github: '<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.5 2.5 5.5 2.8 5.5 2.8a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.2c0 4.6 2.8 5.7 5.5 6a3 3 0 0 0-.8 2.3V21"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
}

export function icon(name, label = "") {
  const a11y = label ? `role="img" aria-label="${escapeHtml(label)}"><title>${escapeHtml(label)}</title` : 'aria-hidden="true"'
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${paths[name] ?? ""}</svg>`
}

// The hero's topic map: quirq at the centre, each topic a node around it,
// filled when published, ringed and pulsing while in research, hollow otherwise.
export function topicMap(topics) {
  const n = topics.length || 1
  const nodes = topics
    .map((t, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
      const r = i % 2 ? 128 : 162
      const x = (210 + r * Math.cos(angle)).toFixed(1)
      const y = (210 + r * Math.sin(angle)).toFixed(1)
      const kind = { Published: "published", Researching: "researching" }[t.status] ?? "proposed"
      const labelY = Number(y) > 210 ? Number(y) + 34 : Number(y) - 26
      return `<line class="map-link map-${kind}" x1="210" y1="210" x2="${x}" y2="${y}"/>
<a class="map-node map-${kind}" href="${t.slug}/" aria-label="${escapeHtml(`${t.title}, ${t.status}`)}">
${kind === "researching" ? `<circle class="map-pulse" cx="${x}" cy="${y}" r="16"/>` : ""}<circle class="map-dot" cx="${x}" cy="${y}" r="13"/>
<text x="${x}" y="${labelY.toFixed(1)}" text-anchor="middle">${escapeHtml(t.title)}</text></a>`
    })
    .join("\n")
  return `<svg class="topic-map" viewBox="0 0 420 420" role="group" aria-label="Topic map">
<circle class="map-orbit" cx="210" cy="210" r="162"/><circle class="map-orbit" cx="210" cy="210" r="128"/><circle class="map-orbit faint" cx="210" cy="210" r="196"/>
${nodes}
<circle class="map-core" cx="210" cy="210" r="34"/><text class="map-core-text" x="210" y="222" text-anchor="middle">q</text>
</svg>`
}
