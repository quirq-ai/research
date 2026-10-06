// Visual partials: cover art, icons and the topic map. All are inline SVG
// strings, generated from data, so they need no image files and stay sharp.

import { escapeHtml } from "./index.mjs"

// A stable 32-bit hash, so a topic always gets the same cover.
function hash(text) {
  let h = 2166136261
  for (const c of text) h = Math.imul(h ^ c.codePointAt(0), 16777619)
  // Final mix so nearby slugs still spread across colours and patterns.
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

// Brand hues for artwork. Covers sit under no text, so they need no contrast pair.
const hues = ["#b0478c", "#7a3fbf", "#e0789f", "#5b4bd1", "#d9864a", "#3d2a5c", "#c2569b"]

// A cover image for a topic: a gradient and a pattern, picked by slug. Pass the
// tile's position as `index` so neighbouring tiles never share a pattern.
export function cover(slug, index) {
  const h = hash(slug)
  const a = hues[h % hues.length]
  const b = hues[(h >>> 3) % hues.length] === a ? hues[(h + 1) % hues.length] : hues[(h >>> 3) % hues.length]
  const id = `c${h.toString(36)}`
  const angle = (h >>> 6) % 360
  const shapes = [
    // Concentric rings off one corner.
    () => [1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${320 + (h % 60)}" cy="${40 + (h % 50)}" r="${i * 34}" />`).join(""),
    // A dot grid.
    () => Array.from({ length: 60 }, (_, i) => `<circle cx="${20 + (i % 12) * 34}" cy="${20 + Math.floor(i / 12) * 44}" r="${2 + ((h >>> i % 16) & 3)}" fill="#fff" stroke="none" />`).join(""),
    // Diagonal bands.
    () => Array.from({ length: 9 }, (_, i) => `<path d="M${-100 + i * 60} 220 L${40 + i * 60} 0" stroke-width="${10 + ((h >>> i) & 15)}" />`).join(""),
    // Waves.
    () => Array.from({ length: 8 }, (_, i) => `<path d="M0 ${40 + i * 22} C 100 ${10 + i * 22 + (h % 30)}, 300 ${70 + i * 22 - (h % 30)}, 400 ${40 + i * 22}" />`).join(""),
    // A tilted grid of squares.
    () => Array.from({ length: 24 }, (_, i) => `<rect x="${(i % 8) * 56 - 20}" y="${Math.floor(i / 8) * 76 - 10}" width="40" height="40" rx="8" transform="rotate(${12 + (h % 20)} 200 110)" ${(h >>> i) & 1 ? 'fill="#fff" fill-opacity=".14"' : ""}/>`).join(""),
    // Orbits with planets.
    () => [60, 100, 140].map((r, i) => `<ellipse cx="200" cy="110" rx="${r * 1.6}" ry="${r * 0.55}" /><circle cx="${200 + r * 1.6 * Math.cos(h + i)}" cy="${110 + r * 0.55 * Math.sin(h + i)}" r="7" fill="#fff" stroke="none" />`).join(""),
  ]
  return `<svg class="cover" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><linearGradient id="${id}" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="400" height="220" fill="url(#${id})"/>
<g fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.5" opacity=".9">${shapes[(index ?? h >>> 9) % shapes.length]()}</g>
</svg>`
}

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
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
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
