# What the Parser Hears

A configuration file has two readers: the person who writes it and the program that loads it. JSON, YAML and TOML each have places where the two hear different things. This is a field guide to all three as they stand in October 2026 — where each came from, what each can say, the pitfalls that still bite, measured by sending 71 cases through 34 parser configurations on this machine — and a rule for choosing among them.

By **Suraj Sharma**, XO Labs · Data Systems. First published 9 October 2026 as *What the Parser Hears* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/what-the-parser-hears).

Source: [`what-the-parser-hears/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/what-the-parser-hears/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

> **How to read the badges**
>
> *\[from the spec\]* marks a fact taken from a format's own specification: RFC 8259, ECMA-404, YAML 1.1 or 1.2.2, TOML 1.0.0 or 1.1.0. *\[from the docs\]* marks a fact from a project's documentation, changelog, issue tracker, CVE record, or a maintainer's own words. *\[from the tree\]* marks something read from the XO source trees on this machine, quoted with its path and line numbers. *\[measured here\]* marks a result produced on this machine, mostly by `_compute.py` beside this page: 71 cases sent through 34 parser configurations in Python 3.14 (and 3.15.0rc1 for one tomllib column), Node 24, Rust 1.97 and Go 1.27, plus jq, on one shared 2-CPU Linux machine. Some come from separate research probes on the same machine (spec word counts, git merges, Cargo publishing, the quoting and writer probes, the XO tree runs); the sentence or caption says so where they appear. What a parser *heard* is exact and repeatable; parse times are not, so they are given as tiers. *\[reconstruction\]* marks a judgement or mechanism I have worked out rather than read.

## 01 · Two readers, one file

A configuration file has two readers. One is the person who writes it. The other is the program that loads it. Most of the time they agree on what the file says. Every pitfall in this guide is a place where they do not, and the program's reading is the one that runs.

The disagreements come in three kinds. The first is **syntax** the author did not expect to matter. A UTF-8 byte-order mark before `{"a": 1}` is reported as an error by 7 of the 10 JSON parsers measured here, including `JSON.parse`, Python's `json` and both Go APIs (jsonc-parser flags it but still returns the object); jq and the two json5 parsers skip it silently. A tab in YAML indentation is an error in all 12 YAML loaders, and a trailing comma in JSON is accepted silently only by the two json5 parsers; jsonc-parser flags it and returns the object anyway. *\[measured here\]* jsonc-parser is Microsoft's fault-tolerant parser for JSON with comments, built to return a result even from invalid input. *\[from the docs\]* RFC 8259 §8.1 lets a parser ignore a BOM, and YAML 1.2.2 §6.1 forbids the tab. *\[from the spec\]* Syntax disagreements are mostly loud: the program refuses to start, and someone fixes the file. *\[reconstruction\]* The JSON cases return in [JSON: a strict grammar, loose readers](#04-json-a-strict-grammar-loose-readers).

The second kind is **typing** the author did not intend, and it is silent. In YAML the country code `NO` becomes `false` in 4 of 12 loaders. The version `3.10` becomes the float 3.1 in all 12. A file mode written `0755` has three readings: 493 in five loaders, 755 in six, and the string `"0755"` in one. None of these raises an error. *\[measured here\]* Each one is taken apart in [YAML: the type you did not write](#05-yaml-the-type-you-did-not-write).

The third kind is **structure** the author did not see. In TOML, the lines after a table header, "until the next header or EOF, are the key/values of that table" (TOML 1.0.0 and 1.1.0, section Table). *\[from the spec\]* A `debug = true` appended at the end of a file, under a comment calling it a top-level setting, lands at `server.debug` in all 10 TOML parsers, with no error. *\[measured here\]* Helm issue \#9793 (10 June 2021, Helm v3.6.0) reported that the unindented lines after an indented first line of `values.yaml` were ignored. *\[from the docs\]* The reported file still loses them: yaml.v3 v3.0.1, sigs.k8s.io/yaml v1.6.0 and serde-saphyr 1.3.0 return only the first mapping, and nine other loaders refuse the file. *\[measured here\]* sigs.k8s.io/yaml is the library Kubernetes uses, and serde-saphyr is a Rust crate. *\[from the docs\]* The two traps have their own sections, [TOML: obvious until the second table](#08-toml-obvious-until-the-second-table) and [YAML: the structure you did not see](#06-yaml-the-structure-you-did-not-see).

A fourth kind arrives when programs write configuration back, as `cargo add` has done to `Cargo.toml` since Rust 1.62 and Claude Code does to `~/.claude/settings.json` from its `/config` menu. *\[from the docs\]* Every such writer is a reader first, and it writes down what it heard. *\[reconstruction\]* Load the 66-line YAML agent config this guide returns to with PyYAML's `safe_load`, change one value, save it with `safe_dump`, and `NO` comes back as `false`, with the keys sorted and none of the six comments. Re-read by PyYAML, ruamel.yaml and eemeli's `yaml` (the npm package named `yaml`), it is `false` all three times, though the last two heard `NO` in the original. *\[measured here\]* The writer has changed what every later reader hears. Figure 1 lays the four kinds side by side, and [When the program writes back](#11-when-the-program-writes-back) follows the fourth.

**Figure 1. What the author meant, the bytes on disk, and what the parsers heard**

![Four kinds of disagreement between a config file's author and its parsers, one per row, each read left to right from what the author meant, through the bytes on disk, to what the measured parsers heard. 1, syntax: the author meant the JSON object {"a": 1} but the editor saved a UTF-8 byte-order mark first; 3 of 10 JSON parsers (jq and both json5 parsers) skip it silently and hear {"a": 1}; 7 of 10 report an error or flag it, and one of those, jsonc-parser, flags it but still returns {"a": 1}. 2, typing, three rows: the YAML line countries: \[GB, IE, FR, DE, NO, SE\], where NO means Norway, is heard as the string NO by 8 of 12 YAML loaders and as false by 4 (PyYAML twice, sigs.k8s.io/yaml, serde-saphyr); python: 3.10 is heard as the float 3.1 by all 12; a file mode written a: 0755 is heard as 493 by 5 loaders (PyYAML twice and the three Go loaders), as 755 by 6 and as the string 0755 by 1. 3, structure: a TOML file with a \[server\] table and debug = true appended at the end under a comment saying it is meant as a top-level setting; all 10 TOML parsers put debug inside server, with no error. 4, write-back: PyYAML 6.0.3 loads the agent config, changes max_tokens to 4096 and dumps it; the rewritten file says - false where it said NO, and all 3 re-readers (PyYAML, ruamel.yaml, eemeli yaml) hear false; keys are sorted and 0 of 6 comments survive. Thick black arrows mark the author writing, thin blue arrows parsers reading, a dashed purple arrow the program writing back. Green marks a reading that matches the author's intent, red a different reading with no error, grey an error reported or flagged.](2026-10-15-what-the-parser-hears/fig-01-two-readers.svg)

*\[measured here\]* Readings are from `_numbers.json` (cases `j_bom`, `y_norway`, `y_versions`, `y_octal`, `t_scope_trap`) and its `roundtrip` record, on the exact bytes in `_cases/`. *\[reconstruction\]* The left column, and so the tints, is my reading of what an author meant. Only syntax tends to stop the program; the other three hand it a different value and let it run.

### How this guide listens

Most results badged *measured here* come from one harness, `_compute.py`, beside this page. The rest come from research probes run on the same machine (unpublished, in `~/config-ref/bench`), and the text names the probe wherever one is used. The harness sends 71 cases (30 YAML, 17 JSON, 24 TOML) to the parsers for their format, 34 configurations in Python, Node, Rust, Go and jq, and records what each heard, with its native type, or its exact error. The main matrix is 32 of them: 12 YAML, 10 JSON, 10 TOML. PyYAML's `full_load` and `unsafe_load` run only on the tag case. Parsers are called as a loader without a schema calls them: default options, untyped target. Typed targets were not measured. What a parser heard is exact and repeatable: repeated full runs gave the same readings, and only timings, alias-bomb load times and two stack-bound depth limits moved. *\[measured here\]*

The roster below gives each configuration with the version the harness recorded. Python's `tomllib` runs twice, on 3.14.4 and on the 3.15.0 release candidate. *\[measured here\]*

| Runtime | JSON (10) | YAML (12) | TOML (10) |
|----|----|----|----|
| Python 3.14.4 | `json` (stdlib); json5 0.15.0 | PyYAML 6.0.3: `safe_load` (pure Python) and `CSafeLoader` (libyaml 0.2.5); ruamel.yaml 0.19.1: safe and round-trip | `tomllib` (stdlib; also on 3.15.0rc1); tomli 2.5.0; tomlkit 0.15.1 |
| Node 24.21.0 | `JSON.parse`; json5 2.2.3; jsonc-parser 3.3.1 | js-yaml 4.3.2 and 5.4.3; yaml 2.9.1 (eemeli) | @iarna/toml 2.2.5; smol-toml 1.9.0 |
| Rust 1.97.1 | serde_json 1.0.151, default and with `arbitrary_precision` | serde_yaml 0.9.34+deprecated; serde-saphyr 1.3.0 | toml 1.1.7 and toml_edit 0.25.16, both spec 1.1.0 |
| Go 1.27.2 | `encoding/json` and `encoding/json/v2` (stdlib) | yaml.v3 v3.0.1; goccy/go-yaml v1.19.2; sigs.k8s.io/yaml v1.6.0 | BurntSushi/toml v1.6.0; go-toml/v2 v2.4.3 |
| jq 1.8.1 | jq | none | none |
| Tag case only | none | PyYAML 6.0.3: `full_load` and `unsafe_load` | none |

The same agent configuration, written as 69 lines of JSON, 66 of YAML and 67 of TOML, gives the JSON file's data in 28 of the 32 parsers of the main matrix, with date-times compared as instants; [One configuration, three ways](#10-one-configuration-three-ways) names the other four. *\[measured here\]*

### The answer, up front

You can stop reading after this list. Each item is my judgement. *\[reconstruction\]*

1.  **For configuration people edit, in a tool you control: TOML.** Write to the 1.0 subset unless you pin the parser, and put top-level keys before the first table header. Python 3.14.4's `tomllib` rejects all four TOML 1.1 features measured here. *\[measured here\]*
2.  **For configuration a program writes, or that crosses language boundaries: strict JSON, validated by JSON Schema.** If people also edit it, use JSONC through one named parser that fails on errors, or keep the file's format and write it with a format-preserving editor (tomlkit, toml_edit, ruamel.yaml round-trip). JSONC here means JSON with comments as VS Code reads it. *\[from the docs\]* Failing on errors is not automatic: jsonc-parser flags a trailing comma and still returns `{"a": 1, "b": 2}`. *\[measured here\]*
3.  **YAML only where the ecosystem expects it.** GitHub Actions documents only YAML for workflows, the Compose specification defines its file as YAML, Ansible chose it, and Kubernetes says "By convention, manifests are YAML". *\[from the docs\]* There, quote every scalar that is not obviously a string and lint with yamllint 1.38.0, whose `truthy` rule allows only `true` and `false` by default. *\[from the docs\]* Validate against a schema, and load with a YAML 1.2 safe loader that limits aliases.
4.  **For all three: name and pin the parser, validate against a schema, use a loader that rejects duplicate and unknown keys and a typed target, check in CI, and never run load-and-dump on a file people edit.**
5.  **If a file needs computed values or types shared across files, use a configuration language (CUE, Pkl, Nickel) or configuration as code, and guard its output the same way.**

The rest of the guide earns that answer, one format at a time and then [side by side](#10-one-configuration-three-ways), and [A practice that holds](#13-a-practice-that-holds) turns it into rules. A companion post, [Where the JSON Lives](2026-10-15-where-the-json-lives.md), treats JSON as stored data. This one treats JSON, YAML and TOML as written configuration: files a person edits and a program trusts.

## 02 · Three formats, three intentions

Each format was built for a different job. JSON was cut down so that programs could exchange data. YAML began with configuration among its uses and grew into a general serialisation language. TOML was written for configuration and nothing else. Most pitfalls in this guide follow from that first job. *\[reconstruction\]*

### JSON: an interchange format that people configure with

JSON was first presented on json.org in 2001. Its first RFC, 4627 (July 2006), was only Informational. RFC 7159 (March 2014) moved it to the Standards Track and allowed any value at the top level. RFC 8259 (December 2017) is an Internet Standard, STD 90, and ECMA-404's second edition appeared the same month. *\[from the spec\]* RFC 8259 §1 gives the goals: "JSON's design goals were for it to be minimal, portable, textual, and a subset of JavaScript." Configuration is not on the list. Nor was it quite a subset: §12 notes that U+2028 and U+2029 are "legal in JSON but not JavaScript". *\[from the spec\]* ES2019 closed that gap. *\[from the docs\]*

No JSON RFC has a production for comments; RFC 4627 (2006) already had none. *\[from the spec\]* Douglas Crockford explained why in a Google+ post, "Comments in JSON" (30 April 2012, Internet Archive copy): "I removed comments from JSON because I saw people were using them to hold parsing directives, a practice which would have destroyed interoperability." Then, on configuration: "Suppose you are using JSON to keep configuration files, which you would like to annotate. Go ahead and insert all the comments you like. Then pipe it through JSMin before handing it to your JSON parser." *\[from the docs\]* The post explained an existing decision; it did not announce one. *\[reconstruction\]*

The npm package `rc`, a "hardwired configuration loader", does the same with a different stripper. Line 15 of `lib/utils.js` (commit a97f6ad) calls `JSON.parse(stripJsonComments(content))`. *\[from the docs\]*

ECMA-404 says "it is not expected that the JSON grammar will ever change", and it has not changed since 2017. *\[from the spec\]* The readers have. Go 1.27 made `encoding/json/v2`, with stricter defaults, a regular package on 19 August 2026. *\[from the docs\]* A format without comments, used by people who want them, grows dialects; each reader picks its own. *\[reconstruction\]*

### YAML: configuration first, then everything

YAML began in 2001 as "Yet Another Markup Language". Its working draft of 26 May 2001 names configuration first: "YAML is optimized for configuration settings, log files, Internet messaging and filtering." By 7 April 2002 the title read "Yaml Ain't Markup Language". YAML 1.0 is dated 29 January 2004. YAML 1.1 is a "Final Draft" dated 18 January 2005 on its title page and 30 December 2004 on yaml.org's spec index. PyYAML and LibYAML followed in 2006. *\[from the spec\]* PyYAML 6.0.3, released 25 September 2025, still says it "features a complete YAML 1.1 parser". *\[from the docs\]*

YAML 1.2.0 (21 July 2009) changed course. The spec's history says: "Its primary focus was making YAML a strict superset of JSON. It also removed many of the problematic implicit typing recommendations." Revision 1.2.1 followed on 1 October 2009, and 1.2.2 on 1 October 2021: "There are no normative changes from the YAML specification v1.2." The same status section says: "Even though YAML often is used for software configuration, it has always been and will continue to be a complete data serialization language." *\[from the spec\]* No YAML 1.3 has been published. *\[from the docs\]*

A serialisation language needs a type for every value. YAML takes it from the spelling of each unquoted scalar, and 1.1 and 1.2 read those spellings differently. *\[from the spec\]* A loader can keep 1.1's answers long after 1.2. *\[reconstruction\]* On this machine PyYAML 6.0.3 still reads the `NO` in a list of country codes as `false` ([YAML: the type you did not write](#05-yaml-the-type-you-did-not-write)). *\[measured here\]*

### TOML: configuration only

Tom Preston-Werner committed TOML's first draft on the evening of 23 February 2013, Pacific time. It opened with "Tom's Own Markup Language." and "TOML is like INI, only better. And standardized." Its "But why?" section read: "Because we need a decent human readable format that maps to a hash and the YAML spec is like 600 pages long and gives me rage. No, JSON doesn't count. You know why." *\[from the spec\]* One hour and forty minutes later (19:05 to 20:45 Pacific), Alex Gaynor changed 600 to 80 in a commit titled "The YAML spec is in fact not 600 pages." *\[from the docs\]* Pages are a poor unit. Counted in words, YAML 1.2.2 (21,953) is about 5.5 times TOML 1.0.0 (3,980) or RFC 8259 (3,998), by a crude whitespace split. *\[measured here\]*

toml.io states TOML's objectives, unchanged since 0.1.0 (17 March 2013): "TOML aims to be a minimal configuration file format that's easy to read due to obvious semantics. TOML is designed to map unambiguously to a hash table. TOML should be easy to parse into data structures in a wide variety of languages." *\[from the spec\]* Releases came slowly: 0.5.0 in July 2018, 1.0.0 on 11 January 2021, 1.1.0 on 18 December 2025 by the changelog and toml.io (the git tag and GitHub release say 24 December). *\[from the docs\]* Python 3.11 added `tomllib` on 24 October 2022, because TOML had become "the format of choice for Python packaging" (PEP 680). *\[from the docs\]* Figure 2 puts the three histories on one axis, with the size of each spec.

**Figure 2. JSON, YAML and TOML from 2001 to 2026, and how long each spec is**

![Timeline from 2001 to 2026 in three lanes, filled dots for spec releases and drafts, hollow dots for events outside the spec. JSON, built for data interchange: json.org 2001; RFC 4627 July 2006; Douglas Crockford's Google+ post explaining why JSON has no comments, 30 April 2012; RFC 7159 March 2014; RFC 8259 and ECMA-404 second edition December 2017, after which the grammar is unchanged while readers keep changing; Go 1.27 ships encoding/json/v2 on 19 August 2026. YAML, built for data serialisation: draft titled Yet Another Markup Language, May 2001; 1.0 January 2004; 1.1 January 2005; PyYAML and LibYAML 2006; 1.2.0 July 2009; 1.2.1 October 2009; 1.2.2 October 2021 with no normative changes; no YAML 1.3 as of October 2026. TOML, built for configuration: first draft 23 February 2013, whose claim that the YAML spec is 600 pages was corrected to 80 one hour and forty minutes later; 0.5.0 July 2018; 1.0.0 11 January 2021; Python 3.11 adds tomllib 24 October 2022; 1.1.0 18 December 2025. Inset bar chart of spec size in words, by whitespace split: ECMA-404 second edition 2,318; RFC 8259 3,998; YAML 1.1 25,216; YAML 1.2.2 21,953; TOML 1.0.0 3,980; TOML 1.1.0 4,221. YAML 1.2.2 is about 5.5 times TOML 1.0.0 or RFC 8259.](2026-10-15-what-the-parser-hears/fig-02-timeline.svg)

*\[from the spec\]* Only TOML changed its rules after 2017; YAML 1.2.2 made no normative changes. Version dates come from each spec's title page, changelog or first commit, and lane labels paraphrase how each spec describes itself. *\[from the docs\]* Hollow events come from the sources named in the text. *\[measured here\]* Word counts were taken on this machine by the research probes behind this page, not by `_compute.py`: a whitespace split of each published text, RFC boilerplate included. Compare orders of magnitude.

A format that only describes a table of settings can fix a few types and leave out null. *\[reconstruction\]* How each design shapes its pitfalls is the subject of [What each format can say](#03-what-each-format-can-say).

## 03 · What each format can say

A data model is the vocabulary of the contract: the values a file can name. JSON is a grammar with almost no semantics. YAML is a serialisation language with a type-resolution step. TOML is a grammar with a small, fixed type system. Each family of pitfalls in this guide follows from one of those designs. *\[reconstruction\]*

Figure 3 compares five specifications row by row. The YAML 1.2.2 column assumes the Core schema, which YAML 1.2.2 recommends as the default (§10.3). *\[from the spec\]* YAML 1.1 and TOML 1.0 keep their own columns because loaders still implement them: PyYAML 6.0.3 reads `NO` as `false`, and Python 3.14's `tomllib` rejects all four TOML 1.1 features measured here. *\[measured here\]*

**Figure 3. What each format can express, spec by spec**

| Can say | JSON (RFC 8259) | YAML 1.1 | YAML 1.2.2 Core | TOML 1.0 | TOML 1.1 |
|----|----|----|----|----|----|
| null | `null` | `~`, `null`, `Null`, `NULL`, empty | same | none | none |
| booleans | `true`, `false` | 22 spellings, incl. `y`, `NO`, `on` | 6: `true`, `false` in three cases | `true`, `false` | same |
| integers | no limit; exact only to ±(2⁵³−1) | any size; `0755` octal, base 60 | any size; `0o`, `0x` | 64-bit should be accepted; lossy is an error | any size; lossy is an error |
| NaN, infinity | not permitted | `.inf`, `.nan` | same | `inf`, `nan` | same |
| date-time | none | `timestamp` | none | 4: offset and local date-time, local date, local time | 4; seconds optional |
| string kinds | one | 5 styles; plain is typed by pattern | same | 4 | 4; adds `\e`, `\xHH` |
| multi-line strings | none | `|` and `>`, with chomping | same | `"""`, `'''`; newlines may be normalised | same |
| comments | none | `#` | `#` | `#` | `#`; cannot change values |
| references | none | anchors, aliases, `<<` merge | anchors, aliases | none | none |
| tags | none | `!!int`, local `!tag` | same | none | none |
| top level | any value | any node | any node | a table | a table |
| duplicate keys | SHOULD be unique | must be unique | must be unique | invalid | invalid |
| version declaration | none | `%YAML 1.1` | `%YAML 1.2` | none | none; 1.0 parsers just fail |
| key order | no significance | unordered | unordered | not guaranteed | same |

*\[from the spec\]* RFC 8259 (ECMA-404 §6 for key order), YAML 1.1 with its type repository, YAML 1.2.2 Core schema, TOML 1.0.0 and 1.1.0. *\[reconstruction\]* Red: a rule or gap where this guide measures a trap. Green: a rule that closes one. TOML closes YAML 1.1's typing traps; its red cells concern versions and newlines.

### JSON: syntax, and almost nothing else

ECMA-404 is explicit in §1: "The goal of this specification is only to define the syntax of valid JSON texts." Its introduction adds: "JSON is agnostic about the semantics of numbers." RFC 8259 adds a little meaning. Readers built on IEEE 754 binary64 agree exactly only on integers within `[-(2**53)+1, (2**53)-1]`, and Infinity and NaN "are not permitted" (§6). Names "SHOULD be unique" (§4). *\[from the spec\]* Readers differ. Of the 10 JSON parsers measured here, nine keep the last of two `"a"` keys and Go's `encoding/json/v2` refuses them. Given `{"b": 1, "a": 2, "10": 3, "2": 4}`, Python's `json` and jq keep source order, `JSON.parse` puts the integer-like keys first, `serde_json` sorts them (its default map is a `BTreeMap`), and a Go map keeps no order. *\[measured here\]* JSON's pitfalls are disagreements between readers ([the JSON section](#04-json-a-strict-grammar-loose-readers)). *\[reconstruction\]*

### YAML: a type for every node

YAML gives every node a tag. A plain scalar gets its tag by matching the schema's regular expressions, and one that matches none is a string (§10.3.2). The 1.2.2 Core schema has six boolean spellings and no timestamp. YAML 1.1 keeps its types outside the spec, in a type repository whose pages are each marked "Working Draft" (2005). Its boolean page lists 22 spellings, from `y` to `OFF`; other pages add leading-zero octal, base 60, timestamps and the `<<` merge key. *\[from the spec\]* So the loader, not the file, picks the table: `2001-12-14` is a native date in 6 of the 12 YAML loaders and a string in the other 6. *\[measured here\]*

A `%YAML 1.2` directive should settle it, but the research probes found PyYAML 6.0.3 ignoring it: `no`, `22:22` and `0755` still load as `False`, 1342 and 493. *\[measured here\]* Keys must be unique (§3.2.1.1). *\[from the spec\]* Which loaders enforce that is measured in [the structure you did not see](#06-yaml-the-structure-you-did-not-see). YAML's tags carry its loader CVEs ([When loading means executing](#07-when-loading-means-executing)). Its pitfalls are type guesses ([the type you did not write](#05-yaml-the-type-you-did-not-write)). *\[reconstruction\]*

### TOML: ten types, fixed by syntax

TOML lists ten value types and says "Unspecified values are invalid." Booleans are "Always lowercase." *\[from the spec\]* All 10 TOML parser configurations refuse `enabled = True`. *\[measured here\]* 1.0 says 64-bit integers "should be accepted"; 1.1 says "Implementations are free to support any integer size." Both make a lossy integer an error. Four date-time types keep an instant apart from a local date-time, which "cannot be converted to an instant in time without additional information." The document is always a table ([TOML's rules](#08-toml-obvious-until-the-second-table) shows where its root ends). No file can declare its version ([TOML 1.1](#09-toml-1-1-and-the-version-nobody-declares)). *\[from the spec\]* What goes wrong is structure: where a key lands and which version the parser reads. *\[reconstruction\]*

### The value TOML left out

Issue \#30 asked for `nil` or `null` and was closed on 24 February 2013 (UTC). Tom Preston-Werner answered: "TOML is intended for configuration, at which point @aaronblohowiak is right: just leave it out." On 7 October 2023 Pradyun Gedam of toml-lang added: "we're not revisiting this design choice at this point". *\[from the docs\]* In \#975 (21 May 2023) Armin Ronacher wrote of absence used as null: "I believe this to be a mistake in designing TOML schemas because such a value cannot be represented in TOML." *\[from the docs\]* In layered configuration, absence cannot unset an earlier layer's default. *\[reconstruction\]* `x = ` is an error in all 10 TOML configurations; all 12 YAML loaders read `~`, `null`, empty and `Null` as null. *\[measured here\]*

None of the three specs promises key order. YAML's §3.2.2.1 states the rule for all of them: "In every case where node order is significant, a sequence must be used." *\[from the spec\]*

## 04 · JSON: a strict grammar, loose readers

JSON's grammar is small, and both of its specifications were last revised in December 2017. Its readers disagree anyway. The specifications leave four questions open: what a repeated name means, how large a number may be, which bytes may come before the text, and how much non-JSON input a parser may accept. Each parser answers them for itself, and in the harness no two answer alike.

### What the specifications leave open

RFC 8259 §4 says "The names within an object SHOULD be unique", then that when they are not, "the behavior of software that receives such an object is unpredictable." *\[from the spec\]* §6 sets no limit on numbers. It names IEEE 754 binary64 as the practical ceiling, says such readers "will agree exactly on" integers in \[-(2\*\*53)+1, (2\*\*53)-1\], and calls a number such as 1E400 a sign of "potential interoperability problems". *\[from the spec\]*

§8.1 requires UTF-8 only for "JSON text exchanged between systems that are not part of a closed ecosystem", bans the byte order mark only from "a networked-transmitted JSON text", and lets a parser "ignore the presence of a byte order mark rather than treating it as an error". *\[from the spec\]* A config file read by one program on one machine is arguably a closed ecosystem, so these rules barely reach it. *\[reconstruction\]*

The two standards disagree on leniency. RFC 8259 §9: "A JSON parser MAY accept non-JSON forms or extensions." ECMA-404 §2: "A conforming processor of JSON texts should not accept any inputs that are not conforming JSON texts." Neither uses the word "comment" outside "Request for Comments" and the "commentary" of ECMA-404's copyright licence. *\[from the spec\]* A parser that accepts comments is within the RFC and against ECMA-404's advice. *\[reconstruction\]* [Three formats, three intentions](#02-three-formats-three-intentions) tells how the comments went.

### Ten inputs, nine readers

Figure 4 sends ten small inputs through nine of the harness's ten JSON readers, each called with default options and an untyped target. The tenth, Python's json5 0.15.0, is left out for width. On these rows it reads numbers and key order like Python's json, and syntax like the JavaScript json5. *\[measured here\]*

**Figure 4. Ten JSON inputs, nine readers: what each one heard**

heard what the bytes say, or refused non-JSON silently heard a different value accepted non-JSON, or lost data doing so untinted: a refusal, or no key order, that the RFC allows

| Input | py json | JSON.parse | jsonc-parser | json5 (js) | serde_json | serde_json · arb. prec. | Go json · v1 API | Go json/v2 | jq |
|----|----|----|----|----|----|----|----|----|----|
| **Duplicate key** · `{"a":1,"a":2}` | 2 | 2 | 2 | 2 | 2 | 2 | 2 | error | 2 |
| **2⁵³+1** · `9007199254740993` | exact | …992 | …992 | …992 | exact | exact | …992 | …992 | exact |
| **u64 id** · `12345678901234567890` | exact | …567000 | …567000 | …567000 | exact | exact | 1.23…e+19 | 1.23…e+19 | exact |
| **Overflow** · `1e400` | inf | Infinity | Infinity | Infinity | error | 1e+400 | error | error | 1E+400 |
| **NaN token**, as Python writes it · `NaN, Infinity` | nan, inf | error | flagged; {} | NaN, Infinity | error | error | error | error | null, 1.797…e+308 |
| **Trailing comma** · `{"a":1,"b":2,}` | error | error | flagged; {a:1, b:2} | accepted | error | error | error | error | error |
| **Line comment** · `// port for the admin UI` | error | error | accepted | accepted | error | error | error | error | error |
| **UTF-8 BOM** · `EF BB BF {"a": 1}` | error | error | flagged; {a:1} | skipped | error | error | error | error | skipped |
| **Lone surrogate** · `{"s": "\ud800"}` | kept | kept | kept | kept | error | error | U+FFFD | error | error |
| **Key order** · `"b","a","10","2"` | b a 10 2 | 2 10 b a | 2 10 b a | 2 10 b a | 10 2 a b | 10 2 a b | unordered | unordered | b a 10 2 |

*\[measured here\]* Every cell comes from `_numbers.json → cases` (`j_dup_keys`, `j_int_2p53p1`, `j_int_u64`, `j_1e400`, `j_python_nan`, `j_trailing_comma`, `j_line_comment`, `j_bom`, `j_lone_surrogate`, `j_key_order`), run on the bytes in `_cases/json/` with Python 3.14.4, Node v24.21.0, jsonc-parser 3.3.1, json5 2.2.3, serde_json 1.0.151, Go 1.27.2 and jq 1.8.1. "…992" is 9007199254740992; "…567000" and "1.23…e+19" are one double, 12345678901234567168. "Flagged": jsonc-parser filled its errors array and still returned the value shown. "Unordered": a Go map, sorted by the harness for output. *\[reconstruction\]* The tints are my reading of what the author meant. No two columns agree on all ten rows. Only an "error" cell stops a program from starting; jsonc-parser's flags stop it only if the caller reads them.

Duplicates first. `{"a": 1, "a": 2}` is `{"a": 2}` to nine readers; only Go's json/v2 refuses it, with `jsontext: duplicate object member name "a"`. *\[measured here\]* Research probes on the same machine found more. serde_json refuses a duplicate when decoding into a struct, and so does Node 24's `node.config.json`, though `JSON.parse` in the same binary does not. Go's v1 API merges: given `"db": {"host": "a", "port": 5432}` and then `"db": {"host": "b"}`, its struct holds host b and port 5432, where Python keeps only the second object. It also matches keys to fields regardless of case, so a later `"PORT": 9090` overrides `"port": 80`; v2 keeps 80. *\[measured here\]* Go's v2 documentation calls case-insensitive matching "another vector through which duplicate names can occur". *\[from the docs\]*

Key order comes back three ways: source order from Python and jq, integer-like keys first from JavaScript, sorted from serde_json. Go's maps keep none. *\[measured here\]* What happens to such a document once it is stored is the subject of the companion post's [What a database does with JSON](2026-10-15-where-the-json-lives.md#07-what-a-database-does-with-json).

Numbers split the readers in two. 2⁵³+1 stays exact in Python, serde_json and jq. It becomes 9007199254740992 in the three JavaScript readers and in both Go APIs, which decode an untyped number into `float64`. A u64 id, 12345678901234567890, becomes the nearest double in the same five, 12345678901234567168, which is 722 less than the number written. JavaScript prints it as 12345678901234567000 and Go as 1.2345678901234567e+19: three spellings of one wrong value. *\[measured here\]* For large integers, I-JSON (RFC 7493 §2.2) says "it is RECOMMENDED to encode them in JSON string values." *\[from the spec\]*

Python writes JSON that most readers refuse: its `json` module documents that "Infinite and NaN number values are accepted and output". *\[from the docs\]* The harness builds its NaN case with Python itself, at lines 207–209 of `_compute.py`:

    case("j_python_nan", "json", "What Python's json.dumps writes for NaN/inf", "json.dumps(allow_nan=True by default) emits non-JSON tokens",
         json.dumps({"ratio": float("nan"), "limit": float("inf")}) + "\n",
         source="https://docs.python.org/3/library/json.html (allow_nan); bytes produced by this harness")

The bytes are `{"ratio": NaN, "limit": Infinity}`. Python's json and both json5 parsers read them back, jq turns them without complaint into `null` and 1.7976931348623157e+308, and the other readers refuse them. *\[measured here\]*

A UTF-8 byte order mark stops 7 of the 10 readers, counting jsonc-parser's flag. Python's error says what to do: "Unexpected UTF-8 BOM (decode using utf-8-sig)". *\[measured here\]* The research probe found Python's json refusing a BOM in a `str` but accepting one in `bytes`, so a file opened in binary mode loads. *\[measured here\]* Windows PowerShell 5.1 is one source of BOMs, since its documentation says "Using any Unicode encoding, except `UTF7`, always creates a BOM." *\[from the docs\]*

The escape `"\ud800"` is grammatical but encodes no character; RFC 8259 §8.2 calls the result unpredictable. *\[from the spec\]* Go's v1 API is the one reader that silently changes it, to U+FFFD. Nesting limits span more than three orders of magnitude: depth 60 fails in Python's json5, 128 in serde_json, 4,613 in jsonc-parser when V8's stack runs out, 10,001 in Go and jq, and about 57,900 in Python's json, a C-stack limit that moves between runs. JSON.parse and the JavaScript json5 reached the search's cap of 100,000. *\[measured here\]*

### Dialects: which JSON is this file?

People want comments in configuration, so JSON grew dialects, and a file's name rarely says which one its reader expects. *\[reconstruction\]* Figure 5 sets the two in use beside strict JSON. A third, Hjson, appears in no configuration surveyed for this guide and goes further: a quoteless string runs to the end of the line, so a `#` after it becomes part of the value. *\[from the docs\]* *\[measured here\]*

**Figure 5. The JSON family used for configuration: what each adds, who reads it, what defines it**

- **Strict JSON**: Adds nothing to the RFC 8259 / ECMA-404 grammar. Read by package.json (Node and npm refuse a comment or trailing comma), Claude Code's settings.json , Node's node.config.json , Composer's composer.json . Defined by the grammar, then by each runtime's parser. The seven non-dialect readers in Figure 4 still differ on eight of its ten rows.
- **JSONC**: Adds // and /\* \*/ comments. Trailing commas are optional: the jsonc.org draft says MAY, VS Code warns, jsonc-parser flags them, tsc accepts them silently. Read by VS Code's settings.json , tasks.json and launch.json ; devcontainer.json ; tsconfig.json , through tsc's own parser; deno.jsonc ; Renovate; Ruby's json gem by default until 3.0.0. Defined by jsonc-parser's default options, which the jsonc.org draft adopts as the definition.
- **JSON5**: Adds identifier keys, single quotes, trailing commas, hex, a leading + or bare decimal point, Infinity and NaN , comments, and escaped-newline line continuation. Read by Babel's babel.config.json and .babelrc.json , named .json but parsed as JSON5; .json5 files in JetBrains IDEs. Defined by the JSON5 1.0.0 spec (standard status since 11 March 2018) and the json5 npm package, last released as 2.2.3 on 31 December 2022.

*\[from the docs\]* Readers, versions and dates come from each project's documentation, specification and npm records. *\[measured here\]* Separate research probes on the same machine confirmed the tsc (TypeScript 7.0.2), jsonc-parser, npm and Node behaviour. *\[reconstruction\]* The tint is my grouping. Green adds nothing. Orange adds syntax for people and leaves every value as strict JSON would read it. Red adds values that a strict reader cannot represent. Each step down the stack accepts more files that a strict reader refuses.

Microsoft's jsonc-parser, the parser behind VS Code's JSONC mode, "tries to be as fault tolerant as possible, but still return a result". *\[from the docs\]* That is the trap. The research probe found it returning `{"a":1,"b":2}` for `{ "a": 1 "b": 2 }`, a missing comma, with only `CommaExpected` in its errors array. *\[measured here\]* A caller that never reads that array accepts broken config. *\[reconstruction\]*

Other projects choose strict JSON on purpose. Claude Code's documentation says: "Settings files are strict JSON: a `//` comment or a trailing comma is a syntax error, and Claude Code reports the file as a Settings Error at the next start." In 2026 the defaults moved further. ESLint v10.0.0 (6 February 2026) dropped `.eslintrc.json`. Go 1.27 (19 August 2026) made `encoding/json/v2`, with its "stricter, more interoperable defaults", a regular package, and runs the v1 API on its engine with the old behaviour kept. Ruby's json 3.0.0 (7 September 2026) stopped accepting comments by default, and its changelog says "Duplicated keys are now rejected by default." *\[from the docs\]*

### `__proto__`: local at parse, global at merge

`{"__proto__": {"isAdmin": true}}` is ordinary JSON. JSON.parse and the JavaScript json5 2.2.3 make `__proto__` an own key; jsonc-parser 3.3.1 returns an object with no own keys whose prototype is the payload, so `o.isAdmin` is `true` by inheritance. *\[measured here\]* json5 did the same up to 2.2.1; NVD's record of CVE-2022-46175 says it "pollutes the prototype of the object returned by `JSON5.parse` and not the global Object prototype". *\[from the docs\]* The comparison is mine. *\[reconstruction\]*

The global damage comes when config layers are merged. In the research probe, a naive recursive merge of the parsed object wrote into `Object.prototype`, after which `({}).isAdmin` was `true`. *\[measured here\]* The npm package `rc` strips comments, calls `JSON.parse` and layers its sources with `deep-extend`, whose versions up to 0.5.0 carry CVE-2018-3750: the function "can be tricked into modifying the prototype of Object when the attacker can control part of the structure passed to this function". rc now requires the fixed `^0.6.0` line. *\[from the docs\]*

### The price of no trailing comma

In a research probe under git 2.55.0, appending one member to a strict JSON object is a diff of two added lines and one deleted, because the old last line gains a comma; with trailing commas it is one added line. One branch appending while another edits the second-to-last member conflicts in strict JSON and merges cleanly with trailing commas. An append against an edit of the last member conflicts in both styles. *\[measured here\]* [When the program writes back](#11-when-the-program-writes-back) measures tools that rewrite these files, and [A practice that holds](#13-a-practice-that-holds) turns this section into rules.

## 05 · YAML: the type you did not write

YAML gives every unquoted scalar a type by testing it against a list of regular expressions. The file does not choose the list; the loader does. Loaders in use today carry YAML 1.1's list, YAML 1.2's list, or a private mixture of the two. So the same unquoted word is a string in one program and a boolean in the next, and neither program says so.

### Two lists of patterns

YAML 1.2.2 says plain scalars "are matched with an extended list of regular expressions", and that anything matching none of them is a string (§10.3.2). Its Core schema is "the recommended default schema that YAML processor should use unless instructed otherwise" (§10.3). *\[from the spec\]* This is the whole Core list, from the §10.3.2 table:

    Regular expression                           Resolved to tag
    null | Null | NULL | ~                       tag:yaml.org,2002:null
    /* Empty */                                  tag:yaml.org,2002:null
    true | True | TRUE | false | False | FALSE   tag:yaml.org,2002:bool
    [-+]? [0-9]+                                 tag:yaml.org,2002:int (Base 10)
    0o [0-7]+                                    tag:yaml.org,2002:int (Base 8)
    0x [0-9a-fA-F]+                              tag:yaml.org,2002:int (Base 16)
    [-+]? ( \. [0-9]+ | [0-9]+ ( \. [0-9]* )? ) ( [eE] [-+]? [0-9]+ )?
                                                 tag:yaml.org,2002:float (Number)
    [-+]? ( \.inf | \.Inf | \.INF )              tag:yaml.org,2002:float (Infinity)
    \.nan | \.NaN | \.NAN                        tag:yaml.org,2002:float (Not a number)
    *                                            tag:yaml.org,2002:str (Default)

YAML 1.1 kept its types outside the spec, in the 2005 type repository ([What each format can say](#03-what-each-format-can-say)). The boolean page, yaml.org/type/bool.html, gives this regexp:

     y|Y|yes|Yes|YES|n|N|no|No|NO
    |true|True|TRUE|false|False|FALSE
    |on|On|ON|off|Off|OFF

The integer page adds leading-zero octal, `_` separators and a base-60 form, "convenient for time and angle values". The float page requires a dot, and a sign on any exponent. *\[from the spec\]* Side by side, the two lists predict every trap in this section. `NO` is on the 1.1 boolean list and matches nothing in Core. `0755` is octal under 1.1 and matches Core's `[-+]? [0-9]+` as decimal 755. `22:22` is base 60 under 1.1 and a string under Core. `1e3` has no dot, so it is a string under 1.1 and 1000 under Core. `3.10` is a float under both. *\[reconstruction\]*

### The Norway problem, told second-hand

The best-known case is "The Norway Problem", a name from Colm O'Connor's StrictYAML documentation. The section was added in commit `a4d99c6` on 3 November 2018, the earliest use found. *\[from the docs\]* The story is second-hand. It opens "A while back I met an old coworker and he started telling me about this interesting bug he faced", and names no company, date or postmortem. *\[from the docs\]*

The page goes on: "The most tragic aspect of this bug, however, is that it is intended behavior according to the YAML 1.2 specification." *\[from the docs\]* That is wrong. In the Core table above, `NO` matches no row and is a string; the behaviour is YAML 1.1's. *\[from the spec\]* It is still common. Given `countries: [GB, IE, FR, DE, NO, SE]`, 4 of the 12 loaders measured here hear `false` for Norway: PyYAML 6.0.3 through both its pure and its C loader, sigs.k8s.io/yaml v1.6.0, and serde-saphyr 1.3.0. *\[measured here\]* serde-saphyr 1.3.0 is a Rust crate published on 16 September 2026. Its `strict_booleans` option is documented as "Default: false (accept YAML 1.1 boolean forms)", and it compares those forms case-insensitively. *\[from the docs\]*

### Twelve scalars, twelve loaders

Figure 6 sends twelve plain scalars through every YAML loader in the harness, each called with default options into an untyped target. Ten of the twelve rows get two or three readings. The two that do not are `~`, null everywhere, and `3.10`, which every loader turns into 3.1. *\[measured here\]*

**Figure 6. Twelve plain scalars, twelve YAML loaders: what each one heard**

| Written | PyYAML · pure/C | ruamel · safe/rt | js-yaml · 4.3.2 | js-yaml · 5.4.3 | yaml · 2.9.1 | yaml.v3 · v3.0.1 | sigs.k8s · .io/yaml | goccy · v1.19.2 | serde\_ · yaml | serde- · saphyr |
|----|----|----|----|----|----|----|----|----|----|----|
| `NO` | false | "NO" | "NO" | "NO" | "NO" | "NO" | false | "NO" | "NO" | false |
| `yes` | true | "yes" | "yes" | "yes" | "yes" | "yes" | true | "yes" | "yes" | true |
| `on` | true | "on" | "on" | "on" | "on" | "on" | true | "on" | "on" | true |
| `y` | "y" | "y" | "y" | "y" | "y" | "y" | true | "y" | "y" | true |
| `0755` | 493 | 755 | 755 | 755 | 755 | 493 | 493 | 493 | "0755" | 755 |
| `0o755` | "0o755" | 493 | 493 | 493 | 493 | 493 | 493 | 493 | 493 | 493 |
| `22:22` | 1342 | "22:22" | "22:22" | "22:22" | "22:22" | "22:22" | "22:22" | "22:22" | "22:22" | "22:22" |
| `3.10` | 3.1 | 3.1 | 3.1 | 3.1 | 3.1 | 3.1 | 3.1 | 3.1 | 3.1 | 3.1 |
| `1e3` | "1e3" | 1000 | 1000 | 1000 | 1000 | 1000 | 1000 | "1e3" | 1000 | 1000 |
| `01234` | 668 | 1234 | 1234 | 1234 | 1234 | 668 | 668 | 668 | "01234" | 1234 |
| `2001-12-14` | date | date | Date | "2001-12-14" | "2001-12-14" | time.Time | "2001-12-14" | "2001-12-14" | "2001-12-14" | "2001-12-14" |
| `~` | null | null | null | null | null | null | null | null | null | null |

*\[measured here\]* Values from `_numbers.json`, cases `y_norway`, `y_bools`, `y_octal`, `y_sexagesimal`, `y_versions`, `y_exponent`, `y_zip`, `y_timestamps` and `y_nulls`. PyYAML's pure and C loaders agree on every row, as do ruamel's safe and round-trip modes, so each pair shares a column. Tint encodes the type heard, not right or wrong: untinted and in quotes is a string, purple a boolean, blue a number, orange a native date object, green null. Only js-yaml 5.4.3 and eemeli's yaml 2.9.1 match the Core table on all twelve rows.

**Booleans.** Ten spellings from the 1.1 boolean list (case `y_bools`) split three ways. Eight loaders treat only `True` and `TRUE` as booleans. PyYAML adds the yes, no, on and off family but not `y` or `n`. sigs.k8s.io/yaml and serde-saphyr make all ten booleans. *\[measured here\]* PyYAML's gap is deliberate. On 20 January 2020 a maintainer wrote in issue \#376 that "PyYAML implements YAML 1.1 (with the exception that `y/Y` and `n/N` are not recognized as booleans)". On 22 August 2023 another answered \#744, a report of `on` loading as `True`: "by design until PyYAML properly supports YAML 1.2 behavior." *\[from the docs\]* What that does to keys is in [the structure you did not see](#06-yaml-the-structure-you-did-not-see).

**Leading zeros.** A file mode written `0755` has three readings. PyYAML, yaml.v3, sigs.k8s.io/yaml and goccy hear octal 493. ruamel, both js-yamls, eemeli's yaml and serde-saphyr hear decimal 755. serde_yaml returns the string `"0755"`. *\[measured here\]* serde_yaml's source (`src/de.rs`, lines 1093–1094) cites the 1.2 spec for that rule, but Core's `[-+]? [0-9]+` matches `0755`, so the rule is serde_yaml's own. *\[from the docs\]* ZIP codes fare worse. `zip: 01234` and `zip_nj: 08540` get four readings between them: 1234 and 8540 in the six loaders that read 755; 668 and the string `"08540"` in PyYAML and goccy, because 8 is not an octal digit; 668 and 8540 in yaml.v3 and sigs.k8s.io/yaml; two strings in serde_yaml. *\[measured here\]* A New Jersey ZIP code survives PyYAML only because it contains an 8. *\[reconstruction\]*

**Times, versions, exponents.** `22:22` is 1342 (22 × 60 + 22) and `1:30:00` is 5400 (3,600 + 1,800) in PyYAML, and strings in the other ten. *\[measured here\]* `python: 3.10` is the float 3.1 in all twelve loaders, and `go: 1.20` is 1.2. *\[measured here\]* Both float patterns match `3.10`, so YAML 1.2 changed nothing here. *\[from the spec\]* In setup-python, issue \#482, opened on 14 August 2022, is titled *Python version 3.10 is parsed as "3.1"*. *\[from the docs\]* The exponent runs the other way. `1e3` is the string `"1e3"` in PyYAML and goccy, which apply the 1.1 float rule, and 1000 in the other nine. *\[measured here\]*

**Dates.** `2001-12-14` is a native date object in six loaders and a string in the other six. *\[measured here\]* Core has no timestamp type, so the six are keeping YAML 1.1's. *\[from the spec\]* js-yaml 4 also turns `2001-12-14T21:59:43.10-05:00` into a JavaScript `Date` that prints as `2001-12-15T02:59:43.100Z`. The instant survives; the offset does not. *\[measured here\]*

### Which YAML each loader implements

A library's description does not predict its row in Figure 6. ruamel.yaml 0.19.1 says "If no explicit version is set version 1.2 is assumed", *\[from the docs\]* yet it still turns `1_000` into 1000 and `2001-12-14` into a date. *\[measured here\]* The README of go-yaml v3 says "The yaml package supports most of YAML 1.2, but preserves some behavior from 1.1 for backwards compatibility", and names typed booleans and `0777` octal as what it keeps. *\[from the docs\]* yaml.v3 keeps `1_000` and dates as well. *\[measured here\]* sigs.k8s.io/yaml, the library Kubernetes uses, says in a doc comment (`yaml.go`, line 52): "As per the YAML 1.1 specification, which yaml.v2 used underneath implements, literal 'yes' and 'no' strings without quotation marks will be converted to true/false implicitly." *\[from the docs\]* It turns `y` into `true` too, yet leaves `22:22` a string. *\[measured here\]* Figure 7 gives each library's row.

**Figure 7. Which YAML each loader actually implements, as of 8 October 2026**

- **PyYAML 6.0.3**: 25 September 2025 · YAML 1.1, minus y/n . Keeps yes/no/on/off, 0755 octal, base 60, dates, 1_000 ; 1e3 stays text; 0o755 is text. The C loader types identically. Duplicate keys: last wins. Alias limit: none found.
- **ruamel.yaml 0.19.1**: 2 January 2026 · 1.2 by default. Still resolves 1_000 and dates. Duplicate keys: error. Alias limit: none found.
- **js-yaml 4.3.2**: 26 August 2026, npm tag v4-legacy · Core booleans and numbers, plus 1.1 timestamps and \<\< merge. Duplicate keys: error. Alias limit: none found.
- **js-yaml 5.4.3**: 5 October 2026 (5.0.0: 20 June 2026) · CORE_SCHEMA , merge off; 1.1 types opt-in through YAML11_SCHEMA . Duplicate keys: error. Alias limit: maxAliases is -1, unlimited.
- **yaml (eemeli) 2.9.1**: 11 September 2026 · 1.2 Core; version: '1.1' switches schema and turns merge on. Duplicate keys: error. Alias limit: maxAliasCount 100.
- **yaml.v3 v3.0.1**: 27 May 2022; frozen, upstream archived, continued as go.yaml.in/yaml v4, which Docker Compose requires ·"most of YAML 1.2". Keeps 0755 octal, 1_000 , dates as time.Time , 1.1 booleans into typed bool fields. Duplicate keys: error. Alias limit: ratio heuristic.
- **sigs.k8s.io/yaml v1.6.0**: 24 July 2025 · go-yaml v2 (YAML 1.1) then encoding/json . All 1.1 booleans including y and n ; 0755 octal; no base 60; .inf is an error. Duplicate keys: last wins. Alias limit: ratio heuristic.
- **goccy/go-yaml v1.19.2**: 8 January 2026 · 1.2 booleans; 1.1 octal, so 0755 is 493; 1_000 is 1000; 1.1 float rule, so 1e3 stays text; dates as strings. Duplicate keys: error. Alias limit: none found.
- **serde_yaml 0.9.34**: 25 March 2024; archived · 1.2 booleans and 0o octal; leading-zero digits kept as strings, its own rule. Duplicate keys: error. Alias limit: repetition limit.
- **serde-saphyr 1.3.0**: 16 September 2026 · 1.2 octal, so 0755 is 755, but 1_000 is 1000 and 1.1 booleans are on by default, case-insensitive; rejects .inf in untyped values. Duplicate keys: error. Alias limit: 50,000 aliases, 250,000 nodes.

*\[from the docs\]* Release dates from PyPI, npm, the Go module proxy and crates.io; schema claims from each project's README, changelog or source. *\[measured here\]* The kept 1.1 rules and the duplicate-key policy are the readings in `_numbers.json` (case `y_dup_keys` for duplicates); alias limits are the ones `_numbers.json → limits` records from each installed package's source. Red: YAML 1.1 typing by default. Orange: a 1.2 base that keeps a 1.1 rule or adds its own. Green: the 1.2.2 Core schema on every scalar measured here. Two of ten are green.

### What works everywhere

Quoting. YAML 1.2.2 resolves a quoted scalar to a string without consulting the table, and says why: "This tag resolution convention allows the author of a YAML character stream to effectively “disable” the tag resolution process." (§3.3.2) *\[from the spec\]* The YAML research probe behind this guide, run separately from `_compute.py`, quoted ten trap values: `'NO'`, `"NO"`, `"3.10"`, `"22:22"`, `"0755"`, `"on"` as a key, `'yes'`, `'2001-12-14'`, `'null'` and `'~'`. Each came back as the quoted text, a string, in all 16 loader configurations it ran, among them PyYAML, ruamel in its 1.1 and 1.2 modes, js-yaml 4 and 5, eemeli's yaml, go-yaml v2 to v4 and sigs.k8s.io/yaml. *\[measured here\]* goccy, serde_yaml and serde-saphyr were not in that probe.

The other two candidate fixes do not travel. The spec offers an explicit `!` tag for the same purpose. *\[from the spec\]* Yet in the same probe `v: ! 123` is still the integer 123 in PyYAML's `safe_load`, all three ruamel modes and go-yaml v3.0.1. A `%YAML 1.2` directive changes nothing in PyYAML, which ignores it ([What each format can say](#03-what-each-format-can-say)). *\[measured here\]* yamllint does honour it: under `%YAML 1.2` its `truthy` rule passes `yes` and `on`. *\[from the docs\]* Adding the header to a file that PyYAML loads therefore silences the linter's warning and leaves the boolean in place. *\[reconstruction\]*

Quoting is also the writer's job, and three writers built for 1.2 skip it; [When the program writes back](#11-when-the-program-writes-back) measures what a 1.2 emitter's bare `NO` becomes in a 1.1 reader. *\[measured here\]*

## 06 · YAML: the structure you did not see

In YAML, indentation, document markers and a leading `!` are syntax. A slip in any of them can still parse, and the data changes shape: a key goes missing, a document disappears, a value becomes a tag. [Typing traps](#05-yaml-the-type-you-did-not-write) change a value; these change which values exist, and for each of them at least one common loader says nothing.

### Indentation ends things

The spec makes indentation structural: "A block style construct is terminated when encountering a line which is less indented than the construct." Tabs may not indent at all (YAML 1.2.2 §6.1). *\[from the spec\]*

Helm issue \#9793 (10 June 2021, Helm v3.6.0) is the clearest real case: "If first line indent 2 space in values.yml file, then under lines with no indent are be ignored." Helm 3.6's `ReadValues` decodes with `sigs.k8s.io/yaml` (`pkg/chartutil/values.go`, lines 26 and 107–108). *\[from the docs\]* The issue's file (436 bytes, CRLF normalised to LF) still does this. yaml.v3 v3.0.1, sigs.k8s.io/yaml v1.6.0 and serde-saphyr 1.3.0 return `kind` and `podLabels` with no error or warning; `additionalArguments` and its six flags are gone. The other nine loaders refuse the file (Figure 8). *\[measured here\]*

**Figure 8. One indented first line: three loaders keep the top of the file and drop the rest**

![Left, the twelve-line values.yaml from Helm issue 9793, 436 bytes. Lines 1 to 3 are indented two spaces: kind: DaemonSet, podLabels:, and under it es-index: traefik2-ingress-controller. Line 4 is blank. Line 5, additionalArguments:, starts in column 1, followed by six quoted command-line flags and one commented-out flag on lines 6 to 12. Right, what twelve YAML loaders heard. yaml.v3 v3.0.1, sigs.k8s.io/yaml v1.6.0 and serde-saphyr 1.3.0 return only kind: DaemonSet and podLabels with es-index: traefik2-ingress-controller, with no error and no warning; additionalArguments and its six flags are absent. Nine loaders refuse the file: PyYAML safe_load and CSafeLoader, ruamel safe and rt, js-yaml 4 and 5, yaml 2.9.1, goccy and serde_yaml; eight of them point at line 5, column 1. PyYAML says expected document start but found block mapping start; serde_yaml says deserializing from YAML containing more than one document is not supported. Lines 1 to 3 are tinted green as heard as written by the three, lines 5 to 12 red as lost with no error.](2026-10-15-what-the-parser-hears/fig-08-helm-truncation.svg)

*\[measured here\]* From `_numbers.json` → `cases[y_misindent_helm9793]`. Tints show what the three silent loaders did with each line. Eight refusals point at line 5, column 1; serde_yaml's names a second document, the clue to the mechanism. The versions are those current on 8 October 2026; the older sigs.k8s.io/yaml that Helm 3.6 shipped was not re-run.

The first key sets the root mapping's indent at two spaces. `additionalArguments:` in column 1 ends that mapping, and a second top-level node follows with no `---` before it. *\[reconstruction\]* serde_yaml's error says as much: "more than one document". *\[measured here\]* yaml.v3 and sigs.k8s.io/yaml then keep the first document, as they do with any multi-document input. *\[reconstruction\]*

### A mis-indented list is valid YAML

A slip that still parses cannot be caught by any loader. In this constructed manifest, `ports` was meant for the container and sits two spaces too far left:

    spec:
      containers:
      - name: app
        image: nginx
      ports:
      - 80

All 12 loaders return `spec.ports = [80]`, with no error or warning. *\[measured here\]* It is an illustration, not a documented incident. A typed target that rejects unknown keys catches it, as [the practice section](#13-a-practice-that-holds) recommends. *\[reconstruction\]*

### One document or several

A YAML stream can hold several documents separated by `---`. RFC 9512 §3.2 says an application that expects one "should signal an error instead of ignoring the extra documents". *\[from the spec\]* Given `a: 1`, `---`, `b: 2`, nine loaders do. All three Go loaders, called through `yaml.Unmarshal`, return `{a: 1}`. Here goccy is silent but refuses the Helm file; serde-saphyr is the reverse. Only yaml.v3 and sigs.k8s.io/yaml are silent on both. *\[measured here\]*

Splitters fail the same way. In Kubernetes issue \#103185 (kubectl v1.21.0), three namespaces, the second after `--- # something`, gave: "Exit code is 0 and only `foo` and `baz` were created." *\[from the docs\]* At v1.21.0, apimachinery's splitter cut only where whitespace alone followed the dashes (`pkg/util/yaml/decoder.go`, lines 290–296); v1.22.0 (PR \#103457) allows a comment. *\[from the docs\]* So `foo` and `bar` reached a single-document decode as one chunk, which kept `foo`; that decoder was not traced. *\[reconstruction\]* All 11 loaders with a multi-document API hear three documents in these 191 bytes: the bug was the splitter's. *\[measured here\]*

### Keys that change their name

sigs.k8s.io/yaml resolves booleans with go-yaml v2's 1.1 table, which includes `y` and `n` (`go.yaml.in/yaml/v2` v2.4.2, `resolve.go` lines 37–40). *\[from the docs\]* It then converts to JSON, where keys are strings. *\[reconstruction\]* So `{x: 1, y: 2}` becomes `{"x": 1, "true": 2}`; the other 11 loaders keep `y`. *\[measured here\]*

The `on:` key of a GitHub Actions workflow is a well-known, often misdiagnosed case. *\[reconstruction\]* PyYAML hears the boolean `True`, sigs.k8s.io/yaml the string `"true"`, the other nine `"on"`. *\[measured here\]* GitHub's open-source `@actions/workflow-parser` uses eemeli's `yaml` with its YAML 1.2 Core default, where `on` is a string, and GitHub's docs write `on:` unquoted; the parser github.com runs is not public. *\[from the docs\]* So the claim that GitHub Actions itself breaks on `on:` has no evidence behind it. *\[reconstruction\]* The risk is your own tooling: a PyYAML script finds the triggers under `True`. In the research probes, yamllint 1.38.0's default `truthy` rule flags the key. *\[measured here\]* All 32 workflows on this machine use a bare `on:`, three in XO trees ([our own tree](#12-what-our-own-tree-says)), among them line 3 of xo-space's `publish-container.yml`. *\[from the tree\]*

### A value that starts with `!`

Ruud van Asseldonk's essay "The yaml document from hell" (11 January 2023) argues that "Yaml is full of footguns and its friendliness is deceptive." Its list of paths to serve ends in `!.git`, commented "Do not expose our Git repository to the entire world." *\[from the docs\]* A leading `!` begins a tag shorthand, so this is the local tag `!.git` on an empty value (YAML 1.2.2 §6.9.1). *\[from the spec\]* The essay: "PyYAML fails to load the document because it doesn’t know the .git tag. Go’s yaml package is less strict and returns an empty string." *\[from the docs\]*

`exclude: !.git` has five outcomes in 12 loaders; none is the string `"!.git"` (Figure 9). yaml.v3 and sigs.k8s.io/yaml return `""` without a word; PyYAML and js-yaml refuse. *\[measured here\]* An entry meant to hide `.git` becomes an empty pattern. *\[reconstruction\]* GitHub's docs warn: "If you start a pattern with `*`, `[`, or `!`, you must enclose the pattern in quotes." *\[from the docs\]*

### Duplicate keys and merge keys

A mapping's pairs come "with the restriction that each of the keys is unique" (YAML 1.2.2 §3.2.1.1). *\[from the spec\]* Given `a: 1` then `a: 2`, nine loaders refuse; PyYAML and sigs.k8s.io/yaml keep the last value silently. *\[measured here\]* In strict mode, Kubernetes re-reads the bytes with `YAMLToJSONStrict` to catch them. *\[from the docs\]*

The merge key `<<` is not YAML 1.2. It exists only on a YAML 1.1 type-repository page marked as a working draft of 18 January 2005, and 1.2.2 Core has no merge tag. *\[from the spec\]* Nine loaders merge anyway, eight of them cleanly; sigs.k8s.io/yaml merges and renames `y`. js-yaml 5.4.3, eemeli's `yaml` and serde_yaml keep a literal `"<<"` key, the correct 1.2 reading, so moving from js-yaml 4.3.2 to 5.4.3 changes the data. *\[measured here\]* GitHub Actions announced anchors and aliases on 18 September 2025 but not merge keys, which "are part of YAML 1.1 but not YAML 1.2", ericsciple, a collaborator on actions/runner, wrote in \#1182 on 4 August 2025. *\[from the docs\]* [The security section](#07-when-loading-means-executing) covers their denial-of-service record.

**Figure 9. Five structural traps, twelve loaders: who changed the data, who refused, who kept it**

changed the data, no error heard what was written untinted: refused, or none

| Trap | Input | Silently changed | Refused | Heard as written |
|----|----|----|----|----|
| **Two documents**, one-document API | `a: 1` · `---` · `b: 2` | 3: yaml.v3, sigs.k8s.io/yaml, goccy → `{a: 1}` | 9 | none (RFC 9512: error) |
| **The key `y`** | `{x: 1, y: 2}` | 1: sigs.k8s.io/yaml → `{"x": 1, "true": 2}` | 0 | 11 |
| **A leading `!`** | `exclude: !.git` | 7: `""` in yaml.v3, sigs.k8s.io/yaml, yaml (warns); null or a tagged empty value in four others | 5: PyYAML ×2, ruamel safe, js-yaml 4, 5 | 0 |
| **Duplicate key** | `a: 1` · `a: 2` | 3: PyYAML ×2, sigs.k8s.io/yaml → `{a: 2}` | 9 | none (spec: unique keys) |
| **Merge key** | `<<: *base`, then `y: 3` | 4: js-yaml 5, yaml, serde_yaml keep a literal `"<<"`; sigs.k8s.io/yaml renames `y` | 0 | 8 merge to `{x: 1, y: 3}` |

*\[measured here\]* From `_numbers.json`, cases `y_multidoc`, `y_merge` (row 2 is its base map, row 5 the merge), `y_unknown_local_tag`, `y_dup_keys`. In rows 1 and 4 refusal is what RFC 9512 and the spec ask for. Row 5's literal `"<<"` is correct YAML 1.2, red because whoever writes `<<` means a merge. sigs.k8s.io/yaml is silent in all five rows.

### Where every loader agrees

A comment needs whitespace before `#`, and a plain scalar may not contain `": "` or `" #"` (YAML 1.2.2 §6.6, §7.3.3). *\[from the spec\]* In all 12 loaders `msg: hello #world` is `"hello"`, `url: http://example.com/#frag` stays whole, and `cmd: echo key: value` is an error, as is tab indentation. Block scalars read identically in all five forms tested. *\[measured here\]*

### One ConfigMap, two entry points

An unquoted `true` in a ConfigMap's string-valued `data` fails loudly at the API server: "cannot unmarshal bool into Go struct field ConfigMap.data of type string" (nixys/nxs-universal-chart#10, 2 July 2022). *\[from the docs\]* kubectl converts the manifest to JSON before the request. *\[from the docs\]* So the value arrives as a bool. *\[reconstruction\]* In the research probes, an emulation of that path fails the same way on `country: NO`; no real server was run. A Go program calling `sigs.k8s.io/yaml.Unmarshal` into a `map[string]string` gets no error: `country: NO` becomes `"false"`. *\[measured here\]*

Every trap here changes shape, so the guard is a shape check: one document per file, a typed target that rejects unknown and duplicate keys, quoted values, no merge keys ([the practice section](#13-a-practice-that-holds)). *\[reconstruction\]*

## 07 · When loading means executing

A YAML tag can name a type, and a loader that honours every name builds whatever the file asks for. That produced a run of code-execution CVEs, published from 2018 to 2022 and each fixed by making the default loader refuse more tags. Safe does not mean bounded. Aliases and merge keys let a few hundred bytes describe hundreds of millions of values.

### A tag names a constructor

YAML 1.2.2 says processors for a language "typically provide some form of local tags that map directly to the language’s native data structures" (§10.4). *\[from the spec\]* PyYAML's `!!python/` tags play that role. NVD on CVE-2017-18342: "In PyYAML before 5.1, the yaml.load() API could execute arbitrary code if used with untrusted data." The maintainers wrote that `load` "has been unsafe since the first release in May 2006". *\[from the docs\]*

The repair ran from 5.1 to 6.0 (Figure 10). PyYAML 5.1 (13 March 2019) made a bare `yaml.load` warn and fall back to a new `FullLoader`. FullLoader was bypassed three times. Version 5.4 "moves arbitrary python tags to UnsafeLoader", and 6.0 (13 October 2021) made the `Loader` argument mandatory. *\[from the docs\]* In the research probes, a bare `yaml.load` raises `TypeError` in 6.0.3. FullLoader still turns `!!python/name:os.getcwd` into the function object: a reference, not a call. *\[measured here\]*

Others broke their APIs too. SnakeYAML 2.0 (26 February 2023) stopped allowing global tags by default, to fix CVE-2022-1471. Psych PR \#487, released in 4.0.0 on 13 May 2021, "changes the default `Psych.load` to use `safe_load`", and Ruby 3.1 shipped it. js-yaml 4.0 moved `!!js/function` and its other JavaScript tags to a separate package. *\[from the docs\]* RFC 9512 states the rule: "Code execution in deserializers should be disabled by default and only be enabled explicitly." (§4.1) *\[from the spec\]* SnakeYAML's README tells config users: "When you use SnakeYAML to configure your application you are totally safe." *\[from the docs\]* That holds only while nobody untrusted writes the file, and agents now write config too ([When the program writes back](#11-when-the-program-writes-back)). *\[reconstruction\]*

**Figure 10. Loader CVEs, 2018–2026: safe loaders stopped every constructor payload and no expansion payload**

| CVE | Library | Published | What the payload did | CVSS 3.1 | Fixed in | Safe loader hit? |
|----|----|----|----|----|----|----|
| CVE-2017-18342 | PyYAML | 2018 | `yaml.load()` ran code via python tags | 9.8 NVD | 5.1 warns; 6.0 requires `Loader` | no |
| CVE-2019-20477 | PyYAML FullLoader | 2020 | class deserialisation, e.g. `Popen` | 9.8 NVD | 5.2 | no |
| CVE-2020-1747 | PyYAML FullLoader | 2020 | code execution via `python/object/new` | 9.8 NVD | 5.3.1 | no |
| CVE-2020-14343 | PyYAML FullLoader | 2021 | bypass of the CVE-2020-1747 fix | 9.8 NVD | 5.4 | no |
| CVE-2022-1471 | SnakeYAML | 2022 | `Constructor()` built any type | 9.8 NVD; 8.3 CNA | 2.0, global tags off | no (SafeConstructor) |
| CVE-2017-18640 | SnakeYAML | 2019 | alias expansion during load | 7.5 NVD | 1.26 | yes |
| CVE-2019-11253 | Kubernetes API server | 2019 | 9⁹ alias bomb, "YAML or JSON" | 7.5 NVD | 1.13.12, 1.14.8, 1.15.5, 1.16.2 | yes |
| CVE-2019-11254 | go-yaml v2 in kube-apiserver | 2020 | unbounded aliasing, CPU | 6.5 NVD | go-yaml v2.2.8 | yes |
| CVE-2025-64718 | js-yaml | 2025 | prototype pollution through `<<` | 5.3 GitHub | 4.1.1, 3.14.2 | yes |
| CVE-2026-53550 | js-yaml | 2026 | quadratic CPU in merge keys | 5.3 GitHub | 4.2.0, 3.15.0 | yes |
| none (issue \#897) | PyYAML | 2025 (issue) | exponential time on nested merge keys | none | `main`, 17 June 2026; no release | yes: it is `safe_load` |

*\[reconstruction\]* Every constructor CVE was closed by refusing tags; no alias or merge row was, because a safe loader expands aliases and merge keys itself. *\[from the docs\]* Descriptions and fixes come from NVD, the GitHub Advisory Database and project changelogs. CVSS 3.1 comes from NVD's API, fetched 9 October 2026, with NVD's own score where it has one. Published is NVD's year. Green: the library's safe loader was unaffected. Red: the safe loader was hit too; on these rows that column is *\[reconstruction\]*, inferred from the loader doing the expansion.

### One harmless payload, fourteen readers

The harness sends `_cases/yaml/python_tag.yaml`, one 45-byte line that calls `str`:

    x: !!python/object/apply:builtins.str ["hi"]

PyYAML's `unsafe_load` calls it and returns `{"x": "hi"}`. `safe_load`, the C loader, `full_load`, ruamel safe and both js-yaml versions raise errors. The other seven return `["hi"]`: yaml.v3, sigs.k8s.io/yaml, goccy, serde_yaml, serde-saphyr, eemeli's `yaml` (with a warning) and ruamel's round-trip loader. *\[measured here\]* Nothing runs, but a value meant to be a string arrives as a list. *\[reconstruction\]* `!!js/function` fails in both js-yaml versions; Go and Rust return its body as a string. *\[measured here\]*

### Safe is not bounded

The CVE-2019-11253 payload was a Kubernetes ConfigMap of nine anchored lists. List `a` holds nine strings, and lists `b` to `i` each hold nine aliases to the list before, so `i` names 9⁹ = 387,420,489 strings. NVD says it let authorised users "send malicious YAML or JSON payloads". The reporter saw the CPU cost client-side, in kubectl. PR \#83261 (merged 3 October 2019) limited decode size, and normal API request bodies "are now limited to 3MB". *\[from the docs\]*

The harness sends that payload (`y_bomb9`, 446 bytes). Seven loaders accept it in milliseconds and return shared references: 12 containers that a full walk would expand to 435,848,053 leaves (the harness counts them without walking). That is 9 + 9² + … + 9⁹ = 435,848,049 strings, plus the four strings outside `data`. Five loaders refuse it (Figure 11). A six-level cut (`y_bomb6`, 335 bytes) loads in the same seven, and Python's `json.dumps` of the result is 4,334,696 bytes, 12,939 times the input. *\[measured here\]* js-yaml's safety guide says the graph "stays cheap until you fully walk it", yet js-yaml 5's `maxAliases` defaults to −1, unlimited. *\[from the docs\]*

**Figure 11. Nine levels in 446 bytes: who refuses the Kubernetes alias bomb, and where**

![Bar chart on a logarithmic axis showing how many strings each level of the 446-byte CVE-2019-11253 alias bomb names: level a 9, b 81, c 729, d 6,561, e 59,049, f 531,441, g 4,782,969, h 43,046,721, i 387,420,489. The whole document expands to 435,848,053 leaves. Green callouts mark where loaders refuse it: eemeli's yaml 2.9.1 (maxAliasCount 100), yaml.v3 and sigs.k8s.io/yaml (alias-ratio check) on level d; serde-saphyr (max_nodes 250,000) and serde_yaml (alias jumps above 100 times the event count) on level f. An orange panel lists the loaders that return shared references in under 10 milliseconds each: PyYAML 6.0.3 pure and C, ruamel 0.19.1 safe and round-trip, js-yaml 4.3.2 and 5.4.3, goccy/go-yaml v1.19.2. A red panel shows the six-level, 335-byte version serialised: 4,334,696 bytes from Python json.dumps, 12,939 times the input, and 3,736,811 bytes from JavaScript and Go.](2026-10-15-what-the-parser-hears/fig-11-alias-bomb.svg)

*\[measured here\]* Data from `_numbers.json → cases` (`y_bomb9`, `y_bomb6`). Bars are 9^(k) on a log scale; JS and Go put no space after separators. serde-saphyr's level comes from its error (line 8). The other refusal levels, worked out from each library's limit, and the 3.2 GB nine-level size (4,334,696 B × 9³) are *\[reconstruction\]*, not run. Without an alias limit, a safe loader is as exposed as any.

### Merge keys, the newest vector

The research probes chained merge keys, each mapping merging the previous one twice. Lines 1–3 of `~/config-ref/bench/yaml/merge20.yaml` (it ends at `L20`, line 21):

    L0: &L0 {k: v}
    L1: &L1 {<<: [*L0, *L0]}
    L2: &L2 {<<: [*L1, *L1]}

PyYAML 6.0.3's `safe_load` took two to three seconds at 20 levels (557 bytes) over two runs (about two seconds with `CSafeLoader`), and about half a minute at 24 (673 bytes): about 4× per two levels. ruamel's pure safe loader took about five seconds at 20. *\[measured here\]* Wall-clock time here varied by about ±50%, so only orders of magnitude count: seconds at 20 levels, tens of seconds at 24. The fix, PR \#937, merged to `main` on 17 June 2026, notes that "A small document under 1 KB can trigger millions of element list extensions". On 9 October 2026 PyPI's latest release is still 6.0.3, from 25 September 2025. *\[from the docs\]*

js-yaml has had six merge-key advisories since November 2025. They run from prototype pollution to a "Quadratic-complexity DoS in merge key handling via repeated aliases". js-yaml 5 turned merge off by default; two of the six cover 5.x users who turn it back on. *\[from the docs\]*

### JSON's version, and TOML's

JSON has no tags or aliases. *\[from the spec\]* Its analogue is prototype pollution when config layers are merged ([the JSON section](#04-json-a-strict-grammar-loose-readers)). *\[reconstruction\]* The Kubernetes PR was titled "limit yaml/json decode size". *\[from the docs\]* TOML has no tags, aliases or merge keys. *\[from the spec\]* Its denial-of-service surface is nesting depth. *\[reconstruction\]* On `a = [[[…]]]` (`t_depth`), Rust's toml and toml_edit refuse at 81 levels, tomlkit at 101 and tomli at 402. BurntSushi and @iarna/toml accept 100,000, the search cap. *\[measured here\]* TOML's unreleased `main` text says: "It's recommended to allow at least 100 levels of nesting." *\[from the spec\]* Rust's limit of 80 sits below that. *\[reconstruction\]* The rules follow in [the practice section](#13-a-practice-that-holds).

## 08 · TOML: obvious until the second table

TOML's grammar is small and its types are fixed by syntax, so its traps are not about types. They are about where a line lands and which redefinitions a parser lets through. The one projects warn about is valid TOML. Every parser agrees on it; only the author is surprised.

### Where a key lands

The goals quoted in [Three formats, three intentions](#02-three-formats-three-intentions) promise obvious semantics. The table rule is one sentence. A header opens a table, and "Under that, and until the next header or EOF, are the key/values of that table." The root table "starts at the beginning of the document and ends just before the first table header (or EOF). Unlike other tables, it is nameless and cannot be relocated." *\[from the spec\]* No syntax returns to the root. A top-level key added at the bottom of a file joins whichever table came last, and neither a blank line nor a comment stops it. *\[reconstruction\]* Call it the scope trap.

The case `t_scope_trap` is 97 bytes: a `title`, a `[server]` table, a blank line, a comment saying "meant as a top-level setting", and `debug = true`. All 10 TOML configurations in the harness put `debug` inside `server` and leave the root holding only `title`, with no error and no warning (Figure 12). *\[measured here\]* The research probe behind the TOML dossier sent the same document through 16 configurations: these 10 plus smol-toml in BigInt mode, @iarna/toml 3.0.0, @ltd/j-toml, npm `toml` 5.0.0 in two modes, and Rust `toml` 0.8.23. All 16 did the same. *\[measured here\]*

**Figure 12. The line you appended is not where you think**

![Left: the seven-line TOML file from case t_scope_trap. Line 1 title = "app" is the whole root table. Line 2 opens \[server\], whose scope runs to the end of the file. Lines 3 and 4 are host = "0.0.0.0" and port = 8080, line 5 is blank, line 6 is the comment \# meant as a top-level setting, and line 7 is debug = true. Middle: the tree all 10 parser configurations returned: a root table with title = "app" and a server table holding host, port and debug = true. An arrow runs from line 7 to debug inside server. Right: the tree the author meant, with debug = true in the root beside title, crossed out because no parser produced it. Below: no error and no warning in 10 of 10 configurations here and 16 of 16 in the research probe; the fixes are to move the key above the first header, where the root table ends, or to have no root keys at all, as Alacritty 0.14 did by removing its root-level options and adding a \[general\] table (PR \#8192).](2026-10-15-what-the-parser-hears/fig-12-scope-trap.svg)

*\[measured here\]* The file is `_cases/toml/scope_trap.toml`; the middle tree is what all 10 harness configurations returned in `_numbers.json`, case `t_scope_trap`. The 16-configuration count comes from the TOML dossier's research probe. Every parser follows the spec here. The spec is what surprises the author.

The tools that read these files mostly let it pass. Cargo 1.97.1 accepted a probe crate with `workspace.exclude` after `[profile.release]` and warned only of an "unused manifest key". Appending `dependencies = ["numpy>=2", "scipy"]` to a copy of fly-lab's `pyproject.toml` put it under pytest's table; pytest 9.1.1 ran the tests and printed "Unknown config option: dependencies". *\[measured here\]*

Upstream makepad's root `Cargo.toml` keeps its `workspace.*` settings as top-level dotted keys on lines 1 to 294, opens its first header at line 297, and its last, `[profile.test.package.makepad-stitch]`, at line 315. *\[from the tree\]* In a copy, an appended `workspace.exclude = ["experiments/scratch"]` landed inside that last table, and nothing reported a clash with the real `workspace.exclude` on line 179, because the two keys sit in different tables. *\[measured here\]*

Alacritty had moved from YAML to TOML in 0.13.0, released on 27 December 2023 (PR \#6673), after its maintainer cited YAML files with broken indentation in issue \#6592. Ten months later, 0.14.0 (22 October 2024) added a `[general]` table because of TOML's own table rule. *\[from the docs\]* Projects now design around the rule. Alacritty's PR \#8192, merged on 2 October 2024, says "Some users struggle with TOML, since root options must always be at the top of the file, since they're otherwise associated with the last table." It removed every root-level option. Zola's docs warn that a section "ends at the next section or EOF." *\[from the docs\]* Writers fall in too: tomlkit 0.15.1 (17 July 2026) fixed a bug in which appending a top-level scalar from code, after a dotted-key entry whose table had a child header, "placed the scalar inside that table's scope, silently re-nesting it on round-trip." *\[from the docs\]*

Arrays of tables repeat the rule: "Any reference to an array of tables points to the most recently defined table element of the array." *\[from the spec\]* After two `[[servers]]` blocks, `[servers.limits]` belongs to the second server only, in tomllib 3.14.4. Writing `[servers]` twice where `[[servers]]` was meant fails in all 16 research configurations. *\[measured here\]*

### Defined once, never reopened

The remaining structural rules are about definition. "Like keys, you cannot define a table more than once. Doing so is invalid." A super-table may follow its sub-table; the spec's example comment reads "defining a super-table afterward is ok". Headers and dotted keys may not redefine each other's tables. Inline tables "are fully self-contained and define all keys and sub-tables within them. Keys and sub-tables cannot be added outside the braces." *\[from the spec\]*

Most of these hold everywhere (Figure 13). Three invalid documents do not, two of them the spec's own examples. BurntSushi/toml v1.6.0 lets a dotted key extend a header-defined table and an inline table, merging the keys both times. @iarna/toml 2.2.5 accepts the example the spec marks `# [fruit.apple]  # INVALID`. *\[measured here\]* That version is still what `npm install @iarna/toml` installs: a TOML 0.5 parser published on 22 April 2020. On 9 October 2026 BurntSushi's issue \#470 was open, fix PRs \#486 and \#487 were unmerged, and v1.6.0 was still the newest release. *\[from the docs\]* In a verification probe, BurntSushi also read `a.b = "hello"` then `a = 7` and silently discarded `a = 7`. *\[measured here\]* A file a Go tool accepts can be refused by a Python or Rust tool. *\[reconstruction\]*

**Figure 13. Fourteen TOML documents, ten parser configurations: who accepts what**

| Document | tomllib · 3.14, · 3.15rc1 | tomli · 2.5.0 | tomlkit · 0.15.1 | smol-toml · 1.9.0 | @iarna/toml · 2.2.5 | Rust toml · 1.1.7 | toml_edit · 0.25.16 | BurntSushi · v1.6.0 | go-toml · v2.4.3 |
|----|----|----|----|----|----|----|----|----|----|
| `debug = true` after `[server]` | server.​debug | server.​debug | server.​debug | server.​debug | server.​debug | server.​debug | server.​debug | server.​debug | server.​debug |
| `[a.b]` before `[a]` | ok | ok | ok | ok | ok | ok | ok | ok | ok |
| `[fruit]` twice | error | error | error | error | error | error | error | error | error |
| dotted key into a `[table]` | error | error | error | error | error | error | error | accepts | error |
| `[fruit.apple]` over dotted keys | error | error | error | error | accepts | error | error | error | error |
| extend an inline table | error | error | error | error | error | error | error | accepts | error |
| `a = 1`, then `a = 2` | error | error | error | error | error | error | error | error | error |
| `mode = 0755` | error | error | error | error | error | error | error | error | error |
| `enabled = True` | error | error | error | error | error | error | error | error | error |
| `x = ` (no value) | error | error | error | error | error | error | error | error | error |
| 2⁶³ − 1 (i64 max) | exact | exact | exact | error | BigInt | exact | exact | exact | exact |
| 2⁵³ + 1 | exact | exact | exact | error | BigInt | exact | exact | exact | exact |
| 2⁶³ (i64 max + 1) | 2⁶³, exact | 2⁶³, exact | 2⁶³, exact | error | −2⁶³ | error | error | error | error |
| `a = [1, "a"]` | ok | ok | ok | ok | error | ok | ok | ok | ok |

*\[measured here\]* Each row is one TOML case in `_numbers.json`; the files are in `_cases/toml/`. tomllib on Python 3.14.4 and 3.15.0rc1 agree on every row, so they share a column. Green: the spec's verdict, a valid document read correctly or an invalid one refused. Red: an invalid document accepted, or a wrong value. Orange: a valid document refused. The first row is green everywhere and is still the trap Alacritty and Zola warn about, because there the spec and the parsers agree and the author does not.

### Numbers, dates and the missing null

TOML has no implicit octal: `0755` is an error in all 10 configurations and `0o755` is 493 in all 10. *\[measured here\]* The integer rule is strict: "If an integer cannot be represented losslessly, an error must be thrown." *\[from the spec\]* At 2⁶³, one past the int64 maximum, the parsers split three ways. Rust, Go and smol-toml raise an error. @iarna/toml returns the BigInt −9223372036854775808: the sign flips and nothing complains. tomllib, tomli and tomlkit return the exact Python int. *\[measured here\]* TOML 1.1 allows any integer size ([What each format can say](#03-what-each-format-can-say)). *\[from the spec\]* smol-toml errs the other way: by default it refuses the valid int64 values 2⁶³ − 1 and 2⁵³ + 1, as "integer value cannot be represented losslessly". *\[measured here\]* In the research probe's run of toml-test, the official conformance suite, tomlkit read `1٠`, a 1 followed by U+0660 ARABIC-INDIC DIGIT ZERO, as 10. *\[from the docs\]* *\[measured here\]* Python's `int()` accepts any Unicode decimal digit, the likely cause. *\[reconstruction\]*

`inf`, `-inf`, `nan` and `-0.0` parse in all 10. Mixed-type arrays have been valid since 1.0: "Values of different types may be mixed." *\[from the spec\]* @iarna/toml 2.2.5 still refuses `a = [1, "a"]`: "Inline lists must be a single type". *\[measured here\]*

The four date-time types ([What each format can say](#03-what-each-format-can-say)) arrive as different native types. On `t_datetimes`, Python returns `datetime`, `date` and `time`; Rust one `Datetime` struct with optional parts; go-toml v2 `time.Time` plus its own three local types; BurntSushi `time.Time` for all four, with a local time placed on 0000-01-01; smol-toml a `TomlDate` each time. @iarna/toml returns a JavaScript `Date` for the offset value, which keeps the instant (14:32 UTC) but not the −07:00 offset. *\[measured here\]* In the research probe, smol-toml 1.9.0 and @iarna/toml turned `2020-02-30` into 1 March 2020; the Python, Go and Rust parsers refused it. *\[measured here\]* smol-toml's README says "certain invalid datetimes (e.g. `2020-02-30`) are gracefully accepted." *\[from the docs\]*

TOML has no null, so the trouble moves to writers. In the research probe, tomli_w and tomlkit raise on `None`. smol-toml 1.9.0 and @iarna/toml 2.2.5 drop keys whose value is null, and @iarna writes `[1, null]` as `arr = [ 1 ]`, one element shorter, with no error. go-toml v2.4.3 writes a Go field `[]*int{&one, nil}` as `ports = [1, 0]`. *\[measured here\]* A program that saves its own config can change a list for the next reader ([When the program writes back](#11-when-the-program-writes-back)). *\[reconstruction\]*

### Bytes and shapes

Two byte-level details split the parsers. "TOML parsers should feel free to normalize newline to whatever makes sense for their platform." *\[from the spec\]* For a multi-line string with CRLF endings, tomllib and tomli return `line1\nline2`; the other 7 configurations keep `\r\n`, on the same Linux machine. *\[measured here\]* A leading UTF-8 BOM split the 16 research configurations 8 to 8: BurntSushi, smol-toml, npm `toml`, both Rust `toml` versions and toml_edit accept it; go-toml v2, @iarna/toml, j-toml and every Python parser refuse it. *\[measured here\]* toml-test notes that the spec "does not explicitly say if a document can start with a UTF-8 BOM". *\[from the docs\]*

The last cost is shape. Every header names its table by the full path, so deep data repeats itself. *\[from the spec\]* A constructed fragment shaped like a Kubernetes Deployment:

    [[spec.template.spec.containers]]
    name = "app"
    image = "app:1.4"

    [spec.template.spec.containers.resources.limits]
    cpu = "500m"

The second header names a path but binds to a position: the most recent container, as with `[servers.limits]` above. *\[from the spec\]* In the research probe, a Deployment-shaped document written with headers only took 14 headers, 9 repeating `spec.template.spec.containers`; it ran to 44 lines and 934 bytes, against 46 lines and 848 bytes of YAML and 76 lines and 1,541 bytes of two-space JSON. *\[measured here\]* Size is not the problem. Distance is: the further a key sits from the header that owns it, the easier it is to misplace. *\[reconstruction\]* [One configuration, three ways](#10-one-configuration-three-ways) shows the same cost on MCP server lists; [the next section](#09-toml-1-1-and-the-version-nobody-declares) covers which TOML a parser reads.

## 09 · TOML 1.1 and the version nobody declares

TOML 1.1.0 is the first new version of the spec in almost five years. A TOML file cannot say which version it uses, so a file with 1.1 syntax is valid to one parser and a syntax error to another, and the error never mentions a version. Python's standard library reads 1.1 only from 3.15.0, released on the day this guide is dated; Python 3.11 to 3.14 read TOML 1.0 only.

### What 1.1 changed

TOML 1.0.0 is dated 11 January 2021 and 1.1.0 is dated 18 December 2025, 4 years and 11 months later ([Three formats, three intentions](#02-three-formats-three-intentions) has the tag dates). The 1.1.0 changelog lists four syntax changes: "Allow newlines and trailing commas in inline tables" (#904); "Add `\xHH` notation to basic strings for codepoints ≤255" (#796); "Add `\e` escape for the escape character" (#790); and "Seconds in datetime and time values are now optional" (#894). *\[from the docs\]* The rest is labelled clarification, but two clarifications change what a parser may do. The comment section now says "Parsers must not modify keys or values, based on the presence (or contents) of a comment." *\[from the spec\]* The other, on integer size, is in [What each format can say](#03-what-each-format-can-say).

The changes waited a long time. Multi-line inline tables were requested in issue \#516 on 22 January 2018 and merged in PR \#904 on 30 July 2022, almost three and a half years before any release contained them. Unicode bare keys, merged in PR \#891 in 2022, were backed out by PR \#979 on 30 May 2025 so that 1.1 could ship; that PR calls them "the most discussed single issue in the history of TOML". *\[from the docs\]*

### A file cannot say which version it is

Neither the 1.1.0 text nor its ABNF defines a version declaration; YAML at least has `%YAML` ([What each format can say](#03-what-each-format-can-say)). *\[from the spec\]* A 1.0 parser meets 1.1 syntax as an error in the only grammar it knows. The harness has four 1.1 cases of 10 to 53 bytes. tomllib on Python 3.14.4 and @iarna/toml 2.2.5 reject all four; the other eight configurations accept all four (Figure 14). *\[measured here\]*

No error names a version. tomllib reports the multi-line inline table as "Invalid initial character for a key part (at line 1, column 8)", both escapes as "Unescaped '\\' in a string", and `t = 07:32` as "Expected newline or end of document after a statement". *\[measured here\]*

The eight that accept disagree about what `07:32` is. Python returns a `datetime.time`, go-toml v2 a `LocalTime`, smol-toml a `TomlDate`, and BurntSushi a `time.Time` dated 0000-01-01. Rust's `toml` and toml_edit return `07:32` with no seconds at all. *\[measured here\]* That is deliberate: Rust `toml` 1.0.0 (11 February 2026) wrapped seconds in `Option`, "preserving whether they are present or not". *\[from the docs\]* It matters for Cargo, below.

**Figure 14. Four TOML 1.1 features, ten parser configurations, and when each learned 1.1**

| Parser, · as measured | Multi-line inline table, · trailing commas | `"\e[31m"` | `"\x41"` | `t = 07:32` | Learned 1.1 | toml-test, · 1.1 mode |
|----|----|----|----|----|----|----|
| tomllib, Python 3.14.4 | error | error | error | error | never in 3.11–3.14; reads 1.0.0 | 207/218 · 494/494 (1.0 mode: 208/208 · 501/501) |
| tomllib, Python 3.15.0rc1 | read | `"\u001b[31m"` | `"A"` | `time` 07:32:00 | 3.15.0 · 9 October 2026 (gh-142956) | 218/218 · 494/494 |
| tomli 2.5.0 | read | `"\u001b[31m"` | `"A"` | `time` 07:32:00 | 2.4.0 · 11 January 2026 | 218/218 · 494/494 |
| tomlkit 0.15.1 | read | `"\u001b[31m"` | `"A"` | `time` 07:32:00 | 0.15.0 · 10 May 2026 | 217/218 · 486/494 |
| smol-toml 1.9.0 | read | `"\u001b[31m"` | `"A"` | `TomlDate` 07:32:00.000 | 1.6.0 · 22 December 2025 | 218/218 · 480/494 |
| @iarna/toml 2.2.5 | error | error | error | error | never; a TOML 0.5 parser, npm `latest` since 22 April 2020 | not run |
| Rust `toml` 1.1.7 | read | `"\u001b[31m"` | `"A"` | `07:32`, no seconds | 0.9.10 · 18 December 2025 | not run |
| toml_edit 0.25.16 | read | `"\u001b[31m"` | `"A"` | `07:32`, no seconds | 0.24.0 · 18 December 2025 | not run |
| BurntSushi v1.6.0 | read | `"\u001b[31m"` | `"A"` | `time.Time` 0000-01-01T07:32:00 | v1.6.0 · 18 December 2025, on by default | 216/218 · 478/494 |
| go-toml v2.4.3 | read | `"\u001b[31m"` | `"A"` | `LocalTime` 07:32:00 | v2.4.0 · 17 June 2026 | not run |

*\[measured here\]* Only two refuse, and both are what people get by default: tomllib on every Python before 3.15, and npm's `latest` @iarna/toml. Neither error mentions a version. The four feature columns come from `_numbers.json`, cases `t_inline_multiline`, `t_escape_e`, `t_escape_x` and `t_time_no_seconds` (files in `_cases/toml/`). Green: the 1.1 document read as 1.1 defines it. Orange: a valid 1.1 document refused, which is what a 1.0 or 0.5 parser must do. The toml-test column comes from the TOML dossier's research probe, suite commit `ff49d10`: valid documents passed of 218, then invalid documents refused of 494. smol-toml ran there in `integersAsBigInt` mode, and four parsers were not run. *\[measured here\]* The learned-1.1 column is the first release with 1.1 support, from each project's changelog, release page or docs. *\[from the docs\]*

### Who reads 1.1, and since when

Python's 3.14 documentation says "This module provides an interface for parsing TOML 1.0.0". Support for 1.1.0 came in 3.15 through gh-142956, contributed by Taneli Hukkinen, not as the in-place update PEP 680 allowed for minor revisions; What's New in 3.15 calls it "a backwards compatible update, meaning that all valid TOML 1.0.0 documents are parsed the same way." *\[from the docs\]*

Python 3.15.0 shipped on 9 October 2026, the date of this guide, as PEP 790 scheduled; its tomllib page now says "This module provides an interface for parsing TOML 1.1.0". Every earlier release, 3.11 to 3.14.8, reads 1.0 only. *\[from the docs\]* The harness measured 3.15.0rc1, not the final release. *\[measured here\]*

Libraries moved faster. Rust's `toml` and toml_edit shipped 1.1 on the spec's release day, and BurntSushi turned it on by default that day; @iarna/toml has published nothing since 2020. *\[from the docs\]* So a `pyproject.toml` that uses 1.1 syntax can pass a tool built on a current Rust `toml` crate and fail in anything that reads it with tomllib on Python 3.11 to 3.14. No such incident was found. *\[reconstruction\]*

### Conformance, measured

toml-test, the official suite, ships one file list per version. *\[from the docs\]* In the research probe's run at commit `ff49d10` (15 September 2026), tomllib 3.15.0rc1 and tomli 2.5.0 were perfect in 1.1 mode (218 valid, 494 invalid documents), and tomllib 3.14.4 was the only perfect score in 1.0 mode (208 and 501). tomli and tomllib 3.15.0rc1 accepted 9 of the 501 invalid documents, exactly the nine that 1.0 forbids and 1.1 allows, because neither has a 1.0-only mode. *\[measured here\]* A 1.1 parser cannot tell you that your file needs 1.1. *\[reconstruction\]*

### Cargo: compatible, with one exception

Cargo has parsed TOML 1.1 in manifests and configuration files since 1.94 (5 March 2026). Its changelog says the new features "will raise your development MSRV, but the published manifest remains compatible with older parsers." *\[from the docs\]* The research probe tested that with Cargo 1.97.1. Lines 7–10 of the probe's `cargo11/Cargo.toml` use three 1.1 features:

    metadata.demo = {
        escape = "\e[0m",
        built = 2026-10-08 14:15,
    }

`cargo package` rewrote them in the manifest it packs into the `.crate`; lines 26–28 of the extracted copy, `normalized_Cargo.toml`, read:

    [package.metadata.demo]
    escape = "\u001B[0m"
    built = 2026-10-08T14:15

The inline table became a header and `\e` became `\u001B`, both 1.0 forms. The missing seconds stayed. tomllib on 3.14.4 rejects the published file: "Expected newline or end of document after a statement (at line 28, column 19)". 3.15.0rc1 reads it. A re-run on 9 October 2026 gave the same results. *\[measured here\]* Cargo's PR \#16415, merged on 29 December 2025, foresaw this: "If `toml_datetime` gains the ability to track whether seconds were optional (will be a breaking change), then that might change though that would only apply to `package.metadata`". *\[from the docs\]* Rust `toml` 1.0.0 made that change six weeks later. The exception is predicted and narrow, and the release note does not mention it. *\[reconstruction\]*

### Nothing outside the file pins it either

`application/toml` was registered with IANA on 21 October 2024, naming toml.io, which serves both 1.0.0 and 1.1.0, as the specification. Issue \#870, "TOML as an RFC?", opened by Mark Nottingham on 24 January 2022, was still open on 9 October 2026. *\[from the docs\]* The rule that follows is mine. *\[reconstruction\]* Write the 1.0 subset unless you pin the parser of every tool that reads the file. To check, parse it with a 1.0 reader such as tomllib on the oldest Python you support, up to 3.14; a 1.1 parser accepts it either way. If you adopt 1.1, say so in a comment: it is the only place the file can say it, and by 1.1's own rule no parser may let it change a value. [A practice that holds](#13-a-practice-that-holds) collects this with the other TOML rules.

## 10 · One configuration, three ways

Write one realistic configuration in all three formats and hand it to every parser. Twenty-eight of 32 hear the same data; the other four hear Norway as `false`. Parse times span three orders of magnitude and barely matter. What is heard does.

### The file

The configuration, `_cases/cross/agent.json` and its `.yaml` and `.toml` twins, describes a code-review agent service: model, timeouts, retries, a country allow-list, a three-line system prompt, a deployment date-time and three MCP servers with environment maps. The JSON is 1,707 bytes in 69 lines, the YAML 1,525 in 66, the TOML 1,560 in 67. YAML and TOML each carry six comments. *\[measured here\]* JSON's grammar has none ([JSON: a strict grammar, loose readers](#04-json-a-strict-grammar-loose-readers)). *\[from the spec\]*

**Figure 15. The same settings in three syntaxes: a date-time, the country list, the prompt, the first MCP server**

`false` to 4 of 12 YAML loaders the string "NO" to every parser a date-time object to some or all parsers

**JSON** · `agent.json` · lines 1, 5, 25–30, 40–50

```
{
  …
  "deployed_at": "2026-10-08T09:30:00Z",
  …
  "routing": {
    "allowed_countries": ["GB", "IE", "FR", "DE", "NO", "SE"]
  },
  "prompt": {
    "system": "You are a careful code reviewer.\nExplain each finding in one sentence — cite the file and line.\nNever approve a change you have not read.\n"
  },
  …
  "mcp_servers": [
    {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "enabled": true,
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}",
        "GITHUB_API_URL": "https://api.github.com"
      }
    },
  …
```

**YAML** · `agent.yaml` · lines 7, 28–35, 46–54

```
deployed_at: 2026-10-08T09:30:00Z
…
routing:
  allowed_countries: [GB, IE, FR, DE, NO, SE]

prompt:
  system: |
    You are a careful code reviewer.
    Explain each finding in one sentence — cite the file and line.
    Never approve a change you have not read.
…
# MCP servers, started in this order
mcp_servers:
  - name: github
    command: npx
    args: [-y, "@modelcontextprotocol/server-github"]
    enabled: true
    env:
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      GITHUB_API_URL: https://api.github.com
…
```

**TOML** · `agent.toml` · lines 7, 28–36, 47–53

```
deployed_at = 2026-10-08T09:30:00Z
…
[routing]
allowed_countries = ["GB", "IE", "FR", "DE", "NO", "SE"]

[prompt]
system = """
You are a careful code reviewer.
Explain each finding in one sentence — cite the file and line.
Never approve a change you have not read.
"""
…
# MCP servers, started in this order
[[mcp_servers]]
name = "github"
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
enabled = true
env = { GITHUB_TOKEN = "${GITHUB_TOKEN}", GITHUB_API_URL = "https://api.github.com" }
…
```

*\[measured here\]* Excerpts of the three case files, byte for byte; … marks omitted lines and long lines scroll. The files are 1,707, 1,525 and 1,560 bytes (`_numbers.json → cross_format.files`). With date-times compared as instants, the country line is the only value the 32 parsers disagree on: PyYAML's two safe loaders, sigs.k8s.io/yaml and serde-saphyr hear `false`. The date-time is a string in JSON, an object in every TOML parser, and an object in 6 of 12 YAML loaders.

Figure 15 shows four differences. JSON and TOML quote every country code; YAML leaves them bare, and a bare `NO` is a YAML 1.1 boolean ([YAML: the type you did not write](#05-yaml-the-type-you-did-not-write)). *\[from the spec\]* JSON has no multi-line string: RFC 8259 §7 requires control characters, newline included, to be escaped. YAML's `|` keeps the line breaks and one final newline (clip chomping, YAML 1.2.2 §8.1.1.2); TOML's `"""` trims the newline after the opening delimiter. *\[from the spec\]* So the JSON prompt sits on line 29, 157 characters long, and all three yield the same string. *\[measured here\]* The date-time differs in type. YAML 1.2's Core schema has no timestamp ([What each format can say](#03-what-each-format-can-say)). *\[from the spec\]* Six loaders still build a date-time object (PyYAML's two, ruamel's two, yaml.v3, js-yaml 4); the other six return a string. *\[measured here\]* And TOML 1.0 says inline tables "are intended to appear on a single line", so the `env` map on line 53 runs to 85 characters. *\[from the spec\]*

### What each parser heard

The harness reads each file with every parser of its format, the 32 configurations of the main matrix, and compares the result with py json's reading of `agent.json`, date-times as UTC instants and numbers canonically. All 10 JSON parsers, all 10 TOML parsers and 8 of 12 YAML loaders agree. The four that do not, PyYAML 6.0.3 through `safe_load` and `CSafeLoader`, sigs.k8s.io/yaml v1.6.0 and serde-saphyr 1.3.0, hear `routing.allowed_countries[4]` as `false`. Putting `"NO"` back makes each identical to the reference. None raises an error. *\[measured here\]*

That is the Norway problem in a file that looks like production config: one wrong value among the file's 56 scalars, in a list whose other entries are strings, and nothing fails unless something checks the element type ([A practice that holds](#13-a-practice-that-holds)). *\[reconstruction\]* The instant comparison is generous. Counted by type, only 14 of 32 match: 28, less the 10 TOML parsers and the four agreeing YAML loaders (ruamel's two, yaml.v3, js-yaml 4) that return a date-time object where JSON has a string. *\[measured here\]*

### Parse time, in tiers

Each parser ran 50 warm-up parses, then 501 timed ones, in its own runtime; the median is reported. Only the parse is timed, with default options into an untyped target. jq (process start dominates) and the Python 3.15 release candidate were not timed, which leaves 30. *\[measured here\]* The machine was not quiet. Its 2-CPU cgroup was shared with another tenant's bundler benchmark and was throttled in 395 of 473 scheduler periods during the final run. Across seven runs, medians moved by up to 2.7× (py json between 18.4 and 49.3 µs). *\[measured here\]* Figure 16 supports tiers, nothing finer.

**Figure 16. Parse-time tiers for the agent config (1.5–1.7 KB), 30 parsers, log scale**

![Range chart on a logarithmic axis from 10 microseconds to 100 milliseconds: the time to parse one copy of the same agent configuration, for 30 parser configurations grouped by format, each with its median as a dot and its 10th to 90th percentile as a bar, from 501 timed parses after 50 warm-ups on one contended 2-CPU machine where medians moved by up to 2.7 times between runs; medians below are rounded to one significant figure. JSON family, about 10 microseconds to 20 milliseconds: serde_json, serde_json with arbitrary precision and JSON.parse about 10 µs; Python json and Go encoding/json/v2 about 20 µs; Go encoding/json about 50 µs; jsonc-parser about 0.1 ms; Node json5 about 0.4 ms; Python json5 about 20 ms. TOML, about 30 microseconds to 4 milliseconds: go-toml/v2 about 30 µs; Rust toml about 40 µs; toml_edit about 60 µs; smol-toml about 90 µs; tomli, @iarna/toml and BurntSushi/toml about 0.2 ms; tomllib on Python 3.14 about 0.4 ms; tomlkit about 4 ms. YAML, about 0.1 to 10 milliseconds: serde_yaml about 0.1 ms; serde-saphyr, js-yaml 4, js-yaml 5 and yaml.v3 about 0.2 ms; sigs.k8s.io/yaml about 0.3 ms; goccy/go-yaml about 0.4 ms; PyYAML CSafeLoader about 0.5 ms; yaml (eemeli) about 2 ms; PyYAML safe_load about 5 ms; ruamel safe about 8 ms; ruamel round-trip about 10 ms. In 26 of the 30 bars the 90th percentile is within 2 times the median; for tomlkit, PyYAML safe_load and ruamel's two loaders it is 3 to 5 times.](2026-10-15-what-the-parser-hears/fig-16-parse-tiers.svg)

*\[measured here\]* From `_numbers.json → cross_format.timing`: dot = median of 501 parses, bar = 10th to 90th percentile, label = median rounded to one significant figure. One contended 2-CPU machine; compare tiers, not digits. The files differ in size and output types, so compare within a format. Within each format, medians span two orders of magnitude or more; the fastest parsers of the three formats sit within 10× of one another (about 10, 30 and 100 µs).

Strict JSON parsers take about 10 to 50 µs. Eight of nine TOML parsers take about 30 µs to 0.4 ms; tomlkit takes about 4 ms. YAML loaders run from about 0.1 ms (serde_yaml) to about 10 ms (ruamel's round-trip loader). PyYAML's `safe_load`, which uses the pure-Python loader, is about ten times slower than `CSafeLoader` (9.3× to 10.2× across the seven runs). *\[measured here\]* The slowest reader of all is a JSON one: the Python `json5` package, 0.15.0, at about 20 ms (18.2 to 38.8 ms across the seven runs), roughly three orders of magnitude slower than serde_json. *\[measured here\]* The format sets a floor; the implementation sets the time. A service parses its config at start-up and on reload, so even the slowest reader costs tens of milliseconds per load. What would reach production is one value heard differently by 4 of 32 readers. *\[reconstruction\]*

### One list, four shapes

Key layout varies too. Claude Desktop's `claude_desktop_config.json` keeps MCP servers under `mcpServers`, an object keyed by server name, and Claude Code's `.mcp.json` uses the same wrapper key and entry shape. *\[from the docs\]* VS Code's `.vscode/mcp.json` "defines servers in a top-level `servers` object"; its portable `.mcp.json` uses `mcpServers`. *\[from the docs\]* Codex gives each server a TOML table, `[mcp_servers.<id>]`, with environment variables in `mcp_servers.<id>.env`. *\[from the docs\]* The agent file is a fourth shape, an array of entries with a `name`. A block pasted under the wrong key is still valid JSON, and a reader that does not validate hears zero servers. *\[reconstruction\]*

The syntaxes also charge differently for depth. JSON and YAML nest; a TOML header spells out the full path. *\[from the spec\]* Below, my rewrite of the agent file's first server in Codex's shape (not a file from any project) needs two headers, both repeating `mcp_servers.github`. Python 3.14's `tomllib` reads it as the same server, keyed by id. *\[measured here\]*

    [mcp_servers.github]
    command = "npx"
    args = ["-y", "@modelcontextprotocol/server-github"]
    enabled = true

    [mcp_servers.github.env]
    GITHUB_TOKEN = "${GITHUB_TOKEN}"
    GITHUB_API_URL = "https://api.github.com"

Every key typed below the second header belongs to `env` until the next one, the trap of [TOML: obvious until the second table](#08-toml-obvious-until-the-second-table). *\[from the spec\]* The agent file's `[[mcp_servers]]` shape has its own: written as a header, each server's environment would read `[mcp_servers.env]`, which names no server and attaches to whichever was defined last, so moving a block moves its environment. *\[from the spec\]* The way out is the one-line inline table. TOML 1.1 lets it span lines. *\[from the spec\]* Python 3.14's `tomllib` and @iarna/toml reject that ([TOML 1.1 and the version nobody declares](#09-toml-1-1-and-the-version-nobody-declares)). *\[measured here\]* In TOML, depth costs headers or line length. *\[reconstruction\]*

## 11 · When the program writes back

Configuration is no longer only read. Package managers, agent CLIs and editors write it, and agents edit it. A writer is a reader first: it saves what it heard, through an emitter with habits of its own. Load, change one value and save, and most libraries hand back a different file. Some hand back different data.

### Who writes, and with what

Python's standard library reads TOML and does not write it, on purpose. PEP 680 rejected a write API because "Use cases that involve editing an existing TOML file (as opposed to writing a brand new one) are better served by a style preserving library. TOML is intended as a human-readable and -editable configuration format, so it's important to preserve comments, formatting and other markup." It also declined to base `tomllib` on tomlkit, which "supports style roundtripping. As a result, it has a more complex API and implementation (about 5x as much code as `tomli`)." PEP 723 dropped an earlier draft that kept a script's TOML metadata in a Python multi-line string, partly because a multi-line double-quoted TOML string would clash with the Python string around it, and many TOML writers do not preserve style, so their output could be malformed. *\[from the docs\]*

Most agent tools that rewrite their own human-edited files use a style-preserving parser. Codex writes `config.toml` through what `codex-rs/core/src/config/edit.rs` calls "the persistence engine", built on toml_edit (lines 21 and 31, commit `03b761dca9b0`). Gemini CLI reads `settings.json` through strip-json-comments 3.1.1 and writes it through comment-json 4.2.5 (`settings.ts` line 800, `commentJson.ts` lines 9 and 49). VS Code applies `setProperty`, a text edit, to the existing document (`configurationEditing.ts` lines 9 and 246). Claude Code writes `~/.claude/settings.json` from `/config`, keeps it strict JSON ([JSON: a strict grammar, loose readers](#04-json-a-strict-grammar-loose-readers)), and keeps a separate `~/.claude.json` "that it writes for itself; you don't need to edit it." OpenClaw's own writes "reserialize JSON5 as standard JSON", and with comments present "the writer warns immediately before removing them". *\[from the docs\]*

Wrangler shows the trade in code. It edits `wrangler.jsonc` with jsonc-parser's `modify`, which keeps comments. Its TOML library, smol-toml, does not, so it guards. Lines 23–34 of `patch-config.ts` in `packages/workers-utils/src/config/`, commit `daae435`: *\[from the docs\]*

    if (configPath.endsWith("toml")) {
      // the TOML parser we use does not preserve comments
      if (configString.includes("#")) {
        throw new PatchConfigError(
          "cannot patch .toml config if comments are present"
        );
      } else {
        // for simplicity, use the JSONC editor to make all edits
        // toml -> js object -> json string -> edits -> js object -> toml
        configString = JSON.stringify(parseTOML(configString));
      }
    }

The guard is a substring test. A comment-free file containing `THEME_COLOR = "#ff6600"` is refused too: the guard expression returns true on it, measured on a reproduction of the code path, not on Wrangler itself. *\[measured here\]* A file that passes is edited as JSON and written back with `TOML.stringify(parseJSONC(configString))` (line 49). *\[from the docs\]* That is the smol-toml writer in Figure 17. *\[reconstruction\]*

A preserving editor keeps the text and can still move the meaning. cargo 1.97.1, adding `itoa` to a commented `Cargo.toml`, kept every comment and put `itoa = "1"` first, in sorted order. The comment "# keep serde first; the derive feature is required by api.rs" stayed attached to `serde`, which is no longer first. `uv add --frozen "idna>=3"` (uv 0.12.5) kept a commented-out dependency inside the array and also inserted in sorted order. *\[measured here\]* cargo and uv build on toml_edit; Poetry on tomlkit. *\[from the docs\]*

### Load, change one value, save

The harness loads the agent config from [One configuration, three ways](#10-one-configuration-three-ways) (69 lines of JSON, 66 of YAML, 67 of TOML), changes `model.max_tokens` from 8192 to 4096, and dumps it. It diffs the output against the original edited by hand on that line and re-reads it with a JSON, a TOML and three YAML readers. Twenty-eight writer configurations ran. *\[measured here\]* Figure 17 shows eighteen of them in thirteen rows, and adds tomli_w from an earlier probe.

**Figure 17. Load, change one value, save: what fourteen writers did to the rest of the file**

| Writer | Format | Comments kept | Key order | Diff lines beyond the edit | Values it changed |
|----|----|----|----|----|----|
| tomlkit 0.15.1 | TOML | 6 of 6 | kept | 0 | none |
| toml_edit 0.25.16, `value()` | TOML | 5 of 6 | kept | 2 | none; the edited line's comment dropped |
| tomli_w 1.2.0 † | TOML | 0 of 6 | `[[jobs]]` moved to the top as an inline array | not measured | `0o5432` → `2842` |
| smol-toml 1.9.0 | TOML | 0 of 6 | kept | 52 | `120.0` → `120`, `250.0` → `250`; `.000` added to the datetime |
| @iarna/toml 2.2.5 | TOML | 0 of 6 | kept | 52 | as smol-toml |
| ruamel.yaml 0.19.1, round-trip | YAML | 6 of 6 | kept | 38; 4 with indent and width set | none; `"` → `'` in two flow lists |
| PyYAML 6.0.3, `safe_dump` | YAML | 0 of 6 | sorted | 125; 100 with `sort_keys=False` | `NO` → `false`; datetime respelled; em dash escaped |
| js-yaml 4.3.2 and 5.4.3, `dump` | YAML | 0 of 6 | kept | 67 | `120.0` → `120`, `250.0` → `250`; datetime gains `.000` (4) or quotes (5) |
| yaml (eemeli) 2.9.1, `Document` | YAML | 6 of 6 | kept | 24; 65 via `stringify` | none; `stringify` writes `120` |
| yaml.v3 v3.0.1, `Node` | YAML | 6 of 6 | kept | 14; 139 via `Marshal`, sorted | none; `Marshal` writes `120` |
| jsonc-parser 3.3.1, `modify` | JSON | — | kept | 0 | none |
| `JSON.stringify`, Node 24.21.0 | JSON | — | kept | 56 | `120.0` → `120`, `250.0` → `250` |
| serde_json 1.0.151 | JSON | — | sorted | 144 | none |
| Go 1.27.2 `encoding/json` | JSON | — | sorted | 144 | `120.0` → `120`, `250.0` → `250` |

Only writers that edit the text come close to a hand edit; the rest rebuild the file. *\[measured here\]* Values come from `_numbers.json → roundtrip.results`. The exception is tomli_w (†), from the TOML research probe on a different 18-line sample with six comments. Diff lines count the + and − lines of a unified diff against the hand edit. The JSON file has no comments (—). Green means kept or unchanged. Orange means a partial loss with every value intact: one comment, the key order, the layout or a number's spelling. Red means every comment lost, or a value's type changed: a boolean where the author wrote a string, or an integer where TOML and the YAML 1.2 Core schema read `120.0` as a float. The harness compares numbers by value and passes `120`, so that red tint is *\[reconstruction\]*.

Two writers reproduce the hand edit byte for byte: tomlkit and jsonc-parser's `modify`. toml_edit's idiomatic `value(4096)` assignment replaces the item's decor and drops `# hard cap per response`; copying the old decor back keeps it. *\[measured here\]* Codex's `edit.rs` imports the same `value` (line 24), and its `insert` copies the old item's decor onto the new one before assigning it (lines 602–605). *\[from the docs\]* ruamel's round-trip mode keeps all six comments but re-indents the `mcp_servers` list by default, 38 lines; with `indent(mapping=2, sequence=4, offset=2)` and `width=4096` it is 4, all quote style. yaml.v3's `Node` costs 14 lines, in blank lines and comment spacing; eemeli's `Document` 24, all spacing. *\[measured here\]* A preserving editor also preserves mistakes: each YAML one leaves `NO` bare, and PyYAML hears `false` after the edit as before. *\[measured here\]*

The other 21 configurations rebuild the file from data, and data has no comments. They produced 52 to 144 diff lines for a one-line edit. *\[measured here\]* PyYAML's `safe_dump` sorts keys by default (`dump_all` declares `sort_keys=True`, `yaml/__init__.py` line 220). *\[from the docs\]* It drops all six comments and writes `false` for `NO`, so none of the three YAML readers hears the author's intent again: the write-back row of Figure 1. serde-saphyr does the same. serde_json, Go and yaml.v3's `Marshal` sort too. JavaScript parsers hand back `120.0` and `120` as the same number, so every JavaScript writer that rebuilds the file writes `120`; in the TOML probe, `timeout = 1.0`, commented "written as a float on purpose", came back as `timeout = 1`. *\[measured here\]* In TOML that turns a float into an integer. *\[from the spec\]*

### Written by one library, read by another

A second test gave eleven YAML emitters 28 strings that look like something else, dumped each with default options, and read each back with PyYAML (1.1), ruamel.yaml's safe loader (1.2, plus timestamps and `1_000`) and eemeli's `yaml` (strict 1.2 Core). *\[measured here\]* The bare `NO` and `22:22` of three 1.2 writers, which PyYAML hears as `false` and 1342 (base 60), are one direction. PyYAML has the mirror fault: it writes the string `1e3` bare, and both 1.2 readers hear the number 1000. Red cells list strings a reader heard as something else; green means none. *\[measured here\]*

| Emitter | Writes `NO` as | PyYAML 6.0.3 · retypes | ruamel safe · retypes | eemeli Core · retypes |
|----|----|----|----|----|
| yaml.v3, sigs.k8s.io/yaml, serde-saphyr, js-yaml 5.4.3 | `"NO"` or `'NO'` | none | none | none |
| js-yaml 4.3.2 | `'NO'` | 1_000 | 1_000 | none |
| PyYAML 6.0.3 | `'NO'` | none | 1e3 | 1e3 |
| goccy/go-yaml v1.19.2 | `"NO"` | .inf, 1:30:00 | .inf, 1e3 | .inf, 1e3 |
| ruamel.yaml 0.19.1, round-trip and safe | `NO` | NO, no, yes, on, off, 22:22, 1:30:00 | none | none |
| yaml (eemeli) 2.9.1, serde_yaml 0.9.34 | `NO` | the same seven, plus 1_000 and 2001-12-14 | 1_000, 2001-12-14 | none |

The four in the first row survive every reader, because each quotes every ambiguous scalar. Both TOML writers given the same strings, smol-toml and Rust's `toml`, return all 28 as strings. *\[measured here\]* TOML has no unquoted string values. *\[from the spec\]*

### Edit, refuse, or own

A tool that writes configuration a person also edits has three honest options. It can edit the text with a format-preserving editor, as Codex, Gemini CLI, VS Code, cargo, uv and Poetry do. It can refuse, as Wrangler does for TOML with a `#` in it. Or it can own the file outright and say so, as Claude Code does with `~/.claude.json`. Load, change and dump is not a fourth option: on this config it cost 52 to 144 diff lines for one edit, and at worst it changed what every later reader hears. Preserving editors still need a test, as toml_edit's lost comment and cargo's stranded one show. An agent that edits the file as text preserves comments by construction, but not meaning: appending a line is how a top-level key ends up in the last TOML table ([TOML: obvious until the second table](#08-toml-obvious-until-the-second-table)), and a line two spaces too far left is how a YAML key lands under the wrong parent ([YAML: the structure you did not see](#06-yaml-the-structure-you-did-not-see)). An agent that scripts a load and dump inherits whatever its library does in Figure 17. *\[reconstruction\]* xo-space's own write-back is in [What our own tree says](#12-what-our-own-tree-says), and the rule returns in [A practice that holds](#13-a-practice-that-holds).

## 12 · What our own tree says

By file count, XO's configuration on this machine is mostly JSON (199 of 230 configuration-shaped files), and YAML and TOML are rare (10 files and 1). *\[measured here\]* xo-space's runtime settings arrive through `.env` files. *\[from the tree\]* The misreadings with the widest reach in our scratch runs are not the well-known ones. They come from one route that picks a parser by file suffix, and from nine readers of `.env` files that do not share a grammar.

### What is on disk

A survey on 9 October 2026 found 304 configuration-shaped files: 230 in XO-owned trees and 74 at the top level or in the workflows of upstream clones. JSON is 199 of the 230 XO files (87%), but only 55 of those are configuration a person writes. The rest are watcher state under `.xo/` (66), data and build artifacts (60), JSON Schemas (14) and lockfiles (4). XO trees hold 10 YAML files and one TOML file, fly-lab's `pyproject.toml`. The upstream clones lean the other way: 36 of their 74 files are YAML and 8 are TOML. *\[measured here\]*

### Four formats behind one suffix switch

xo-space drives five agent backends. Line 7 of each JSON manifest, `config/agents/<agent>/manifest.json`, names the agent's own config file: `~/.claude/settings.json`, `~/.gemini/antigravity-cli/settings.json`, `~/.codex/config.toml`, `~/.hermes/config.yaml` and `~/.openclaw/openclaw.json`. *\[from the tree\]* That makes four formats, because OpenClaw's configuration reference says its "Config format is JSON5 (comments + trailing commas allowed)." *\[from the docs\]*

The Settings → Config route reads all five, choosing the parser by suffix in `routers/cowork_agent/config.py`, lines 256–261:

    if suffix in (".yaml", ".yml"):
        import yaml
        raw = yaml.safe_load(config_path.read_text()) or {}
    else:
        import json as _json
        raw = _json.loads(config_path.read_text() or "{}")

Its docstring (line 232) names only "json for openclaw, yaml for hermes". *\[from the tree\]* In a scratch `HOME`, a valid Codex `config.toml` goes to `json.loads` and the route returns HTTP 500, "Expecting value: line 1 column 1 (char 0)". A five-line JSON5 `openclaw.json` returns 500 too. *\[measured here\]* Yet the Codex troubleshooter, `config/agents/codex/troubleshoot.py` lines 117–118, already warns: "codex's config_file is TOML (~/.codex/config.toml), NOT JSON — never json.load it." *\[from the tree\]*

The OpenClaw adapter goes further. `load_openclaw_config` (`adapters/openclaw/store.py`, lines 27–35) returns `{}` on any exception, and `create_agent` (`adapters/openclaw/agents.py`, lines 156 and 182–183) adds the new agent to that dict's `agents.list` and writes it over the file. *\[from the tree\]* With the same JSON5 file, `create_agent` returned 200 and left only `agents.list`; the `gateway` and `channels` blocks were gone. *\[measured here\]* Figure 18 traces both paths.

This is a scratch-environment finding. No `~/.openclaw`, `~/.codex` or `~/.hermes` exists on this machine, though the running `/opt/xo-space` build has the same code. *\[measured here\]* OpenClaw's own writes produce standard JSON ([When the program writes back](#11-when-the-program-writes-back)), its "Minimal config" example opens with a `//` comment, and its Gateway refuses to start on a config that does not match its schema. *\[from the docs\]* So the exposure is a file written by hand or copied from that example. *\[reconstruction\]*

**Figure 18. Four agent formats, one suffix switch, one write-back**

![Diagram of how xo-space reads five agent config files. Five agent manifests, claude_code, antigravity, codex, hermes and openclaw, name config files in four formats: ~/.claude/settings.json (JSON), ~/.gemini/antigravity-cli/settings.json (JSON), ~/.codex/config.toml (TOML), ~/.hermes/config.yaml (YAML) and ~/.openclaw/openclaw.json (JSON5 according to OpenClaw's documentation). All five flow into one suffix switch at routers/cowork_agent/config.py lines 256 to 261, which sends .yaml and .yml files to yaml.safe_load and everything else to json.loads. Results in a scratch home: Claude Code's settings.json goes to the right parser and Antigravity's to json.loads, neither probed, and Antigravity's grammar was not checked; codex returns HTTP 500, Expecting value; hermes returns 200 but password: 123456 comes back unmasked because YAML typed it as an integer; openclaw returns HTTP 500, Expecting property name. A second path below: load_openclaw_config in store.py lines 27 to 35 turns any exception into an empty dict, create_agent in agents.py lines 156 and 182 to 183 appends the new agent to agents.list, and write_openclaw_config in store.py lines 38 to 43 replaces the whole file; a dashed write-back edge returns to openclaw.json, which afterwards holds only agents.list, with gateway and channels gone.](2026-10-15-what-the-parser-hears/fig-18-xo-config-map.svg)

*\[from the tree\]* Paths and line numbers are from the xo-space checkout at `aa96ba8`. *\[measured here\]* The three measured results on the right and the write-back ran against scratch files in a scratch `HOME`, never a real agent config; the Claude Code and Antigravity rows were not probed. The route knows two formats and the manifests name four. Of the loaders shown, the one that swallows its parse error is the one whose output is written back.

### `.env` has no single grammar

Most of xo-space's configuration arrives as environment variables, loaded from `.env`-format files by python-dotenv 1.2.3. *\[from the tree\]* The tree holds eight other `.env` readers: install.sh's bash loop, which matches `KEY=` prefixes, and seven hand-written Python parsers. The Python ones each strip the line, skip `#` lines and split at the first `=`; they differ in how they treat quotes. *\[from the tree\]* Five of these readers, run on one 12-line file, disagree with one another (Figure 19). *\[measured here\]*

The disagreement reaches stored values because the Settings → Env Vars writer is not the boot reader. `serialize_env_file` (`registry/agent_env.py`, lines 51–54) writes `KEY=value` unquoted. *\[from the tree\]* In a scratch run through xo-space's own code, a value typed as `p@ss #1` stays `p@ss #1` in the live process and becomes `p@ss` after a restart. *\[measured here\]* The backup writer's docstring (`xo_projects_sync/config.py`, lines 94–97) states the assumption: "We don't quote automatically because dotenv treats unquoted values as plain strings and most of our values are simple repo names / hex secrets." *\[from the tree\]* A backup passphrase containing " \#" is cut the same way. In another scratch run through xo-space's own code, with a key written twice, the upsert edits the first row while python-dotenv and install.sh take the last, so the edit reverts at the next restart. *\[measured here\]*

Precedence has the same split. The comment at `server.py` lines 29–31 says keys exported by the shell "outrank every file below". *\[from the tree\]* Run against scratch files, they outrank `.env` and `roots.env` but not `runtime.env`, loaded with `override=True` (line 70). *\[measured here\]* The secrets file is loaded the same way (lines 71–73). *\[from the tree\]* Booleans use two vocabularies: `QUIRQ_WATCHER_ENABLED` accepts `"on"` (line 726) and `UVICORN_RELOAD` does not (line 1159). *\[from the tree\]*

**Figure 19. One .env line, five readers in xo-space**

| Line in the file | python-dotenv · 1.2.3 (boot) | install.sh · loop | agent_env.py · (Settings UI) | hermes/ · profile_env.py | openclaw/ · troubleshoot.py |
|----|----|----|----|----|----|
| `STAGE=beta # beta (default …)` | `beta` | `beta` | value plus the comment | value plus the comment | value plus the comment |
| `QUOTED_HASH="a #b"` | `a #b` | `"a` | `"a #b"` | `a #b` | `a #b` |
| `DQ="value"` | `value` | `value` | `"value"` | `value` | `value` |
| `TRAIL_QUOTE=pa"ss"` | `pa"ss"` | `pa"ss"` | `pa"ss"` | `pa"ss` | `pa"ss"` |
| `QUOTED_THEN_COMMENT="x" # note` | `x` | `x` | `"x" # note` | `x" # note` | `"x" # note` |
| `SPACED = spaced` | `spaced` | not found | `spaced` | `spaced` | `spaced` |
| `export EXPORTED=v` | key `EXPORTED` | not found | key `export EXPORTED` | key `export EXPORTED` | key `export EXPORTED` |
| `ESCAPED="line1\nline2"` | two lines | literal `\n` | literal `\n`, quotes kept | literal `\n` | literal `\n` |
| one key on two rows (separate probe) | last row | last row | lists both; an edit changes the first | not run | not run |

*\[measured here\]* Each reader's code was copied verbatim from the tree and fed the same 12-line file; python-dotenv 1.2.4 gives identical values. The `STAGE` line's padding and comment are shortened here. Untinted: the boot reader, or not run. Green: hears what the boot reader hears. Orange: hears something else. Only two of the twelve lines, an empty value and `$HOME/x`, are read the same way by all five. The reader behind the Settings UI disagrees with the boot reader on seven of the nine rows shown.

### YAML typing reaches the secret mask

Before the Settings route returns a config, `_mask_sensitive` (`services/cowork_agent/helpers.py`, lines 214–223) masks six key names, but only string values. *\[from the tree\]* So YAML's typing decides what is hidden. In a scratch Hermes `config.yaml`, `password: 123456` came back as the integer 123456, unmasked; the quoted `token: "123456"` came back as `****`. *\[measured here\]* Hermes v0.21.6 reads the file with ruamel.yaml pinned to YAML 1.1 (`hermes_yaml.py`, lines 22–25), *\[from the docs\]* and on this file agrees with PyYAML on every value. *\[measured here\]*

The famous YAML traps are nearly absent. The 46 YAML files in the survey contain no `yes`, `no`, `NO` or `off` value, no leading-zero number and no unquoted dotted version. The one Norway-style pitfall is a bare `on:` key, in three XO workflows and 29 upstream ones, and 3 of the 12 loaders measured here rename it ([YAML: the structure you did not see](#06-yaml-the-structure-you-did-not-see)). *\[measured here\]*

### fly-lab: two formats, three readers

fly-lab keeps each experiment config twice, as YAML and as a JSON "twin", and reads the YAML when PyYAML is importable (`fly_lab/config.py`, lines 1–3). *\[from the tree\]* The JSON carries defaults the YAML omits, yet all five pairs load to identical configs. *\[measured here\]* Command-line overrides go through a third reader, `ast.literal_eval` with a true/false fallback (lines 113–117). *\[from the tree\]* It hears `010` as a string, `null` as the string `"null"`, and `3.10` as 3.1. *\[measured here\]*

### The quirq outcome spec

`what-is-quirq/section-2-spec.md` defines the unit of work at lines 32–33 as `u = (S₀, G, τ, B)` with `G = {(g₁,w₁),…,(gₙ,wₙ)}`, and adds: "All four components committed before execution." Lines 44–45 give the score and the test: `V(u) = Σᵢ wᵢ gᵢ(S₁) / Σᵢ wᵢ` and `done(u) = [ V(u) ≥ τ ]`. *\[from the tree\]* No config file represents this yet. quirq-calculator reads no configuration at all, and its `PLAN.md` lists the V and Q core as next. *\[from the tree\]*

The format question is easy here; the number question is not. The same spec in JSON, TOML and YAML (τ = 0.8, B = 4.00, weights 0.7, 0.1 and 0.2) parses to equal dicts under `json`, `tomllib` and PyYAML. Passing the first two checks gives V = 0.7999999999999999, and `done` is false in Python and in Node. With `Decimal`, V is 0.8 and `done` is true. *\[measured here\]* Neither 0.7 nor 0.1 has an exact binary form, and `json`, `tomllib` and PyYAML all return binary doubles, so changing the format does not fix this. *\[reconstruction\]* The whitepaper's calculator hides the edge by rounding V to two decimals (`whitepaper/index.html`, line 1096), a step eq 1 does not contain. *\[from the tree\]*

A spec that commits τ should commit numbers that compare exactly. Here is a TOML version that keeps top-level keys above the first header ([TOML: obvious until the second table](#08-toml-obvious-until-the-second-table)), uses only TOML 1.0 syntax, and makes every number an integer. *\[reconstruction\]*

    # quirq outcome spec: u = (S0, G, tau, B), section-2-spec.md Definition 1.
    # Top-level keys first. Every number is an integer, so V >= tau is exact.
    spec_version = 1
    start = "refs/tags/quirq/u-0001/start"   # S0, fixed before execution
    settlement = "atomic"                    # divisible | atomic | deadband
    checks = [                               # G: id, predicate, integer weight
      { id = "a", run = "checks/a.sh", weight = 7 },
      { id = "b", run = "checks/b.sh", weight = 1 },
      { id = "c", run = "checks/c.sh", weight = 2 },
    ]

    [threshold]                              # tau = num / den = 0.8
    num = 8
    den = 10                                 # done iff den*sum(w*g) >= num*sum(w)

    [budget]                                 # B = 4.00 USD
    minor_units = 400
    currency = "USD"

`tomllib` on Python 3.14.4 loads it, and the same two passing checks give 10 × 8 ≥ 8 × 10, so `done` is true with no rounding. *\[measured here\]* The budget is in cents for the same reason. One question stays open: "committed before execution" needs a form that can be hashed, and nothing in the tree yet says whether quirq would hash these bytes or a canonical form. *\[reconstruction\]*

## 13 · A practice that holds

Every failure in this guide has a guardrail, usually a flag, a schema or a lint rule. The rules below are mine, and each names the failure it prevents. *\[reconstruction\]*

### Six rules for any format

**1. Name the parser and its version.** The format is not the contract; the parser is. The line `countries: [GB, IE, FR, DE, NO, SE]` gives `"NO"` in 8 of 12 [YAML loaders](#05-yaml-the-type-you-did-not-write) and `false` in 4. A multi-line [TOML 1.1](#09-toml-1-1-and-the-version-nobody-declares) inline table is read by 8 of 10 TOML parsers and refused by Python 3.14's `tomllib` and by @iarna/toml. *\[measured here\]* Write down which library reads the file, pin it, and run it over the file in CI. *\[reconstruction\]*

**2. Validate against a schema, in the editor and in CI.** JSON Schema serves all three formats: on 8 October 2026, SchemaStore's catalog listed 1,513 schemas, and by file pattern 762 match YAML files, 624 JSON-family files and 128 TOML files. *\[measured here\]* JSON Schema's current dialect, 2020-12, is an Internet-Draft that expired on 12 December 2022. *\[from the spec\]* VS Code warns that an in-file `"$schema"` key "changes the JSON itself, which systems consuming the JSON might not expect". check-jsonschema 0.38.2 validates all three formats in CI. *\[from the docs\]*

**3. Load into a typed target and reject unknown keys.** Go's `encoding/json` documentation says "By default, object keys which don't have a corresponding struct field are ignored". *\[from the docs\]* Turning that off guards the silent structure traps. [TOML's scope trap](#08-toml-obvious-until-the-second-table) moves `debug` into `server` in all 10 parsers, and three YAML loaders return only the first mapping of the file from [Helm issue \#9793](#06-yaml-the-structure-you-did-not-see). *\[measured here\]* A `Server` type with no `debug` field rejects the first, and required fields report the second. Typed targets were not measured here. *\[reconstruction\]*

**4. Reject duplicate keys.** All 10 TOML parsers refuse `a = 1` followed by `a = 2`, and so do 9 of 12 [YAML loaders](#06-yaml-the-structure-you-did-not-see); PyYAML's two loaders and sigs.k8s.io/yaml keep the last value. In [JSON](#04-json-a-strict-grammar-loose-readers), 9 of 10 parsers keep the last value silently, and only Go's `encoding/json/v2` refuses. *\[measured here\]* A schema cannot catch them: it validates the value the parser returned, after the last duplicate has won. *\[reconstruction\]*

**5. Never write human configuration with a non-preserving writer.** Load the agent config, change one value and dump it: each of the 21 writers that dump plain data produced 52 to 144 diff lines, and tomlkit and jsonc-parser's `modify` changed nothing beyond the edit ([the write-back test](#11-when-the-program-writes-back)). *\[measured here\]*

**6. Keep secrets out of files that agents read and write.** An agent reads the whole file it edits, and a dumping writer rewrites it, so keep references such as `"${GITHUB_TOKEN}"` in the file and the values elsewhere. *\[reconstruction\]* xo-space masks configs sent to the browser only where the value is a string under one of six key names. *\[from the tree\]* In a [scratch run](#12-what-our-own-tree-says), a YAML `password: 123456` went out as an unmasked integer. *\[measured here\]*

### Rules per format

The flags and tools for each format are in Figure 20.

**JSON.** Keep it strict wherever a program writes it, and use [JSONC](#04-json-a-strict-grammar-loose-readers) only through one named parser that fails on errors: jsonc-parser 3.3.1 reports two errors for a trailing comma and still returns `{"a": 1, "b": 2}`. *\[measured here\]*

**YAML.** Quote every scalar that is not obviously a string. Unquoted, `python: 3.10` is 3.1 in all 12 loaders here; [quoted](#05-yaml-the-type-you-did-not-write), ten trap values stayed strings in all 16 loader configurations of the research probe. *\[measured here\]* yamllint's `truthy` rule allows only `true` and `false` by default. *\[from the docs\]* Its default `check-keys: true` also flags a workflow's bare [`on:`](#06-yaml-the-structure-you-did-not-see). *\[measured here\]* Quote `"on"` or set `check-keys: false` for `.github/workflows`. *\[reconstruction\]*

Load with a safe loader, never an unsafe or full one, that also limits [aliases](#07-when-loading-means-executing): in Node, eemeli's `yaml` (`maxAliasCount` 100); in Go, yaml.v3 (an alias-ratio check); in Rust, serde-saphyr (a node and alias budget) or the archived serde_yaml (a repetition limit). None of the four Python loaders here has one. *\[measured here\]* A cap on input size does not stop a 446-byte bomb. *\[reconstruction\]* js-yaml's safety guide says what does: "do a cheap pass first that counts every element and bails out past a limit". *\[from the docs\]*

**TOML.** Put top-level keys before the first table, or have none, as Alacritty 0.14 did when it moved its root options into a `[general]` table ([the scope trap](#08-toml-obvious-until-the-second-table)). *\[from the docs\]* Write the 1.0 subset unless every reader is pinned: Python 3.14's `tomllib` and @iarna/toml refuse all four [1.1 features](#09-toml-1-1-and-the-version-nobody-declares) measured. *\[measured here\]*

**Figure 20. The guardrails per format: one row per concern, with the flag, rule or library**

- **Parser, pinned**: JSON one library and version, locked; in Go, encoding/json/v2 YAML a safe loader with an alias limit: eemeli yaml in Node, yaml.v3 in Go, serde-saphyr in Rust; in Python none here has one, so count elements before walking the result TOML the parser by name; tomllib reads 1.1 only from Python 3.15
- **Version**: JSON strict RFC 8259; JSONC only through jsonc-parser, errors fatal YAML 1.2, so no merge keys; a %YAML 1.2 line changes nothing in PyYAML TOML the 1.0 subset; a 1.1 file says so in a comment
- **Schema**: JSON JSON Schema 2020-12, mapped from outside the file YAML a yaml-language-server modeline comment TOML a \#:schema comment for Taplo or Tombi All three check-jsonschema in CI
- **Typed target**: All three deny_unknown_fields (serde), extra='forbid' (pydantic) JSON DisallowUnknownFields (Go encoding/json ) YAML KnownFields(true) in go-yaml v3, which still reads yes into a bool as true
- **Duplicate keys**: JSON encoding/json/v2 ; object_pairs_hook ; a serde struct, not a Value YAML yamllint key-duplicates ; the \*Strict functions of sigs.k8s.io/yaml TOML already invalid; all 10 parsers refuse
- **Values**: JSON ids beyond 2 53 as strings; allow_nan=False in Python; UTF-8 with no BOM, which 7 of 10 report as an error YAML quote versions, codes, modes, times, a leading 0 or ! ; yamllint truthy , plus octal-values (off by default); one document per file TOML integers in int64, or 2 53 for JavaScript; offsets on date-times; no null, so absence or a documented sentinel
- **Writer**: JSON jsonc-parser modify , or own the file outright YAML ruamel.yaml round-trip, eemeli Document ; Go: yaml.v3 Node ; never safe_dump TOML tomlkit, or toml_edit, copying the old item's decor; never load and dump
- **Secrets**: All three references such as "\${GITHUB_TOKEN}" in the file, values in the environment or a secret store

*\[reconstruction\]* The concerns are the same in every format; the defaults are not. All 10 TOML parsers refuse a duplicate key unasked; in YAML and JSON that takes a chosen parser. *\[measured here\]* Blue rows are decided once per project, purple rows are checked on every edit and load, and green rows govern what is written back and who can read it. Each entry appears in this guide, measured or from its own documentation; the selection is mine.

### When none of the three fits

For computed values, types shared across files, or no implicit typing at all, these are the candidates as of October 2026. *\[from the docs\]*

- **JSON5**: JSON plus some ECMAScript 5.1 syntax; easier editing, no types (spec 1.0.0, 2018).
- **HCL**: HashiCorp's native syntax, with expressions, plus a JSON variant; v2 tagged 2 October 2019.
- **CUE**: unifies data with constraints across JSON, YAML and TOML; pre-1.0, v0.17.1 (16 July 2026).
- **Dhall**: "JSON + functions + types + imports", not Turing-complete; v23.1.0 (16 January 2025).
- **Jsonnet**: templating that emits JSON, v0.22.0 (24 March 2026); by default its imports reach any path the interpreter can read.
- **Nickel**: "in essence JSON with functions", with gradual types; 1.18.0 (19 September 2026).
- **Pkl**: Apple's configuration language, open-sourced on 1 February 2024; 0.32.1 (23 July 2026).
- **KDL**: 2.0.0 (21 December 2024) made bare `true`, `false` and `null` syntax errors.
- **StrictYAML**: a Python-only YAML subset, all strings unless a schema says otherwise; 1.7.3 (10 March 2023).
- **NestedText**: one scalar type, the string; 3.8 (26 December 2025).
- **Starlark**: Bazel's hermetic Python dialect, which needs an embedded interpreter.

ESLint took the last exit. Since v9.0.0 (5 April 2024) its default configuration is `eslint.config.js`, and v10.0.0 (6 February 2026) removed the old formats. One format, its documentation says, lets it "avoid the need for custom parsing of config files". *\[from the docs\]* Most of these languages emit JSON or YAML, so their output is still parsed and still needs the guardrails. *\[reconstruction\]*

### The decision rule

The answer up front, reordered as a flow with a strict-JSON fallback, is four questions asked in order (Figure 21). TOML gets the hand-edited files because its parsers seldom disagree in silence. *\[reconstruction\]* In `cases[].heard`, leaving out errors, the agent config and the depth and bomb runs, the parsers that accept a case return two or more readings in 9 of 15 JSON cases, 12 of 26 YAML cases across the 12 loaders, and 4 of 22 TOML cases; TOML's nine other splits are refusals. *\[measured here\]* A refusal is loud. The scope trap is the exception: silent, and the same in all 10 parsers, so it needs rule 3, not a better parser. *\[reconstruction\]*

**Figure 21. Choosing a configuration format: four questions, asked in order**

![A decision flow of four questions asked in order down the left, each with a yes branch to an answer on the right. Question 1: does the ecosystem expect a format? Yes: use that format with the guardrails; YAML for Actions, Compose, Kubernetes and Ansible, TOML for Cargo.toml, pyproject.toml and Codex, JSON for package.json, tsconfig and Claude Code. Question 2: will a program write it? Yes: strict JSON with a JSON Schema if the program owns it; if people edit it too, JSONC through one parser, or a preserving editor such as tomlkit, toml_edit or ruamel's round-trip mode. Question 3: will people edit it by hand? Yes: TOML written as the 1.0 subset, with top-level keys before the first table, absence documented because there is no null, and integers within int64, or within 2 to the 53 if JavaScript reads them. Question 4: does it need logic or types across files? Yes: a configuration language such as CUE, Pkl, Nickel, Dhall or Jsonnet, or configuration as code such as eslint.config.js, whose output still needs guarding. If every answer is no: strict JSON with a schema. Answers are tinted grey when the format is chosen for you, blue when a program writes the file, green when people write it, and purple when it is computed.](2026-10-15-what-the-parser-hears/fig-21-decision.svg)

*\[reconstruction\]* The flow is my judgement, not a standard. Thick black edges are control: a yes leads to an answer, a no to the next question. The tint says who the file is for. The answers carry the guardrails of Figure 20; none of them removes the need to name the parser.

Whichever box a file lands in, the six rules stay. The format decides which pitfalls are possible. The guardrails decide whether the two readers of the file hear the same thing. *\[reconstruction\]*

## 14 · Sources

Every fact above comes from these sources, the XO trees on this machine, or the harness and probes described at the end. Where a link names a commit or tag, line numbers refer to it. An entry without a link was read from the repository, registry or local toolchain it names, or is a record found by its number.

**Companion.** [Where the JSON Lives](2026-10-15-where-the-json-lives.md) treats JSON as stored data. This guide treats JSON, YAML and TOML as configuration.

### Specifications

- JSON: [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.txt) ([STD 90](https://www.rfc-editor.org/info/std90)), [RFC 4627](https://www.rfc-editor.org/rfc/rfc4627.txt), [RFC 7159](https://www.rfc-editor.org/rfc/rfc7159.txt), [ECMA-404 2nd edition](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf), and RFC 7493 (I-JSON).
- YAML: [1.2.2](https://yaml.org/spec/1.2.2/), its [changes](https://yaml.org/spec/1.2.2/ext/changes/) and [history](https://yaml.org/spec/history/); [1.1](https://yaml.org/spec/1.1/) and the type repository ([bool](https://yaml.org/type/bool.html), [int](https://yaml.org/type/int.html), [float](https://yaml.org/type/float.html), [null](https://yaml.org/type/null.html), [timestamp](https://yaml.org/type/timestamp.html), [merge](https://yaml.org/type/merge.html)); [RFC 9512](https://www.rfc-editor.org/rfc/rfc9512.html#section-3.2).
- TOML: [1.0.0](https://toml.io/en/v1.0.0), [1.1.0](https://toml.io/en/v1.1.0), the [CHANGELOG](https://github.com/toml-lang/toml/blob/main/CHANGELOG.md), the IANA [application/toml](https://www.iana.org/assignments/media-types/application/toml) entry.
- Dialects: [JSON5](https://spec.json5.org/), [jsonc.org](https://jsonc.org/) ([repository](https://github.com/JSONC-org/JSONC)), [Hjson](https://hjson.github.io/).

### Parser documentation, source and changelogs

- JSON readers: Python's [json docs](https://docs.python.org/3/library/json.html) (CPython 3.14 `json.rst`, "Standard Compliance and Interoperability"); [jsonc-parser](https://github.com/microsoft/node-jsonc-parser)'s README; Go 1.27.2's `encoding/json/v2_decode.go` lines 55–59, the package documentation on unknown keys, from the local toolchain; Go [1.27 notes](https://go.dev/doc/go1.27) (json/v2) and [release history](https://go.dev/doc/devel/release); [ruby/json](https://github.com/ruby/json) CHANGES.md; Node's [v24 CLI docs](https://github.com/nodejs/node/blob/v24.x/doc/api/cli.md) (`node.config.json`); [dominictarr/rc](https://github.com/dominictarr/rc), `lib/utils.js` line 15 at a97f6ad, and its dependency [deep-extend](https://github.com/unclechu/node-deep-extend).
- PyYAML [CHANGES](https://github.com/yaml/pyyaml/blob/6.0.3/CHANGES), [resolver.py](https://github.com/yaml/pyyaml/blob/6.0.3/lib/yaml/resolver.py#L170-L175), `yaml/__init__.py` line 220 (6.0.3, `sort_keys=True`), the [load() deprecation](https://github.com/yaml/pyyaml/wiki/PyYAML-yaml.load(input)-Deprecation), issues [\#376](https://github.com/yaml/pyyaml/issues/376), [\#744](https://github.com/yaml/pyyaml/issues/744), [\#897](https://github.com/yaml/pyyaml/issues/897), PR [\#937](https://github.com/yaml/pyyaml/pull/937); ruamel.yaml [docs](https://yaml.dev/doc/ruamel.yaml/detail/) and [CHANGES](https://sourceforge.net/p/ruamel-yaml/code/ci/default/tree/CHANGES); Psych [PR \#487](https://github.com/ruby/psych/pull/487); SnakeYAML's [README](https://github.com/snakeyaml/snakeyaml/blob/master/README.md) and [Changes](https://codeberg.org/snakeyaml/snakeyaml/wiki/Changes) (2.0 and 1.26).
- js-yaml [CHANGELOG](https://github.com/nodeca/js-yaml/blob/78326247fa2c/CHANGELOG.md), [v5 migration](https://github.com/nodeca/js-yaml/blob/78326247fa2c/docs/migrate_v4_to_v5.md), [safety](https://github.com/nodeca/js-yaml/blob/78326247fa2c/docs/safety.md); eemeli's yaml [options](https://github.com/eemeli/yaml/blob/528ef30d6ded/docs/03_options.md), [errors](https://github.com/eemeli/yaml/blob/528ef30d6ded/docs/08_errors.md); serde_yaml [0.9.34](https://github.com/dtolnay/serde-yaml/releases/tag/0.9.34) and its `src/de.rs` lines 1093–1094; serde-saphyr 1.3.0's README; both from the Cargo registry.
- Go YAML: [go-yaml](https://github.com/yaml/go-yaml/blob/main/README.md); `go.yaml.in/yaml/v2` v2.4.2 `resolve.go` lines 37–40, from the Go module cache; [sigs.k8s.io/yaml](https://github.com/kubernetes-sigs/yaml/blob/aadfabb7d36952151672ec164d4220a6f0e31f63/yaml.go); Helm v3.6.0 [pkg/chartutil/values.go](https://raw.githubusercontent.com/helm/helm/v3.6.0/pkg/chartutil/values.go) (lines 26, 107–108); apimachinery's `pkg/util/yaml/decoder.go` at [v1.21.0](https://raw.githubusercontent.com/kubernetes/kubernetes/v1.21.0/staging/src/k8s.io/apimachinery/pkg/util/yaml/decoder.go) (lines 290–296) and [v1.22.0](https://raw.githubusercontent.com/kubernetes/kubernetes/v1.22.0/staging/src/k8s.io/apimachinery/pkg/util/yaml/decoder.go), the release with PR \#103457.
- GitHub Actions: the [workflow syntax](https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax) reference (the quote about `*`, `[` and `!`) and the open-source parser, [actions/languageservices workflow-parser](https://github.com/actions/languageservices/blob/4043eda158e1/workflow-parser/src/workflows/yaml-object-reader.ts#L46-L50).
- tomllib docs for [3.14](https://github.com/python/cpython/blob/3.14/Doc/library/tomllib.rst) and [3.15](https://github.com/python/cpython/blob/3.15/Doc/library/tomllib.rst), [What's New in 3.15](https://github.com/python/cpython/blob/3.15/Doc/whatsnew/3.15.rst) (gh-142956); [tomli](https://github.com/hukkin/tomli/blob/master/CHANGELOG.md), [tomli-w](https://github.com/hukkin/tomli-w/blob/master/README.md), [tomlkit](https://github.com/python-poetry/tomlkit/blob/master/CHANGELOG.md); Rust [toml](https://github.com/toml-rs/toml/blob/main/crates/toml/CHANGELOG.md), [toml_edit](https://github.com/toml-rs/toml/blob/main/crates/toml_edit/CHANGELOG.md); BurntSushi/toml [v1.6.0](https://github.com/BurntSushi/toml/releases/tag/v1.6.0), [\#470](https://github.com/BurntSushi/toml/issues/470), [\#486](https://github.com/BurntSushi/toml/pull/486), [\#487](https://github.com/BurntSushi/toml/pull/487); [go-toml](https://github.com/pelletier/go-toml/blob/v2/README.md) [v2.4.0](https://github.com/pelletier/go-toml/releases/tag/v2.4.0); [smol-toml](https://github.com/squirrelchat/smol-toml/blob/mistress/README.md) [v1.6.0](https://github.com/squirrelchat/smol-toml/releases/tag/v1.6.0).
- Platform: Windows PowerShell 5.1's `about_Character_Encoding`, in MicrosoftDocs/PowerShell-Docs (the BOM quote).

### Decisions and essays

- Douglas Crockford, "Comments in JSON" (Google+, 30 April 2012), via Wayback captures of [2014](http://web.archive.org/web/20140714051630/https://plus.google.com/+DouglasCrockfordEsq/posts/RK8qyGVaGSr) and [2018](http://web.archive.org/web/20180814013139/https://plus.google.com/+DouglasCrockfordEsq/posts/RK8qyGVaGSr).
- [PEP 680](https://peps.python.org/pep-0680/), [PEP 723](https://peps.python.org/pep-0723/), [PEP 790](https://peps.python.org/pep-0790/). TOML issues [\#30](https://github.com/toml-lang/toml/issues/30), [\#516](https://github.com/toml-lang/toml/issues/516), [\#870](https://github.com/toml-lang/toml/issues/870), [\#975](https://github.com/toml-lang/toml/issues/975); PRs [\#891](https://github.com/toml-lang/toml/pull/891), [\#904](https://github.com/toml-lang/toml/pull/904), [\#979](https://github.com/toml-lang/toml/pull/979).
- Where a format is expected: GitHub's workflow syntax reference, above; the [Compose specification](https://github.com/compose-spec/compose-spec/blob/main/spec.md) and compose-go's [go.mod](https://raw.githubusercontent.com/compose-spec/compose-go/main/go.mod); Ansible's [YAML syntax](https://docs.ansible.com/ansible/latest/reference_appendices/YAMLSyntax.html) page; the Kubernetes [objects docs](https://kubernetes.io/docs/concepts/overview/working-with-objects/) ("By convention, manifests are YAML"); Zola's [configuration docs](https://github.com/getzola/zola/blob/master/docs/content/documentation/getting-started/configuration.md).
- Writers and agents: Alacritty issue [\#6592](https://github.com/alacritty/alacritty/issues/6592), PRs [\#6673](https://github.com/alacritty/alacritty/pull/6673) and [\#8192](https://github.com/alacritty/alacritty/pull/8192), [CHANGELOG](https://github.com/alacritty/alacritty/blob/master/CHANGELOG.md); Wrangler's [patch-config.ts](https://github.com/cloudflare/workers-sdk/blob/daae4351fb517f8a93106a00c6a2a5b31600242a/packages/workers-utils/src/config/patch-config.ts); Cargo [\#16415](https://github.com/rust-lang/cargo/pull/16415) and its [CHANGELOG](https://github.com/rust-lang/cargo/blob/master/doc/book/src/CHANGELOG.md) (Cargo 1.94); [ESLint](https://github.com/eslint/eslint)'s v10 migration guide and its [2022 post on the new config system](https://eslint.org/blog/2022/08/new-config-system-part-2/); Codex [edit.rs](https://github.com/openai/codex/blob/03b761dca9b0/codex-rs/core/src/config/edit.rs); VS Code [configurationEditing.ts](https://github.com/microsoft/vscode/blob/1bcc86eea18435169fc003c40c0a29733089783c/src/vs/workbench/services/configuration/common/configurationEditing.ts); Gemini CLI [settings.ts](https://github.com/google-gemini/gemini-cli/blob/2ce1a6963e9e53a04afaf76111e4527cfa7c5dd7/packages/cli/src/config/settings.ts) and commentJson.ts; Claude Code [settings](https://code.claude.com/docs/en/settings) and [MCP](https://code.claude.com/docs/en/mcp) docs; the Codex [config reference](https://developers.openai.com/codex/config-reference); OpenClaw's [configuration reference](https://docs.openclaw.ai/gateway/configuration-reference.md), [configuration](https://docs.openclaw.ai/gateway/configuration.md) and [config CLI](https://docs.openclaw.ai/cli/config.md) pages; Hermes v0.21.6 [hermes_yaml.py](https://raw.githubusercontent.com/NousResearch/hermes-agent/v0.21.6/hermes_yaml.py).
- MCP file shapes: the MCP project's local-server quickstart for Claude Desktop (modelcontextprotocol/modelcontextprotocol, `connect-local-servers.mdx` at b488c16) and VS Code's MCP configuration reference (microsoft/vscode-docs, `mcp-configuration.md` at 4fe6b03).
- Pitfall reports: Colm O'Connor, "[The Norway Problem](https://hitchdev.com/strictyaml/why/implicit-typing-removed/)" (StrictYAML docs, 2018); Ruud van Asseldonk, "[The yaml document from hell](https://ruudvanasseldonk.com/2023/01/11/the-yaml-document-from-hell)" (2023); [helm#9793](https://github.com/helm/helm/issues/9793); [kubernetes#103185](https://github.com/kubernetes/kubernetes/issues/103185), [\#83261](https://github.com/kubernetes/kubernetes/pull/83261); setup-python issue \#482, whose title is quoted, and [\#160](https://github.com/actions/setup-python/issues/160), where a contributor explained on 10 November 2020 that YAML parses `3.10` as a number; [actions/runner#1182](https://github.com/actions/runner/issues/1182); [nxs-universal-chart#10](https://github.com/nixys/nxs-universal-chart/issues/10); GitHub's [anchors changelog](https://github.blog/changelog/2025-09-18-actions-yaml-anchors-and-non-public-workflow-templates/).

### Security

- NVD: [CVE-2017-18342](https://nvd.nist.gov/vuln/detail/CVE-2017-18342), [CVE-2019-20477](https://nvd.nist.gov/vuln/detail/CVE-2019-20477), [CVE-2020-1747](https://nvd.nist.gov/vuln/detail/CVE-2020-1747), CVE-2020-14343 (PyYAML); [CVE-2022-1471](https://nvd.nist.gov/vuln/detail/CVE-2022-1471) (SnakeYAML, and its [maintainer's note](https://codeberg.org/snakeyaml/snakeyaml/wiki/CVE-2022-1471)); [CVE-2019-11253](https://nvd.nist.gov/vuln/detail/CVE-2019-11253), [CVE-2019-11254](https://nvd.nist.gov/vuln/detail/CVE-2019-11254) (with [GO-2020-0036](https://vuln.go.dev/ID/GO-2020-0036.json)); [CVE-2022-46175](https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2022-46175) (json5); CVE-2018-3750 (deep-extend).
- CVE.org: [CVE-2017-18640](https://cveawg.mitre.org/api/cve/CVE-2017-18640) (SnakeYAML). The GitHub Advisory Database for js-yaml's merge-key advisories.

### Tooling and alternatives

- [SchemaStore's catalog](https://www.schemastore.org/api/json/catalog.json); [JSON Schema](https://json-schema.org/specification) and its [2020-12 draft](https://www.ietf.org/archive/id/draft-bhutton-json-schema-01.txt); VS Code's [JSON docs](https://code.visualstudio.com/docs/languages/json); [yaml-language-server](https://github.com/redhat-developer/yaml-language-server/blob/main/README.md); yamllint's [truthy rule](https://github.com/adrienverge/yamllint/blob/v1.38.0/yamllint/rules/truthy.py); actionlint's README; [Taplo](https://github.com/tamasfe/taplo/blob/master/README.md); Tombi's JSON Schema docs (tombi-toml/tombi, `json-schema.mdx` at 6688bb0); [toml-test](https://github.com/toml-lang/toml-test) at ff49d10.
- [check-jsonschema](https://github.com/python-jsonschema/check-jsonschema) 0.38.2 (PyPI, 23 September 2026), whose parser module lists json, toml and yaml; pydantic's `ConfigDict.extra` in `pydantic/config.py` at v2.14.0. Both were checked at the source on 9 October 2026; neither is in the research dossiers.
- For [A practice that holds](#13-a-practice-that-holds): the READMEs of hashicorp/hcl, cue-lang/cue, dhall-lang/dhall-lang, google/jsonnet, tweag/nickel, KenKundert/nestedtext and bazelbuild/starlark, and kdl-org/kdl's CHANGELOG, with release dates from their GitHub tags and releases; Pkl's [launch post](https://pkl-lang.org/blog/introducing-pkl.html); StrictYAML's [comparison with TOML](https://hitchdev.com/strictyaml/why-not/toml/); NestedText on [PyPI](https://pypi.org/pypi/nestedtext/json).

### XO trees read (read-only)

- xo-space at `aa96ba8`: `routers/cowork_agent/config.py` 232, 256–261; `config/agents/<agent>/manifest.json` 7; `config/agents/codex/troubleshoot.py` 117–118; `server.py` 29–31, 70–73, 726, 1159; `.github/workflows/publish-container.yml` 3. Under `services/cowork_agent/`: `adapters/openclaw/store.py` 27–43; `adapters/openclaw/agents.py` 156, 182–183; `registry/agent_env.py` 51–54; `xo_projects_sync/config.py` 94–97; `helpers.py` 214–223.
- The `.env` readers compared in [What our own tree says](#12-what-our-own-tree-says): `install.sh`, `adapters/hermes/profile_env.py` under `services/cowork_agent/`, `config/agents/openclaw/troubleshoot.py` and `agent_env.py`, beside python-dotenv 1.2.3 from xo-space's virtualenv.
- fly-lab `fly_lab/config.py` 1–3, 113–117; writings `what-is-quirq/section-2-spec.md` 32–33, 44–45 and `whitepaper/index.html` 1096; the makepad clone's `Cargo.toml` 1–297, 315.

### The measurement

`_compute.py`, `_numbers.json` and `_cases/` sit beside this page; `uv run _compute.py` regenerates the last two. Its Node, Rust and Go probes live in `~/config-ref/bench/hears/`, unpublished, as are the dossiers' other probes. The final run took 316 s. *\[measured here\]*

**Provenance.** Web sources were fetched on 8 and 9 October 2026; check them again before relying on them. Results marked *measured here* come from one Linux machine with a 2-CPU quota; each harness parser's exact version is in `_numbers.json → versions`. What each parser heard did not change between full runs of the same harness. Parse times moved by up to 2.7×: 395 of 473 cgroup periods were throttled while they were taken, so they support tiers, not digits. Results from the research probes cannot be rerun from this page, because the probes are unpublished, in `~/config-ref/bench`. The 3.15 tomllib was measured on Python 3.15.0rc1, not on the 3.15.0 final released on 9 October 2026. XO excerpts are quoted verbatim from the trees as of 9 October 2026, and the trees were not modified. The recommendations, the decision rule, the kubernetes#103185 explanation and the quirq TOML proposal are *reconstruction*. Not verified: GitHub's production workflow parser, which is not public; SnakeYAML and Psych, read from source only; serde and Go decoding into typed structs, largely unmeasured; and Claude Code's handling of duplicate keys.
