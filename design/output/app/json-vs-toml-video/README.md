# JSON vs TOML, in motion

A 101-second explainer video of suraj's research
[What the Parser Hears](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/what-the-parser-hears): one config file written twice, JSON on the left
and TOML on the right, edited one line at a time, with twenty real parsers under it showing what each one heard.
Made on 14 October 2026 with the method in this topic's report,
[How motion graphics are made with Claude](../../report/2026-10-15-prompt-motion.md).

`site/` is what the hub serves: the video (`json-vs-toml.mp4`: H.264, 1920 × 1080, 60 fps, 6,080 frames, 101.33 s;
AAC stereo, −18 LUFS), a poster frame, and a watch page with a ledger of every verdict on screen.
`npm run build` copies `site/` to `dist/`.

## What is on screen, and where it comes from

| Scene | Edit | JSON, 10 parsers | TOML, 10 parsers |
|---|---|---|---|
| Setup | the base file | 10 same data | 10 same data |
| Comment | `// admin UI port` · `# admin UI port` | 7 refuse, 3 read on | 10 skip it |
| Trailing comma | `"port": 8080,` | 8 refuse, 2 accept | not sent |
| Duplicate key | `port` twice, 8080 then 9090 | 9 keep 9090, 1 refuses | 10 refuse |
| 2⁵³ + 1 | `9007199254740993` | 5 hear …992, 5 exact | 9 exact, 1 refuses |
| Date | `2026-10-09T09:30:00Z` | 10 hear a string | 10 hear a date-time |
| Empty value | `"proxy": null` · `proxy =` | 10 hear null | 10 refuse |
| Scope trap | `debug = true` after `[server]` | 10 top level | 10 file it under server |
| TOML 1.1 | multi-line inline table, trailing comma | not sent | 8 read it, 2 refuse |

Every verdict was measured on the exact bytes shown, by running each snippet through the 10 JSON and 10 TOML parser
configurations of the original research at the same pinned versions:
[`source/measure/results.json`](source/measure/results.json) holds every parser's raw output, and the page reads
its verdicts from `source/data.js`, generated from that file. Spec quotes on screen come from the TOML 1.0.0
specification and RFC 8259, as cited in the original post.

## Source

| File | What it is |
|---|---|
| [`source/prompt.md`](source/prompt.md) | The brief, written in Prompt Motion's `<inputs>`, `<direction>`, `<structure>`, `<build>`, `<gotchas>`, `<start>` layout |
| [`source/index.html`](source/index.html) | The video itself: one page whose `window.seek(t)` computes every frame from time; the soundtrack is written with the Web Audio API |
| `source/data.js` | The measured verdicts per scene and parser |
| [`source/render.mjs`](source/render.mjs) | Renders the page frame by frame with Playwright and pipes the frames to ffmpeg |
| [`source/measure/measure.py`](source/measure/measure.py) | Runs the on-screen snippets through the parsers; writes `results.json` |
| `source/fonts/` | Source Serif 4, Inter and JetBrains Mono, under the SIL Open Font License (licences beside them) |

## Re-render

Node.js 22 or newer, a Chrome or `chrome-headless-shell` binary, and an ffmpeg build with libx264.

```sh
cd source
npm install
CHROME=/path/to/chrome-headless-shell node render.mjs beats      # one still per scene beat, plus a contact sheet
CHROME=/path/to/chrome-headless-shell FFMPEG=ffmpeg node render.mjs full 60   # the video, about 14 minutes on 2 CPUs
```

Re-measuring needs the What the Parser Hears harness: `measure.py` imports
`what-the-parser-hears/_compute.py` from a checkout of
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `~/xo-projects/writings`, and that
harness drives Node, Rust and Go probes that are not published. Run it with `uv run --script measure/measure.py`.
