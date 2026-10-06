#!/usr/bin/env node
// Write the Topics table in the root README.md from each topic's README.md:
// its status, first paragraph and the formats it has published. The table sits between the
// <!-- topics:start --> and <!-- topics:end --> markers.
//
// Usage, from the repo root:
//   node scripts/topics-table.mjs           rewrite the table (npm run topics)
//   node scripts/topics-table.mjs --check   exit 1 if the table is out of date
//                                           (npm run check does this too)

import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { findTopics, published, readTopic, root } from "./lib/topics.mjs"

const readmePath = join(root, "README.md")
const markers = /(<!-- topics:start -->\n)[\s\S]*?(<!-- topics:end -->)/

export function topicsTable() {
  const rows = findTopics().map((slug) => {
    const t = readTopic(slug)
    const outputs = published(slug).join(", ") || "None yet"
    return `| [${slug}](${slug}/) | ${t.status} | ${t.summary.replace(/\|/g, "\\|")} | ${outputs} |`
  })
  return ["| Topic | Status | Summary | Outputs |", "|---|---|---|---|", ...rows].join("\n") + "\n"
}

// The root README with the table regenerated, or null if it has no markers.
export function withTopicsTable(readme) {
  if (!markers.test(readme)) return null
  return readme.replace(markers, (_, start, end) => start + topicsTable() + end)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const readme = readFileSync(readmePath, "utf8")
  const updated = withTopicsTable(readme)
  if (updated === null) {
    console.error("topics-table: README.md has no <!-- topics:start --> / <!-- topics:end --> markers")
    process.exit(1)
  }
  if (process.argv[2] === "--check") {
    if (updated !== readme) {
      console.error("topics-table: README.md Topics table is out of date; run npm run topics")
      process.exit(1)
    }
  } else if (updated !== readme) {
    writeFileSync(readmePath, updated)
    console.log("topics-table: rewrote the README.md Topics table")
  }
}
