import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const present = fileURLToPath(new URL("../bin/present.js", import.meta.url))

function fixture(t, entries) {
  const dir = mkdtempSync(join(tmpdir(), "research-output-navigation-"))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const write = (path, content) => {
    const dest = join(dir, path)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content)
  }
  for (const [path, content] of entries) write(path, content)
  write("README.md", `# Topic\n\nA sample topic.\n\n| | |\n|---|---|\n| Status | Published |\n\n## Published outputs\n\n| Format | File | Date | Notes |\n|---|---|---|---|\n${entries.filter(([path]) => !path.includes("/figures/") && !path.includes("/slides/")).map(([path]) => `| ${path.split("/")[1]} | [${path}](${path}) | 2026-10-14 | |`).join("\n")}\n`)
  execFileSync(process.execPath, [present, "build"], { cwd: dir, stdio: "pipe" })
  return { dir, read: (path) => readFileSync(join(dir, "dist", path), "utf8") }
}

function outputTargets(html) {
  const navigation = html.match(/<nav class="container output-switcher"[\s\S]*?<\/nav>/)?.[0] ?? ""
  return [...navigation.matchAll(/<a class="output" href="([^"]+)"/g)].map((match) => match[1])
}

test("readers can switch among reports and one-pagers without selecting supporting files", (t) => {
  const { dir, read } = fixture(t, [
    ["output/report/2026-10-14-first.md", "# First report\n\nFirst findings."],
    ["output/report/2026-10-14-second.md", "# Second report\n\nSecond findings."],
    ["output/report/figures/chart.png", "image fixture"],
    ["output/onepager/2026-10-14-first.md", "# First one-pager\n\nFirst summary."],
    ["output/onepager/2026-10-14-second.md", "# Second one-pager\n\nSecond summary."],
  ])
  for (const format of ["report", "onepager"]) {
    const page = `output/${format}/2026-10-14-second.html`
    const html = read(page)
    const targets = outputTargets(html)
    assert.equal(targets.length, 2)
    assert.match(html, /<a class="output" href="[^"]*second\.html" aria-current="page"/)
    assert.match(html, /class="output-icon"/)
    assert.doesNotMatch(html, /<select|<option/)
    assert.match(html, new RegExp(`<a[^>]+aria-current="page"[^>]*>${format === "report" ? "Reports" : "One-pagers"}</a>`))
    for (const target of targets) assert.ok(existsSync(resolve(dir, "dist", dirname(page), target)), target)
  }
  assert.ok(outputTargets(read("output/report/2026-10-14-first.html")).every((target) => !target.includes("chart")))
})

test("PDF-only slides have a tab and selector while the original PDF remains accessible", (t) => {
  const pdf = "%PDF-1.4\nfixture bytes\n%%EOF"
  const { dir, read } = fixture(t, [
    ["output/slide/2026-10-14-first.pdf", pdf],
    ["output/slide/2026-10-14-second.pdf", pdf + "\nsecond"],
  ])
  const page = "output/slide/_views/2026-10-14-first.pdf.html"
  const html = read(page)
  assert.match(read("index.html"), /href="output\/slide\/_views\/2026-10-14-first\.pdf\.html"[^>]*>Slides</)
  assert.equal(outputTargets(html).length, 2)
  assert.match(html, /href="\.\.\/2026-10-14-first\.pdf" download>Download PDF/)
  assert.match(html, /data-pdf-src="\.\.\/2026-10-14-first\.pdf"/)
  assert.match(html, /type="module" src="\.\.\/\.\.\/\.\.\/_pdfjs\/reader\.mjs"/)
  for (const asset of ["reader.mjs", "pdf.min.mjs", "pdf.worker.min.mjs", "LICENSE"]) {
    assert.ok(existsSync(join(dir, "dist", "_pdfjs", asset)), asset)
  }
  assert.doesNotMatch(html, /<iframe/)
  assert.equal(read("output/slide/2026-10-14-first.pdf"), pdf)
  for (const target of outputTargets(html)) assert.ok(existsSync(resolve(dir, "dist", dirname(page), target)))
})

test("a listed slide source folder opens its files instead of a missing index", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "research-slide-sources-"))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const folder = "output/slide/2026-10-14-deck"
  mkdirSync(join(dir, folder, "slides"), { recursive: true })
  writeFileSync(join(dir, folder, "slides", "intro.html"), "<!doctype html><title>Intro</title><h1>Intro</h1>")
  writeFileSync(join(dir, "README.md"), `# Topic\n\nA sample topic.\n\n| | |\n|---|---|\n| Status | Published |\n\n## Published outputs\n\n| Format | File | Date | Notes |\n|---|---|---|---|\n| slide | [Deck source](${folder}/) | 2026-10-14 | |\n`)
  execFileSync(process.execPath, [present, "build"], { cwd: dir, stdio: "pipe" })
  const page = "output/slide/_views/2026-10-14-deck.html"
  const html = readFileSync(join(dir, "dist", page), "utf8")
  assert.equal(outputTargets(html).length, 1)
  assert.match(html, /source files/)
  assert.match(html, /href="\.\.\/2026-10-14-deck\/slides\/intro\.html"/)
  assert.ok(existsSync(join(dir, "dist", folder, "slides", "intro.html")))
  const overview = readFileSync(join(dir, "dist", "index.html"), "utf8")
  assert.match(overview, /class="output" href="output\/slide\/_views\/2026-10-14-deck\.html"/)
})
