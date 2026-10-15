# What is a TOML file?

How a plain-text .toml file becomes structured data, and how a program turns that data into behavior: keys, tables, types, parsing, validation, overrides, version compatibility, and the configuration boundary for a session operating system.

By **Suraj Sharma**, XO Labs · Files and systems. First published 4 October 2026 as *What is a TOML file?* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/toml-files).

Source: [`toml-files/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/toml-files/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

## 01 · A .toml file is text that describes data

*\[Language\]* A `.toml` file is a text document written in **Tom’s Obvious, Minimal Language**. It stores named values and groups them into tables. Programs often use it for configuration because a person can edit the text while a parser can recover a precise data structure. The extension tells you the intended format; it does not make the file executable.

Open one in a text editor and you will see lines such as `enabled = true`, section headings such as `[server]`, and comments beginning with `#`. The document uses UTF-8. Names are case-sensitive: `port` and `Port` are different keys. Spaces can improve readability, but indentation does not create nesting. [TOML specification](https://toml.io/en/v1.1.0#preliminaries).

A file named `config.toml` has no universal meaning. One program might look for it beside a project; another might use a directory under your home folder; a third might never read it. The application chooses the filename, location, accepted keys, defaults, and moment when changes take effect.

This writing follows a file from text to typed values to application behavior. Most examples use the TOML 1.0 subset and were checked with CPython 3.13.0’s `tomllib`. Features added in TOML 1.1 are marked separately. The specification was checked on 4 October 2026; synthetic worker settings below are teaching examples, not settings for an installed product.

## 02 · Read a complete small file

Suppose a small worker program needs a name, a switch, a server address, and two jobs. Its author could choose this configuration schema:

``` toml
# A hypothetical worker's configuration
name = "session-notes"
enabled = true

[server]
host = "127.0.0.1"
port = 8042

[[jobs]]
name = "index-notes"
interval_minutes = 15

[[jobs]]
name = "check-links"
interval_minutes = 60
```

`name` is a string. `enabled` is a boolean. `[server]` creates a table. Each `[[jobs]]` appends a new table to an ordered array. Blank lines and the comment are for readers. The parser returns a root table containing these values; it does not open port 8042 or schedule either job.

**Figure 1. The file becomes one root table** *\[Measured parse\]*

TOML source

``` toml
name = "session-notes"
enabled = true
[server]
host = "127.0.0.1"
port = 8042
```

Parsed shape

``` json
{
  "name": "session-notes",
  "enabled": true,
  "server": {
    "host": "127.0.0.1",
    "port": 8042
  }
}
```

These particular values have a direct JSON representation. TOML’s temporal values and non-finite floats need additional conversion decisions.

Changing `interval_minutes = 15` to `interval_minutes = 30` changes the stored integer. Whether a running worker notices depends on its configuration loader. That distinction—stored value versus effective behavior—applies to every TOML file.

## 03 · What happens between the file and the program

**Figure 2. Four stages with different responsibilities** *\[Reconstruction\]*

01

### Read text

The loader locates a file and reads bytes.

02

### Parse TOML

A parser produces typed tables and arrays.

03

### Validate settings

The app checks names, types and allowed values.

04

### Apply settings

Runtime code decides what changes and when.

The blue connections carry data. This is a conceptual pipeline; applications can combine stages or resolve several files before final validation.

The **parser** checks language rules. Is the string closed? Is a key defined twice? Is a date legal? It then constructs objects such as dictionaries, arrays, numbers, and dates in the host language. A parser may work directly on tokens or maintain a richer syntax tree; that internal design is not prescribed by the file extension.

The **application schema** checks meaning. A TOML parser accepts `port = "8042"` as a string. A server’s schema can reject it because a port must be an integer. It can also reject `port = 90000` even though that integer is valid TOML. Unknown keys may be errors, warnings, or ignored; the application defines the policy.

The **loader** decides which files and overrides contribute to the result. The **runtime** decides whether to start a component, replace a setting in memory, or wait for a restart. Successful parsing proves only that the input fits the parser’s supported TOML language. It does not prove that a program read that file or accepted the resulting settings.

*\[Design\]* When an error occurs, identify its stage. “Unterminated string,” “unknown setting,” “file not found,” and “restart required” have different causes. Treating all four as a broken TOML file makes troubleshooting slower.

## 04 · Keys, quoted names, and dotted paths

A key names a value. Bare keys use ASCII letters, digits, underscores, or hyphens. Quote a key when its name contains spaces, dots, or other characters. A numeric-looking bare key still names a string key; it is not an array index. [TOML specification](https://toml.io/en/v1.1.0#keys).

``` toml
retry_count = 3
worker-name = "indexer"
"display name" = "Notes worker"
42 = "a string key"
```

A dot *outside* quotes separates path segments. A dot *inside* quotes is part of the key. This small punctuation choice changes the structure:

**Figure 3. The same letters can describe different trees** *\[Measured parse\]*

TOML source

``` toml
worker.name = "indexer"
```

Parsed shape

``` json
{"worker": {"name": "indexer"}}
```

TOML source

``` toml
"worker.name" = "indexer"
```

Parsed shape

``` json
{"worker.name": "indexer"}
```

Quoted keys protect the characters inside them. A dotted key traverses or creates nested tables.

Segments can mix styles: `sites."notes.example".enabled = true` creates a `sites` table, a child named `notes.example`, and an `enabled` field inside that child. The quoted domain is one segment. Spaces around separating dots do not alter the path.

A key may be defined once within its table. Quoting does not create another identity: `enabled` and `"enabled"` are the same key. TOML also cannot turn a value already defined as an integer into a table merely because a later line uses a dotted child path.

## 05 · Tables set the scope of following assignments

A table is a collection of key/value pairs. `[server]` selects the root’s `server` table; subsequent assignments belong there until another header changes the scope. A blank line does not reset it. The file begins in the root table, so put root-level assignments before the first table header.

``` toml
title = "Worker settings"       # root.title

[server]
port = 8042                     # server.port
logging.level = "info"          # server.logging.level

[storage]
directory = "./cache"           # storage.directory
```

Table headers describe paths from the document root. In that example, `[storage]` is a sibling of `[server]`, not its child. A header `[server.logging]` names a nested table explicitly. By contrast, a dotted assignment inside the current table is relative to that table. [TOML specification](https://toml.io/en/v1.1.0#table).

One common mistake is to append a supposedly global setting at the bottom of a file. Under `[server]`, `enabled = false` means `server.enabled`. It does not change a root-level `enabled`. The file can parse successfully while your intended setting remains unchanged.

Ordinary table headers cannot simply be repeated to append more fields. There is a narrower rule for implicit parents: `[a.b]` can create an implicit parent `a`, which may later be explicitly defined with `[a]`. A table established by dotted assignments has different redefinition constraints. For hand-written configuration, keep related assignments together instead of relying on those edge cases.

``` toml
[server]
port = 8042

[server]        # invalid: this table was already defined
host = "127.0.0.1"
```

## 06 · Four string forms, with two escaping rules

Basic strings use double quotes and interpret escapes. Literal strings use single quotes and preserve backslashes as characters. Each has a triple-quoted multiline form. All four produce strings; the quote style is a choice about how to write the content. [TOML specification](https://toml.io/en/v1.1.0#string).

**Figure 4. Choose a string form for the characters you need** *\[Language\]*

| Form | Use | What to remember |
|----|----|----|
| `"text"` | Short text with escapes | `\n` is a newline; `\\` is one backslash. |
| `'text'` | Paths and regular expressions | Backslashes stay literal. A single quote cannot appear inside this single-line form. |
| `"""text"""` | Multiline text with escapes | A newline immediately after the opening delimiter is trimmed. |
| `'''text'''` | Multiline literal text | Backslashes stay literal; the initial newline is also trimmed. |

The resulting value is text. A parser normally does not retain which of these four notations produced it.

``` toml
basic_path = "C:\\work\\notes"
literal_path = 'C:\work\notes'
message = "First line\nSecond line"
placeholder = "${HOME}/cache"
command_text = "$(date)"
color = "#d98226"
```

The first two path values above are equal. The placeholder and command-looking strings remain text after parsing: TOML itself neither expands `${HOME}` nor executes `$(date)`. A `#` inside a string is also text, not the start of a comment.

``` toml
message = """
A first line.
A second line.
"""
```

Multiline strings preserve indentation and subsequent whitespace. They are not automatically “dedented” to match your surrounding code. A line-ending backslash in a multiline basic string can suppress the line break and following whitespace; a multiline literal string does not interpret that escape. If exact whitespace matters, inspect the parsed value rather than relying on the editor’s visual alignment.

An unrecognized escape is an error in a basic string. Writing an ordinary Windows path as `"C:\work\notes"` without doubling the backslashes can introduce invalid escapes or unintended characters. Use a literal string or escape each backslash. TOML 1.1 adds two more escape forms, covered in [the version section](#15-toml-1-0-and-1-1-are-not-the-same-parser-target).

## 07 · Numbers, booleans, and temporal values

Quotation marks affect type. `retries = 3` stores an integer; `retries = "3"` stores a string. `enabled = true` stores a boolean; `enabled = "true"` stores text. Boolean tokens must be lowercase.

``` toml
retries = 3
budget = 12_500
mask = 0xff
permissions = 0o640
bits = 0b1010
ratio = 0.75
threshold = 2e3
enabled = false
```

Underscores between digits improve readability without changing the number. Decimal integers cannot have extra leading zeros. Hexadecimal, octal, and binary spellings use their prefixes and represent non-negative integers. A float’s decimal point needs a digit on both sides: `0.5` works; `.5` does not. The language also has `inf` and `nan`, which an application may reasonably reject for a particular setting. [Integer rules](https://toml.io/en/v1.1.0#integer) · [Float rules](https://toml.io/en/v1.1.0#float).

TOML 1.1 allows implementations to choose numeric range and precision; its recommendations include at least signed 64-bit integers and binary64 floats. Do not use the file format as a promise that every consumer can represent an arbitrarily large integer or an exact decimal amount. For precise decimal policy, select a suitable parser representation and application schema.

**Figure 5. Four temporal types answer different questions** *\[Language\]*

| TOML value | Type | Meaning |
|----|----|----|
| `2026-10-04T09:30:00+05:30` | Offset date-time | A date and clock time with a fixed UTC offset; this identifies an instant. |
| `2026-10-04T09:30:00` | Local date-time | A wall-clock date and time with no offset attached. |
| `2026-10-04` | Local date | A calendar date without a time of day. |
| `09:30:00` | Local time | A clock time without a date or offset. |

These are unquoted temporal values. Put quotes around one and it becomes a string. An offset is not an IANA timezone such as Asia/Kolkata.

``` toml
instant = 2026-10-04T09:30:00+05:30
local_start = 2026-10-04T09:30:00
day = 2026-10-04
clock = 09:30:00
label = "2026-10-04"
```

A bare time does not create a recurring schedule. A local date-time does not tell you which timezone to apply. Those are application decisions. If you need a named timezone or a duration such as “every 15 minutes,” define explicit fields in your schema; TOML has no built-in duration or cron-expression value type. [Temporal types](https://toml.io/en/v1.1.0#offset-date-time).

There is no TOML `null` value. Omitting a key, setting it to `false`, assigning an empty string, and assigning an empty array are four different states. A loader may interpret an omitted key as “use the default,” but the language does not choose that default.

## 08 · Arrays, inline tables, and arrays of tables

Arrays use square brackets and preserve element order. Values can span lines, and a trailing comma is allowed. TOML permits mixed value types; an application schema may require every element to have one type. Nested arrays are also allowed. [TOML specification](https://toml.io/en/v1.1.0#array).

``` toml
ports = [8042, 8043]
labels = [
  "draft",
  "review", # comments are allowed here
]
mixed = ["queue", 2, true]
matrix = [[1, 2], [3, 4]]
```

An inline table puts a compact table on the right of an assignment. In the broadly supported TOML 1.0 syntax, keep it on one line and omit the trailing comma. Inline tables are self-contained: you cannot extend one later with another header or dotted assignment. [TOML specification](https://toml.io/en/v1.1.0#inline-table).

``` toml
endpoint = { host = "127.0.0.1", port = 8042 }
limits = { cpu = 2, memory_mb = 1024 }
```

An array of tables uses double brackets. Every `[[workers]]` creates the next record. A child table such as `[workers.resources]` belongs to the most recently created worker. This is useful for a repeated list whose entries each have several fields.

**Figure 6. Double brackets append records; single brackets select a table** *\[Measured parse\]*

TOML source

``` toml
[[workers]]
name = "reader"
[workers.resources]
cpu = 1

[[workers]]
name = "writer"
[workers.resources]
cpu = 2
```

Parsed shape

``` json
{
  "workers": [
    {"name": "reader", "resources": {"cpu": 1}},
    {"name": "writer", "resources": {"cpu": 2}}
  ]
}
```

Child headers attach to the current array element. A misplaced header can describe the wrong record even when the file is valid.

An ordinary `workers = []` assignment does not open an array that later `[[workers]]` headers may append to. Choose one representation. Likewise, do not switch a table into an array of tables midway through a document. [TOML specification](https://toml.io/en/v1.1.0#array-of-tables).

## 09 · Inspect what the parser actually produced

The selector below switches among original, small examples and their recorded CPython 3.13.0 parse results. It is deliberately a fixed teaching set, not a browser-based TOML parser. The corresponding source and result remain together.

**Figure 7. Different source forms, recorded data shapes** *\[Measured parser results\]*

Choose a source shape

TOML source

```
[worker]
name = "indexer"
retries = 3
```

Recorded Python parse, displayed as JSON

```
{
  "worker": {
    "name": "indexer",
    "retries": 3
  }
}
```

**Accepted**

A table header scopes the following assignments.

Changing the selector reveals a result recorded during the build. No file is uploaded and no parser runs in the browser.

For simple strings, booleans, integers, arrays, and tables, the JSON-shaped view is a convenient display. In a real Python process the result is a dictionary containing native Python values. Dates, times, non-finite floats, and formatting choices need separate treatment when exporting that result.

## 10 · Inside a TOML parser: languages and components

*\[Implementation\]* **Python is not the only way to parse TOML.** TOML defines a language for writing data. A *TOML parser* is software that recognizes that language and produces a usable representation. There are many implementations, written in different programming languages. A TOML file does not require a Python installation unless the program consuming it chooses a Python-based implementation. The [official TOML site](https://toml.io/en/) lists implementations across languages.

Keep three things separate: the **input language** is TOML; the **implementation language** is what the parser’s authors wrote; the **output representation** is what the caller receives. The same file can become a Python dictionary, a Rust value tree, or a Go struct. Those are interfaces to the same data model, not different file formats.

**Figure 8. One file format, several parser implementations** *\[Project documentation\]*

| Implementation | Written in | What its interface offers |
|----|----|----|
| [CPython 3.13 tomllib](https://github.com/python/cpython/blob/v3.13.0/Lib/tomllib/_parser.py) | Python | Reads into dictionaries and native values. The parser logic is Python source. |
| [toml](https://docs.rs/toml/latest/toml/) | Rust | Reads into `Table`/`Value` or deserializes into application types through Serde. |
| [toml_edit](https://docs.rs/toml_edit/latest/toml_edit/) | Rust | Builds an editable document that retains comments and formatting information, with documented limits. |
| [BurntSushi/toml](https://github.com/BurntSushi/toml) | Go | Decodes into Go values, including structs; also provides an encoder. |
| [toml++](https://github.com/marzer/tomlplusplus) | C++17 | Parses a table tree and provides serialization facilities. |

These are examples, not a ranking. Check the exact library release for supported TOML versions, output types, and editing guarantees. Only Python was executed for this article.

A parser is commonly a library called inside the application. It need not be a separate program, server, or background process. A command-line validator can wrap that library; an editor can embed one for diagnostics. The extension `.toml` does not decide which implementation runs. The consuming program and its dependencies do.

*\[Anatomy\]* The following breakdown names responsibilities. It is a useful way to read parser code, not a requirement that every implementation contain six modules or execute six isolated passes. Scanning, grammar recognition, conversion, and state updates can be interleaved.

**Figure 9. Six responsibilities inside the parsing boundary** *\[Reconstruction\]*

| Component | Responsibility | Example to follow |
|----|----|----|
| **Input and cursor** | Accept text, or decode file bytes, and track the current position. File discovery belongs to the surrounding loader. | UTF-8 bytes become characters; the cursor identifies where the next construct starts. |
| **Scanner / lexer** | Recognize names, delimiters, strings, comments, and value spellings. Some parsers emit tokens; others inspect characters directly. | In `port = 8042 # local`, the comment is separate from the integer. In `"# local"`, the hash is text. |
| **Grammar recognizer** | Combine those pieces into assignments, headers, arrays, and inline tables; require the right separators and closing delimiters. | An assignment needs a key, an equals sign, and a value. Nested arrays require nested parsing. |
| **Table state and language checks** | Track the active table, defined keys, implicit parents, and the current element of an array of tables. Reject forbidden redefinitions. | After `[server]`, `port` belongs to that table. A second assignment to the same key fails. |
| **Value conversion and result builder** | Convert spellings to typed values and assemble the table/array hierarchy. The library chooses the host-language representation. | `8042` becomes an integer; `"8042"` remains a string; a date can become a date object. |
| **Diagnostics** | Report what failed and where. Position tracking supports useful errors throughout parsing, rather than only at the end. | Distinguish an unterminated string from a duplicate key; include a line, column, or source span when supported. |

This is a conceptual decomposition reconstructed from parser implementations. Application-specific rules such as an allowed port range sit outside this language boundary.

The distinction between a lexer and a parser is especially useful. A lexer recognizes small pieces; a parser recognizes their arrangement. The Go implementation exposes this separation in [lex.go](https://github.com/BurntSushi/toml/blob/master/lex.go) and [parse.go](https://github.com/BurntSushi/toml/blob/master/parse.go). You should not infer the same architecture from the word “parser” in every other library.

*\[Source walkthrough\]* In CPython 3.13.0, `Lib/tomllib/_parser.py` implements `load` and `loads`. The latter advances a character cursor and builds nested dictionaries directly. `parse_key_value_pair` handles assignments; `parse_value` dispatches by value form; `create_dict_rule` and `create_list_rule` handle the two header forms. `NestedDict` and `Flags` support structure and redefinition bookkeeping. `suffixed_err` adds location information to errors. The rule functions and bookkeeping classes are private implementation details; applications call the public `tomllib.load` or `tomllib.loads` APIs. [Pinned Python source](https://github.com/python/cpython/blob/v3.13.0/Lib/tomllib/_parser.py).

Its companion `_re.py` contains number and date/time patterns and conversion helpers such as `match_to_number` and `match_to_datetime`. This shows why parsing is more than splitting a line at `=`: the reader must distinguish spellings, validate them, and construct typed values. Regular expressions help with some values; they are not the whole parser. [Conversion source](https://github.com/python/cpython/blob/v3.13.0/Lib/tomllib/_re.py).

Follow a tiny input through that model:

``` toml
[server]
port = 8042
```

The header selects the `server` table. The assignment names `port`; its unquoted digits produce an integer. The builder inserts that value under the selected table. In the Python implementation, the observed result is:

``` json
{"server": {"port": 8042}}
```

Adding another `port = 9000` under that header is a duplicate-key error. Changing the original value to `"8042"` is valid TOML and produces a string. Whether that string is acceptable for a server is an application-schema question. The parser does not open the port. A typed decoder can combine parsing and application-type checks in one API call; these remain different responsibilities.

*\[Representation\]* An **abstract syntax tree (AST)** represents grammatical structure without necessarily retaining every character. A **concrete syntax tree (CST)** represents more of the written syntax; a lossless representation must also retain comments and whitespace. A parser can instead build the final data values directly. None of these internal structures is mandated by TOML.

For editing, retaining only values is often insufficient. A format-preserving document model can keep comments, spacing, and spelling alongside those values. Rust’s `toml_edit` provides such an editing model, while documenting exceptions such as dotted-key order and an absent final newline. A serializer then emits text from the chosen representation; serialization is a separate capability from parsing. [toml_edit documentation](https://docs.rs/toml_edit/latest/toml_edit/).

For your session system, the parser therefore supplies structured configuration. Your schema validator supplies product meaning, and your runtime supplies effects. Python is used in the next section because it makes that boundary easy to demonstrate. A Rust, Go, or C++ service can implement the same boundary with its own library.

## 11 · Read and validate a file in Python

*\[Python API\]* Python includes `tomllib` from version 3.11. In the Python 3.13 environment used here it reads TOML 1.0, returns dictionaries, and raises `TOMLDecodeError` for invalid input. `load` expects a binary file; `loads` accepts a string. It provides no writer. [Python 3.13 reference](https://docs.python.org/3.13/library/tomllib.html).

This is one parser implementation, not a Python requirement of TOML; the [parser anatomy section](#10-inside-a-toml-parser-languages-and-components) compares alternatives. Save this as `inspect_toml.py`. It parses a supplied file, then applies a small, explicitly chosen server schema. The port rule below belongs to this example program:

``` python
import sys
import tomllib
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("Usage: python3 inspect_toml.py FILE.toml")

try:
    with Path(sys.argv[1]).open("rb") as source:
        settings = tomllib.load(source)
except (OSError, tomllib.TOMLDecodeError) as error:
    raise SystemExit(f"Cannot read configuration: {error}")

server = settings.get("server")
if not isinstance(server, dict):
    raise SystemExit("Expected a [server] table")

port = server.get("port")
if type(port) is not int or not 1 <= port <= 65535:
    raise SystemExit("server.port must be an integer from 1 to 65535")

print(f"Parsed and validated server.port = {port}")
```

```
python3 inspect_toml.py worker.toml
```

The explicit `type(port) is int` test matters in Python because booleans are also instances of `int`. This example rejects `port = true` rather than accidentally treating it as port 1. It does not bind a socket or modify a running service.

In this parser, tables become dictionaries, arrays become lists, and temporal values become Python date/time objects. Floating-point conversion can be customized through `parse_float`, for example with `decimal.Decimal`. Converting every unknown object to a string during JSON export would erase those distinctions. Choose an explicit representation if the data must move to another system.

A reader and a writer solve different problems. Parsing into ordinary data discards comments and choices such as quote style. Writing that data back can therefore preserve its meaning while changing its layout. If a tool edits human-maintained configuration, use an editor that preserves syntax and comments, or make a small reviewed text change. Do not expect a general dictionary serializer to preserve the original document.

## 12 · The application owns defaults, paths, and overrides

The following file is valid TOML. Its apparent behavior is still undecided until an application supplies a contract:

``` toml
[worker]
enabled = true
concurrency = 2
cache_dir = "${HOME}/cache"
include = ["base.toml"]
```

`cache_dir` is a string. `include` is an ordinary key holding an array. The language does not expand the variable or load another file. A product can implement those features deliberately. It can also choose to reject either key. An application-specific feature does not become a TOML feature just because it is expressed inside a TOML file.

**Figure 10. Questions the TOML grammar cannot answer** *\[Design boundary\]*

| Question | Owner of the answer |
|----|----|
| Where does this file live? | The application’s discovery rules or an explicit command-line argument. |
| What if a key is absent? | The application’s required fields and default policy. |
| What does `./cache` point to? | The loader’s path-base rule: file directory, project root, working directory, or another base. |
| Does a later file replace or merge a table? | The configuration loader’s merge algorithm. |
| Do arrays append or replace? | The same loader; there is no universal TOML layering rule. |
| Are environment variables expanded? | A loader feature, where documented. |
| When do edits take effect? | The consuming runtime and its reload mechanism. |

The same parsed values can behave differently under different configuration loaders. Document these policies beside the schema.

Distinguish *duplicate keys within one document* from *overrides across separate documents*. The former are a TOML syntax error. The latter can be a legitimate application feature. A loader might parse a defaults file and a project file separately, then merge their results according to its own precedence.

Relative paths deserve particular care. If you move the file, invoke the program from another directory, or hand a job to another host, a path string may resolve differently. TOML supplies the characters; it supplies no filesystem identity or permission grant. For portable work, record the path base and the host or workspace it belongs to.

## 13 · Three familiar filenames, three different contracts

**Figure 11. The suffix is shared; the schemas belong to their tools** *\[Documented\]*

| File | Who interprets it | What its tables mean |
|----|----|----|
| `pyproject.toml` | Python packaging and individual tools | `[build-system]`, `[project]`, and tool-defined `[tool.<name>]` settings. |
| `Cargo.toml` | Cargo | Package metadata, dependencies, targets and related manifest inputs. |
| `.cargo/config.toml` | Cargo’s configuration loader | Build-tool settings with Cargo-specific discovery, merging and path rules. |
| `~/.codex/config.toml` | Codex | User preferences, with other documented configuration layers and enforced requirements. |

None of these meanings comes from TOML alone. A syntactically valid table can still violate the consuming tool’s schema.

For Python packaging, a minimal metadata excerpt can use the following shape. The `version` field is a string because the packaging schema says so; `version = 1.0` would still be valid TOML but the wrong type for this metadata. A build backend and source files are separate concerns. [PyPA specification](https://packaging.python.org/en/latest/specifications/pyproject-toml/).

``` toml
[project]
name = "session-notes"
version = "0.1.0"
requires-python = ">=3.11"
```

Cargo uses `Cargo.toml` for a Rust package manifest and `.cargo/config.toml` for tool configuration. Its configuration arrays can concatenate across layers; its current documentation also defines an `include` key and specific bases for relative paths. These are Cargo policies. A different TOML application need not behave the same way. [Manifest reference](https://doc.rust-lang.org/cargo/reference/manifest.html) · [Configuration reference](https://doc.rust-lang.org/cargo/reference/config.html).

Codex reads user configuration from `~/.codex/config.toml` and can read trusted project layers from `.codex/config.toml`. Command-line overrides, selected profiles, other defaults, and enforced requirements affect the effective result. For the current complete ordering, use its [configuration documentation](https://learn.chatgpt.com/docs/config-file/config-basic); it is a Codex contract, not a generic TOML rule.

``` toml
# Illustrative Codex user-configuration excerpt
model_reasoning_effort = "medium"
web_search = "disabled"
```

Profile layout is versioned too: current Codex documentation uses separate `<name>.config.toml` files, rather than the legacy `[profiles.<name>]` table form. Codex project-config relative paths resolve from the .codex/ directory containing that config.toml. Check the product version before pasting an older example. [Advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced).

The [Codex JSON explorer](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/codex-session/codex-json) covers a different file: the desktop’s `.codex-global-state.json`. A settings document, a desktop state snapshot, and a session history can all contain structured data while having different writers and lifetimes. See the [Codex session anatomy](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/codex-session#configuration) for the surrounding system.

## 14 · Failures that look similar but need different fixes

**Figure 12. First classify the failure** *\[Language + diagnosis\]*

| Example or symptom | What went wrong | Fix at the right layer |
|----|----|----|
| `enabled = True` | Syntax: wrong boolean token. | Use lowercase `true`. |
| `name = worker` | Syntax: unquoted text value. | Use a quoted string. |
| `port = 08042` | Syntax: decimal leading zero. | Use `8042`. |
| `value = null` | Syntax: TOML has no null literal. | Omit the field or use a schema-defined alternative. |
| The same key appears twice. | Syntax: conflicting definition. | Keep one value in that table. |
| An inline table is extended later. | Syntax: the inline table is sealed. | Put the fields inside it or use an ordinary table. |
| `port = "8042"` | Valid TOML; possibly the wrong application type. | Follow the tool’s schema. |
| An edited setting has no effect. | Possibly wrong file, wrong table, an override, or a loaded snapshot. | Inspect the effective configuration and reload rules. |

The first six examples are language errors. The final two require application context.

``` toml
enabled = true
enabled = false
```

``` toml
endpoint = { port = 8042 }
endpoint.host = "127.0.0.1"
```

Do not rely on “last assignment wins” inside a single TOML document. That behavior belongs to some configuration systems, not TOML key redefinition. A parser that silently accepts duplicate keys would hide a document error.

When a parser reports a line and column, the cause can begin earlier—for example, an opening quote or bracket that was never closed. Reduce the failing region, preserve the table context, and run the same parser version as the consumer. An online validator may accept a newer dialect than the application you are configuring.

## 15 · TOML 1.0 and 1.1 are not the same parser target

*\[Versioned language\]* The official TOML 1.1.0 specification was published on 18 December 2025. Its syntax additions are small but visible. The file extension does not declare the dialect, and a key such as `toml_version = "1.1"` cannot upgrade a parser. Parser support must be established separately. [TOML 1.1.0](https://toml.io/en/v1.1.0) · [TOML 1.0.0](https://toml.io/en/v1.0.0).

**Figure 13. Syntax additions that matter when sharing files** *\[Specification comparison\]*

| Feature | TOML 1.0 | TOML 1.1 |
|----|----|----|
| Multiline inline-table layout | Not permitted as ordinary layout. Multiline values have their own rules. | Permitted, including comments between entries. |
| Trailing comma in an inline table | Not permitted. | Permitted. |
| `\xHH` in a basic string | Not a valid escape. | A Unicode escape for U+00HH, not an arbitrary byte. |
| `\e` in a basic string | Not a valid escape. | The escape character U+001B. |
| Omitting seconds in a time/date-time | Not permitted. | Seconds default to zero; fractional seconds still require explicit seconds. |

Use the older common subset when the consumer’s dialect support is unknown. This does not imply the older subset is the only valid TOML.

``` toml
endpoint = {
  host = "127.0.0.1", # TOML 1.1
  port = 8042,
}
clock = 09:30
instant = 2026-10-04T09:30+05:30
```

``` toml
letter = "\x41"
escape_character = "\e"
```

These two blocks are valid by the 1.1 specification and intentionally fail in the installed CPython 3.13.0 TOML 1.0 parser. That failure is a compatibility result. This writing did not execute them in a 1.1 parser, so their 1.1 validity is specification-backed, not a local runtime claim.

A declared application schema version is a different axis. For example, a product may define `schema_version = 2` to change its accepted keys while continuing to use TOML 1.0 syntax. Track both: the text language version and the application’s configuration contract.

## 16 · How TOML differs from JSON, YAML, and INI

These formats can describe overlapping data, but they have different language rules. Pick the one required by the consuming application. Renaming `config.json` to `config.toml` does not convert its contents.

**Figure 14. A small comparison of language features** *\[Standards comparison\]*

| Feature | TOML | JSON (RFC 8259) | YAML 1.2 |
|----|----|----|----|
| A comment notation | `# comment` | No comments in the standard grammar. | `# comment` outside applicable scalar contexts. |
| Nested data | Table paths, inline tables and arrays. | Objects and arrays. | Mappings and sequences, using block or flow styles. |
| Explicit null value | No. | `null`. | Supported through schema resolution. |
| Temporal values | Dedicated date/time types. | Represented through strings or an application convention. | Depends on tags/schema; do not assume every loader resolves dates alike. |
| Indentation creates structure | No. | No. | In block collections, yes. |

This compares the named standards, not extensions such as JSON-with-comments or every YAML loader.

JSON has a smaller built-in value vocabulary and does not carry TOML’s temporal types directly. A lossless conversion needs a policy for those values and for non-finite floats; syntax conversion alone is insufficient. [RFC 8259, sections 3–7](https://www.rfc-editor.org/rfc/rfc8259).

YAML has a broader notation, including block collections, flow collections, tags and aliases. Interpretation depends on the selected schema and loader. A TOML file’s dotted names should not be read as YAML indentation or as object-property expressions in a programming language. [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/).

INI is best treated as a family of configuration conventions rather than one interchangeable TOML dialect. Bracketed section names may look familiar, but a particular INI reader can have different rules for types, nesting, duplicate keys, interpolation, and name normalization. A visual resemblance does not establish parser compatibility. For example, [Python’s configparser](https://docs.python.org/3/library/configparser.html) stores values as strings and normally treats option names as case-insensitive.

## 17 · A practical workflow for changing a TOML file

Start with the consuming application, not the filename alone. Find its configuration reference and establish which file is active. For an existing file, preserve the intended table scope and the application’s expected types.

1.  **Locate the active source.** Check the program’s file-discovery rules, working directory, selected profile, and command-line overrides.
2.  **Identify the owner of the key.** Find its schema, accepted values, default behavior, and version requirements.
3.  **Edit the smallest relevant block.** Keep the surrounding table context. Retain comments that explain intent.
4.  **Parse with the consumer’s dialect.** Use its validator when available; otherwise use a parser whose TOML version matches.
5.  **Validate application meaning.** Check unknown keys, required fields, ranges, path resolution, and merged settings.
6.  **Apply and observe.** Follow the documented reload or restart process, then verify the effective setting and the resulting behavior.

Review the file diff before accepting an automated rewrite. A formatter can reorganize text without changing values; a serializer can remove comments; a mistaken move across a table header can change the structure. Those are different kinds of edit.

If another process writes the same file, use its settings interface or its documented editing procedure. A file watcher noticing a change is not proof the application accepted the new values. A runtime may reject them, retain the previous settings, or require a new process. These outcomes belong to the application and should be observable in its diagnostics.

For a configuration editor you build yourself, useful features include schema-aware validation, a preview of effective values, provenance for each winning override, and a clear report of what will change after reload. An editor that merely confirms “valid TOML” leaves most of the operational questions unanswered.

## 18 · Where TOML fits in a session operating system

*\[Proposal\]* In a system that routes work between Codex, Space, and other products, TOML is a reasonable representation for a small human-edited policy or manifest. The surrounding system still needs to define its schema, ownership, versioning, path bases, and override behavior. This is a design suggestion, not an existing Space or Codex configuration format.

``` toml
schema_version = 1

[workspace]
root = "./project"

[worker]
max_parallel = 2
retry_limit = 3

[[tasks]]
id = "index-notes"
kind = "documentation"
```

The example states desired configuration. It does not record which task is currently leased, what happened during an attempt, or which artifact passed verification. Those changing facts need a runtime-owned state model and an execution history. Parsing this manifest would be only the first step in creating or scheduling work.

A useful boundary is: humans edit the desired policy; a loader resolves it into a versioned effective configuration; an executor reports actual events and results. Keep a link from each run to the configuration it used. If a policy changes during a long-running session, define whether it affects that session, only future turns, or only new sessions.

This is why understanding the file format matters before building the operating system around it. TOML gives you an unambiguous way to write data. Your product must give that data an operational contract.

## 19 · Sources, checks, and limits

The language explanations follow the official versioned specification. Parser observations come from the installed CPython 3.13.0 standard library. Product examples are configuration excerpts, not complete runnable projects, and were not used to change those products.

1.  [TOML 1.1.0 specification](https://toml.io/en/v1.1.0): especially Keys, String, Integer, Float, the four date/time sections, Array, Table, Inline Table, and Array of Tables.
2.  [TOML 1.0.0 specification](https://toml.io/en/v1.0.0): the compatibility baseline used for executed examples.
3.  [TOML change log](https://github.com/toml-lang/toml/blob/main/CHANGELOG.md): language-version changes. The specification is available under the [MIT license](https://github.com/toml-lang/toml/blob/main/LICENSE), copyright Tom Preston-Werner.
4.  [Python 3.13 tomllib reference](https://docs.python.org/3.13/library/tomllib.html): reading API, parse errors, type mapping, and writing limitations.
5.  [CPython 3.13.0 tomllib source](https://github.com/python/cpython/tree/v3.13.0/Lib/tomllib), [Rust toml](https://docs.rs/toml/latest/toml/), [Rust toml_edit](https://docs.rs/toml_edit/latest/toml_edit/), [Go BurntSushi/toml](https://github.com/BurntSushi/toml), and [C++ toml++](https://github.com/marzer/tomlplusplus): implementation languages, interfaces, and parser architecture. Alternatives were inspected through source/documentation, not benchmarked or executed.
6.  [PyPA pyproject.toml specification](https://packaging.python.org/en/latest/specifications/pyproject-toml/): packaging-owned table and field meanings.
7.  [Cargo manifest reference](https://doc.rust-lang.org/cargo/reference/manifest.html) and [Cargo configuration reference](https://doc.rust-lang.org/cargo/reference/config.html): distinct files, schemas, discovery and merging.
8.  [Codex config basics](https://learn.chatgpt.com/docs/config-file/config-basic) and [advanced configuration](https://learn.chatgpt.com/docs/config-file/config-advanced): user/project layers, profile layout, and application-specific behavior.
9.  [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259) and [YAML 1.2.2](https://yaml.org/spec/1.2.2/): the comparison’s named standards.

Checks for this page: 18 marked TOML 1.0 blocks parsed successfully; 3 deliberately invalid blocks were rejected; 2 specification-valid TOML 1.1 blocks were rejected by the older parser as expected. The selector contains 7 additional recorded cases. These are teaching checks, not a claim of full parser conformance.

Provenance. The syntax and version boundaries are sourced from the linked standards. Examples, diagrams, the parser-result selector, and the session-OS proposal are original. TOML 1.0 examples were exercised with CPython 3.13.0; the marked TOML 1.1 examples were checked against the specification and rejected by that older parser, not executed in a 1.1 implementation. Application snippets were not deployed. No private configuration was read or modified. Reading time is measured from article text, excluding SVG, scripts, and styles, at 225 words per minute.
