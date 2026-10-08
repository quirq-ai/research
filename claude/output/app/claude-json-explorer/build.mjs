// The explorer is already a static site: copy site/ to dist/.
import { cpSync, rmSync } from "node:fs"

rmSync("dist", { recursive: true, force: true })
cpSync("site", "dist", { recursive: true })
console.log("claude-json-explorer: copied site/ to dist/")
