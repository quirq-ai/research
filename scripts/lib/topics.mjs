// Shared helpers for the root scripts: which folders are topics, and what a
// topic's README says about it.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

export const root = resolve(import.meta.dirname, "../..")
export const notTopics = new Set(["_template", "packages", "scripts", "node_modules", "dist"])

// A topic is a top-level folder with a package.json, except the names above.
export function findTopics() {
  return readdirSync(root)
    .filter((name) => !name.startsWith(".") && !notTopics.has(name))
    .filter((name) => statSync(join(root, name)).isDirectory() && existsSync(join(root, name, "package.json")))
    .sort()
}

// Strip the Markdown a one-line summary is likely to carry.
export function plain(text) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Title, first paragraph and Status from <slug>/README.md.
export function readTopic(slug) {
  const readme = join(root, slug, "README.md")
  const markdown = existsSync(readme) ? readFileSync(readme, "utf8") : ""
  const lines = markdown.split("\n")
  const titleAt = lines.findIndex((line) => /^#\s+/.test(line))
  const title = titleAt >= 0 ? lines[titleAt].replace(/^#\s+/, "").trim() : slug
  const paragraph = []
  for (const line of lines.slice(titleAt + 1)) {
    if (!line.trim()) {
      if (paragraph.length) break
      continue
    }
    if (/^[|#<]/.test(line)) break
    paragraph.push(line)
  }
  const status = markdown.match(/^\|\s*Status\s*\|\s*([^|]+?)\s*\|/m)?.[1] ?? ""
  return { slug, title, summary: plain(paragraph.join(" ")), status }
}

export const formats = ["onepager", "slide", "report", "app"]

// The output formats of a topic that hold anything besides their README.
export function published(slug) {
  return formats.filter((format) => {
    const folder = join(root, slug, "output", format)
    return existsSync(folder) && readdirSync(folder).some((name) => name !== "README.md" && !name.startsWith("."))
  })
}
