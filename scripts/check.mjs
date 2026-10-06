#!/usr/bin/env node
// Check that every topic follows the repo rules in AGENTS.md.
//
// Usage, from the repo root: node scripts/check.mjs   (or npm run check)
//
// For each topic (a top-level folder with a package.json, as in build-hub.mjs):
// - it has README.md, GOAL.md, AGENTS.md and output/<format>/README.md;
// - no {{TOPIC}} or {{DATE}} placeholder is left in its .md or .json files
//   (tracked or not ignored);
// - its README Status is one of the five statuses;
// - every entry in output/onepager|slide|report/ other than README.md is named
//   YYYY-MM-DD-<short-name>[.<ext>];
// - only formats ticked under "Requested outputs" in GOAL.md hold anything
//   besides their README.
// It also checks that the root README Topics table matches what
// scripts/topics-table.mjs generates.
// Exits 1 and lists every problem if any rule is broken.

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { findTopics, root } from "./lib/topics.mjs"
import { withTopicsTable } from "./topics-table.mjs"

const formats = ["onepager", "slide", "report", "app"]
const statuses = ["Proposed", "Researching", "Published", "Paused", "Archived"]
const dated = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9]+)?$/

const problems = []
const fail = (slug, message) => problems.push(`${slug}: ${message}`)

const topics = findTopics()

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

  const goal = existsSync(join(dir, "GOAL.md")) ? readFileSync(join(dir, "GOAL.md"), "utf8") : ""
  for (const format of formats) {
    const folder = join(dir, "output", format)
    if (!existsSync(folder)) continue
    const entries = readdirSync(folder).filter((name) => name !== "README.md" && !name.startsWith("."))
    const ticked = new RegExp(`^- \\[x\\] ${format}:`, "mi").test(goal)
    if (entries.length && !ticked) fail(slug, `output/${format}/ has files but "${format}" is not ticked in GOAL.md`)
    if (format === "app") continue
    for (const name of entries) {
      if (!dated.test(name)) fail(slug, `output/${format}/${name} is not named YYYY-MM-DD-<short-name>.<ext>`)
    }
  }
}

const rootReadme = readFileSync(join(root, "README.md"), "utf8")
const regenerated = withTopicsTable(rootReadme)
if (regenerated === null) problems.push("README.md: no <!-- topics:start --> / <!-- topics:end --> markers around the Topics table")
else if (regenerated !== rootReadme) problems.push("README.md: Topics table is out of date; run npm run topics")

if (problems.length) {
  console.error(`check: ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join("\n")}`)
  process.exit(1)
}
console.log(`check: ${topics.length} topic(s) follow the rules: ${topics.join(", ")}`)
