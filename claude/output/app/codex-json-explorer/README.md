# Codex JSON, field by field

A recursive reference to Codex desktop's global state file, `.codex-global-state.json`: every observed object shape
becomes a page, and every leaf gets a section, with what it holds, what writes it, and how projects, threads and hosts
link through it. It covers all 44 root keys and 255 stored atom entries of the snapshot, as 462 object and container
pages and 1,213 leaf sections. In the explorer's words, dynamic records are merged "into placeholder shapes", and the
Codex post describes it as having "dynamic identifiers replaced by placeholders".

By **Suraj Sharma**, as the companion to
[Anatomy of a Codex session](../../report/2026-10-15-codex-session.md). Source:
[`codex-session/codex-json/`](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/codex-session/codex-json)
in sharmasuraj0123/writings at `a5a356d`.

`site/` holds the generated pages unchanged except for links that left the explorer: the post now opens this topic's
report, the `~/.claude.json` explorer it links to opens this topic's copy, the writings home and other posts open
the writings repo on GitHub, links to the explorer's old quirq.ai address are now relative, the favicon sits
beside the pages, and the footer's contact link is left out. The generator's input, `_content.json`, is not copied. `npm run build` copies `site/` to
`dist/`. To change the content, change it in the writings repo and copy the pages again.
