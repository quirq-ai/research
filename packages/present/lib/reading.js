// Reading aids for long pages, laid out like a journal article: numbered
// headings with anchors, front and back matter, a table of contents, a
// reading-time estimate and a scroll progress bar.

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

// Closing sections a journal leaves unnumbered and sets as back matter. The
// whole title must match, after any number the page gave it ("15 · Sources").
const backMatter = /^(?:\d+\s*[·.:)]?\s*)?(sources|references|bibliography|notes|further reading)$/i
// Appendices stay unnumbered, in body type.
const appendix = /^appendix\b/i
// Headings that already carry a number of their own: "1. What qq is",
// "Step 1: …", "Example 2: …", "v0: …". One such h2 turns automatic numbering off.
const ownNumber = /\d|^(step|part|example|phase|stage|chapter|section)\s/i
const plainText = (html) => html.replace(/<[^>]+>/g, "").replace(/&[a-z]+;|&#\d+;/g, " ").trim()

// Give each h2 and h3 an id and a hover anchor. Number them journal style
// (1, 1.1, ...) when the page has at least two body sections and none numbers
// itself; back matter and appendices stay unnumbered.
// Returns the html and the headings found.
function anchorHeadings(html) {
  const seen = new Map()
  const headings = []
  const titles = [...html.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map(([, inner]) => plainText(inner))
  const body = titles.filter((t) => !backMatter.test(t) && !appendix.test(t))
  const number = body.length >= 2 && !titles.some((t) => ownNumber.test(t))
  let h2 = 0
  let h3 = 0
  let counted = false
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level, inner) => {
    const base = slugify(inner)
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    const id = n ? `${base}-${n}` : base
    let num = ""
    if (level === "2") {
      const text = plainText(inner)
      counted = number && !backMatter.test(text) && !appendix.test(text)
      if (counted) {
        h2++
        h3 = 0
        num = String(h2)
      }
    } else if (counted) {
      h3++
      num = `${h2}.${h3}`
    }
    const label = num ? `<span class="secnum">${num}</span> ` : ""
    headings.push({ level: Number(level), id, html: label + inner.replace(/<a [^>]*>|<\/a>/g, "") })
    return `<h${level} id="${id}">${label}${inner}<a class="anchor" href="#${id}" aria-label="Link to this section">#</a></h${level}>`
  })
  return { html: out, headings }
}

// Journal structure: what sits between the title and the first section is the
// front matter (a summary, a byline or a note), set apart under the title, and
// closing sections such as Sources are set as back matter.
function structure(body) {
  const parts = body.split(/(?=<h2 id=)/)
  let front = parts.shift()
  const meta = front.indexOf('<p class="read-meta">')
  // A page with no sections has no front matter: its whole body is the text.
  if (meta >= 0 && parts.length) {
    const end = front.indexOf("</p>", meta) + 4
    const lead = front.slice(end).trim()
    if (lead) front = `${front.slice(0, end)}\n<div class="front-matter">\n${lead}\n</div>\n`
  }
  const sections = parts.map((part) => {
    const heading = (part.match(/^<h2 id="[^"]*">([\s\S]*?)<\/h2>/)?.[1] ?? "").replace(/<a class="anchor"[\s\S]*?<\/a>/, "")
    return backMatter.test(plainText(heading)) ? `<section class="back-matter">\n${part}</section>\n` : part
  })
  return front + sections.join("")
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
  const withMeta = structure(/<\/h1>/.test(body) ? body.replace(/<\/h1>/, `</h1>\n${time}`) : time + body)
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
