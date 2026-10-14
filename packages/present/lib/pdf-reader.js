import { cpSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { escapeHtml, icon } from "@research/theme"

export function copyPdfReader(outDir) {
  const library = dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"))
  const dest = join(outDir, "_pdfjs")
  mkdirSync(dest, { recursive: true })
  for (const name of ["pdf.min.mjs", "pdf.worker.min.mjs"]) {
    cpSync(join(library, "legacy", "build", name), join(dest, name))
  }
  for (const name of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
    cpSync(join(library, name), join(dest, name), { recursive: true })
  }
  cpSync(join(library, "LICENSE"), join(dest, "LICENSE"))
  cpSync(fileURLToPath(new URL("../client/pdf-reader.js", import.meta.url)), join(dest, "reader.mjs"))
}

export function pdfReader({ source, script, title }) {
  return `<section class="pdf-reader" aria-label="PDF reader" data-pdf-src="${escapeHtml(source)}" aria-busy="true">
<div class="pdf-toolbar">
<div class="pdf-control-group">
<button type="button" data-pdf-action="previous" aria-label="Previous page" disabled>${icon("previous")}</button>
<label class="pdf-page-label">Page <input type="number" data-pdf-page aria-label="PDF page" value="1" min="1" disabled></label>
<span>of <span data-pdf-count>…</span></span>
<button type="button" data-pdf-action="next" aria-label="Next page" disabled>${icon("next")}</button>
</div>
<div class="pdf-control-group">
<button type="button" data-pdf-action="zoom-out" aria-label="Zoom out" disabled>${icon("minus")}</button>
<output data-pdf-scale aria-label="Zoom level">—</output>
<button type="button" data-pdf-action="zoom-in" aria-label="Zoom in" disabled>${icon("plus")}</button>
<button type="button" data-pdf-action="fit-page" aria-pressed="true" disabled>Fit page</button>
<button type="button" data-pdf-action="fit-width" aria-pressed="false" disabled>Fit width</button>
</div>
</div>
<div class="pdf-stage" tabindex="0" role="region" aria-label="PDF pages">
<div class="pdf-page"><canvas role="img" aria-label="${escapeHtml(title)}" hidden></canvas></div>
</div>
<p class="pdf-status" data-pdf-status role="status">Loading PDF…</p>
<div class="pdf-page-text" data-pdf-text role="region" aria-label="Page text"></div>
</section>
<script type="module" src="${escapeHtml(script)}"></script>`
}
