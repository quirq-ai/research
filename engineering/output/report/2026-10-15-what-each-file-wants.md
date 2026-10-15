# What Each File Wants

There is no best compressor, only a best match between what a file is and how it will be read. A measured field guide, October 2026: JSON at rest and on the wire, small messages and dictionaries, binary encodings, config files, logs, tables, images, audio and video — which codec, which level or quality, when a format beats a compressor, and when to leave a file alone.

By **Suraj Sharma**, XO Labs · Data Systems. First published 9 October 2026 as *What Each File Wants* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/what-each-file-wants).

Source: [`what-each-file-wants/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/what-each-file-wants/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

> **How to read the badges**
>
> *\[from the spec\]* marks text from an RFC or a format specification. *\[from the docs\]* marks a project's own documentation, release notes, wiki or a maintainer's words, including benchmarks others published, which are reported as their claims. *\[from the tree\]* marks something read from the XO source trees on this machine. *\[measured here\]* marks a result produced by `_compute.py` beside this page, with the exact tool versions recorded in `_numbers.json`, on one shared 2-CPU Linux machine: sizes, ratios and quality scores are exact for these inputs; speeds are tiers. *\[reconstruction\]* marks a judgement or recipe I have worked out rather than read.

## 01 · Every file wants something different

There is no best compressor, only a best match between what a file is and how it will be read ([What Compression Keeps](2026-10-15-what-compression-keeps.md) explains why). Three questions find the match.

First: is the file media, or already compressed? Four general-purpose codecs saved under 0.07% on a JPEG, a PNG, two MP4s, an Opus file, a `.zip` and a `.tar.gz`, and at most 4.66% on any media file. *\[measured here\]* What matters is the media codec and its quality ([Already compressed](#12-already-compressed-leave-it)). *\[reconstruction\]*

Second: is it small, and stored alone? Then [framing](#04-small-messages-and-dictionaries) can outweigh the saving. *\[reconstruction\]* gzip -6 made 1,216 of 1,409 synthetic messages under 200 bytes bigger, and gzip -9 grew 5 of 80 XO config files, all of 109 bytes or less. *\[measured here\]*

Third: how will it be read? A file compressed once and read often can afford a slow encoder and wants a fast decoder. *\[reconstruction\]* On synthetic API records, brotli 11 was densest (11.84×) but compressed at under 1 MB/s; zstd 3 decompressed at 500 MB/s or more. *\[measured here\]* Data read by offset is cut into frames, whose size sets the ratio: zstd 3 gives 2.08× in 1 KiB blocks of a real 6 MB JSONL audit log from a doomfly simulation run on this machine, and 8.68× in 1 MiB blocks. *\[measured here\]* Data read by column wants a columnar format first (Figure 1). *\[reconstruction\]*

**Figure 1. Three questions, in order, and what each file wants**

![Decision flow of three questions asked in order, each with yes branches to the right and a no path continuing down. Question 1: is the file media, or already compressed (photos, audio, video, archives)? If yes: photos want AVIF or JPEG XL at a perceptual-quality target; graphics want lossless WebP or JPEG XL, or oxipng if the file must stay PNG; audio wants Opus to listen and FLAC to keep; video wants SVT-AV1 to store, H.264 to play and HEVC where required; already compressed files want to be stored as they are, never gzipped. If no, question 2: is it small, and stored alone (one message, one config file)? If yes: messages want zstd with a trained dictionary, or batching; config files want to be left alone, compressed as a set. If no, question 3: how will it be read? Once, over HTTP: brotli or zstd at the CDN, gzip as the fallback. Often, from disk: zstd 3 to 9, level 19 for cold archives. By offset: zstd in 1 MiB frames plus a seek table. By column: Parquet, dictionary encoding first, then zstd. By a package manager: the registry's format, gzip level 9 tarballs. Orange marks answers where a media codec does the work, blue a general-purpose codec, green a format first and then a codec, grey leaving the bytes alone.](2026-10-15-what-each-file-wants/fig-01-decision.svg)

Media and archives leave at the first question and tiny files at the second; for everything else, how the file is read picks the codec. The order and the answers are my judgement. *\[reconstruction\]*

### The answer, up front

Each row is my judgement, tested in the linked section. *\[reconstruction\]* Figure 2 has the measured headlines.

- **[JSON over HTTP](#03-json-pick-a-level-then-stop):** brotli or zstd [at the CDN](2026-10-15-what-compression-keeps.md#08-compression-on-the-wire), gzip as the fallback.
- **[JSON at rest](#03-json-pick-a-level-then-stop):** zstd 3 to 9; a trained dictionary for many [small documents](#04-small-messages-and-dictionaries), batches for streams.
- **[Binary encodings](#05-binary-encodings-vs-compressed-text):** for a schema and typed values, not for size.
- **[Config files](#06-config-files-leave-them-alone)** (TOML, YAML, small JSON; see [What the Parser Hears](2026-10-15-what-the-parser-hears.md)): never compress one by one.
- **[Lockfiles and packages](#06-config-files-leave-them-alone):** the registry's format; for Cargo and npm, gzip level 9 tarballs. *\[from the docs\]*
- **[JSONL logs](#07-logs-and-json-lines):** zstd in large blocks; seekable frames for random access.
- **[Tables](#08-tables-let-the-format-do-the-work):** Parquet (dictionary, RLE, zstd), not gzipped CSV.
- **[Images](#09-images):** AVIF or JPEG XL for photos; lossless WebP or JPEG XL for graphics, oxipng if it must stay PNG.
- **[Audio](#10-audio):** Opus to listen, FLAC to keep.
- **[Video](#11-video):** SVT-AV1 at preset 4 to 6 to store; H.264 to play anywhere; HEVC where hardware demands it.
- **[Already compressed](#12-already-compressed-leave-it):** store it; never gzip it.

**Figure 2. One measured headline per kind of file**

- **8.03×** · JSON API records, zstd 3 (gzip -6: 6.07×)
- **3.21×** · small messages, zstd 3 + 110 KiB dictionary (1.98× without)
- **−2.61%** · MessagePack vs minified JSON, both after zstd 3
- **5 of 80** · XO config files gzip -9 made bigger, all ≤ 109 B
- **8.68×** · JSONL audit log, zstd 3 in 1 MiB blocks
- **1.54×** · CSV.gz ÷ Parquet bytes (dictionary + zstd 3)
- **−34.5%** · AVIF vs JPEG 4:2:0, three photos at SSIMULACRA 2 = 80
- **15.68×** · Opus 96 kb/s vs WAV (FLAC -8: 2.14×)
- **−34.56%** · SVT-AV1 preset 8 BD-rate vs x264 (x265: −39.09%)
- **−21.3%** · SVT-AV1 preset 4 kbps vs x265 at equal VMAF (one point)
- **≤ 4.66%** · best saving on nine media files, four codecs

From `_numbers.json → headline`; the preset-4 tile from `video.single_points_vs_curves`. Ratios are original ÷ compressed. SSIMULACRA 2 and VMAF are perceptual scores; BD-rate is the average bitrate difference at equal VMAF ([Video](#11-video)). JSON records, messages and the table are synthetic. Video is one 10 s clip; audio has no quality metric. *\[measured here\]*

## 02 · How the measurements were made

Every result badged *measured here* comes from one run of `_compute.py`, recorded in `_numbers.json`. Sizes, ratios and scores are exact for these inputs; speeds are tiers. *\[measured here\]*

### Machine and tools

The run ended on 10 October 2026 after 2,841 s, on Ubuntu 26.04.1 LTS, an Intel Xeon at 2.20 GHz and 31 GiB of RAM. The host shows 8 CPUs, but the cgroup's `cpu.max` of `200000 100000` grants two CPUs of time, shared with other tenants; it throttled 40.3% of the run's periods. *\[measured here\]*

Python 3.14.4 supplies `compression.zstd` (libzstd 1.5.7), zlib 1.3.1 and liblzma 5.8.3. Pinned wheels bring brotli 1.2.0, liblz4 1.9.4, zlib-ng 2.2.5, libdeflate (bundled in the deflate 0.9.0 wheel; version not exposed), pyarrow 26.0.0, Pillow 12.3.0 and five binary-format libraries. Static builds add BtbN's GPL FFmpeg n9.0.2-24 with x264 core 165, x265 4.3+49, SVT-AV1 v4.2.0-151 and libvmaf 86da14d; libjxl 0.12.0's tools; and oxipng 10.2.1. *\[measured here\]* `_numbers.json → versions` has the rest; [What Compression Keeps](2026-10-15-what-compression-keeps.md#05-the-codecs-that-matter-in-2026) introduces the codecs.

### The inputs

The synthetic agent events in Figure 3 draw about 90% of their free text from a 175-word vocabulary, so they repeat less than real tool output (`_compute.py`, lines 388–397 and 509–556). *\[from the tree\]* No file under `~/.claude` or `~/.quirq` is opened; the audit log of a run of doomfly (a local clone of nftechie/doomfly, a connectome simulation driving a Doom arena; MIT) stands in for agent logs, kept as sizes and ratios only (`_compute.py`, lines 39–40, 1306; doomfly's `PROJECT.md`, line 11, and `LICENSE`). *\[from the tree\]* derf's Sintel Y4M is an `rgb2yuv` conversion from 8-bit RGB (its footnote 2), not a lossless master. *\[from the docs\]*

**Figure 3. The test corpora, by the section that measures them**

| For | Corpus | Bytes | Source · · licence |
|----|----|----|----|
| [JSON](#03-json-pick-a-level-then-stop) | `posts.json`; the `_numbers.json` of [What the Parser Hears](2026-10-15-what-the-parser-hears.md) | 27,667 · 518,267 | this site |
| [JSON](#03-json-pick-a-level-then-stop), [binary](#05-binary-encodings-vs-compressed-text) | 4,100 API order objects, minified | 4,926,885 | seed 20261010 |
| [Small](#04-small-messages-and-dictionaries) | 20,000 agent messages, 132–4,096 B, median 652 | 21,814,795 | seed 20261011 |
| [Config](#06-config-files-leave-them-alone) | 80 config files: 69 JSON, 10 YAML, 1 TOML | 485,042 | XO trees; first-party |
| [Config](#06-config-files-leave-them-alone) | three `Cargo.lock` files | 153 · 57,438 · 134,543 | upstream; two MIT, one with no licence file |
| [Logs](#07-logs-and-json-lines) | doomfly `audit.jsonl`, 1,915 lines of JSONL | 6,123,015 | a doomfly (MIT) run here; ratios only |
| [Logs](#07-logs-and-json-lines) | nginx access log, 28,148 lines | 6,000,088 | seed 20261012 |
| [Tables](#08-tables-let-the-format-do-the-work) | clickstream CSV, 1,000,000 rows, 14 columns | 124,514,710 | seed 20261013 |
| [Images](#09-images) | Kodak kodim05, 15, 23: 768×512 photographs | 557,596 to · 785,610 | r0k.us; unrestricted use, as the host understands it |
| [Images](#09-images) | xo-space screenshot; doomfly pixel-art fly | 390,623 · 756,305 | MIT, both |
| [Images](#09-images) | this site's 3 JPEGs; its 22 SVGs | 286,319 · 59,258 | this site |
| [Audio](#10-audio) | Sintel trailer soundtrack, FLAC, 52.0 s, 48 kHz stereo | 4,692,805 | Xiph derf; CC BY 3.0 |
| [Video](#11-video) | Sintel trailer Y4M, 1080p24, frames 480–719 (10.0 s) | 746,497,485 | Xiph derf; CC BY 3.0 |

*\[measured here\]* Bytes from `_numbers.json → corpora`, which pins 24 inputs by SHA-256 (two archive-test inputs omitted). Green: real files on this machine; blue: public test media; purple: synthetic, from the seed shown. Licences as each source states them. *\[from the docs\]* Small messages, binary encodings and tables are synthetic only; read their ratios as rankings. *\[reconstruction\]*

### What is exact, and what is not

Sizes, ratios, SSIMULACRA 2 and VMAF scores are deterministic. Generators are seeded, gzip members carry mtime 0, MP4s are written bit-exact, and every lossless result is decoded and compared. An independent pass reproduced 122 values with other tools; all matched. MB is 10⁶ bytes, and a ratio is original ÷ compressed. *\[measured here\]*

Speeds are medians of 7 runs after a warm-up for the JSON codecs (3 when a run passes 2 s), 5 for most other phases and 3 for audio; video encodes ran once, three of them three times. They are binned into tiers such as 10–100 MB/s. Throttling took 3.4–4.8% of periods in single-threaded phases and 94% during video encoding. zstd 9 on the API records ran at 41.3 MB/s in this run and near 20 MB/s in two earlier full runs, in the same tier, so no section quotes a speed ratio. *\[measured here\]*

### Rerunning it

`~/compression-ref/bench/setup.sh` puts the static builds in `bench/bin`, outside the publication. It checks every download against BtbN's or GitHub's published SHA-256 or, where hosts publish none, a digest recorded at first download on 10 October 2026 (lines 19–29, 52–63). `uv run _compute.py` then rewrites `_numbers.json` (`_compute.py`, lines 21–27). *\[from the tree\]*

Three things will drift. x264 sized 12 threads from the 8 visible CPUs, and its bytes depend on that count. `posts.json` and the site's SVGs are live files, pinned only by their recorded hashes; the `.xo` state files are not hashed. *\[measured here\]*

## 03 · JSON: pick a level, then stop

Every codec here shrinks JSON; they differ in what the last few per cent cost. Past a knee, each level adds little ratio and often costs a tier of compression speed, while decompression stays where it was. Find the knee, set the level there, and stop.

### Three files, twenty-three settings

The corpora are this site's `posts.json` (27,667 bytes when measured), the `_numbers.json` of [What the Parser Hears](2026-10-15-what-the-parser-hears.md) (518,267) and 4,100 synthetic API order records (4,926,885 minified). *\[measured here\]* The records draw customers and products from fixed, skewed pools of 1,500 and 400, so values repeat across records (`_compute.py`, lines 434–436). *\[from the tree\]* Each corpus is also re-serialised three ways: indented two spaces, Python's default `json.dumps`, and minified. Every form goes through 23 settings of gzip (zlib, zlib-ng, libdeflate), Brotli, zstd, xz and LZ4; every output is decoded and compared. Speeds come from the API records alone and are tiers ([How the measurements were made](#02-how-the-measurements-were-made)). *\[measured here\]*

**Figure 4. Ratio against compression speed, with decoding tier as fill: 23 settings on the minified API records**

![Scatter chart of compression ratio against compression speed on a log scale for 23 codec settings on the 4,926,885-byte minified synthetic API records, with speed tiers shaded and markers filled when decoding runs at 500 MB/s or more. gzip -1 4.72× compressing at 10–100 MB/s and decoding at 100–500 MB/s; gzip -6 6.07× compressing at 10–100 MB/s and decoding at 100–500 MB/s; gzip -9 6.37× compressing at 10–100 MB/s and decoding at 100–500 MB/s; zlib-ng gzip -1 4.04× compressing at 100–500 MB/s and decoding at ≥500 MB/s; zlib-ng gzip -6 6.20× compressing at 10–100 MB/s and decoding at ≥500 MB/s; zlib-ng gzip -9 6.33× compressing at 10–100 MB/s and decoding at ≥500 MB/s; libdeflate gzip -1 5.16× compressing at 100–500 MB/s and decoding at ≥500 MB/s; libdeflate gzip -6 6.22× compressing at 10–100 MB/s and decoding at ≥500 MB/s; libdeflate gzip -9 6.47× compressing at 10–100 MB/s and decoding at ≥500 MB/s; libdeflate gzip -12 6.57× compressing at 1–10 MB/s and decoding at ≥500 MB/s; brotli -q 1 6.10× compressing at 100–500 MB/s and decoding at 100–500 MB/s; brotli -q 5 9.95× compressing at 10–100 MB/s and decoding at 100–500 MB/s; brotli -q 9 10.71× compressing at 1–10 MB/s and decoding at 100–500 MB/s; brotli -q 11 11.84× compressing at \<1 MB/s and decoding at 100–500 MB/s; zstd 1 6.91× compressing at 100–500 MB/s and decoding at ≥500 MB/s; zstd 3 8.03× compressing at 100–500 MB/s and decoding at ≥500 MB/s; zstd 9 10.07× compressing at 10–100 MB/s and decoding at ≥500 MB/s; zstd 19 11.49× compressing at \<1 MB/s and decoding at ≥500 MB/s; zstd 22 11.50× compressing at \<1 MB/s and decoding at ≥500 MB/s; xz -6 11.52× compressing at 1–10 MB/s and decoding at 100–500 MB/s; xz -9 11.52× compressing at 1–10 MB/s and decoding at 100–500 MB/s; lz4 (default) 4.02× compressing at 100–500 MB/s and decoding at ≥500 MB/s; lz4 -9 (HC) 5.82× compressing at 10–100 MB/s and decoding at ≥500 MB/s. Rings mark the knees, gzip -6, brotli 5 and zstd 9, where the next level adds under 15% to the ratio.](2026-10-15-what-each-file-wants/fig-04-json-frontier.svg)

*\[measured here\]* From `_numbers.json → json.timing.minified.rows`. Ratios (original ÷ compressed) are exact; speeds are medians on two CPUs shared with other tenants (3.6% of periods throttled): read the bands, not positions within them. Past the ringed knees no step adds more than 14.13% to the ratio. The 15% knee rule is mine. *\[reconstruction\]*

### Where the knee is

In Figure 4, zstd 3 gives 8.03× and compresses in the 100–500 MB/s tier; gzip -6 gives 6.07× a tier lower, so zstd 3's output is 24.46% smaller. zstd 3 to 9 adds 25.34% to the ratio and drops one tier; 9 to 19 adds 14.13% and drops two, to below 1 MB/s; 19 to 22 adds 0.08%. Brotli bends sooner: quality 1 to 5 adds 63.04%, 5 to 9 adds 7.72%, and 9 to 11 adds 10.56%, each a tier slower. gzip -6 to -9 adds 4.98% inside its tier. *\[measured here\]*

Decoding speed follows the codec more than the level. The zstd README says decompression "remains roughly the same at all settings". *\[from the docs\]* Here every zstd level decoded at 500 MB/s or more and every Brotli quality below it; indented, zstd 3 and Brotli 5 to 11 swapped sides, so that boundary is not stable. *\[measured here\]* zlib-ng and libdeflate write the same gzip format as zlib: at level 6 their output is within 3.74% of zlib's, either way by corpus, and their own decoders run a tier faster. *\[measured here\]*

### Defaults, and other people's numbers

zstd 3 is not denser than gzip -6 everywhere. On both real files, as found, its output is larger: 7,807 against 7,387 bytes for `posts.json` (+5.69%), and 49,754 against 47,037 for the parser post's file (+5.78%). GNU gzip 1.14 and the separate `zstandard` binding give the same order. zstd 9 beat gzip -6 on all three corpora: by 1.49% and 15.74% on the files as found, and 39.73% on the minified records. *\[measured here\]* At level 3, zstd's dependable lead is speed. *\[reconstruction\]*

The brotli command line defaults to quality 11, its slowest, and zstd to level 3 ([The codecs that matter in 2026](2026-10-15-what-compression-keeps.md#05-the-codecs-that-matter-in-2026)). *\[from the docs\]* On the records, brotli 11's output is 32.17% smaller than zstd 3's, written below 1 MB/s; matched by tier, brotli 5 is 1.25% larger than zstd 9, and brotli 11 2.97% smaller than zstd 19. *\[measured here\]* The 20–26% Brotli gain quoted against gzip was Google's 2015 figure against Zopfli. *\[from the docs\]* Against gzip -9, brotli 11 saved 17.87% on `posts.json` and 26.77% on the parser post's file, both as found, and 46.21% on the minified records. *\[measured here\]*

On minified SchemaStore documents of 100 bytes and up, Viotti and Kinderkhedia, in an unrefereed preprint, found GZIP's average and median reductions the best of GZIP, LZ4 and LZMA ("A Benchmark of JSON-compatible Binary Serialization Specifications", arXiv:2201.03051, 2022, §8.4.1). *\[from the docs\]* Here xz -6 beat gzip -6 on all three minified files, by 3.98% to 47.31%. *\[measured here\]* A ranking travels only with its inputs. *\[reconstruction\]* Their tiny documents, and Facebook's 2016 dictionary, are in [Small messages and dictionaries](#04-small-messages-and-dictionaries).

### Indented or minified

RFC 8259 §2: "Insignificant whitespace is allowed before or after any of the six structural characters." Minifying loses no data. *\[from the spec\]* Python's `json.dumps` is not minimal by default: without `indent` it puts a space after each comma and colon, and its documentation points to `separators=(',', ':')` for the most compact output. *\[from the docs\]* That default form, which also escapes non-ASCII, makes the records 9.53% larger than minified, and 1.52% larger after zstd 3. *\[measured here\]*

Compression removes most of what indentation adds: minifying the indented records saves 34.99% raw but 4.79% after brotli 11 (Figure 5). Ratios flatter indentation: indented, the records reach 11.04× under zstd 3 against 8.03× minified, yet compress to 686,355 bytes against 613,261. *\[measured here\]* Compare bytes, not ratios. *\[reconstruction\]*

**Figure 5. What minifying saves, before and after compression, on three corpora**

![Horizontal bars: bytes saved by minifying indented JSON, before and after compression, for three corpora. API records: raw 34.99% (7,578,250 to 4,926,885 bytes), gzip -6 11.60% (918,302 to 811,796 bytes), zstd 3 10.65% (686,355 to 613,261 bytes), brotli 11 4.79% (436,892 to 415,965 bytes); What the Parser Hears \_numbers.json: raw 35.21% (611,835 to 396,391 bytes), gzip -6 14.88% (49,649 to 42,259 bytes), zstd 3 11.98% (51,686 to 45,493 bytes), brotli 11 5.34% (33,762 to 31,960 bytes); posts.json: raw 22.75% (27,666 to 21,371 bytes), gzip -6 3.28% (7,386 to 7,144 bytes), zstd 3 5.45% (7,806 to 7,381 bytes), brotli 11 2.88% (6,049 to 5,875 bytes).](2026-10-15-what-each-file-wants/fig-05-minify.svg)

*\[measured here\]* From `_numbers.json → json.minify`: 100 × (indented − minified) ÷ indented, in bytes; codec colours as in Figure 4, uncompressed in grey. Indented means re-serialised with `indent=2`, so the parser post's file is 611,835 bytes here against 518,267 as found. After brotli 11, minifying is worth 2.88% to 5.34%.

### What to set

My reading of the measurements above: *\[reconstruction\]*

- **At rest, written often:** zstd 3, which compressed both forms of the records at 100 MB/s or more.
- **Read often, or replacing gzip -6:** zstd 9, at the knee: gzip -6's compression tier, smaller on all three corpora, a decode tier faster.
- **Cold archives:** zstd 19, which still decoded at 500 MB/s or more. Skip `--ultra`: it unlocks levels 20 to 22 and needs more memory to compress and to decode *\[from the docs\]*; level 22 added at most 1.20% to any ratio here. *\[measured here\]*
- **At the edge:** brotli 11 for static files, brotli 5 or zstd 3 per request; negotiation is in [Compression on the wire](2026-10-15-what-compression-keeps.md#08-compression-on-the-wire).
- **Only gzip:** level 6, not nginx's default `gzip_comp_level` of 1 *\[from the docs\]*; gzip -1 wrote 11.18% to 47.79% more bytes than -6. *\[measured here\]*

## 04 · Small messages and dictionaries

A 135-byte message has almost nothing to repeat; its repetition lives in the messages around it. Batching reaches it and wins on ratio. A trained dictionary reaches it while each message stays readable alone.

### Framing comes first

A gzip member spends at least 18 bytes on header and trailer (RFC 1952 §2.3); a zstd frame at least 9 (RFC 8878 §3.1.1, §3.1.1.2). *\[from the spec\]* "Compression is always performed, even if the compressed file is slightly larger than the original" (GNU Gzip 1.15 manual). *\[from the docs\]* Under 100 bytes, compression of SchemaStore JSON "tends to yield negative results", LZMA at worst reaching "a negative 171.4% size reduction" (Viotti and Kinderkhedia, §8.4.1). *\[from the docs\]*

The corpus is 20,000 synthetic agent events of 132 to 4,096 bytes, split at random into training and test halves ([How the measurements were made](#02-how-the-measurements-were-made)). Every test message under 200 bytes is a heartbeat of 132 to 146 bytes, like this one from `agent_events` (`_compute.py`, lines 509–556): *\[measured here\]*

    {"v":1,"ts":"2026-10-01T09:27:25.459Z","session":"ses_gcdkyDJpkvuJ","seq":11274,"project":"writings","type":"heartbeat","state":"busy"}

gzip -6 made 1,216 of those 1,409 heartbeats bigger, 0.98× in total. Raw DEFLATE at level 6 grew none, and its output is 25,362 bytes smaller: 18 × 1,409, the member framing exactly. zstd 3 grew none (1.05×), Brotli 11 one (1.22×). *\[measured here\]*

### Batch them, or bring a dictionary

Kafka compresses batches because "much of the redundancy is due to repetition between messages of the same type (e.g. field names in JSON or user agents in web logs or common string values)" (design docs, "End-to-end Batch Compression"). *\[from the docs\]* On the test half, zstd 3 gives 1.98× with one message per frame, 2.83× with 10, 3.27× with 100 and 3.57× with all 10,000. *\[measured here\]*

A dictionary gives each message a past ([Saying it again, by reference](2026-10-15-what-compression-keeps.md#04-saying-it-again-by-reference)). Four were trained with `compression.zstd.train_dict` on the training half, 10,900,903 bytes. *\[measured here\]* The largest, 112,640 bytes, is the zstd CLI's default maximum. *\[from the docs\]* With it, zstd 3 per message rises from 1.98× to 3.21× overall, and from 1.05× to 2.71× under 200 bytes (Figure 6). *\[measured here\]*

**Figure 6. Ratio by message size: alone, with a trained dictionary, and 100 to a frame**

![Grouped bar chart of compression ratio, original bytes divided by compressed bytes, for 10,000 held-out synthetic agent-event messages in five size buckets, linear axis from 0 to 6 with a dashed break-even line at 1, no compression, below which the output is larger than the input. Bars per bucket: gzip -6 on each message alone, zstd 3 on each message alone, zstd 3 with a 110 KiB trained dictionary on each message alone, and zstd 3 on frames of 100 messages of that bucket. 100 to 199 bytes, 1,409 messages: 0.98, 1.05, 2.71, 5.53; gzip -6 made 1,216 of them bigger. 200 to 499 bytes, 2,862 messages: 1.30, 1.32, 3.17, 3.96. 500 to 999 bytes, 1,889 messages: 1.69, 1.65, 3.16, 3.35. 1,000 to 1,999 bytes, 1,856 messages: 2.00, 1.96, 3.20, 3.26. 2,000 to 4,096 bytes, 1,984 messages: 2.36, 2.35, 3.25, 3.32.](2026-10-15-what-each-file-wants/fig-06-small.svg)

*\[measured here\]* From `_numbers.json → small.by_size_bucket`. Only gzip falls below no compression, and only under 200 bytes. Purple bars pack each bucket 100 messages to a frame, so 5.53× is frames of near-identical heartbeats: a best case. *\[reconstruction\]*

The dictionary's 3.21× lies between batches of 10 (2.83×) and 100 (3.27×) without one. *\[measured here\]* A store that reads one record by key wants the dictionary; a log shipper wants the batch ([Logs and JSON Lines](#07-logs-and-json-lines)). *\[reconstruction\]* The two barely stack: the dictionary lifts frames of 100 from 3.27× to 3.48×, and at 1,000 per frame costs about 1% (3.49× against 3.53×). *\[measured here\]*

### How big a dictionary

The first 4 KiB does most of the work: 1.98× to 2.97×, 0.99 of the 1.22 points that 110 KiB adds (81%). *\[measured here\]* The zstd README says "Dictionary gains are mostly effective in the first few KB". *\[from the docs\]* Here 110 KiB lifts the 100–199-byte bucket 2.57-fold and the 2,000–4,096-byte bucket 1.38-fold (Figure 7). *\[measured here\]*

**Figure 7. Ratio per message against trained dictionary size, zstd 3**

![Line chart of zstd level 3 compression ratio per message against trained dictionary size: none, 4, 16, 64 and 110 KiB, sizes on a log scale with none set apart; vertical axis from 1.0, no saving, to 3.5. All 10,000 messages: 1.98, 2.97, 3.04, 3.14, 3.21. 100 to 199 bytes: 1.05, 2.38, 2.41, 2.55, 2.71. 2,000 to 4,096 bytes: 2.35, 3.07, 3.09, 3.19, 3.25. A dashed reference line marks zstd 3 on all messages in frames of 100 with no dictionary, 3.27. The first 4 KiB gives 81 percent of the gain that 110 KiB gives across all messages.](2026-10-15-what-each-file-wants/fig-07-dict-size.svg)

*\[measured here\]* From `small.per_document_test_split`, `small.by_size_bucket` and `small.batching_test_split`; the axis starts at 1.0×. Each curve makes about 80% of its rise by 4 KiB, and none reaches the dashed line.

Facebook's zstd launch post took 1,000 GitHub user records, "roughly 850 KB", to "just over 300 KB" file by file and to 122 KB with a dictionary of about 64 KB, "taking the original compression ratio from 2.8x to 6.9" (Collet and Turner, "Smaller and faster data compression with Zstandard", 31 August 2016). *\[from the docs\]* That is a 2.46-fold lift (6.9 ÷ 2.8). *\[reconstruction\]* 64 KiB here gives about 1.6-fold (3.14 ÷ 1.98). *\[measured here\]* Their transcript trains the dictionary on the directory it then compresses. *\[from the docs\]* Ours is tested on held-out messages whose free text is mostly random draws from 175 words (`_compute.py`, lines 388–397). *\[from the tree\]*

### What a dictionary costs

A dictionary is a deployment: every reader needs its exact bytes for as long as the messages live. *\[reconstruction\]* A zstd frame may name it in an optional `Dictionary_ID`; "When it's not present, it's up to the decoder to know which dictionary to use" (RFC 8878 §3.1.1.1.3). *\[from the spec\]* The ID costs 4 bytes: dropping optional header fields saves 46,826 bytes on 10,000 messages with the dictionary and 6,826 without, 40,000 more. Under 200 bytes the ID is 7.9% of the output. *\[measured here\]* Keep the ID; it is how a reader notices the wrong dictionary. *\[reconstruction\]*

Load it once: "it's recommended to digest the dictionary only once, since it's a costly operation" (`lib/zstd.h`, v1.5.7, lines 987–992). *\[from the docs\]* Passing Python 3.14's `ZstdDict` itself to `compress` reloads it per call, under 1,000 messages a second; `zd.as_digested_dict` gives the same bytes in plain zstd 3's tier, 10,000–100,000. *\[measured here\]*

Over HTTP, RFC 9842 names a dictionary by its SHA-256 and puts a 40-byte header on each `dcz` response ([Compression on the wire](2026-10-15-what-compression-keeps.md#08-compression-on-the-wire)). *\[from the spec\]* A heartbeat compressed with the dictionary averages 50 bytes (70,994 ÷ 1,409). *\[measured here\]* The header nearly doubles that, so HTTP dictionaries suit kilobyte responses. *\[reconstruction\]*

The rule: never gzip a message under 200 bytes alone. Batch when the reader takes batches; otherwise train a dictionary, test it on held-out messages and record its ID ([A practice that holds](#13-a-practice-that-holds)). *\[reconstruction\]*

## 05 · Binary encodings vs compressed text

A binary format and a compressor remove much of the same redundancy. Without a codec, four of five binary encodings beat minified JSON, two by more than half. After zstd 3, CBOR and MessagePack are under 3% smaller, BSON is larger, and only the formats with a schema stay clearly ahead. Pick a binary format for its data model, not its size.

### One record set, six encodings

The input is the 4,100 synthetic order records of [JSON: pick a level, then stop](#03-json-pick-a-level-then-stop), written as minified JSON, CBOR (RFC 8949), MessagePack, BSON (one document per record), Protobuf and Avro (`_compute.py`, lines 986–992). Protobuf gets a proto2 schema built at run time (lines 860–898); Avro gets the same schema, kept outside the bytes (lines 936–951). *\[from the tree\]* Each was stored raw and under gzip -6, zstd 3 and zstd 19, and each decodes to the original records. *\[measured here\]* Figure 8 has every size.

**Figure 8. One record set in six encodings: size against minified JSON, raw and after three codecs**

![Diverging horizontal bar chart: the size of the same 4,100 synthetic order records in six encodings, each with no codec and after gzip -6, zstd 3 and zstd 19, as a percentage of minified JSON's size under the same codec (negative is smaller). Minified JSON, the baseline: no codec 4,926,885 bytes, gzip -6 811,796, zstd 3 613,261, zstd 19 428,686. CBOR: no codec 3,948,528 bytes (minus 19.86%), gzip -6 812,331 (plus 0.07%), zstd 3 595,729 (minus 2.86%), zstd 19 431,437 (plus 0.64%). MessagePack: no codec 3,934,439 bytes (minus 20.14%), gzip -6 814,822 (plus 0.37%), zstd 3 597,256 (minus 2.61%), zstd 19 431,461 (plus 0.65%). BSON: no codec 5,104,386 bytes (plus 3.6%), gzip -6 970,748 (plus 19.58%), zstd 3 703,840 (plus 14.77%), zstd 19 484,403 (plus 13.0%). Protobuf: no codec 2,269,715 bytes (minus 53.93%), gzip -6 745,791 (minus 8.13%), zstd 3 558,870 (minus 8.87%), zstd 19 448,202 (plus 4.55%). Avro: no codec 2,022,052 bytes (minus 58.96%), gzip -6 677,436 (minus 16.55%), zstd 3 511,271 (minus 16.63%), zstd 19 416,622 (minus 2.81%). Without a codec the bars spread from minus 58.96 to plus 3.6 percent; after a codec every encoding except BSON lies between minus 16.63 and plus 4.55 percent.](2026-10-15-what-each-file-wants/fig-08-binary.svg)

*\[measured here\]* From `_numbers.json → binary.rows`. Raw, the bars run from −58.96% to +3.6%. Compressed, every encoding but BSON lies between −16.63% and +4.55%.

### Schema-less: a fifth off, then almost nothing

Raw, CBOR is 19.86% smaller than minified JSON and MessagePack 20.14%. *\[measured here\]* Neither drops a key: RFC 8949's objectives include "Data must be able to be decoded without a schema description" (§1.1). *\[from the spec\]* So every record still spells out every field name. *\[reconstruction\]*

A compressor removes repeated names by itself ([Saying it again, by reference](2026-10-15-what-compression-keeps.md#04-saying-it-again-by-reference)). After any of the three codecs, CBOR and MessagePack land within 3% of JSON, from 2.86% smaller to 0.65% larger. *\[measured here\]* Viotti and Kinderkhedia found that "in comparison to compressed JSON, both compressed and uncompressed schema-less binary serialization specifications result in negative median and average size reductions" (PDF abstract). *\[from the docs\]*

### BSON: larger, by design

BSON is 3.6% larger than minified JSON raw and 13.0% to 19.58% larger compressed. *\[measured here\]* Its FAQ says "In some cases BSON uses even more space than JSON": documents carry string and sub-object lengths for traversal, and integers take 32 or 64 bits. *\[from the docs\]* It is a storage format ([What a database does with JSON](2026-10-15-where-the-json-lives.md#07-what-a-database-does-with-json)), not a way to save bytes. *\[reconstruction\]*

### Schema-driven: ahead, until the codec catches up

A schema takes the names out of the bytes. Protobuf writes field numbers and varints of one to ten bytes; *\[from the docs\]* the Avro specification says "Binary encoded Avro data does not include type information or field names" (Data Serialization and Deserialization). *\[from the spec\]* Raw, Protobuf is 53.93% smaller than minified JSON and Avro 58.96%. *\[measured here\]*

Compression closes most of that gap. Avro stays ahead under every codec, by 2.81% to 16.63%. Protobuf is 8.13% and 8.87% smaller under gzip -6 and zstd 3, then 4.55% larger under zstd 19. *\[measured here\]* The same abstract calls compressed sequential schema-driven formats "strictly superior to compressed JSON in all the cases from the input data". *\[from the docs\]* Here that holds for Avro and fails once for Protobuf, for a reason I did not trace. *\[measured here\]*

Schema and compressor remove the same repetition, so their gains do not add. *\[reconstruction\]* zstd 3 shrinks the JSON 8.03×, Protobuf 4.06× and Avro 3.95×. *\[measured here\]* Protobuf's overview is plain: "Messages are not compressed." *\[from the docs\]* Carrying the schema costs little: Avro's container file, schema in its header, adds 5,034 bytes to 2,022,052. *\[measured here\]*

### What the switch buys

MessagePack sells itself as "fast and small", Protobuf as "smaller and faster". *\[from the docs\]* In Python all six decoders, json included, rebuilt the records at 10,000 to 100,000 records a second, one tier (medians of five runs), *\[measured here\]* a library result on a shared 2-CPU machine that predicts nothing for C++ or Rust. *\[reconstruction\]*

So choose a binary format for what it adds besides size: a schema both sides hold, typed values, a database's layout. For bytes, compress the JSON; where a schema exists, Avro and Protobuf beat it by 8.87% to 16.63%, all under zstd 3. *\[reconstruction\]* Below about 100 bytes the ranking changes: Viotti and Kinderkhedia's schema-less formats won mostly on documents that small, which compression grows (§8.4.2; [Small messages and dictionaries](#04-small-messages-and-dictionaries)). *\[from the docs\]*

## 06 · Config files: leave them alone

Config files compress like any other text, but they are small and read whole: there is little to save, and the smallest [grow](#04-small-messages-and-dictionaries). Where config travels in bulk, a registry or Git has already compressed it.

### Eighty files, each alone

The 80 config files in the XO-owned trees (69 JSON, 10 YAML, 1 TOML; upstream clones skipped) total 485,042 bytes; the median is 1,424. Each compressed alone, their median ratios are 2.42× with gzip -9, 2.87× with brotli 11 and 2.45× with zstd 19. *\[measured here\]* gzip -9 made five bigger: `writings/vercel.json`, 49 bytes to 61, and four agent `settings.json` files of 92 to 109 bytes. A fifth agent file, 206 bytes, shrank to 179; no file lies between. *\[measured here\]*

The 11 YAML and TOML files (one of them TOML) shrink less than JSON of the same size (454 to 1,692 bytes): median gzip -9 output 0.63 of the input, against 0.47. Summed, the 80 files save 304,131 bytes under zstd 19, but 70.4% of the input is this site's 11 post plans (`_plan.json`, prose in JSON). The other 69 save 94,560 of 143,764 bytes (Figure 9). *\[measured here\]* That does not pay for a decompression step in every loader. *\[reconstruction\]*

**Figure 9. 80 config files and 3 lockfiles, each gzipped alone: size against output ÷ input**

![Scatter plot of 83 files, each compressed alone with gzip -9: original size on a log axis from 40 to 200,000 bytes against output size divided by input size, with a dashed line at 1.00 above which the file grew. The 80 XO config files are 58 JSON config files, 11 YAML or TOML files and 11 of this site's post plans; the 3 Cargo.lock files come from upstream clones. Five files of 109 bytes or less lie above the line: vercel.json, 49 to 61 bytes (1.24), and four agent settings.json files of 92 to 109 bytes (1.04 to 1.11). All 75 config files of 206 bytes or more lie below it, from 0.22 to 0.87, 69 of them between 0.25 and 0.70. YAML and TOML lie at 0.44 to 0.68; the post plans, 3,899 to 70,129 bytes, at 0.34 to 0.42. Cargo.lock: fly-chess, 153 bytes, one package, 0.93; makepad, 57,438 bytes, 0.16; sentrux, 134,543 bytes, 0.24.](2026-10-15-what-each-file-wants/fig-09-config.svg)

*\[measured here\]* From `_numbers.json → config`: gzip members with mtime 0 and no name; brotli 11 and zstd 19 are not drawn. No config file lies between 109 and 206 bytes, so break-even falls in that gap; the one lockfile there, 153 bytes, shrank to 0.93.

### Lockfiles are the exception

`Cargo.lock` is TOML. *\[from the docs\]* The three under `~/xo-projects` hold 192,134 of the 192,588 TOML bytes measured here. *\[measured here\]* All three are in upstream clones. *\[from the tree\]* makepad's 57,438 bytes compress 6.30× with gzip -9, 7.30× with brotli 11 and 6.90× with zstd 19; sentrux's 134,543 bytes 4.10×, 5.00× and 4.80×. *\[measured here\]* sentrux pins 527 of its 529 packages with a 64-hex-digit checksum, makepad 71 of 374. *\[from the tree\]* Each checksum is 32 bytes no model can predict, so sentrux's checksums need at least 527 × 32 = 16,864 bytes, 63% of brotli's 26,929. *\[reconstruction\]*

### Where config already travels compressed

Cargo writes a `.crate` as a gzip tarball at `Compression::best()`, level 9 (`src/ops/cargo_package/mod.rs`, lines 872–874). *\[from the docs\]* npm 12.2.0's pacote forces level 9 and dates every entry 26 October 1985, "for the benefit of zip" (`tar-create-options.js`). *\[from the docs\]* That fixed date also makes the tarball reproducible. *\[reconstruction\]* Wheels are ZIP archives (PEP 427); sdists are `.tar.gz` (PEP 625). *\[from the spec\]* Git zlib-compresses loose objects, at level 1 unless `core.looseCompression` or `core.compression` is set, and can store packed objects as deltas (Git documentation, v2.56.0). *\[from the docs\]* [What Compression Keeps](2026-10-15-what-compression-keeps.md#10-compaction-keeping-only-the-present) measures `git gc`. Compress config as a set, never file by file. *\[reconstruction\]*

### One fix in the XO tree

xo-space's project backup writes a level-6 gzip tarball after sorting paths "for reproducible-ish tars" (`tarball.py`, lines 131 and 134, in `services/cowork_agent/xo_projects_sync/`). *\[from the tree\]* But `tarfile`'s `"w:gz"` mode opens its `GzipFile` without an `mtime` (Python 3.14 `tarfile.py`, line 1999), and "If mtime is omitted or None, the current time is used" (`gzip.py`, line 191). *\[from the docs\]* So the header carries the time of each run, and the bytes change with it. *\[reconstruction\]* The fix, against `tarball.py` lines 27–28 and 134:

     import fnmatch
    +import gzip
     import os
     …
    -    with tarfile.open(output_path, "w:gz", compresslevel=6) as tar:
    +    with gzip.GzipFile(output_path, "wb", compresslevel=6, mtime=0) as gz, \
    +         tarfile.open(fileobj=gz, mode="w") as tar:

Then a project whose files and file times are unchanged tars to the same bytes, and a plaintext hash could show that nothing changed. *\[reconstruction\]* `backup.py`, beside it, hashes only the encrypted parts (line 160). *\[from the tree\]*

## 07 · Logs and JSON Lines

A log is a stream of similar records, and its repetition lies between lines. A compressor sees only the block in front of it. So block size sets the ratio more than the codec does, and the way the log is read sets the block.

### Block size before codec

Two logs of about 6 MB were cut into blocks of 1 KiB to 4 MiB, each compressed alone: a JSONL audit log from a doomfly training run on this machine (1,915 lines) and a synthetic nginx-format access log (28,148 lines). *\[measured here\]* On the audit log, zstd 3 climbs from 2.08× in 1 KiB blocks to 8.68× in 1 MiB blocks, 4.2-fold (8.6839 ÷ 2.0802). At 1 KiB the four codecs lie within 15% of one another, 1.87× to 2.14× (Figure 10). *\[measured here\]*

**Figure 10. Ratio against block size: four codecs, two 6 MB logs**

![Two line charts of compression ratio, original bytes divided by compressed bytes, against block size from 1 KiB to 4 MiB in steps of four, plus the whole file as one block, for gzip -6, zstd 3, zstd 19 and xz -6, each block compressed alone; a dashed line marks 256 kB. Values at 1, 4, 16, 64 and 256 KiB, 1 and 4 MiB, then whole. The doomfly audit log, 6,123,015 bytes of JSONL: gzip -6 2.13, 2.88, 5.48, 7.26, 8.00, 8.23, 8.28, whole 8.29; zstd 3 2.08, 2.81, 5.68, 7.99, 7.93, 8.68, 8.60, whole 8.57; zstd 19 2.14, 2.92, 6.14, 8.83, 10.07, 10.47, 10.62, whole 10.65; xz -6 1.87, 2.85, 6.19, 8.84, 9.84, 10.08, 10.15, whole 10.15. For comparison, DuckDB's published zstd row on an unnamed dataset, 1 kB to 1 MB: 1.72, 2.1, 2.21, 2.41, 2.54, 2.73. The synthetic access log, 6,000,088 bytes: gzip -6 2.12, 3.73, 5.66, 6.93, 7.43, 7.57, 7.60, whole 7.61; zstd 3 2.14, 3.57, 5.28, 6.31, 6.68, 7.04, 7.20, whole 7.25; zstd 19 2.17, 3.84, 6.09, 7.81, 8.82, 9.65, 10.29, whole 10.58; xz -6 1.93, 3.71, 6.15, 8.06, 9.15, 9.90, 10.38, whole 10.57. At 1 KiB every codec on either log is between 1.87 and 2.17; by 1 MiB they spread from 7.04 to 10.47.](2026-10-15-what-each-file-wants/fig-10-blocks.svg)

*\[measured here\]* Most of the ratio arrives by 256 KiB. From `_numbers.json → logs.blocks`: each block is an independent gzip member, zstd frame or xz stream, cut at a byte offset; "whole" is the file as one block. Dashed black: DuckDB's published zstd row, on its own unnamed data and in kB, drawn for shape only. *\[from the docs\]*

DuckDB's "Lightweight Compression in DuckDB" (Mark Raasveldt, 28 October 2022) shows a flatter zstd curve and concludes: "To achieve a good compression ratio, blocks of at least 256 kB must be used." *\[from the docs\]* Here, at 256 KiB every codec reaches at least 92% of its whole-file ratio on the audit log; on the access log zstd 19 and xz -6 gain another 20% and 15.5% by the whole file, gzip -6 only 2.5%. *\[measured here\]* DEFLATE refers back at most 32K bytes (RFC 1951 §2); *\[from the spec\]* xz -6 keeps an 8 MiB dictionary (`xz(1)`). *\[from the docs\]*

One result runs backwards: zstd 3 in 1 MiB blocks (705,098 bytes) beats one frame of the whole audit log (714,867), and forcing `window_log` 18 instead of level 3's default 21 beats both (691,857). *\[measured here\]*

doomfly writes this audit to hourly gzip files through Python's `gzip.open` (`doom/archive.py`, lines 1 and 20). *\[from the tree\]* This run's archive is 717,390 bytes, 8.54× (6,123,015 ÷ 717,390); the gzip header's extra-flags byte (RFC 1952 §2.3.1) marks level 9. *\[measured here\]*

### Random access: seekable frames

To read one record, a reader decompresses its whole block. zstd's contrib Seekable Format (version 0.1.0) compresses frames independently and appends a seek table in a skippable frame, so plain zstd decoders still read the file. *\[from the spec\]* Its README advises a maximum frame size near the usual read size. *\[from the docs\]*

In the harness's files the seek table is 17 bytes plus 8 per frame, at most 0.13% of the output; frame size costs more. Against one frame at zstd 3, 64 KiB frames add 7.4% (audit) and 14.9% (access), 1 MiB frames −1.4% and +3.0%; at zstd 19, 64 KiB frames add 20.8% and 35.6%. All 200 random 1 KiB reads matched. A read took under 0.1 ms with 64 KiB frames and about 1 ms with 1 MiB frames, the whole file about 10 ms (tiers). *\[measured here\]* So: zstd 3 in 1 MiB frames with a seek table, at most 3% over one frame here; zstd 19 for cold logs. *\[reconstruction\]*

### What log stores do

Specialised compressors parse the records first. CLP ("CLP: Efficient and Scalable Search on Compressed Text Logs", OSDI 2021) splits messages into log types, variables and timestamps, and reports "2x of Gzip". μSlope ("μSlope: High Compression and Fast Search on Semi-Structured Logs", OSDI 2024) brings this to JSON logs: 21.9:1 to 186.8:1, "2.34x as high as Zstandard". *\[from the docs\]*

General log stores use stock codecs. Grafana Loki gzips chunks by default, each aimed at 1.5 MB compressed, which takes 7.5–10 MB of raw log. Elasticsearch uses LZ4 by default; `best_compression` has meant zstd since 8.16.0 (PR \#112665), and `logsdb` mode defaults to it. *\[from the docs\]*

### Agent transcripts

Agent transcripts are JSONL logs too (Figure 11). *\[from the docs\]* Codex's compressor pull request states the rule: "The key invariant is that writers append to plain `.jsonl`." (PR \#25089, merged 1 June 2026) *\[from the docs\]* No transcript was opened here. Given the 1 MiB frame costs above, a transcript can be appended plain and rewritten as seekable frames once cold. *\[reconstruction\]* Shortening the conversation itself is another matter ([Compacting a conversation](2026-10-15-what-compression-keeps.md#11-compacting-a-conversation)).

**Figure 11. What three agent CLIs do with their transcripts, 9 October 2026**

- **Claude Code**: Plaintext JSONL, one file per session under ~/.claude/projects/ , kept 30 days by default ( cleanupPeriodDays ). The docs mention no compression.
- **Codex CLI**: Appends plain .jsonl . Rewriting rollouts older than 7 days as .jsonl.zst at zstd 3 ( codex-rs/rollout/src/compression.rs , lines 363–364) sits behind local_thread_store_compression , under development and off by default ( codex-rs/features/src/lib.rs , lines 1268–1271). Request bodies: zstd 3 by default, only with ChatGPT sign-in and the OpenAI provider ( codex-rs/core/src/client.rs , lines 1690–1698).
- **Gemini CLI**: Appends JSON.stringify(record) + '\n' with fs.appendFileSync ( chatRecordingService.ts , lines 814 and 947–949). A search of that file finds no compression call.

None of the three compresses transcripts by default. *\[from the docs\]* Claude Code's docs, and Codex and Gemini CLI source on main, read 9 October 2026; latest stable releases Codex rust-v0.162.1 and Gemini CLI v0.63.0. Blue: stored plain, no compression path found. Orange: a transcript compressor exists, off by default.

## 08 · Tables: let the format do the work

For tabular data, encoding beats compression. A columnar format stores each column apart and writes repeated values as small integers before any codec runs. *\[from the spec\]* The codec squeezes what is left. On one million rows, Parquet with dictionary encoding and zstd 3 came out 35.2% smaller than gzipped CSV (36,348,082 ÷ 23,543,373 = 1.54). *\[measured here\]*

### One table, 26 files

The table is a synthetic clickstream from `make_table` in `_compute.py` (lines 1325–1367, seed 20261013): 1,000,000 rows of 14 columns. *\[from the tree\]* pyarrow 26.0.0 wrote it as CSV, as Parquet under seven codec settings with dictionary encoding on and off plus four encoding variants, and as Arrow IPC. Every Parquet and Arrow file read back equal to the original. DuckDB is not installed here, so its native format was not measured. *\[measured here\]*

gzip -6 takes the 124,514,710-byte CSV to 36,348,082 bytes, zstd 19 to 30,525,434. Parquet with dictionary encoding and no codec is 38,643,059 bytes, 6.3% more than gzipped CSV; add a codec and it wins: 32,598,232 bytes with snappy, pyarrow's default, and 23,543,373 with zstd 3. *\[measured here\]* Full reads fall into three tiers and nothing finer, since the CPU quota throttled 754 of 872 periods in this phase (Figure 12). *\[measured here\]*

**Figure 12. One million rows, 26 files: megabytes on disk and full-read tier**

![Horizontal bar chart on one linear axis from 0 to 130 MB, where 1 MB is 10 to the 6 bytes: one synthetic table of 1,000,000 rows and 14 columns stored 26 ways. CSV: no codec 124.5 MB; gzip -6 36.3; zstd 3 37.8; zstd 19 30.5; a full read takes about 1 second. Parquet from pyarrow 26.0.0, with dictionary encoding on and then off: no codec 38.6 and 115.2; snappy, pyarrow's default, 32.6 and 47.0; LZ4_RAW 33.3 and 49.1; gzip 24.7 and 27.5; zstd 1 23.8 and 30.1; zstd 3 23.5 and 29.8; zstd 9 23.1 and 26.4; zstd 3 with DELTA_BINARY_PACKED on ts and user_id 22.8, the smallest file; zstd 3 with BYTE_STREAM_SPLIT on price and latency_ms 28.2; a tuned layout with an encoding per column 26.9 at zstd 3 and 26.7 at zstd 9; full reads take 0.2 to 0.5 seconds. Arrow IPC: uncompressed 127.7 and LZ4, Feather's default, 67.9, both read in under 0.1 seconds; zstd at Arrow's default level 1 44.6 and at level 3 43.7, read in 0.2 to 0.5 seconds. A dashed line marks CSV with gzip -6. Grey is CSV without a codec, blue CSV with a codec, green Parquet with dictionary encoding, a dashed green outline Parquet without it, purple Arrow IPC.](2026-10-15-what-each-file-wants/fig-12-tables.svg)

*\[measured here\]* From `tables.files`; read tiers come from medians of five full reads into Arrow. With dictionary encoding on, Parquet under every codec is smaller than gzipped CSV (dashed line); with it off, snappy and LZ4_RAW are not.

### The encoding does the work

The Parquet specification says it in two sentences: "The dictionary will be stored in a dictionary page per column chunk. The values are stored as integers using the RLE/Bit-Packing Hybrid encoding." (`Encodings.md`, Dictionary Encoding) *\[from the spec\]* Figure 13 follows one column through.

**Figure 13. Inside one Parquet column chunk: encoding first, codec second**

![Diagram of one Parquet column chunk: the device column, 1,000,000 rows with four distinct values. Step 1: the values as written, PLAIN encoding, 10,462,644 bytes. A thin blue data arrow, dictionary encoding, leads to step 2: a dictionary page listing desktop, mobile, tablet and bot as 0 to 3, and data pages of indices stored with the RLE and bit-packing hybrid at 2 bits each, 254,725 bytes. A thin blue arrow, page codec, leads to step 3: each page compressed alone with zstd 3, the encodings and codec recorded in the chunk metadata, 182,822 bytes. Below, three other encodings and what they did here: DELTA_BINARY_PACKED for integers and timestamps, file 3.1% smaller on ts and user_id; DELTA_BYTE_ARRAY, front coding of strings, session_id chunk 4.6% smaller; BYTE_STREAM_SPLIT for floats ahead of a codec, file 19.7% larger on price and latency_ms. Grey marks values as written, green Parquet's own encodings, blue the general-purpose codec.](2026-10-15-what-each-file-wants/fig-13-parquet.svg)

The encoding shrinks the chunk 41-fold; zstd then removes 28% of what is left. *\[measured here\]* Chunk bytes from `tables.parquet_columns`, file bytes from `tables.files`; percentages against the dictionary file at zstd 3. Sample values are illustrative. Four values need 2-bit indices, and a million of them make 250,000 bytes, close to the measured 254,725. *\[reconstruction\]*

In the six columns with few distinct values (event, region, status, country, device, referrer), dictionary encoding alone takes 66,183,361 bytes to 2,233,301; zstd 3 alone reaches 6,529,647; both together, 1,976,187. On `referrer` the codec adds 434 bytes. *\[measured here\]* Once a column is small integers, a general-purpose codec finds little left. *\[reconstruction\]*

Other columns want other encodings. DELTA_BINARY_PACKED on the timestamp and `user_id` made the smallest file, 22,802,779 bytes, 3.1% under the dictionary file. *\[measured here\]* BYTE_STREAM_SPLIT "does not reduce the size of the data but can lead to a significantly better compression ratio and speed when a compression algorithm is used afterwards" (`Encodings.md`, Byte Stream Split). *\[from the spec\]* Here it did the reverse: on the two floats it grew the file 19.7%, and the harness's tuned layout, an encoding per column chosen by type and cardinality, ended 14.1% larger than plain dictionary encoding. *\[measured here\]* These floats are independent lognormal draws, not a slowly changing series. *\[from the tree\]* ALP, Parquet encoding 10, aims at decimal-like doubles such as prices and entered parquet-format 2.14.0 on 11 September 2026 as Preview; this bench did not test it. *\[from the spec\]* Over half the file, 53.7%, is `session_id`: random ids, which the best encoding tried here cut by only 4.6%. *\[measured here\]*

### Who picks the codec

Writers differ. pyarrow, DuckDB's `COPY` and Spark write Parquet with snappy; Polars writes zstd. ORC has defaulted to ZSTD at level 3 since 2.0.0 (8 March 2024); Feather V2 defaults to LZ4 when available. *\[from the docs\]* Parquet's legacy `LZ4` codec adds "an additional undocumented framing scheme" (`Compression.md`, LZ4); write `LZ4_RAW`. *\[from the spec\]*

Engines choose per column or per segment. DuckDB picks lightweight encodings per column segment, has had ALP since 0.10.0, and since 1.2.0 considers zstd for strings over 4,096 characters. *\[from the docs\]* ClickHouse sets codec chains per column, such as `CODEC(Delta, Default)`; its ZSTD defaults to level 1, and its ALP codec became beta in 26.9. *\[from the docs\]* The authors of "ALP: Adaptive Lossless floating-Point Compression" (PACMMOD 1(4), presented at SIGMOD ’24) report that zstd at level 3 "slightly takes the upper hand in compression ratio" but is "slow and block-based (one cannot skip through compressed data)". *\[from the docs\]*

PostgreSQL's TOAST instead compresses field values one at a time once a row passes about 2 kB ([What a database does with JSON](2026-10-15-where-the-json-lives.md#07-what-a-database-does-with-json)); its default moves from pglz to lz4, where built in, in PostgreSQL 19 (Beta 4, 24 September 2026). *\[from the docs\]*

Snappy cost 38% more bytes than zstd 3 here, and zstd 9 was only 1.9% smaller. *\[measured here\]* So: write Parquet, keep dictionary encoding on, and set zstd 3. Try delta encoding on timestamps and ids; measure before splitting floats. Use Arrow IPC between processes and Parquet at rest. A new codec reaches old files only when they are rewritten ([Compaction](2026-10-15-what-compression-keeps.md#10-compaction-keeping-only-the-present)). *\[reconstruction\]*

## 09 · Images

An image file has already been through an entropy coder, so the choice is the codec and how much to lose. At an equal perceptual score, AVIF and JPEG XL took about a third fewer bytes than JPEG on three photographs. Losslessly, the winner changed with the picture.

### Five images, one score

The photographs are three 768×512 Kodak scans: kodim05 (motorcycles, dense detail), kodim15 (a portrait) and kodim23 (parrots). Two MIT-licensed PNGs stand for graphics: the xo-space dashboard screenshot and doomfly's pixel-art fly (licences in [the bench](#02-how-the-measurements-were-made)). JPEG is Pillow 12.3.0's libjpeg-turbo 3.1.4.1 with optimised Huffman tables, not mozjpeg or jpegli; WebP is libwebp 1.6.0 at method 4; AVIF is libavif 1.4.2 with libaom 3.14.1 at speed 6; JPEG XL is `cjxl` 0.12.0 at effort 7. *\[measured here\]*

Each photograph was encoded across a sweep of settings, decoded and scored against its source with SSIMULACRA 2; bytes at a target score are interpolated between the two settings that bracket it. *\[measured here\]* The tool's usage text calls 80 "very high quality" and 90 "visually lossless". *\[from the docs\]* It is a model of perception ([Throwing away what nobody sees](2026-10-15-what-compression-keeps.md#07-throwing-away-what-nobody-sees)). *\[reconstruction\]*

### Lossy: match the score, not the setting

At a score of 80, summed over the three photographs, JPEG 4:2:0 took 261,399 bytes, WebP 221,745 (−15.2%), JPEG XL 178,764 (−31.6%) and AVIF 171,173 (−34.5%). JPEG 4:4:4 took 256,131 (−2.0%). *\[measured here\]* AVIF led at every target from 60 to 80; at 85 JPEG XL led, −33.4% against AVIF's −30.1%. *\[measured here\]*

**Figure 14. Bytes at equal quality: three photographs at SSIMULACRA 2 = 80, and five images losslessly**

![Two panels of horizontal bars; each bar is bytes as a share of the first bar in its group. Left, lossy: bytes at an SSIMULACRA 2 score of 80, interpolated, for three Kodak photographs. kodim05, motorcycles, dense detail: JPEG 4:2:0 123,592 bytes, WebP 103,261 bytes (minus 16.5%), AVIF 85,280 bytes (minus 31.0%), JPEG XL 96,871 bytes (minus 21.6%); kodim15, portrait, smooth skin: JPEG 4:2:0 88,132 bytes, WebP 71,556 bytes (minus 18.8%), AVIF 53,943 bytes (minus 38.8%), JPEG XL 51,564 bytes (minus 41.5%); kodim23, parrots, saturated colour: JPEG 4:2:0 49,675 bytes, WebP 46,928 bytes (minus 5.5%), AVIF 31,950 bytes (minus 35.7%), JPEG XL 30,329 bytes (minus 38.9%); All three, summed: JPEG 4:2:0 261,399 bytes, WebP 221,745 bytes (minus 15.2%), AVIF 171,173 bytes (minus 34.5%), JPEG XL 178,764 bytes (minus 31.6%). Right, lossless, every output decoded pixel-identical to the source, WebP at method 6 quality 100 and JPEG XL at effort 9: kodim05, photograph: PNG as found 785,610 bytes, oxipng -o 4 754,856 bytes (minus 3.9%), WebP lossless 556,352 bytes (minus 29.2%), JPEG XL -d 0 485,061 bytes (minus 38.3%); kodim15, photograph: PNG as found 612,582 bytes, oxipng -o 4 575,752 bytes (minus 6.0%), WebP lossless 427,336 bytes (minus 30.2%), JPEG XL -d 0 382,926 bytes (minus 37.5%); kodim23, photograph: PNG as found 557,596 bytes, oxipng -o 4 537,426 bytes (minus 3.6%), WebP lossless 422,106 bytes (minus 24.3%), JPEG XL -d 0 372,255 bytes (minus 33.2%); xo-space dashboard, screenshot: PNG as found 390,623 bytes, oxipng -o 4 233,940 bytes (minus 40.1%), WebP lossless 155,468 bytes (minus 60.2%), JPEG XL -d 0 243,126 bytes (minus 37.8%); doomfly pixel-art fly, graphic: PNG as found 756,305 bytes, oxipng -o 4 546,880 bytes (minus 27.7%), WebP lossless 425,432 bytes (minus 43.8%), JPEG XL -d 0 323,213 bytes (minus 57.3%). AVIF is smallest on the dense photograph, JPEG XL on the other two; losslessly JPEG XL is smallest except on the screenshot, where lossless WebP is.](2026-10-15-what-each-file-wants/fig-14-images.svg)

*\[measured here\]* From `_numbers.json → images`; lossy bytes interpolated to the score, lossless outputs decoded and checked pixel for pixel. No format was smallest on every image, lossy or lossless.

The sum hides the pictures: AVIF won on the motorcycles, JPEG XL narrowly on the portrait and the parrots (Figure 14). *\[measured here\]* Only JPEG 4:4:4 and JPEG XL reached a score of 90 on all three photographs; JPEG 4:2:0, WebP and AVIF each missed it on at least one. *\[measured here\]* There JPEG XL took 368,296 bytes to JPEG 4:4:4's 568,619, 35.2% fewer. *\[measured here\]*

The quality number does not transfer. To reach 80, JPEG 4:2:0 needed quality 80 to 85 on two photographs and 85 to 90 on the portrait; AVIF needed 60 to 75; `cjxl` needed distance 1.0 to 2.5. *\[measured here\]* Choose the setting by scoring your own images. *\[reconstruction\]*

Encoding cost differs by tiers. On kodim05, JPEG ran at 10 MP/s or more, WebP and `cjxl` at 1 to 10 MP/s (the latter timed with process start), and AVIF at 0.1 to 1 MP/s. *\[measured here\]* Cloudflare's image service warns that "AVIF encoding can be an order of magnitude slower than encoding to other formats". *\[from the docs\]*

### Lossless: it depends on the picture

On the photographs, JPEG XL at `-d 0`, effort 9, cut the PNGs as distributed by 33.2 to 38.3%; lossless WebP at maximum effort by 24.3 to 30.2%; oxipng `-o 4` by 3.6 to 6.0%. *\[measured here\]* PNG compression is DEFLATE with a window of at most 32,768 bytes (PNG Third Edition §10.1). *\[from the spec\]* oxipng re-runs the filters and DEFLATE but cannot change the coder. *\[reconstruction\]* On the screenshot the order flipped: lossless WebP −60.2%, oxipng −40.1%, JPEG XL −37.8%. On the pixel-art fly JPEG XL led again, −57.3% to WebP's −43.8%. *\[measured here\]* Decoding speed was not measured; in Mozilla's intent-to-ship thread a developer reported lossless JPEG XL decoding 15 to 20 times slower than lossless WebP, for files about 10% smaller. *\[from the docs\]*

### JPEG to JPEG XL, reversibly

Given a JPEG, `cjxl` recompresses it losslessly by default and `djxl` rebuilds the original file (libjxl README). *\[from the docs\]* WebKit's Safari 17.0 notes claim "an average of 20%", on an unstated corpus. *\[from the docs\]* Six JPEGs, this site's three and Pillow quality-90 encodes of the Kodak photographs, went from 613,829 to 499,958 bytes, 18.6%; every rebuilt file matched its original's SHA-256. *\[measured here\]* This site's `og.jpg`, carrying T.81 Annex K's example Huffman tables, saved 32.8%; Pillow's encodes, with tables fitted to each image, saved 13.2 to 14.8%. *\[measured here\]* Unoptimised JPEGs have the most to give back. *\[reconstruction\]*

### Where they decode

WebP and AVIF decode in all four major browsers. On 6 October 2026 Chrome 155 began decoding JPEG XL by default, through jxl-rs, a Rust decoder. *\[from the docs\]* Figure 15 has the versions.

**Figure 15. Where each newer image format decodes, as of 9 October 2026**

| Format | Chrome | Edge | Firefox | Safari |
|----|----|----|----|----|
| WebP | 32+ | 18+ | 65+ | 16.0+; 14 to 15.6 need macOS 11 |
| AVIF | 85+ | 121+ | 93+; animation from 113 | 16.4+; 16.1 to 16.3 partial |
| JPEG XL | 155+, by default from 6 October 2026 | no through 154; later not verified | 158, scheduled for 13 October 2026 | 17.0+, partial: no animation, no progressive decoding |

WebP and AVIF decode everywhere; JPEG XL still needs a fallback. *\[from the docs\]* Read from caniuse, chromiumdash and whattrainisitnow on 9 October 2026; Edge's WebP entry from caniuse on 12 October. Green: on by default; orange: partial; blue: scheduled; untinted: no. Mozilla's product-details feed gave its next release date as 23 October, so the Firefox date is not certain.

WebKit's post uses `<picture>` "to provide JPEG XL files to browsers that have support"; Cloudflare's `format=auto` picks from the `Accept` header, and its documented outputs omit JPEG XL. *\[from the docs\]*

### On the wire

Unlike the raster formats ([Already compressed](#12-already-compressed-leave-it)), SVG is text: Vercel's compression allowlist names `svg+xml` and leaves out JPEG, PNG and WebP. *\[from the docs\]* This site's 22 SVGs, 59,258 bytes, compress file by file to 16,583 bytes under gzip -9 (3.57×) and 13,542 under brotli 11 (4.38×). *\[measured here\]*

For photographs, encode AVIF or JPEG XL from the lossless master at a measured score, with JPEG or WebP as the fallback. Move JPEG archives to JPEG XL losslessly; it can be undone. For graphics, keep the smaller of lossless WebP and JPEG XL, or run oxipng if the file must stay PNG. Serve SVG with brotli. *\[reconstruction\]*

## 10 · Audio

Audio wants FLAC for the master and Opus for listening. FLAC keeps every sample and roughly halves a WAV. Opus keeps what a perceptual model says matters and is 12 to 45 times smaller than the WAV. FLAC level 5 is within 0.4% of level 8; the Opus bitrate is the decision. *\[measured here\]*

### Lossless: FLAC, level 5 or above

FLAC is RFC 9639 (Standards Track, December 2024). Unlike general-purpose compressors, it "removes redundancy solely in the very short term, looking back at 32 samples at most" (§1). *\[from the spec\]*

The clip is the Sintel trailer soundtrack ([How the measurements were made](#02-how-the-measurements-were-made)): 52.0 s of 48 kHz 16-bit stereo, 9,984,000 bytes of PCM (52.0 × 48,000 × 2 × 2). FFmpeg's native FLAC encoder reaches 1.95× at level 0, 2.13× at 5 and 2.14× at 8. Level 8 is 0.39% smaller than level 5; level 0 is 9.6% larger than level 8. ALAC reaches 2.05×. Every lossless file decodes to PCM byte-identical to the source (Figure 16). *\[measured here\]* libFLAC's `flac` tool may give other bytes at the same levels. *\[reconstruction\]*

**Figure 16. 52 seconds of stereo audio, eleven ways: bytes per encoding**

![Horizontal bar chart of file size for one 52.0 second, 48 kHz, 16-bit stereo clip, the Sintel trailer soundtrack, in eleven encodings; bar length is linear in bytes. Lossless, each decoding to PCM identical to the source: WAV 9,984,044 bytes at 1,536 kb/s, 1.00 times; FLAC level 0 5,112,869 bytes, 786.6 kb/s, 1.95 times smaller than WAV; FLAC level 5 4,682,283 bytes, 720.4 kb/s, 2.13 times; FLAC level 8 4,663,924 bytes, 717.5 kb/s, 2.14 times; ALAC 4,862,823 bytes, 748.1 kb/s, 2.05 times. Lossy, bytes only with no quality metric: Opus 32k 219,693 bytes, 33.8 kb/s, 45.45 times; Opus 64k 422,240 bytes, 65.0 kb/s, 23.65 times; Opus 96k 636,816 bytes, 98.0 kb/s, 15.68 times; Opus 128k 848,818 bytes, 130.6 kb/s, 11.76 times; AAC 128k 849,338 bytes, 130.7 kb/s, 11.76 times; MP3 128k 832,916 bytes, 128.1 kb/s, 11.99 times. Xiph recommends Opus at 32 kb/s for stereo podcasts, 64 to 96 for music streaming and 96 to 128 for music storage.](2026-10-15-what-each-file-wants/fig-16-audio.svg)

FLAC's levels span 9.6%, the lossy files 3.9×. Bytes from `_numbers.json → audio.rows`; kb/s is file bytes × 8 ÷ 52.0 s ÷ 1,000, so the VBR Opus files, in Ogg, run 1.5–5.6% over the requested rate; × is WAV bytes ÷ file bytes. With no perceptual metric, the blue bars say nothing about quality. *\[measured here\]* The use labels are Xiph's. *\[from the docs\]*

### Lossy: Opus, at the rate the use needs

Opus is RFC 6716 (September 2012), updated by RFC 8251 (October 2017). It "scales from low bitrate narrowband speech at 6 kbit/s to very high quality stereo music at 510 kbit/s". *\[from the spec\]* The FFmpeg build used here reports its libopus as "unknown". *\[measured here\]*

Xiph recommends 24 kb/s mono or 32 stereo for podcasts, 64–96 for music streaming and 96–128 for music storage, where "Opus at 128 KB/s (VBR) is pretty much transparent". For archiving: "Use FLAC". *\[from the docs\]* FFmpeg's wiki is stricter: libopus is "Very close at default (96 Kbps), but takes more (160+) to be real transparent". *\[from the docs\]* At 96k the file is 15.68× smaller than the WAV and 7.3× smaller than FLAC 8 (4,663,924 ÷ 636,816). *\[measured here\]*

At 128 kb/s, Opus, FFmpeg's native AAC and LAME's MP3 land within 2% of one another in bytes (849,338 ÷ 832,916). The bitrate sets the bytes; what separates the three is the sound, and no perceptual audio metric (ViSQOL, PEAQ) was available here to score it. *\[measured here\]* Xiph says that at 64–96 kb/s "Opus has better quality than MP3, AAC and Vorbis at these rates". *\[from the docs\]*

### What to do

Do not gzip or zstd either: zstd 19 grew the Opus file and saved 0.761% of FLAC 8, some of it padding ([Already compressed: leave it](#12-already-compressed-leave-it)). *\[measured here\]*

Keep the master as FLAC at level 5 or above. Cut Opus copies from it, 24–32 kb/s for speech and 96–128 for music, and use AAC or MP3 only where a player lacks Opus. *\[reconstruction\]* FFmpeg's wiki says to "Transcode to lossy from the lossless source (if you have it)"; under "Generation loss" it warns that lossy to lossy "might degrade the audio quality even if the bit rate stays the same (or higher)". *\[from the docs\]* The theory is in [Throwing away what nobody sees](2026-10-15-what-compression-keeps.md#07-throwing-away-what-nobody-sees).

## 11 · Video

Ten seconds of raw 1080p video took 746.5 MB; x264 at its defaults stored it in 3.76 MB. The choice is the encoder, its preset and its quality. On one clip, x265 and SVT-AV1 needed 35–39% fewer bits than x264 for the same VMAF, and at one point SVT-AV1's slower preset 4 needed 34.3% fewer bits than its default preset 8. The container, and any gzip around it, move almost nothing. *\[measured here\]*

### One clip, three encoders

The clip is frames 480–719 of Xiph's 1080p24 Sintel trailer: computer animation, letterboxed to 2.35:1, 8-bit 4:2:0 ([How the measurements were made](#02-how-the-measurements-were-made)). x264 and x265 ran at preset medium and SVT-AV1 at its default preset 8, four CRFs each (constant rate factor: each encoder's constant-quality setting, where lower means higher quality and more bits; the scales differ between encoders) *\[from the docs\]*, all else at defaults; VP9 was not run. VMAF is FFmpeg's default model, `vmaf_v0.6.1`, averaged over all 240 frames; the VMAF v1 models were not run. *\[measured here\]* What VMAF and BD-rate measure is in [Throwing away what nobody sees](2026-10-15-what-compression-keeps.md#07-throwing-away-what-nobody-sees).

BD-rate follows draft-ietf-netvc-testing-09 §4.2: a piecewise cubic Hermite fit of log-rate against quality, integrated by the trapezoidal rule over at least 1,000 samples. For different codecs the draft bounds the range with a third, anchor codec. It asks for at least four points per codec. *\[from the spec\]* Each encoder here has four. With no anchor, the range is the VMAF both curves cover; against x264, three points of each curve fall inside it. x265 needed 39.09% fewer bits than x264, and SVT-AV1 at preset 8 needed 34.56% fewer. SVT-AV1 against x265 is withheld: only two of its points fall inside x265's range, CRF 55 missing it by 0.007 VMAF. The saving shrinks as quality rises: x265's from 41.6% at VMAF 90 to 35.7% at 95, preset 8's from 39.9% to 28.3%, below x265's at each level (Figure 17). *\[measured here\]*

**Figure 17. Rate against quality on one 10 s clip: three encoders, and two more SVT-AV1 presets**

![Line chart of VMAF (model v0.6.1, mean of 240 frames) against video bitrate on a log scale from 400 to 6,400 kbps, for 10 seconds of the Sintel trailer at 1080p24. x264 preset medium: CRF 33, 1,056.7 kbps, VMAF 83.42; CRF 28, 1,731.0 kbps, VMAF 92.32; CRF 23, 3,006.5 kbps, VMAF 97.11; CRF 18, 5,518.4 kbps, VMAF 98.64. x265 preset medium: CRF 36, 481.4 kbps, VMAF 79.55; CRF 32, 754.4 kbps, VMAF 88.05; CRF 28, 1,204.7 kbps, VMAF 93.63; CRF 23, 2,184.7 kbps, VMAF 97.18. SVT-AV1 preset 8: CRF 55, 449.2 kbps, VMAF 79.55; CRF 45, 871.1 kbps, VMAF 89.59; CRF 35, 1,683.7 kbps, VMAF 94.99; CRF 25, 3,308.4 kbps, VMAF 97.49. Single points at CRF 35: SVT-AV1 preset 4, 1,341.7 kbps, VMAF 95.70; preset 10, 1,759.2 kbps, VMAF 93.58. Filled markers encoded at 10 frames per second or faster, hollow at 3 to 10: x264 CRF 18 to 28, all x265 points and preset 4 are hollow. BD-rate against x264: x265 minus 39.09%, SVT-AV1 preset 8 minus 34.56%; preset 8 against x265 withheld. Kbps at equal VMAF for x264, x265 and preset 8: at 90, 1,522.0, 888.5 and 915.3; at 93, 1,872.3, 1,142.5 and 1,320.7; at 95, 2,357.6, 1,515.7 and 1,689.7. At equal VMAF, preset 4 needs 21.3% fewer bits than x265 and 34.3% fewer than preset 8; preset 10 needs 24.1% more than preset 8.](2026-10-15-what-each-file-wants/fig-17-rd.svg)

*\[measured here\]* Where the curves overlap, every other encoder sits left of x264: fewer kbps at equal VMAF. From `video.encodes`, `video.bd_rate`, `video.kbps_at_vmaf` and `video.single_points_vs_curves`. One animated clip and one VMAF model; grain or live action could move every curve. Keyframe intervals are encoder defaults (250, 250 and 161 frames), and x264 chose 12 threads, which its bytes depend on.

On this clip, the preset mattered as much as the codec. At CRF 35, preset 4 scored VMAF 95.70 at 1,341.7 kbps: 34.3% fewer bits than preset 8 needs for that VMAF and 21.3% fewer than x265, in x265's speed tier of 3–10 fps. Preset 10 cost 24.1% more bits than 8. These are single points against interpolated curves, not BD-rates. *\[measured here\]*

Defaults are not equal quality. The FFmpeg wiki says x265's default CRF 28 "should visually correspond to libx264 video at CRF 23, but result in about half the file size". *\[from the docs\]* Here that file is 40.2% of x264's bytes but scores VMAF 93.63 against 97.11. x265 matches x264's CRF 23 at its own CRF 23 (97.18), with 27.3% fewer kbps. *\[measured here\]* Figure 18 therefore compares settings, not codecs.

### The wrapper is not the video

Rewrapping the x264 CRF 23 file from MP4 to Matroska changed it by 811 bytes and left the H.264 stream byte-identical. The MP4's boxes are 3,437 bytes; zstd 19 saved 2,581 bytes of the file, gzip -9 1,788 ([Already compressed: leave it](#12-already-compressed-leave-it)). *\[measured here\]* FFmpeg's manual (§3.1) says streamcopy neither decodes nor encodes, so it loses no quality. *\[from the docs\]*

**Figure 18. The same 10 s clip: three encoders' defaults, one slower preset, and the wrapper**

- **3.76 MB** · x264 CRF 23, medium: VMAF 97.11, 3–10 fps
- **1.51 MB** · x265 CRF 28, medium: VMAF 93.63, 3–10 fps
- **2.11 MB** · SVT-AV1 CRF 35, preset 8: VMAF 94.99, ≥ 10 fps
- **1.68 MB** · SVT-AV1 CRF 35, preset 4: VMAF 95.70, 3–10 fps
- **198×** · raw Y4M ÷ x264 file
- **−811 B** · MP4 → Matroska; H.264 stream unchanged
- **0.069%** · zstd 19 on the x264 MP4 (gzip -9: 0.048%)
- **0.09%** · MP4 boxes in the x264 file

*\[measured here\]* The defaults land at different qualities; the wrapper costs under 0.1%. From `video.encodes`, `video.remux` and `corpora`; MB is 10⁶ bytes. The first three are defaults, each run three times, byte-identical. Speeds are tiers.

### Six codecs, October 2026

Figure 19's claimed savings come from "Overview of the High Efficiency Video Coding (HEVC) Standard" (IEEE TCSVT, 2012), "Overview of the Versatile Video Coding (VVC) Standard and its Applications" (IEEE TCSVT, 2021), "A Technical Overview of AV1" (Proceedings of the IEEE, 2021) and AOMedia (27 July 2026). *\[from the docs\]* Netflix wrote on 5 March 2018 that the 50% claimed per generation "never quite materialized"; the best estimate "is closer to 40%". *\[from the docs\]*

AV2 is specified but not yet usable: v1.0.0 is dated 28 May 2026 *\[from the docs\]*, and on 9 October 2026 FFmpeg's changelog did not mention it. *\[reconstruction\]* Access Advance acquired Via LA's HEVC/VVC programme on 15 December 2025. Via LA's AVC licence lists streaming fees of up to \$4.5 million a year, though MDN says free-to-viewer AVC streaming owes none. *\[from the docs\]*

**Figure 19. Video codecs on 9 October 2026: standard, claimed saving, licensing, decoding, encoder**

| Codec | Standard | Claimed · saving | Licensing | Decoding | Newest encoder |
|----|----|----|----|----|----|
| H.264 · AVC | ITU-T, ISO/IEC; 2003 | 50% vs MPEG-2 | Via LA; streaming fees up to \$4.5 M a year | browsers not checked; hardware rarely beyond 8-bit 4:2:0 | x264: no releases |
| HEVC · H.265 | ITU-T; 2013 | ~50% vs AVC | HEVC Advance; VCL Advance (ex-Via LA); VDP | Safari 13+; Chrome 107+, Edge and Firefox 137+ by platform or hardware | x265 4.2 tag, 19 April 2026; the bench's build reports 4.3+49 |
| VP9 | Google; 2013; spec "not final" | none; "quite competitive" | Sisvel, EUR 0.24 per display device; VDP | not checked | libvpx 1.17.0, August 2026 |
| AV1 | AOMedia; 2018 | \> 30% vs VP9 | AOMedia royalty-free licence; Sisvel, EUR 0.32 per display device; VDP | Chrome 70+, Firefox 67+, Edge 121+; Safari 17+ only with a hardware decoder | SVT-AV1 4.2.0, July 2026 |
| VVC · H.266 | ITU-T, ISO/IEC; 2020 | ~50% vs HEVC | VVC Advance; VCL Advance; VDP | no caniuse entry | VVenC 1.14.0, January 2026 |
| AV2 | AOMedia; v1.0.0, 28 May 2026 | ~30% vs AV1 | AOMedia royalty-free policy; no pool found | no caniuse entry or public hardware decoder | AVM reference; Intel showed SVT-AV2 |

*\[from the docs\]* Every codec but AV2 has a royalty-bearing pool; none newer than AV1 has browser data. Savings are developers' claims cited above (H.264's as Netflix recounted it), not measurements. Browsers per caniuse, 30 September 2026. Orange: some platforms or hardware only; red: no browser data; untinted: not checked. VDP: Access Advance's streaming pool. Newest encoder: the newest tagged release; static builds may run ahead of it.

### What to do

Netflix's Anne Aaron, in AOMedia's IBC 2026 release (September 2026), said AV1 "now powers over a third of our global VOD streaming". Netflix's film-grain synthesis cut average bitrate by 36% at 1080p and above on about 300 titles (2 July 2025). Meta puts AV1 at "\> 70% of global watch" (white paper, September 2025). *\[from the docs\]*

Keep the source. For storage and modern players, use SVT-AV1 at preset 4 to 6. *\[reconstruction\]* At its default preset 8 it needed more kbps than x265 medium at VMAF 90, 93 and 95; preset 6 was not run. *\[measured here\]* SVT-AV1's CommonQuestions.md calls presets 4–6 "a balance of efficiency and reasonable compute time". *\[from the docs\]* FFmpeg 9.0.2 still caps `-crf` at 63 (`libavcodec/libsvtav1.c`, lines 826–827), below SVT-AV1 4.0.0's own 1–70 scale. *\[from the docs\]* Give the web an H.264 fallback with `-movflags +faststart`. *\[reconstruction\]* Safari decodes AV1 only in hardware, and Meta calls hardware support limited in mid- and low-tier phone chips. Tag HEVC `hvc1` where Apple players demand it. *\[from the docs\]* For editing handoffs, the FFmpeg wiki calls x264 CRF 17–18 "visually lossless or nearly so". *\[from the docs\]* CRF 18 scored VMAF 98.64 here. *\[measured here\]* As commands, with CRF 30 my choice rather than a measured point: *\[reconstruction\]*

    ffmpeg -i master.mov -c:v libsvtav1 -preset 4 -crf 30 -movflags +faststart av1.mp4
    ffmpeg -i master.mov -c:v libx264 -crf 23 -pix_fmt yuv420p -movflags +faststart h264.mp4
    ffmpeg -i master.mov -c:v libx265 -crf 23 -tag:v hvc1 hevc.mp4
    ffmpeg -i in.mkv -map 0 -c copy out.mp4

## 12 · Already compressed: leave it

A JPEG, an MP4 or a `.zip` has already been through an entropy coder. Wrapping eleven such files in four general-purpose codecs found at most 4.66%; re-doing the inner coding found up to 41%. *\[measured here\]*

Figure 20 wraps eleven files in gzip -9, zstd 19, xz -9 and brotli 11. Five grew under all four, by 5 to 258 bytes; both MP4s changed by at most 0.069%. *\[measured here\]* A tar of five media files, 10,014,720 bytes, shrank 0.441% under zstd 19. *\[measured here\]* That is 44,131 bytes, less than the 45,345 that the five give up one by one (38,008) plus the tar's headers and padding (7,337): side by side, they share nothing zstd could use. *\[reconstruction\]*

**Figure 20. Compressing the already compressed: wrapped whole, or re-coded**

![Two panels. Panel A, eleven files and a tar of five media files compressed whole with gzip -9, zstd 19, xz -9 and brotli 11, saving as a percentage of the file, negative when it grew: JPEG, Pillow q90, 159,419 bytes: gzip -9 minus 0.017%, zstd 19 minus 0.009%, xz -9 minus 0.043%, brotli 11 minus 0.003%; PNG, Kodak kodim05, 785,610 bytes: gzip -9 minus 0.033%, zstd 19 minus 0.003%, xz -9 minus 0.012%, brotli 11 grew by 5 bytes; Opus, 96 kb/s, 636,816 bytes: gzip -9 minus 0.023%, zstd 19 minus 0.004%, xz -9 minus 0.014%, brotli 11 grew by 5 bytes; .zip, DEFLATE 6, 1,127,914 bytes: gzip -9 minus 0.021%, zstd 19 minus 0.003%, xz -9 minus 0.010%, brotli 11 grew by 5 bytes; .tar.gz, gzip -6, 1,127,742 bytes: gzip -9 minus 0.019%, zstd 19 minus 0.003%, xz -9 minus 0.010%, brotli 11 grew by 5 bytes; MP4, SVT-AV1 CRF 35, 2,106,647 bytes: gzip -9 0.026%, zstd 19 0.057%, xz -9 0.029%, brotli 11 grew by 8 bytes; MP4, x264 CRF 23, 3,761,614 bytes: gzip -9 0.048%, zstd 19 0.069%, xz -9 0.036%, brotli 11 grew by 13 bytes; tar of five media files, 10,014,720 bytes: zstd 19 0.441%, xz -9 0.407%; FLAC, level 8, 4,663,924 bytes: gzip -9 0.750%, zstd 19 0.761%, xz -9 0.728%, brotli 11 0.391%; PNG, xo-space screenshot, 390,623 bytes: gzip -9 0.837%, zstd 19 1.168%, xz -9 0.901%, brotli 11 1.117%; AAC 128 kb/s, .m4a, 849,338 bytes: gzip -9 1.467%, zstd 19 1.779%, xz -9 1.183%, brotli 11 1.988%; JPEG, og.jpg, 66,400 bytes: gzip -9 3.399%, zstd 19 4.182%, xz -9 3.904%, brotli 11 4.658%. Panel B, the inner coding re-done losslessly, saving on a scale from 0 to 45 percent: .zip to tar, xz -9 41.144% (best wrapped grew by 5 bytes); .tar.gz to tar, xz -9 41.135% (best wrapped grew by 5 bytes); screenshot, oxipng -o 4 40.111% (best wrapped 1.168%); Kodak PNG to JPEG XL 38.257% (best wrapped grew by 5 bytes); screenshot to JPEG XL 37.759% (best wrapped 1.168%); og.jpg to JPEG XL 32.756% (best wrapped 4.658%); Pillow JPEG to JPEG XL 13.209% (best wrapped minus 0.003%); Kodak PNG, oxipng -o 4 3.915% (best wrapped grew by 5 bytes). Wrapping never saved more than 4.658 percent; re-coding saved up to 41.144 percent.](2026-10-15-what-each-file-wants/fig-20-recompress.svg)

*\[measured here\]* From `_numbers.json → recompress`. Saving is (original − compressed) / original, negative when the file grew; growth under 0.001% is in bytes. The tar holds the Pillow JPEG, Kodak PNG, x264 MP4, Opus and FLAC files. Wrapping saved at most 4.658%; re-coding, up to 41.144%.

Each inner coder fits its code to its data: H.264's CABAC, AV1's CDF updates, DEFLATE's per-block Huffman trees in PNG. *\[from the docs\]* *\[from the spec\]* Its output looks [random](2026-10-15-what-compression-keeps.md#02-information-is-surprise) to the [next model](2026-10-15-what-compression-keeps.md#03-a-model-and-a-coder). *\[reconstruction\]*

Where a file gave up more, part of it was coded loosely. *\[reconstruction\]* This site's `og.jpg` carries T.81 Annex K's example Huffman tables; the Pillow JPEG's are fitted, and it grew. FFmpeg's FLAC muxer adds an 8,192-byte padding block; zstd 19 saves 0.587% of the audio frames alone, not 0.761%. The AAC and screenshot cases were not isolated. *\[measured here\]*

### Re-do the coding instead

Figure 20's panel B: re-coding saved 3.9% to 41.1%, beating wrapping on every file. *\[measured here\]* The image cases are in [Images](#09-images). The `.zip` and `.tar.gz` hold the same four text files, 7,473,011 bytes, two synthetic; re-packed as one tar under xz -9, both became 663,848 bytes, 41.1% smaller. *\[measured here\]*

Arrow's spec: "Double compression typically worsens performance and does not substantially improve compression ratios" (Columnar.rst, "Compression"). *\[from the spec\]* nginx's gzip module compresses only `text/html` by default ([Compression on the wire](2026-10-15-what-compression-keeps.md#08-compression-on-the-wire)), and Vercel's allowlist leaves out JPEG, PNG and WebP ([Images](#09-images)). *\[from the docs\]*

Store and serve media and archives as they are, without Content-Encoding; to shrink one, re-code it losslessly or re-encode from source ([Images](#09-images), [Video](#11-video)). *\[reconstruction\]*

## 13 · A practice that holds

Ten rules, each resting on a result above, then one row per kind of file in Figure 21. *\[reconstruction\]*

### Ten rules

**1. Decide by the data and its reads, not by a codec's fame.** zstd 3 wrote 5.7% more bytes than gzip -6 on `posts.json` and 24.5% fewer on the API records, and gave one audit log 2.08× in 1 KiB blocks, 8.68× in 1 MiB ([Logs](#07-logs-and-json-lines)). *\[measured here\]*

**2. At rest, zstd 3 (9 if read often, 19 for cold archives); at the edge, brotli or zstd.** zstd 3 compressed the API records at 100–500 MB/s; zstd 9, in gzip -6's tier, beat gzip -6 on all three JSON corpora; zstd 19 still decoded at 500 MB/s or more; brotli 11, the densest, compressed below 1 MB/s ([JSON](#03-json-pick-a-level-then-stop)). *\[measured here\]*

**3. Never compress a tiny payload alone: batch it, or use a versioned dictionary.** gzip -6 grew 1,216 of 1,409 synthetic messages under 200 bytes. zstd 3 gave 1.98× per message, 3.27× in batches of 100 and 3.21× per message with a trained dictionary ([Small messages](#04-small-messages-and-dictionaries)). *\[measured here\]*

**4. Give a table a columnar format before a codec.** Parquet's encodings alone cut a synthetic 124.5 MB CSV to 38.6 MB; adding zstd 3 made it 23.5 MB, 35.2% smaller than the CSV under gzip -6 ([Tables](#08-tables-let-the-format-do-the-work)). *\[measured here\]*

**5. For media, choose codec and quality, measure, keep the source.** At an SSIMULACRA 2 score of 80, AVIF took 34.5% fewer bytes than libjpeg-turbo's 4:2:0 JPEG on three photographs ([Images](#09-images)). *\[measured here\]* Match the score, not the setting; cut lossy copies from the master ([Throwing away what nobody sees](2026-10-15-what-compression-keeps.md#07-throwing-away-what-nobody-sees)). *\[reconstruction\]*

**6. Leave compressed data alone.** Four general-purpose codecs saved at most 4.66% on nine media files. Re-coding pays: oxipng took 40.1% off a screenshot, and JPEG XL 32.8% off a JPEG it rebuilt bit for bit ([Already compressed](#12-already-compressed-leave-it)). *\[measured here\]*

**7. Record codec, level and dictionary with the data.** A zstd frame header has a field for a dictionary ID, none for the level (RFC 8878 §3.1.1.1). *\[from the spec\]* Parquet names each column chunk's codec; all 14 in the zstd 3 file read `ZSTD`. *\[measured here\]* Keep the level and the dictionary's SHA-256 in a manifest. *\[reconstruction\]*

**8. Bound decompression by its output.** Python's zlib and `compression.zstd` decompressors take a `max_length`. *\[from the docs\]* [Decompression bombs](2026-10-15-what-compression-keeps.md#09-when-compression-is-the-attack) and the [YAML alias bomb](2026-10-15-what-the-parser-hears.md#07-when-loading-means-executing) are one family: few bytes in, unbounded work out. *\[reconstruction\]*

**9. Never compress a secret with attacker-controlled input.** "One should never compress a message whose content must remain secret with a message generated by a third party" (RFC 8878 §8). *\[from the spec\]* BREACH's authors list disabling HTTP compression first among mitigations ([When compression is the attack](2026-10-15-what-compression-keeps.md#09-when-compression-is-the-attack)). *\[from the docs\]*

**10. Make archives reproducible: fixed dates, sorted entries.** npm fixes every tarball entry's date ([Config files](#06-config-files-leave-them-alone)). *\[from the docs\]* xo-space's backup sorts its paths (`tarball.py`, line 131), *\[from the tree\]* but stamps each run's time into its gzip header; the same section has the fix. *\[reconstruction\]*

**Figure 21. Per kind of file: what to use · how to check it**

- **JSON at rest**: zstd 3; 9 if read often; 19 for archives · decompress, compare SHA-256
- **JSON over HTTP**: brotli 11 if static, brotli 5 or zstd 3 if dynamic, gzip -6 fallback · fetch, decode, compare
- **Small messages**: zstd 3 with a trained dictionary, or batches · held-out ratio, none larger
- **Config, lockfiles**: nothing per file; the registry's package · build twice, same SHA-256
- **JSONL logs**: zstd 3 in 1 MiB seekable frames · random reads match
- **Tables**: Parquet, dictionary encoding, zstd 3 · read back, compare
- **Photos**: AVIF or JPEG XL at a target score; JPEG fallback · SSIMULACRA 2 against the source
- **Graphics**: lossless WebP or JPEG XL; oxipng if it stays PNG · pixels identical
- **Audio master**: FLAC, level 5 or above · decoded PCM identical
- **Audio copies**: Opus, 24–32 kb/s speech, 96–128 music · by ear; no metric here
- **Video**: SVT-AV1 preset 4–6 at a CRF; H.264 fallback; HEVC where required · VMAF against the source
- **Already compressed**: store as is; re-code only with oxipng or cjxl · bit- or pixel-exact

*\[reconstruction\]* Most checks are the bench's own. Blue: lossless, checked by decoding and comparing. Purple: lossy, checked against the kept source. Orange: no codec on the file itself.

### Where this breaks

One shared machine with two CPUs of time, throttled in 40.3% of its cgroup periods, made every measurement: speeds are tiers ([the bench](#02-how-the-measurements-were-made)). The API records, messages, access logs and table are synthetic. The video BD-rates, x265 −39.09% and SVT-AV1 preset 8 −34.56% against x264, rest on one 10-second animated clip, VMAF v0.6.1 and four points per encoder, three inside the shared range; lossy images on three Kodak photographs; audio has no quality score. *\[measured here\]* VMAF and SSIMULACRA 2 model perception; they are not perception. *\[reconstruction\]* Browser support moves monthly; Figure 15 is dated. *\[reconstruction\]*

### The decision rule

Ask the three questions of Figure 1 in order. Already entropy-coded? Store it as it is, or re-code it from its source at a measured quality. Small? Batch it or give it a dictionary. Read how: over HTTP, from disk, by offset or by column? That picks the edge codec, the zstd level, the frame size or Parquet. Record the choice. *\[reconstruction\]*

## 14 · Sources

Links are the pages the dossiers read, some through the Wayback Machine; unlinked entries came from abstracts, snapshots, APIs, a branch or the local toolchain. Theory sources are in [What Compression Keeps](2026-10-15-what-compression-keeps.md#13-sources).

### Specifications

- Codecs: RFC [1950](https://www.rfc-editor.org/rfc/rfc1950.txt), [1951](https://www.rfc-editor.org/rfc/rfc1951.txt), [1952](https://www.rfc-editor.org/rfc/rfc1952.txt), [8878](https://www.rfc-editor.org/rfc/rfc8878.txt), [9842](https://www.rfc-editor.org/rfc/rfc9842.txt); zstd's [seekable format](https://raw.githubusercontent.com/facebook/zstd/dev/contrib/seekable_format/zstd_seekable_compression_format.md).
- Data: RFC [8259](https://www.rfc-editor.org/rfc/rfc8259.txt), [8949](https://www.rfc-editor.org/rfc/rfc8949.txt); Parquet [encodings](https://raw.githubusercontent.com/apache/parquet-format/master/Encodings.md), [compression](https://raw.githubusercontent.com/apache/parquet-format/master/Compression.md), [2.14.0](https://api.github.com/repos/apache/parquet-format/releases/tags/apache-parquet-format-2.14.0); Arrow [Columnar.rst](https://raw.githubusercontent.com/apache/arrow/main/docs/source/format/Columnar.rst); Avro, on main; PyPA [wheel](https://raw.githubusercontent.com/pypa/packaging.python.org/main/source/specifications/binary-distribution-format.rst), [sdist](https://raw.githubusercontent.com/pypa/packaging.python.org/main/source/specifications/source-distribution-format.rst) (PEPs 427, 625).
- Media: RFC [9639](https://www.rfc-editor.org/rfc/rfc9639.txt), [6716](https://www.rfc-editor.org/rfc/rfc6716.txt), [8251](https://www.rfc-editor.org/rfc/rfc8251.txt); [PNG](https://www.w3.org/TR/png-3/) Third Edition; [T.81](https://www.w3.org/Graphics/JPEG/itu-t81.pdf); ITU-T [H.264](https://www.itu.int/rec/T-REC-H.264), [H.265](https://www.itu.int/rec/T-REC-H.265), [H.266](https://www.itu.int/rec/T-REC-H.266); [VP9](https://www.webmproject.org/vp9/); [AV1](https://aomediacodec.github.io/av1-spec/); [AV2](https://av2.aomedia.org/) v1.0.0; [draft-ietf-netvc-testing-09](https://www.ietf.org/archive/id/draft-ietf-netvc-testing-09.txt).

### Project documentation and source

- Codecs: zstd [README](https://raw.githubusercontent.com/facebook/zstd/dev/README.md), [manual](https://raw.githubusercontent.com/facebook/zstd/dev/programs/zstd.1.md), [zstd.h](https://raw.githubusercontent.com/facebook/zstd/v1.5.7/lib/zstd.h); [brotli.1](https://raw.githubusercontent.com/google/brotli/master/docs/brotli.1); [xz.1](https://raw.githubusercontent.com/tukaani-project/xz/master/src/xz/xz.1); GNU gzip [manual](https://www.gnu.org/software/gzip/manual/gzip.html); Python [compression.zstd](https://docs.python.org/3/library/compression.zstd.html), [zlib](https://docs.python.org/3/library/zlib.html); CPython `json.rst`; Python 3.14's `tarfile.py`, `gzip.py`.
- Formats and packages: [MessagePack](https://raw.githubusercontent.com/msgpack/msgpack/master/spec.md), [BSON](https://bsonspec.org/faq.html), [UBJSON](https://ubjson.org/), [Protobuf](https://raw.githubusercontent.com/protocolbuffers/protocolbuffers.github.io/main/content/overview.md); Cargo [mod.rs](https://raw.githubusercontent.com/rust-lang/cargo/master/src/ops/cargo_package/mod.rs); npm [pacote](https://raw.githubusercontent.com/npm/cli/latest/node_modules/pacote/lib/util/tar-create-options.js); Git [loose](https://raw.githubusercontent.com/git/git/master/Documentation/gitformat-loose.adoc), [pack](https://raw.githubusercontent.com/git/git/master/Documentation/gitformat-pack.adoc), [core](https://raw.githubusercontent.com/git/git/master/Documentation/config/core.adoc).
- Tables: [pyarrow](https://raw.githubusercontent.com/apache/arrow/main/python/pyarrow/parquet/core.py), [DuckDB](https://raw.githubusercontent.com/duckdb/duckdb-web/main/docs/current/data/parquet/overview.md), [Spark](https://spark.apache.org/docs/latest/sql-data-sources-parquet.html), [Polars](https://raw.githubusercontent.com/pola-rs/polars/main/py-polars/src/polars/dataframe/frame.py), [ORC](https://orc.apache.org/news/2024/03/08/ORC-2.0.0/), [Feather](https://raw.githubusercontent.com/apache/arrow/main/python/pyarrow/feather.py); DuckDB [0.10.0](https://raw.githubusercontent.com/duckdb/duckdb-web/main/_posts/2024-02-13-announcing-duckdb-0100.md), [1.2.0](https://raw.githubusercontent.com/duckdb/duckdb-web/main/_posts/2025-02-05-announcing-duckdb-120.md); ClickHouse [codecs](https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/docs/reference/statements/create/table/codec.mdx), [changelog](https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/CHANGELOG.md); PostgreSQL [TOAST](https://www.postgresql.org/docs/current/storage-toast.html), [19](https://www.postgresql.org/docs/devel/release-19.html).
- Logs and agents: Kafka [design](https://raw.githubusercontent.com/apache/kafka/trunk/docs/design/design.md); seekable [README](https://raw.githubusercontent.com/facebook/zstd/dev/contrib/seekable_format/README.md); Loki [configuration](https://raw.githubusercontent.com/grafana/loki/main/docs/sources/shared/configuration.md), [practices](https://raw.githubusercontent.com/grafana/loki/main/docs/sources/configure/bp-configure.md); Elasticsearch [codecs](https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules), [logsdb](https://www.elastic.co/docs/manage-data/data-store/data-streams/logs-data-stream), [\#112665](https://raw.githubusercontent.com/elastic/elasticsearch/v8.16.0/docs/changelog/112665.yaml); Claude Code [sessions](https://code.claude.com/docs/en/sessions.md), [data usage](https://code.claude.com/docs/en/data-usage.md); Codex [\#25089](https://github.com/openai/codex/pull/25089); on main, Codex `compression.rs`, `lib.rs` and `client.rs`, Gemini CLI `chatRecordingService.ts`.
- Images and audio: [oxipng](https://raw.githubusercontent.com/oxipng/oxipng/master/README.md); libjxl [README](https://raw.githubusercontent.com/libjxl/libjxl/main/README.md), [format](https://raw.githubusercontent.com/libjxl/libjxl/main/doc/format_overview.md); [jxl-rs](https://github.com/libjxl/jxl-rs); [SSIMULACRA 2](https://github.com/cloudinary/ssimulacra2); Cloudflare [Images](https://developers.cloudflare.com/images/optimization/features/); [FLAC](https://raw.githubusercontent.com/xiph/flac/master/CHANGELOG.md); [ALAC](https://raw.githubusercontent.com/macosforge/alac/master/ReadMe.txt); [Opus](https://opus-codec.org/), Xiph's [settings](https://wiki.xiph.org/Opus_Recommended_Settings); Fraunhofer [MP3](https://www.iis.fraunhofer.de/en/ff/amm/consumer-electronics/mp3.html).
- Video: FFmpeg [download](https://ffmpeg.org/download.html), [manual](https://ffmpeg.org/ffmpeg.html), [codecs](https://ffmpeg.org/ffmpeg-codecs.html), [filters](https://ffmpeg.org/ffmpeg-filters.html), [changelog](https://raw.githubusercontent.com/FFmpeg/FFmpeg/release/9.0/Changelog), `libsvtav1.c` on release/9.0; its wiki's Encode pages, via Wayback; SVT-AV1 [releases](https://gitlab.com/AOMediaCodec/SVT-AV1/-/releases), [parameters](https://gitlab.com/AOMediaCodec/SVT-AV1/-/raw/master/Docs/Parameters.md), [questions](https://gitlab.com/AOMediaCodec/SVT-AV1/-/raw/master/Docs/CommonQuestions.md); x265 [notes](https://bitbucket.org/multicoreware/x265_git/raw/master/doc/reST/releasenotes.rst); [VVenC](https://raw.githubusercontent.com/fraunhoferhhi/vvenc/master/README.md); libvpx's tags and x264's commits; VMAF [README](https://raw.githubusercontent.com/Netflix/vmaf/master/README.md), [v1](https://raw.githubusercontent.com/Netflix/vmaf/master/resource/doc/models_v1.md).

### Published results, cited as claims

- Viotti and Kinderkhedia [2022](https://arxiv.org/pdf/2201.03051v1); Facebook's [zstd launch](https://engineering.fb.com/2016/08/31/core-infra/smaller-and-faster-data-compression-with-zstandard/); Google's [Brotli launch](https://opensource.googleblog.com/2015_09_01_archive.html); DuckDB [2022](https://raw.githubusercontent.com/duckdb/duckdb-web/main/_posts/2022-10-28-lightweight-compression.md); [CLP](https://www.usenix.org/system/files/osdi21-rodrigues.pdf); [Uber](https://www.uber.com/en-US/blog/reducing-logging-cost-by-two-orders-of-magnitude-using-clp/); [μSlope](https://www.usenix.org/system/files/osdi24-wang-rui.pdf); [Gorilla](https://www.vldb.org/pvldb/vol8/p1816-teller.pdf); [FSST](https://www.vldb.org/pvldb/vol13/p2649-boncz.pdf); [ALP](https://ir.cwi.nl/pub/33334/33334.pdf); [BREACH](http://breachattack.com/).
- WebKit's [Safari 17](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/); Mozilla's [intent to ship](https://groups.google.com/a/mozilla.org/g/dev-platform/c/3YMV4MS34KA); Januschka's [Chromium history](https://www.januschka.com/chromium-jxl-resurrection.html); Netflix [2018](https://netflixtechblog.com/dynamic-optimizer-a-perceptual-video-encoding-optimization-framework-e19f1e3a277f), [2025](https://netflixtechblog.com/av1-scale-film-grain-synthesis-the-awakening-ee09cfdff40b); Meta's [white paper](https://engineering.fb.com/wp-content/uploads/2025/09/Meta-AV1-White-Paper-FINAL.pdf); Marpe (2003), Sullivan (2012), Mukherjee (2013), Bross (2021) and Han (2021).

### Browsers, servers and licensing

- caniuse [WebP](https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/webp.json), [AVIF](https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/avif.json), [JPEG XL](https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/jpegxl.json), [AV1](https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/av1.json), [HEVC](https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/hevc.json); [chromestatus](https://chromestatus.com/feature/5114042131808256); [chromiumdash](https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=155); Mozilla [schedule](https://whattrainisitnow.com/api/release/schedule/?version=158), [product-details](https://product-details.mozilla.org/1.0/firefox_versions.json); MDN [compression](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Compression), [video codecs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs); Cloudflare [compression](https://developers.cloudflare.com/speed/optimization/content/compression/); [Vercel](https://vercel.com/docs/how-vercel-cdn-works/compression); [nginx](https://nginx.org/en/docs/http/ngx_http_gzip_module.html).
- AOMedia [AV1](https://aomedia.org/press%20releases/the-alliance-for-open-media-kickstarts-video-innovation-era-with-av1-release/), [AV2](https://aomedia.org/press%20releases/Alliance-for-Open-Media-Releases-AV2-Codec/), [implementers](https://aomedia.org/blog%20posts/AV2-What-the-Final-Specification-Means-for-Implementers/), [IBC 2026](https://aomedia.org/press%20releases/AOMedia-Showcase-AV2-Ecosystem-Developments-at-IBC-2026/); [Access Advance](https://accessadvance.com/2025/07/21/access-advance-announces-hevc-advance-and-vvc-advance-pricing-through-2030/); Via LA [HEVC/VVC](https://www.via-la.com/licensing-programs/hevc-vvc/), [AVC](https://www.via-la.com/licensing-programs/avc-h-264/); Sisvel [AV1](https://www.sisvel.com/licensing-programmes/audio-and-video-coding-decoding/video-coding-platform-av1/), [VP9](https://www.sisvel.com/licensing-programmes/audio-and-video-coding-decoding/video-coding-platform/).

### Test media and XO trees

- Kodak [kodim05](https://r0k.us/graphics/kodak/kodak/kodim05.png), [15](https://r0k.us/graphics/kodak/kodak/kodim15.png), [23](https://r0k.us/graphics/kodak/kodak/kodim23.png); Xiph's Sintel trailer [soundtrack](https://media.xiph.org/video/derf/flac/Sintel/sintel_trailer-audio.flac) and [Y4M](https://media.xiph.org/video/derf/y4m/sintel_trailer_2k_1080p24.y4m), CC BY 3.0 per [Blender](https://durian.blender.org/about/). *\[from the docs\]*
- Read-only: xo-space at `aa96ba8`, under `services/cowork_agent/xo_projects_sync/`, `tarball.py` 27–28, 131, 134 and `backup.py` 160; doomfly at `71ecf53`, `doom/archive.py` 1, 20 and `deploy/doomfly/README.md` 33–36. *\[from the tree\]*

### The measurement

`uv run _compute.py` rewrites `_numbers.json`, whose `versions` key names every tool, after the unpublished `~/compression-ref/bench/setup.sh` fetches and checksums builds and media. *\[from the tree\]*

**Provenance.** Sources as of 9 October 2026, the byline date. Web sources were fetched on 8 and 9 October 2026, caniuse's Edge WebP entry on 12 October. Results marked *measured here* come from the third full run, ended 10 October 2026, on one shared 2-CPU Linux machine. Sizes, ratios and quality scores repeat exactly for these inputs; speeds are tiers. The decision rules, recipes and tarball fix are *reconstruction*. Not verified: Chrome 155's JPEG XL rollout, Edge after 154 and Firefox 158's date; SVT-AV1 CRFs above 63 through FFmpeg; Via LA's terms for existing licensees; Viotti and Kinderkhedia's ranking with current libraries; Mozilla's paraphrased decoding report; why Protobuf trails JSON under zstd 19.
