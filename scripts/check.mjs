#!/usr/bin/env node
// Check that every topic follows the repo rules in AGENTS.md.
//
// Usage, from the repo root: node scripts/check.mjs   (or npm run check)
//
// For each topic (a top-level folder with a package.json, as in build-hub.mjs):
// - it has README.md, GOAL.md, AGENTS.md and output/<format>/README.md;
// - no {{TOPIC}} or {{DATE}} placeholder is left in its .md or .json files
//   (tracked or not ignored);
// - its README Status is one of the five statuses, and the root Topics table
//   has a row for it with the same status;
// - every entry in output/onepager|slide|report/ other than README.md is named
//   YYYY-MM-DD-<short-name>[.<ext>];
// - only formats ticked under "Requested outputs" in GOAL.md hold anything
//   besides their README;
// - every entry in output/<format>/ is linked from the README "Published
//   outputs" table (a folder named like a listed file, such as a report's
//   images, counts as listed), and every file the table links to exists.
// Exits 1 and lists every problem if any rule is broken.

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, parse, resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const notTopics = new Set(["_template", "packages", "scripts", "node_modules", "dist"])
const formats = ["onepager", "slide", "report", "app"]
const statuses = ["Proposed", "Researching", "Published", "Paused", "Archived"]
const dated = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)?$/

const problems = []
const fail = (slug, message) => problems.push(`${slug}: ${message}`)

const topics = readdirSync(root)
  .filter((name) => !name.startsWith(".") && !notTopics.has(name))
  .filter((name) => statSync(join(root, name)).isDirectory() && existsSync(join(root, name, "package.json")))
  .sort()

const rootReadme = readFileSync(join(root, "README.md"), "utf8")
const topicRows = new Map(
  [...rootReadme.matchAll(/^\|\s*\[([^\]]+)\]\([^)]*\)\s*\|\s*([^|]+?)\s*\|/gm)].map((m) => [m[1], m[2]]),
)

function tracked(slug) {
  return execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", slug], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean)
}

for (const slug of topics) {
  const dir = join(root, slug)
  for (const file of ["README.md", "GOAL.md", "AGENTS.md", ...formats.map((f) => `output/${f}/README.md`)]) {
    if (!existsSync(join(dir, file))) fail(slug, `missing ${file}`)
  }

  for (const file of tracked(slug)) {
    if (!/\.(md|json)$/.test(file)) continue
    const lines = readFileSync(join(root, file), "utf8").split("\n")
    lines.forEach((line, i) => {
      if (/\{\{(TOPIC|DATE)\}\}/.test(line)) fail(slug, `placeholder left at ${file}:${i + 1}`)
    })
  }

  const readme = existsSync(join(dir, "README.md")) ? readFileSync(join(dir, "README.md"), "utf8") : ""
  const status = readme.match(/^\|\s*Status\s*\|\s*([^|]+?)\s*\|/m)?.[1]
  if (!statuses.includes(status)) fail(slug, `README Status is "${status ?? ""}", not one of ${statuses.join(", ")}`)
  if (!topicRows.has(slug)) fail(slug, "no row in the root README Topics table")
  else if (topicRows.get(slug) !== status) fail(slug, `root Topics table says "${topicRows.get(slug)}", topic README says "${status}"`)

  const outputsTable = readme.split(/^## Published outputs\s*$/m)[1]?.split(/^## /m)[0] ?? ""
  const listed = [...outputsTable.matchAll(/\]\((output\/[^)#\s]+)\)/g)].map((m) => m[1].replace(/\/$/, ""))
  for (const link of listed) {
    if (!existsSync(join(dir, link))) fail(slug, `README Published outputs links to ${link}, which does not exist`)
  }
  const listedStems = new Set(listed.map((link) => join(parse(link).dir, parse(link).name)))

  const goal = existsSync(join(dir, "GOAL.md")) ? readFileSync(join(dir, "GOAL.md"), "utf8") : ""
  for (const format of formats) {
    const folder = join(dir, "output", format)
    if (!existsSync(folder)) continue
    const entries = readdirSync(folder).filter((name) => name !== "README.md" && !name.startsWith("."))
    const ticked = new RegExp(`^- \\[x\\] ${format}:`, "mi").test(goal)
    if (entries.length && !ticked) fail(slug, `output/${format}/ has files but "${format}" is not ticked in GOAL.md`)
    for (const name of entries) {
      const path = `output/${format}/${name}`
      if (!listedStems.has(join(`output/${format}`, parse(name).name))) fail(slug, `${path} is not in the README Published outputs table`)
    }
    if (format === "app") continue
    for (const name of entries) {
      if (!dated.test(name)) fail(slug, `output/${format}/${name} is not named YYYY-MM-DD-<short-name>.<ext>`)
    }
  }
}

for (const slug of topicRows.keys()) {
  if (!topics.includes(slug)) problems.push(`README.md: Topics table lists "${slug}", which is not a topic folder`)
}

if (problems.length) {
  console.error(`check: ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join("\n")}`)
  process.exit(1)
}
console.log(`check: ${topics.length} topic(s) follow the rules: ${topics.join(", ")}`)
