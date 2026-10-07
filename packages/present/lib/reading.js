// Reading aids for long pages: heading anchors, a table of contents,
// a reading-time estimate and a scroll progress bar.

import { icon } from "@research/theme"

const wordsPerMinute = 230

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;|&#\d+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "section"
}

// Give each h2 and h3 an id and a hover anchor. Returns the html and the headings found.
function anchorHeadings(html) {
  const seen = new Map()
  const headings = []
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    const base = slugify(inner)
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    const id = n ? `${base}-${n}` : base
    headings.push({ level: Number(level), id, html: inner.replace(/<a [^>]*>|<\/a>/g, "") })
    return `<h${level} id="${id}">${inner}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`
  })
  return { html: out, headings }
}

function minutes(markdown) {
  const words = markdown.replace(/```[\s\S]*?```/g, "").split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / wordsPerMinute))
}

// Scroll progress and the active table-of-contents entry. Small and dependency-free.
const script = `<script>
(() => {
  const bar = document.querySelector(".read-progress")
  const links = [...document.querySelectorAll(".toc a")]
  const targets = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean)
  let ticking = false
  function update() {
    ticking = false
    const max = document.documentElement.scrollHeight - innerHeight
    if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, scrollY / max) : 1) + ")"
    let current = targets[0]
    for (const t of targets) if (t.getBoundingClientRect().top < 120) current = t
    for (const a of links) a.classList.toggle("active", current && a.hash === "#" + current.id)
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }, { passive: true })
  update()
})()
</script>`

// Wrap a rendered page in the reading layout. Pages with fewer than three
// headings get the reading time and progress bar but no table of contents.
export function readingLayout(html, markdown) {
  const { html: body, headings } = anchorHeadings(html)
  const time = `<p class="read-meta">${icon("clock")} ${minutes(markdown)} min read</p>`
  const withMeta = /<\/h1>/.test(body) ? body.replace(/<\/h1>/, `</h1>\n${time}`) : time + body
  const toc =
    headings.length >= 3
      ? `<nav class="toc" aria-label="On this page"><p>On this page</p><ol>${headings
          .map((h) => `<li class="toc-${h.level}"><a href="#${h.id}">${h.html}</a></li>`)
          .join("")}</ol></nav>`
      : ""
  return `<div class="read-progress" aria-hidden="true"></div>
<div class="container reading${toc ? "" : " no-toc"}">
<article class="prose">
${withMeta}
</article>
${toc ? `<aside>${toc}</aside>` : ""}
</div>
${script}`
}
