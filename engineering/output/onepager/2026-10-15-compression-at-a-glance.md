# Compression at a glance

suraj's compression research in one page, from two companion posts: what
compression and compaction each keep, and which codec, level or format each
kind of file wants. Their sources are as of 9 October 2026. The
measurements ran on 10 October 2026 on one shared 2-CPU machine, with libzstd
1.5.7, zlib 1.3.1 and brotli 1.2.0.

## The claim

> Compression and compaction make two different promises. Compression keeps
> all the information and spends fewer bits on it. Compaction keeps only what
> a reader can still observe, the present state, and rewrites it densely.
> Lossless compression can be undone. Compaction, as a rule, cannot.

From [What Compression Keeps](../report/2026-10-15-what-compression-keeps.md#01-fewer-bits-or-fewer-things), §01.

## In numbers

| | |
|---|---|
| **31.99** | times smaller when a 200,000-record update log is compacted before zstd 19 than with zstd 19 alone; only compression keeps the history |
| **3** | of 20 codec settings make the ratio-speed frontier on the Silesia corpus: zstd 1, zstd 9 and xz -9 |
| **198** | bytes to send an 822,400-byte page that grew by 808 bytes, with its previous version as the dictionary; 125,854 as br |
| **785** | bytes of bzip2 -9 that decompress to 1 GiB of zeros; the defence is a caller-set output cap |
| **47,034,368** | bytes in a SQLite file before and after deleting 90% of its documents; VACUUM took it to 4,714,496 |
| **8.03×** | zstd 3 on synthetic JSON API records; gzip -6 gives 6.07× |
| **3.21×** | per small message with zstd 3 and a 110 KiB trained dictionary; 1.98× without |
| **8.68×** | zstd 3 on a 6 MB JSONL audit log in 1 MiB blocks; 2.08× in 1 KiB blocks |
| **35.2%** | smaller: Parquet with dictionary encoding and zstd 3, against gzipped CSV, on one million rows |
| **4.66%** | at most, saved by four general-purpose codecs on any media file; re-coding saved up to 41% |

All ten numbers carry the posts' *measured here* badge: exact sizes and
ratios. The update log, API records, messages, SQLite documents and table are
synthetic.

## Where to go next

| Read | For |
|---|---|
| [What Compression Keeps](../report/2026-10-15-what-compression-keeps.md) | The theory, the 2026 codecs, the wire, attacks, and compaction from LSM trees to an agent's context window; 22 figures |
| [What Each File Wants](../report/2026-10-15-what-each-file-wants.md) | The measured guide per kind of file, from JSON and logs to images, audio and video; 21 figures |
| [A decision rule](../report/2026-10-15-what-compression-keeps.md#a-decision-rule) | When to compress, when to compact, and in which order |
| [Ten rules](../report/2026-10-15-what-each-file-wants.md#ten-rules) | The practice in ten rules, each resting on a result in the guide |

## How it connects

| Where | What the posts say |
|---|---|
| xo-space | Its project backup stamps each run's time into the gzip header, so the bytes change every run; [§06](../report/2026-10-15-what-each-file-wants.md#one-fix-in-the-xo-tree) gives the fix |
| xo-space | `time_compacting` and `time_compacted` are hard-coded to `None`, where a compaction audit trail would start ([§11](../report/2026-10-15-what-compression-keeps.md#in-this-repo-and-the-xo-trees)) |
| Agent CLIs ([claude](../../../claude/) topic) | None of Claude Code, Codex CLI and Gemini CLI compresses transcripts by default; Claude Code keeps them as plaintext JSONL for 30 days by default ([§07](../report/2026-10-15-what-each-file-wants.md#agent-transcripts)) |
| Mindwalk | The session-replay tool marks compactions in Claude Code, Codex and pi sessions ([§11](../report/2026-10-15-what-compression-keeps.md#in-this-repo-and-the-xo-trees)) |

## Open questions

Left open by the posts:

- How much an agent's context compaction loses; no published measure was
  found ([§11](../report/2026-10-15-what-compression-keeps.md#the-one-compaction-without-an-invariant)).
- Why Protobuf trails minified JSON under zstd 19
  ([§05](../report/2026-10-15-what-each-file-wants.md#schema-driven-ahead-until-the-codec-catches-up)).
- Whether Iceberg and Delta rewrites re-encode old files
  ([§12](../report/2026-10-15-what-compression-keeps.md#where-they-meet)).

Related issue: [#24](https://github.com/quirq-ai/research/issues/24) asks
whether one provider-neutral session record can carry Claude Code and Codex
sessions through compaction without losing evidence.

## Sources

Both by Suraj Sharma, in
[sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at
`a5a356d`, first published 9 October 2026:
[what-compression-keeps](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/what-compression-keeps)
([`index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/what-compression-keeps/index.html))
and
[what-each-file-wants](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/what-each-file-wants)
([`index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/what-each-file-wants/index.html)).
