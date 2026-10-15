// The video and its watch page are already built: copy site/ to dist/.
import { cpSync, rmSync } from "node:fs"

rmSync("dist", { recursive: true, force: true })
cpSync("site", "dist", { recursive: true })
console.log("json-vs-toml-video: copied site/ to dist/")
