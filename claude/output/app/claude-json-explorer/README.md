# ~/.claude.json, key by key

Every key of Claude Code's global state file `~/.claude.json`, one page per
object, with what each key holds, who writes it and what reads it. Structure
was measured on one real file on 28 September 2026 (82 top-level keys, 72
project entries); no value from that file is published, and keys that are data
are replaced by placeholders. Meanings come from the Claude Code 2.1.280
binary and Anthropic's documentation, or are marked as inferred.

By **Suraj Sharma**, as the companion to
[Anatomy of a Claude Code session](../../report/2026-10-08-claude-code-session.md).
Originally published at
[quirq.ai/claude-code-session/claude-json/](https://quirq.ai/claude-code-session/claude-json/).
Source: [`claude-code-session/claude-json/`](https://github.com/sharmasuraj0123/writings/tree/fcdd25f9386db22028dbb2468897bf24f32a7a88/claude-code-session/claude-json)
in sharmasuraj0123/writings at `fcdd25f`, generated there by
`tools/build-claude-json-explorer.py` from `claude-json/_content.py`.

`site/` holds the generated pages unchanged except for links that left the
explorer: the post now opens this topic's report, the writings home opens
quirq.ai, and the favicon sits beside the pages. `npm run build` copies
`site/` to `dist/`. To change the content, change it in the writings repo and
copy the pages again.
