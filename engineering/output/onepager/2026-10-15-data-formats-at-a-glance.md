# Data formats at a glance

suraj's data-format research in one page: JSON, YAML and TOML as
configuration people write and programs load, what a TOML file is, and
where JSON written all day should be stored. The posts, published between 1
and 9 October 2026, describe the specifications, parsers and databases as
they stood that month.

## The claim

> A configuration file has two readers. One is the person who writes it.
> The other is the program that loads it. Most of the time they agree on
> what the file says. Every pitfall in this guide is a place where they do
> not, and the program's reading is the one that runs.

From [What the Parser Hears](../report/2026-10-15-what-the-parser-hears.md#01-two-readers-one-file).

## In numbers

All ten are *measured here* in the reports, each on one machine. For the
storage costs, the ratios travel and the microseconds do not.

| | |
|---|---|
| **4 of 12** | YAML loaders hear the country code `NO` as `false`, with no error |
| **9 of 10** | JSON parsers keep the last of two duplicate keys, silently |
| **10 of 10** | TOML parsers put a `debug = true` meant for the top level, appended after `[server]`, inside `server` |
| **2 of 10** | TOML parser configurations reject all four TOML 1.1 features; no error names a version |
| **28 of 32** | parsers hear the same data from one agent config in JSON, YAML and TOML |
| **52 to 144** | diff lines for a one-value edit from each writer that dumps plain data |
| **446** | bytes in a YAML alias bomb that a full walk expands to 435,848,053 leaves; seven of 12 loaders accept it |
| **84%** | of a durable whole-file JSON rewrite (1,464.5 µs) is the fsync |
| **49** | times cheaper per row when 100 SQLite inserts share one durable commit |
| **2,398** | times less time to filter 20,000 documents with an expression index |

## Where to go next

| Read | For |
|---|---|
| [What the Parser Hears](../report/2026-10-15-what-the-parser-hears.md) | JSON, YAML and TOML as configuration: what 34 parser configurations heard, and [rules that hold](../report/2026-10-15-what-the-parser-hears.md#13-a-practice-that-holds) |
| [What is a TOML file?](../report/2026-10-15-toml-files.md) | From text to behaviour: keys, tables, types, parsers, TOML 1.0 against 1.1, and what the application owns |
| [Where the JSON Lives](../report/2026-10-15-where-the-json-lives.md) | Storing JSON: database families, licences, five write strategies measured, the [hybrid schema](../report/2026-10-15-where-the-json-lives.md#09-the-hybrid-schema) and a free stack |

## How it connects

- **xo-space.** Its Settings → Config route picks a parser by file suffix.
  In a scratch `HOME`, a valid Codex `config.toml` returned HTTP 500, and
  the OpenClaw adapter overwrote a JSON5 config with only `agents.list`
  ([§12](../report/2026-10-15-what-the-parser-hears.md#four-formats-behind-one-suffix-switch),
  measured). The JSON report plans a reversible move of xo-space's JSON
  state files to tables
  ([§11](../report/2026-10-15-where-the-json-lives.md#11-implementing-it-from-json-files-to-tables),
  reconstruction).
- **quirq.** With weights 0.7, 0.1 and 0.2, passing the first two checks of
  the outcome spec gives V = 0.7999999999999999 against τ = 0.8, so `done`
  is false (measured). suraj's integer-only TOML spec (reconstruction) makes
  it true with no rounding
  ([§12](../report/2026-10-15-what-the-parser-hears.md#the-quirq-outcome-spec)).
- **A session OS.** The TOML guide proposes TOML for small human-edited
  policies, with runtime state kept outside them
  ([§18](../report/2026-10-15-toml-files.md#18-where-toml-fits-in-a-session-operating-system),
  proposal).

## Open questions

- Decoding into typed structs, GitHub's production workflow parser and
  Claude Code's handling of duplicate keys were not verified
  ([§14](../report/2026-10-15-what-the-parser-hears.md#the-measurement)).
- PostgreSQL was not run; its behaviour is cited from the documentation
  ([§12](../report/2026-10-15-where-the-json-lives.md#12-where-this-advice-stops)).
- How xo-space's JSON writers fail on power loss is a reconstruction
  ([§11](../report/2026-10-15-where-the-json-lives.md#what-the-tree-does-now)).
  Issue [#33](https://github.com/quirq-ai/research/issues/33) proposes fault
  injection for agent runtime stores.
- Whether quirq would hash a spec's bytes or a canonical form
  ([§12](../report/2026-10-15-what-the-parser-hears.md#the-quirq-outcome-spec)).

## Sources

All by Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`:
[what-the-parser-hears](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/what-the-parser-hears/index.html)
([post folder](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/what-the-parser-hears)),
[toml-files](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/toml-files/index.html)
([post folder](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/toml-files)) and
[where-the-json-lives](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/where-the-json-lives/index.html)
([post folder](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/where-the-json-lives)).
