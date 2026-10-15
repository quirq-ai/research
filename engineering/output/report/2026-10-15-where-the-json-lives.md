# Where the JSON Lives

Relational versus non-relational is the wrong first question. The right ones are what shape your reads take, what a lost write costs, and who governs the licence. This is a field guide to both families as they stand in October 2026 — how each stores and finds data, the trade-offs they cannot escape, the licences that changed under people's feet — then a measured answer to a narrower question: if a system loads and stores JSON all day, where should that JSON live, and how do you build it from free, open-source parts that hold up.

By **Suraj Sharma**, XO Labs · Data Systems. First published 1 October 2026 as *Where the JSON Lives* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/where-the-json-lives).

Source: [`where-the-json-lives/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/where-the-json-lives/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

> **How to read the badges**
>
> *\[from the docs\]* marks a fact taken from a project's own documentation, release notes, or licence text. *\[from the tree\]* marks something read from the `xo-space` source, quoted with its path. *\[measured here\]* marks a number produced by `_compute.py` beside this page, on one 8-CPU Linux machine with Python 3.14 and SQLite 3.46.1 — the ratios travel, the absolute microseconds do not. *\[reconstruction\]* marks a judgement or mechanism I have worked out rather than read. PostgreSQL was not benchmarked here; its behaviour is cited, not measured.

## 01 · The wrong first question

"SQL or NoSQL?" is the question most teams ask first, and it is the wrong one. It stands in for one of five decisions and says nothing about the other four. JSON does not settle it either: JSON is a serialization format, not a database category.

Both camps have spent a decade converging. PostgreSQL has stored binary JSON in `jsonb` since 9.4, with GIN indexes over it. *\[from the docs\]* SQLite added its own binary JSONB in 3.45.0, January 2024. *\[from the docs\]* MySQL has a native `JSON` type. Going the other way, MongoDB enforces JSON Schema validators and runs multi-document transactions, and ClickHouse declared its `JSON` column type production-ready in 25.3. *\[from the docs\]* Every serious engine now stores JSON. So "where does the JSON live" is not answered by picking a family. It is answered by the five axes in Figure 1.

**Figure 1. Five axes that decide where data lives — and the one "SQL vs NoSQL" covers**

![Five vertical columns, one per decision axis: data shape, access pattern, consistency need, operational burden, and licence and governance. Each column lists the question it asks and two example poles. A bracket under the first column only, data shape, is labelled 'relational versus NoSQL lives here', showing that the familiar question is a proxy for one axis out of five.](2026-10-15-where-the-json-lives/fig-01-axes.svg)

*\[reconstruction\]* — my framing, not a standard taxonomy. Choosing a family answers the first column. Most production regret comes from the other four: a read path nobody indexed, a consistency level nobody chose, a cluster nobody wanted to run, or a licence that changed under the team.

### The answer, up front

You can stop reading after this paragraph. For a system that loads and stores JSON all day, the default is **PostgreSQL 18** with `jsonb` when there is a server, or **SQLite in WAL mode** when there is one node and one process tree. Use a **hybrid schema**: real columns for anything you filter, join, or constrain, and `jsonb` for the long tail. Around it, add **Valkey** for hot ephemeral state, **S3-compatible object storage** for large blobs, and **ClickHouse or DuckDB** for analysing the event history. Every piece is free and under an OSI-approved licence as of 1 October 2026. *\[reconstruction\]*

Two of these choices are not obvious. The first is why the core is relational at all, when the payload is documents. The reason is that continuously written JSON almost never stays a pure document. Within months someone needs every session for a project, every document in status `failed`, or a count per tenant per day. Those are filters, joins and aggregates over fields, which is what the relational planner exists for. The second is why there are two defaults. A server database costs a process, a port, backups and upgrades. When the whole system is one machine, SQLite gives most of the same guarantees with none of that. *\[reconstruction\]*

The rest of the page has to earn that answer. It does so in three parts:

- **The field guide** (§2–§5) covers both families, the trade-offs neither escapes, and the licence changes of 2024–2026.
- **The JSON question** (§6–§9) covers the practices that survive production, what an engine does when you change one field, five write strategies measured on this machine, and the hybrid schema.
- **The build** (§10–§12) covers the stack, the migration, and where this advice stops.

### The running example

The example throughout is `xo-space`, the XO agent workspace server. It keeps its state as JSON files. The cowork state writer in `services/cowork_agent/xo_cowork_state.py` (lines 54–62) dumps the whole dict to a temp file in the same directory, calls `fsync`, then `os.replace`s it over `state.json`. *\[from the tree\]* The per-project timeline is append-only JSONL at `.xo/timeline.jsonl` (`services/cowork_agent/scopes.py`, line 87). *\[from the tree\]* Neither choice is a mistake. A rename is atomic on POSIX, so a crash leaves either the old file or the new one, never half of each. The costs show up elsewhere. Every change rewrites the whole document. Every query parses it. Two writers race and the last one wins. §8 measures what that costs, and §11 moves it to tables without downtime.

## 02 · The relational family

A relational database stores facts as rows in tables, enforces rules about them, and lets you ask questions without saying how to answer them. The model fits on an index card. The engine underneath is where the engineering lives: a write-ahead log, B-tree indexes, multiversion concurrency, and a cleanup process that never finishes.

### The model

A *relation* is a set of tuples with the same named, typed attributes. A *primary key* identifies each one. *Foreign keys* point between relations, and the engine refuses writes that would leave a dangling pointer. `CHECK`, `UNIQUE` and `NOT NULL` constraints turn business rules into errors at write time, not bugs at read time. *Normalization* stores each fact once, so an update touches one row rather than every copy.

Queries are declarative. You state what you want in SQL, and a cost-based *planner* chooses scan types, join order and join algorithms from table statistics. This is the family's main advantage. A query nobody planned for still runs and still returns the right answer, just slowly until someone adds an index. Most of the specialised families in §3 give that up.

### What the engine does on commit

Figure 2 follows one `UPDATE` through PostgreSQL. The order matters. The change is described in the write-ahead log (WAL) first. On commit, the WAL is flushed to disk; with the default `synchronous_commit = on`, the client is not told "committed" until that flush returns. *\[from the docs\]* The table page itself is changed only in memory, in `shared_buffers`, and reaches its data file later, through the background writer or a checkpoint (every `checkpoint_timeout`, 5 minutes by default, or sooner when `max_wal_size` fills). *\[from the docs\]* After a crash, recovery replays WAL from the last checkpoint. One sequential flush per commit buys durability for any number of random page changes.

**Figure 2. Anatomy of a committed write in PostgreSQL**

![A client sends an UPDATE. Step one appends a WAL record to the WAL buffer, which is flushed with fsync to the WAL segment on disk before the commit is acknowledged. Step two writes a new tuple version into a heap page in shared buffers and, unless it is a HOT update, a new index entry. Step three, later and asynchronously, the background writer and checkpointer write dirty pages to the data files. Below, the MVCC detail: the old tuple version gets xmax set to the updating transaction, the new version has xmin set to it, and vacuum later reclaims the dead version once no snapshot can see it.](2026-10-15-where-the-json-lives/fig-02-write-path.svg)

*\[from the docs\]* for the mechanism; the layout is mine. Durability comes from step 1 alone. Steps 2 and 3 are caching, which is why an `UPDATE` costs one sequential fsync, not a random page write. The purple band is the cost that shows up later: every update leaves a dead tuple behind.

Indexes are B-trees by default: balanced, page-sized nodes with a fan-out in the hundreds, so a lookup in a billion-row table touches about four pages. *\[reconstruction\]* PostgreSQL also ships GIN (for `jsonb`, arrays and full text), GiST, BRIN and hash indexes. *\[from the docs\]*

Concurrency is MVCC. An `UPDATE` never overwrites a row in place. It writes a new tuple version stamped with the writer's transaction id (`xmin`) and marks the old one with `xmax`. Readers see whichever version their snapshot allows, so readers never block writers. The default isolation level is `READ COMMITTED`: each statement sees data committed before it began. `REPEATABLE READ` and true `SERIALIZABLE` (serializable snapshot isolation, since 9.1) are one `SET TRANSACTION` away. *\[from the docs\]* The price is `VACUUM`. Dead versions stay in the heap until autovacuum reclaims them, and a table updated faster than it is vacuumed bloats. This matters for JSON: §7 shows that changing one field of a large `jsonb` value writes a whole new version.

### The open-source members, October 2026

- **PostgreSQL**: PostgreSQL Licence (BSD-style), run by the PostgreSQL Global Development Group. Version 18 shipped on 25 September 2025. It added an asynchronous I/O subsystem, `uuidv7()`, and virtual generated columns as the default kind. Version 19 reached Beta 4 on 24 September 2026, with a release candidate planned for October and no GA yet. *\[from the docs\]* 18 is the production pick today.
- **MySQL**: GPLv2, owned by Oracle. InnoDB is a clustered B-tree that defaults to `REPEATABLE READ`. *\[from the docs\]* **MariaDB**: GPLv2, stewarded by the MariaDB Foundation.
- **SQLite**: public domain, a library rather than a server. The database is one file and allows one writer at a time. In WAL mode, readers keep reading the last committed state while that writer works. *\[from the docs\]* For a single-node service this is not a toy. It is often the fastest option, because there is no network hop.
- **Distributed SQL**: YugabyteDB and TiDB are Apache 2.0 and shard tables across nodes with Raft. CockroachDB retired its free Core edition in late 2024 for a single Enterprise licence with a free tier. *\[from the docs\]* That licence is not open source, so it drops out of this guide's stack.

### Where it shines, where it hurts

The family is strongest where data is shared and correctness spans more than one row: orders and inventory, accounts and ledgers, permissions, anything a report will join. It is weakest in three places.

- **Schema changes on hot tables.** Some `ALTER TABLE` forms rewrite the table under an `ACCESS EXCLUSIVE` lock. Adding a nullable column is cheap. Changing a column's type is not. §6 covers the expand/contract pattern that avoids this.
- **Horizontal write scaling.** One primary takes every write. Read replicas scale reads only. Past one machine you shard (Citus) or move to distributed SQL, and both cost you cross-shard joins.
- **Impedance mismatch.** Applications hold nested objects, and tables hold flat rows. ORMs bridge the gap with N+1 queries and migrations nobody reads. This is the honest reason document stores exist. A `jsonb` column in the right place narrows the gap without leaving the engine. *\[reconstruction\]*

## 03 · The non-relational families

"NoSQL" is not one thing. It is at least eight families, each built around one access pattern and each paying for it by giving up something a relational engine provides: joins, ad-hoc queries, strong consistency, or transactions across keys. You choose one when that pattern dominates your load and has outgrown a general engine. Not before.

Figure 3 is the map, one row per family. The open-source pick in each row is under an OSI-approved licence as of October 2026. Where the best-known product is not, the row says so.

**Figure 3. Eight families: what each is built for, and what it gives up**

| Family | Data model | Built for | Gives up | Open-source pick · licence |
|----|----|----|----|----|
| Key-value | opaque value under a key; in-memory variants add typed structures | sub-millisecond get/set by exact key; counters, sessions, queues | queries by value, joins; durability is optional in memory stores | Valkey 9 · BSD-3 (Linux Foundation); RocksDB, etcd, FoundationDB as embedded/building blocks |
| Document | nested JSON/BSON per key, grouped in collections | load and save one aggregate by id; filter on its fields | joins across collections are awkward; denormalised copies drift | FerretDB 2 · Apache 2.0, over DocumentDB · MIT; CouchDB · Apache 2.0. MongoDB is SSPL, not OSI |
| Wide-column | partition key → rows sorted by clustering key | very high write rates; reads by known partition | ad-hoc queries, joins; secondary indexes are limited | Apache Cassandra 5 · Apache 2.0. ScyllaDB is source-available since 2025.1 |
| Graph | nodes and typed edges with properties | multi-hop traversals: paths, neighbours, fraud rings | bulk scans and aggregates; sharding a graph is hard | Apache AGE (on Postgres) · Apache 2.0; Neo4j Community · GPLv3 |
| Time-series | (series, timestamp) → values, partitioned by time | append-mostly ingest; range and downsample queries | updates and deletes of old points; general joins | QuestDB, VictoriaMetrics · Apache 2.0; TimescaleDB core · Apache 2.0, extras TSL |
| Search | inverted index over analysed text and fields | relevance-ranked full text, facets, log search | it is not a system of record; refresh lag; no transactions | OpenSearch · Apache 2.0. Elasticsearch added AGPLv3 as an option in 2024 |
| Vector | embedding arrays with ANN indexes (HNSW, IVF) | nearest-neighbour similarity at recall below 100% | exactness; it is usually a second index on other data | pgvector · PostgreSQL Licence; Qdrant · Apache 2.0 |
| Columnar analytics | each column stored and compressed separately | scans and aggregates over billions of rows | point updates and single-row reads are expensive | ClickHouse · Apache 2.0; DuckDB (embedded) · MIT |

*\[from the docs\]* for licences; *\[reconstruction\]* for the "built for / gives up" columns. Read the fourth column first. Each family is a general engine with something removed, and what was removed is the bill.

### Key-value

The simplest contract is `get(key)` and `set(key, value)`. In-memory stores add lists, hashes, sorted sets, TTLs and pub/sub, which is why they end up holding sessions, rate limits and caches. The licence history decides the pick here. Redis moved from BSD to RSALv2/SSPLv1 in March 2024, and Redis 8 (May 2025) added AGPLv3 as a third option. *\[from the docs\]* Valkey forked from the last BSD release and reached 9.0 on 21 October 2025, still BSD-3, under the Linux Foundation. *\[from the docs\]* Both are fine to run. Only Valkey keeps the permissive licence the ecosystem was built on. Underneath many systems sit embedded key-value engines: RocksDB (an LSM library), etcd (Raft-replicated, for configuration) and FoundationDB (ordered keys with strict-serializable multi-key transactions). All three are Apache-licensed. *\[from the docs\]*

### Document

A document store keeps one aggregate, such as an order with its lines or a user with their settings, as one nested value. That matches application objects and saves the joins. The cost appears when two aggregates share a fact. You either copy it into both and accept drift, or store a reference and join in application code. MongoDB is the reference product, but its Server Side Public License (since 2018) is not OSI-approved. *\[from the docs\]* FerretDB 2.0 speaks the MongoDB wire protocol under Apache 2.0, storing data through Microsoft's DocumentDB extension for PostgreSQL. DocumentDB is MIT-licensed and joined the Linux Foundation on 25 August 2025. *\[from the docs\]* In other words, the open-source document database of 2026 is Postgres in disguise. CouchDB (Apache 2.0) remains the choice when you need multi-master replication and offline sync.

### Wide-column, graph, time-series

Wide-column stores (Cassandra, its ancestor Bigtable) model a table as partitions. A partition key picks the node, and a clustering key orders rows within it. You design one table per query, write fast because every write is an append to an LSM tree, and give up the queries you did not design for. Apache Cassandra 5.0 is Apache 2.0. ScyllaDB's last AGPL release was 6.2, and from 2025.1 it is source-available with a free tier capped at 10 TB and 50 vCPUs. *\[from the docs\]* Graph engines make multi-hop traversal cheap by storing adjacency directly. Apache AGE adds openCypher to Postgres, so a graph can share a database with everything else. Time-series engines partition by time, compress columns, and assume old points rarely change. TimescaleDB needs care: its core is Apache 2.0, but compression, continuous aggregates and other features are under the Timescale Licence (TSL). The TSL is free to use except for offering TimescaleDB as a hosted database service, and it is not OSI-approved. *\[from the docs\]*

### Search, vector, columnar

These three are usually second stores. A primary database owns the truth and feeds them. Search engines build inverted indexes. OpenSearch is Apache 2.0 under the Linux Foundation, and Elasticsearch added AGPLv3 alongside SSPL and ELv2 in August 2024. *\[from the docs\]* Vector search is an index type more than a database: pgvector puts HNSW and IVFFlat inside Postgres, and Qdrant is a standalone engine. Columnar engines (ClickHouse server-side, DuckDB in-process) store each column separately, so an aggregate over three columns of a hundred-column event never reads the other ninety-seven. They are where the event history from §10 ends up.

### One record, four models

Figure 4 shows the same agent-session record in four models. The data does not change, only the access pattern each layout makes cheap.

**Figure 4. The same session record, laid out four ways**

![Four panels show one agent session stored four ways. Key-value: the key session:s42 maps to an opaque blob, cheap to get by id and blind to its contents. Document: a nested object with id, project, status, model and an array of turns, queryable by field. Wide-column: partition key project p7 with rows clustered by started_at, so one read returns a project's sessions in time order. Graph: nodes for user, session, project and file with edges ran, in, and edited, so traversal from a file to the users who touched it is cheap.](2026-10-15-where-the-json-lives/fig-04-shapes.svg)

*\[reconstruction\]*: an illustrative record, not `xo-space`'s actual schema. Each layout makes one question cheap and leaves the others to the application. A relational table with a `jsonb` column answers all four questions, none of them optimally, which is usually the right trade until one of them dominates.

## 04 · The trade-offs nobody escapes

Under the product names there are a few mechanisms, and each has a cost that no vendor removes. A storage engine trades read cost against write cost against space. A distributed system trades latency against consistency, even when nothing is broken. Knowing which trade a product made tells you more than its feature page does.

### Two storage engines

Almost every engine in §2 and §3 is one of two designs. A **B-tree** keeps sorted, page-sized nodes on disk and updates them in place (PostgreSQL's indexes, InnoDB's clustered index, SQLite). A **log-structured merge tree** (LSM) never updates in place. It buffers writes in a sorted in-memory *memtable*, flushes it as an immutable sorted file (an SSTable), and merges those files in the background through *compaction*. RocksDB, Cassandra and ScyllaDB are LSM engines. ClickHouse's MergeTree follows the same idea for columns: each insert becomes an immutable part, and parts are merged later. *\[from the docs\]*

**Figure 5. B-tree versus LSM-tree: where each one pays**

![Left, a B-tree: a root page, two inner pages and four leaf pages. A write descends to one leaf and rewrites that page in place, plus a WAL record. Reads are cheap, one root-to-leaf path. Writes pay a whole page per small change, and pages are kept partly empty. Right, an LSM tree: writes go to a memtable and WAL, the memtable flushes to an immutable level-0 SSTable, and compaction merges level 0 into levels 1 and 2. Writes are sequential and cheap. Reads may check the memtable and several levels, helped by bloom filters, and compaction rewrites the same data several times. Space holds obsolete versions until compaction.](2026-10-15-where-the-json-lives/fig-05-amplification.svg)

*\[reconstruction\]*: qualitative, no numbers claimed. Neither design is faster in general. Each moves cost to a different moment. B-trees pay at write time, and LSM trees pay in background I/O and on reads that miss the memtable.

The general form of this is the **RUM conjecture** (Athanassoulis et al., EDBT 2016): an access method can minimise at most two of read overhead, update overhead and memory (space) overhead. *\[from the docs\]* Indexes are the everyday case. Every index you add makes some reads cheaper and every write more expensive. §8 measures that on this machine: an expression index turns a 20,000-document filter from 22,062 µs into 9.2 µs. *\[measured here\]*

### Distribution: CAP is narrow, PACELC is useful

CAP says that during a network *partition*, a replicated system must choose between availability and linearizable consistency. That is true, and it only covers the partition case. Abadi's **PACELC** (IEEE Computer, 2012) adds the case that runs all day: *else*, with no partition, you still choose between *latency* and *consistency*, because waiting for another replica to acknowledge costs a round trip on every write. *\[from the docs\]* Cassandra with consistency level `ONE` is PA/EL. A single-leader Postgres with synchronous replication is PC/EC. Most of the cost of "distributed" is in the EL/EC half.

**Figure 6. The consistency ladder, with where engines sit by default**

![A ladder of seven rungs from weakest at the bottom to strongest at the top: eventual, read-your-writes, causal, read committed, snapshot, serializable, strict serializable. Defaults are marked: Cassandra at consistency level ONE and asynchronous Valkey replicas at eventual; MongoDB causally consistent sessions at causal; PostgreSQL default at read committed; PostgreSQL repeatable read and TiDB at snapshot; SQLite, PostgreSQL serializable, and CockroachDB default at serializable; FoundationDB and etcd at strict serializable or linearizable. Higher rungs cost more coordination latency.](2026-10-15-where-the-json-lives/fig-06-consistency.svg)

*\[reconstruction\]*: a simplification. Replica consistency (eventual, causal) and transaction isolation (read committed, snapshot) are different axes, and the true hierarchy is a partial order, not a ladder. Placements are *\[from the docs\]* of each engine. The useful lesson is that the default is a choice someone made for you. Read it.

Defaults vary by more than most teams realise. PostgreSQL runs `READ COMMITTED` unless told otherwise, so two concurrent read-modify-write transactions on a `jsonb` document can lose an update without any error. Use `SELECT … FOR UPDATE`, a version column, or an in-place `jsonb_set`. Cassandra lets each query choose its consistency level, and reads and writes at `QUORUM` overlap so a read sees the latest acknowledged write. MongoDB has defaulted to write concern `majority` since 5.0. *\[from the docs\]* FerretDB inherits whatever its PostgreSQL backend commits. *\[reconstruction\]*

### What this means for JSON written all day

Two consequences follow for the workload this page is about. First, a document updated in place on a B-tree engine pays for a whole new row version each time, however small the change. PostgreSQL can make that a HOT update, with no new index entries, when the new version fits on the same page and no indexed column changed. *\[from the docs\]* Promoting a hot JSON field to an indexed column therefore has a write cost as well as a read benefit. §7 and §9 return to this. Second, an append-only event log is the access pattern LSM and columnar engines were built for. The current document belongs in a B-tree engine, and its history belongs in one that merges. That split is the shape of the stack in §10. *\[reconstruction\]*

### Replication and sharding

Replication comes in three topologies. **Single-leader** (Postgres, MySQL, Valkey) sends every write through one node: simple to reason about, with a write ceiling at one machine. **Multi-leader** (CouchDB, BDR-style setups) accepts writes in several places and must resolve conflicts afterwards. **Leaderless** (Cassandra, Dynamo-style) writes to N replicas and relies on quorum overlap plus read repair. Sharding is a separate decision. It splits data by key so writes scale out. The bill comes as cross-shard joins, cross-shard transactions (two-phase commit or a consensus layer), and rebalancing when a shard grows hot.

### The rule

One well-tuned node handles far more than most products need. On this machine, SQLite in WAL mode with `synchronous=FULL` committed 2,427 single-event inserts per second, each one durable. With `synchronous=NORMAL` it committed 56,767, and batching 100 per transaction reached 280,925 rows per second. *\[measured here\]* PostgreSQL on a server-class disk is in the same order of magnitude per node. *\[reconstruction\]* Distribute when a measured limit forces you to (write throughput, dataset size, or a regional latency requirement), and not before. Each step up the ladder or out to more shards is paid for on every request after it.

## 05 · Free and open source, checked

"Free and open source" is checkable. A licence is on the Open Source Initiative's approved list or it is not. Between March 2024 and May 2025 that answer changed for several databases people run every day. Licence text tells you what you may do today. Governance tells you whether the text can change.

### The definition this guide uses

Open source here means an OSI-approved licence: PostgreSQL Licence, MIT, BSD-3-Clause, Apache 2.0, the GPL family, AGPLv3. Public domain (SQLite) also qualifies. Source-available licences publish the code but restrict who may run it and for what. That list includes the Server Side Public License (SSPL), the Business Source License (BSL), RSALv2, the Elastic License v2 and ScyllaDB's 2025 licence. Each restricts a use, usually "do not offer this as a service", which criterion 6 of the Open Source Definition, "No Discrimination Against Fields of Endeavor", forbids. *\[from the docs\]* MongoDB withdrew the SSPL from OSI review in 2019. *\[from the docs\]* BSL code turns open source on a "change date" up to four years after release: a delay, not a promise about the next release.

**Figure 7. The licence ledger, March 2024 to October 2026**

| Project | Before | After | When | Governed by | Self-hosting it behind your SaaS |
|----|----|----|----|----|----|
| **Redis** | BSD-3 | RSALv2 / SSPLv1, then AGPLv3 added as a third option in Redis 8 | Mar 2024; May 2025 | Redis Ltd. | Open source again via AGPLv3; modify-and-serve means publishing patches. |
| **Valkey** | fork of Redis 7.2.4 | BSD-3; 9.0 GA 21 Oct 2025 | Mar 2024 | Linux Foundation | No conditions beyond attribution. Same protocol, so swapping is cheap. |
| **Elasticsearch** | Apache 2.0, then SSPL / ELv2 (2021) | AGPLv3 added as an option | Aug 2024 | Elastic N.V. | AGPLv3 rule applies. OpenSearch (Apache 2.0) is the foundation fork. |
| **MongoDB** | AGPLv3 | SSPL | Oct 2018 | MongoDB Inc. | Not open source. Offering it as a service triggers SSPL §13. |
| **DocumentDB** (Postgres extension) | new, MIT | MIT; FerretDB 2.0 builds on it (Apache 2.0) | joined LF 25 Aug 2025 | Linux Foundation | Open source; MongoDB wire protocol via FerretDB, on PostgreSQL. |
| **CockroachDB** | BSL + CCL, with a free Core build | Core retired; one Enterprise licence | late 2024 | Cockroach Labs | Not open source. Free terms are a revocable grant. |
| **ScyllaDB** | AGPLv3 (6.2 is the last) | source-available from 2025.1; free tier capped at 10 TB / 50 vCPU | announced 18 Dec 2024 | ScyllaDB Inc. | Not open source from 2025.1. Pinning 6.2 means no fixes. |
| **MinIO** | AGPLv3 (Apache 2.0 before 2021) | community edition in maintenance mode; repository archived | Dec 2025; early 2026 | MinIO Inc. | Licence intact, project gone. Garage (AGPLv3) or SeaweedFS (Apache 2.0). |
| **NATS** | Apache 2.0 | Apache 2.0. Synadia's move to BSL was blocked. | Apr 2025; settled 1 May 2025 | CNCF (trademark held by LF) | Unchanged: foundation governance working. |

*\[from the docs\]* Dates and licence names come from each project's announcements and licence files. *\[reconstruction\]* The last column is my reading, not legal advice. Every row that left open source has one company in the "governed by" column.

### Governance outranks licence text

A company holding all the copyrights, through a contributor licence agreement or its own staff, can ship the next version under any terms. Redis, Elasticsearch, MongoDB, CockroachDB and ScyllaDB did. The PostgreSQL Global Development Group has no owner who could relicense; copyright is spread across thousands of contributors. Apache, Linux Foundation and CNCF projects hold the trademark apart from the companies employing the maintainers.

NATS is the proof. In April 2025 Synadia, the main NATS developer, moved to take the project out of the CNCF and ship future versions under the BSL. The Linux Foundation held the trademark, so a relicensed NATS could not keep the name. On 1 May 2025 they settled: NATS stays in the CNCF under Apache 2.0. *\[from the docs\]* The licence text did not stop the change. The trademark did.

### AGPLv3, precisely

The AGPL is an OSI-approved copyleft licence with one extra clause. Section 13 says that if you *modify* the program, your modified version must offer its Corresponding Source to every user who interacts with it over a network. *\[from the docs\]* You may run an unmodified AGPL server internally, or behind your own network service, without publishing anything. Your application talks to it over a protocol and is not a derivative work. *\[reconstruction\]* If you patch the server and expose it, you owe your patches to its users. Garage, Redis 8 under its AGPL option, and Elasticsearch under its AGPL option fall here. Some companies ban AGPL outright; check policy before code.

### The rule this guide follows

Put the **system of record** on an OSI-licensed, foundation-governed or public-domain project: PostgreSQL, SQLite, DuckDB (MIT, stewarded by the non-profit DuckDB Foundation). Accept single-vendor projects only where swapping is cheap: a wire-compatible alternative exists, or the data can be rebuilt. Valkey fits the hot path; anything speaking RESP replaces it, and a cache refills. ClickHouse, Apache 2.0 but one company, fits event history; its tables reload from Parquet in object storage. *\[reconstruction\]* MinIO showed that losing a vendor is survivable when the interface is a standard. You lose the tool, not the data.

## 06 · Best practices that survive production

Most database incidents trace back to a short list: a lock held too long, a missing index, a migration that blocked writes, a backup nobody had restored, a transaction left open over lunch. The practices below each prevent one item on that list. They are written for PostgreSQL, and the SQLite equivalent is noted where one exists.

### Design: queries first, tables second

Write the queries down before you write the tables. List the five reads that run most often and the one write that must never be lost. Then choose keys and indexes to serve them. A schema designed from an entity diagram serves the diagram. *\[reconstruction\]*

**Primary keys.** Use `bigint GENERATED ALWAYS AS IDENTITY` or a UUIDv7. PostgreSQL 18 ships `uuidv7()`. *\[from the docs\]* A UUIDv7 starts with a millisecond timestamp, so consecutive inserts land on the right-most B-tree leaf, the way a sequence does. A random UUIDv4 sends each insert to a random leaf. On a large, hot table that means more pages dirtied per insert, more full-page images in WAL after each checkpoint, and a working set as large as the whole index. *\[reconstruction\]*

**Constraints are documentation that executes.** `NOT NULL`, `CHECK`, `UNIQUE` and foreign keys enforced by the database hold even for the script someone runs at 2 a.m. without going through your application. A `CHECK (jsonb_typeof(body) = 'object')` costs almost nothing per write.

**Indexes answer a measured query.** Add one when `EXPLAIN (ANALYZE, BUFFERS)` shows a sequential scan on a query you actually run. In PostgreSQL 18, `ANALYZE` includes buffer counts by default. *\[from the docs\]* Every index is maintained on every insert, and on every update that touches its column. An index can also disqualify an update from the HOT path ([next section](#07-what-a-database-does-with-json)). Indexes cost write throughput, so each one has to earn its place.

### Migrations: expand, migrate, contract

A schema change and an application deploy are two clocks that never tick together. During a rolling deploy, old and new code run side by side against the same schema. So every schema state must work with the code version before it and the code version after it. Expand/contract makes that true by splitting one breaking change into several compatible ones (Figure 8).

**Figure 8. Replacing owner text with owner_id bigint in six steps**

![Expand, migrate, contract shown as six alternating steps on two lanes. Schema lane: step 1 expand, add nullable owner_id and create its index concurrently; step 3 backfill in batches with lock_timeout set and validate a NOT VALID foreign key; step 6 contract, drop the old owner column. Application lane: step 2 version 2 writes both columns and reads the old one; step 4 version 3 reads owner_id and still writes both; step 5 version 4 writes owner_id only. A bottom row shows the oldest app version you can still roll back to after each step: v1, v1, v2, v2, v3, and after the contract step none earlier than v4.](2026-10-15-where-the-json-lives/fig-08-expand-contract.svg)

*\[reconstruction\]* This is the standard pattern applied to one rename. Purple steps change the schema and blue steps change the code. Steps alternate, and only the last one takes away a rollback option, so it runs last and runs alone.

Three PostgreSQL mechanics make each step non-blocking. `CREATE INDEX CONCURRENTLY` builds an index without taking a lock that blocks inserts, updates or deletes. It cannot run inside a transaction block, and a failed build leaves an `INVALID` index that you must drop. *\[from the docs\]* Adding a foreign key or `CHECK` as `NOT VALID` and running `VALIDATE CONSTRAINT` later moves the full-table scan under a weaker lock. *\[from the docs\]* And `lock_timeout` stops the most common outage of all. An `ALTER TABLE` waiting for its `ACCESS EXCLUSIVE` lock behind one long transaction makes every later query on that table queue behind it.

    SET lock_timeout = '2s';             -- fail fast, retry later; never queue
    ALTER TABLE sessions ADD COLUMN owner_id bigint;      -- nullable: no rewrite
    CREATE INDEX CONCURRENTLY sessions_owner_id ON sessions (owner_id);
    ALTER TABLE sessions ADD CONSTRAINT sessions_owner_fk
      FOREIGN KEY (owner_id) REFERENCES users (id) NOT VALID;
    ALTER TABLE sessions VALIDATE CONSTRAINT sessions_owner_fk;

### Connections and transactions

PostgreSQL starts one operating-system process per connection. *\[from the docs\]* Two thousand idle clients means two thousand backends. Put PgBouncer in transaction mode in front, or rely on a bounded driver pool when you have a single application. Transaction mode does not preserve session state between transactions: `SET`, advisory locks, temporary tables. Recent PgBouncer releases (1.21 and later) can track protocol-level prepared statements. Keep transactions short, and never make a network call inside one. Set `idle_in_transaction_session_timeout`, and on PostgreSQL 17 or later `transaction_timeout`, so a stuck client cannot hold locks or hold back vacuum indefinitely.

### Backups, observability, security, lifecycle

A backup you have never restored is only a hope. Point-in-time recovery for PostgreSQL means a base backup plus archived WAL. pgBackRest and WAL-G both do this against S3-compatible storage. Litestream does the same for SQLite by streaming WAL frames to an object store. Schedule a restore into a scratch instance and alert when it fails. For observability, `pg_stat_statements` ranks queries by total time, and `auto_explain` logs the plans of slow ones. For security, give the application a role that owns nothing and is not a superuser. Require TLS. Where tenants share tables, enable row-level security, keeping in mind that table owners bypass it unless the table is `FORCE ROW LEVEL SECURITY`. *\[from the docs\]*

Append-only tables need a retention plan from day one. Partition them by time with declarative partitioning. Expiring a month is then `DETACH PARTITION … CONCURRENTLY` followed by `DROP TABLE`: a metadata change, with no `DELETE` leaving millions of dead tuples for autovacuum. Autovacuum is how MVCC gives disk space back. Any transaction left open pins the oldest row version every session might still need, so vacuum cannot reclaim anything newer. Watch `pg_stat_activity` for `xact_start` older than a few minutes.

**Figure 9. The operating checklist, one row per concern, with the open-source tool**

- **Design**: Write the queries first. Keys are bigint identity or uuidv7() . Constraints live in the database. Tool: PostgreSQL 18 itself.
- **Indexes**: Add one per measured query. Verify with EXPLAIN (ANALYZE, BUFFERS) . Drop indexes nobody uses; pg_stat_user_indexes.idx_scan = 0 finds them.
- **Migrations**: Expand/contract. CREATE INDEX CONCURRENTLY , NOT VALID then VALIDATE , lock_timeout . Tools: plain SQL files in a migration runner such as sqitch or dbmate.
- **Connections**: PgBouncer in transaction mode. Short transactions. idle_in_transaction_session_timeout and transaction_timeout .
- **Observability**: pg_stat_statements , auto_explain , log_min_duration_statement . Export through postgres_exporter to Prometheus.
- **Security**: A least-privilege app role. No superuser. TLS required. Row-level security where tenants share tables.
- **Backups**: pgBackRest or WAL-G for point-in-time recovery. Litestream for SQLite. Restore on a schedule and alert when a restore fails.
- **Retention**: Partition append-only tables by time, then detach and drop. Archive old partitions to Parquet in object storage before dropping them.

Blue rows are decided when you write the schema, purple rows apply while the system runs, and green rows protect data over time. The tools are the ones this guide uses later. Each is OSI-licensed. *\[reconstruction\]*

## 07 · What a database does with JSON

Every database that accepts JSON turns it into something else on disk. What it turns it into decides three things: what a query can find without reading the whole value, what an index can cover, and how many bytes one changed field costs. The last of these surprises people most. No mainstream engine edits a stored document in place.

### Text or binary

PostgreSQL has two JSON types. `json` stores an exact copy of the input text, including whitespace, key order and duplicate keys, and must reparse it on every function call. `jsonb` stores a decomposed binary form. It does not keep whitespace or key order, and for a duplicate key only the last value survives. The manual describes it as "slightly slower to input due to added conversion overhead, but significantly faster to process, since no reparsing is needed." *\[from the docs\]* Use `jsonb` unless you must reproduce the input byte for byte, as with a signed webhook payload.

### There is no partial update

`jsonb_set(body, '{usage,input_tokens}', '42')` looks like a field edit. It is a function that returns a new `jsonb` value. The `UPDATE` then writes that value into a new row version, because PostgreSQL's MVCC never overwrites a row in place. Large values make this expensive. TOAST is triggered "when a row value to be stored in a table is wider than TOAST_TUPLE_THRESHOLD bytes (normally 2 kB)". *\[from the docs\]* Wide fields are first compressed with `pglz` or `lz4`, whichever `default_toast_compression` or the column says. If the row is still too wide, they are moved out of line into chunk rows of about 2 kB in a side table. An `UPDATE` that leaves a TOASTed column alone pays no TOAST cost. *\[from the docs\]* An update to the document itself *is* a change to that column, so the whole value is recompressed and rewritten (Figure 10).

**Figure 10. What one changed integer costs in a 40 KB PostgreSQL jsonb document**

![Five steps for an UPDATE that calls jsonb_set to change one integer in a 40 kilobyte jsonb document. One: the whole value is detoasted, decompressed and rebuilt as a new 40 kilobyte value. Two: MVCC writes a new tuple version and marks the old one dead; this is a HOT update only if no indexed column changes and the page has room. Three: because the row exceeds the 2 kilobyte TOAST threshold, the new value is compressed with pglz or lz4 and stored out of line in new chunks of about 2 kilobytes. Four: WAL records cover the heap tuple, every new TOAST chunk and any index entries, with full-page images on the first touch of a page after a checkpoint. Five: the old tuple and old chunks remain until vacuum reclaims them. Below, the alternative: promote the hot counter to its own bigint column, so one update writes one narrow tuple and can be HOT.](2026-10-15-where-the-json-lives/fig-10-jsonb-update.svg)

*\[from the docs\]* The 2 kB threshold, the HOT conditions and the rule that unchanged TOAST values are not rewritten come from the PostgreSQL manual's Database Physical Storage chapter (the TOAST and Heap-Only Tuples sections). *\[reconstruction\]* The 40 KB document and the chunk count (40 KB ÷ ~2 kB) are illustrative. The practical point is that bytes written scale with document size, not with the size of the edit.

So incrementing one counter in a 1 MB document rewrites the compressed size of that megabyte, plus the WAL to describe it, plus a dead copy for vacuum to clean up. *\[reconstruction\]* The manual says the same thing about locking: "any update acquires a row-level lock on the whole row. Consider limiting JSON documents to a manageable size". *\[from the docs\]*

### Indexing a document

PostgreSQL offers three tools, from widest to narrowest. A GIN index with the default `jsonb_ops` class indexes every key and value. It serves `?`, `?|`, `?&`, `@>`, `@?` and `@@`. A GIN index with `jsonb_path_ops` serves only `@>`, `@?` and `@@`, but "is usually much smaller … and the specificity of searches is better". *\[from the docs\]* For a path you already know you will filter on, a B-tree expression index is smaller still and supports ranges and sorting. Alternatively, promote the path to a generated column. PostgreSQL 18 makes generated columns `VIRTUAL` by default, and virtual columns cannot be indexed, so declare it `STORED`. *\[from the docs\]*

    CREATE INDEX sessions_body_gin  ON sessions USING gin (body jsonb_path_ops);
    CREATE INDEX sessions_status    ON sessions ((body->>'status'));
    ALTER TABLE sessions ADD COLUMN owner text
      GENERATED ALWAYS AS (body->>'owner') STORED;

    -- PostgreSQL 17+: SQL/JSON, including JSON_TABLE
    SELECT t.* FROM sessions s,
      JSON_TABLE(s.body, '$.todos[*]'
        COLUMNS (id int PATH '$.id', done boolean PATH '$.done')) AS t
    WHERE NOT t.done;

On the query side, jsonpath arrived in PostgreSQL 12. PostgreSQL 17 added the SQL-standard `JSON_TABLE`, `JSON_EXISTS`, `JSON_QUERY` and `JSON_VALUE`. `JSON_TABLE` "presents the results as a relational view, which can be accessed as a regular SQL table". *\[from the docs\]*

### The other engines

SQLite has built-in JSON functions and the `->` / `->>` operators. Since 3.45.0 (January 2024) it also has JSONB, a binary encoding stored in a `BLOB` that the `jsonb_*` functions read without reparsing. Expression indexes and generated columns work the same way as in PostgreSQL. *\[from the docs\]* MongoDB stores BSON, a typed binary format with length prefixes, and caps a document at 16 MiB. FerretDB 2 stores BSON inside PostgreSQL through the DocumentDB extension. ClickHouse's `JSON` type, production-ready since 25.3, infers a type for every path and stores each path as its own subcolumn. Analytics over JSON events then reads only the columns a query names. *\[from the docs\]*

**Figure 11. Five on-disk representations of the same JSON**

- **Text JSON**: The bytes as sent: PostgreSQL json , SQLite TEXT , a .json file. Every read reparses the whole value, and no index can see inside it without an expression.
- **PostgreSQL jsonb**: Decomposed binary. Keys are deduplicated and stored in an internal order, and there is no whitespace. Values are TOASTed above about 2 kB. GIN, B-tree expression and generated-column indexes all work. Any edit rewrites the whole value.
- **SQLite JSONB**: A binary encoding of the JSON tree, stored as a BLOB (3.45.0+). It skips reparsing but is internal to SQLite, not an interchange format. Expression indexes work. An edit rewrites the row.
- **BSON**: MongoDB, and FerretDB on DocumentDB. Typed (dates, int64, decimal128), length-prefixed and traversable. 16 MiB per document. Indexes are per path.
- **ClickHouse JSON**: Each path is a typed subcolumn (25.3+). The format is columnar and compressed per path, and built for append and scan. Changing a stored row is a heavyweight operation, not the hot path.

Red means parsed on every read. Blue is a row-store binary that can be queried by path. Purple is a document-store binary. Green is columnar. *\[from the docs\]* The point is the one-way trade: the more a format is built for querying paths, the less it suits growing one document forever.

### The rule

Keep documents small and stable in shape. Anything that grows without bound, such as messages, log lines, tool calls or usage ticks, belongs in rows, one per event, keyed to the document. Then each new event is an `INSERT` of a few hundred bytes, not a rewrite of everything that came before. *\[reconstruction\]* The [next section](#08-five-ways-to-keep-a-document-current-measured) measures what that difference costs.

## 08 · Five ways to keep a document current, measured

One session document, updated 1,500 times, five ways, each update timed. The result is plain. The cost of a durable write is the fsync, not the format. Throughput depends on how many writes share one fsync.

### Setup

The benchmark is `_compute.py`, beside this post. It uses only the standard library and writes `_numbers.json`. The document is a synthetic agent session (usage block, 24 todos, 600-byte notes), 2,879 bytes serialised; the docstring's "~4 KB" is stale. Each write variant runs 1,500 updates. The machine has 8 CPUs, Linux 6.12, Python 3.14.4 and SQLite 3.46.1, with fsync landing on a cloud block device. *\[measured here\]* The five ways are a whole-file rewrite, a JSONL append, a whole-document `UPDATE` in SQLite, an in-place `json_set` or `jsonb_set` in SQLite, and an event-row `INSERT`. The SQLite variants run in WAL mode under `synchronous=FULL` and `NORMAL`, both per row and batched 100 to a transaction.

The file-rewrite variant copies the pattern xo-space uses for its own state file (`services/cowork_agent/xo_cowork_state.py`, lines 54–62: write a temp file, `fsync`, `os.replace`). *\[from the tree\]* In `_compute.py` it is lines 44–54:

    def file_rewrite(fsync):
        path = tmp / "state.json"; d = dict(BASE)
        def run(n):
            for k in range(n):
                d["usage"]["input_tokens"] += 1; d["updated_at"] = time.time()
                fd, t = tempfile.mkstemp(dir=tmp, suffix=".json")
                with os.fdopen(fd, "w") as f:
                    json.dump(d, f)
                    if fsync: f.flush(); os.fsync(f.fileno())
                os.replace(t, path)
        return run

### Writes

**Figure 12. Cost per update, fourteen variants, log scale**

![Horizontal bar chart on a logarithmic axis from 1 microsecond to 10 milliseconds, cost per update for fourteen ways of keeping a 2,879-byte JSON document current, measured over 1,500 updates each. Values in microseconds per operation: file tmp + fsync + os.replace 1,464.5; JSONL append, fsync each line 1,153.9; SQLite FULL whole-doc UPDATE 991.0; SQLite FULL jsonb_set 417.6; SQLite FULL event INSERT 412.0; SQLite FULL json_set (text) 411.1; file tmp + os.replace, no fsync 241.3; SQLite NORMAL whole-doc UPDATE 34.1; SQLite NORMAL json_set (text) 21.3; SQLite NORMAL event INSERT 17.6; JSONL append, fsync every 100 14.0; SQLite NORMAL jsonb_set 10.8; SQLite FULL 100 INSERTs per txn 8.4; SQLite NORMAL 100 INSERTs per txn 3.6. Bars that fsync on every commit cluster between 411 and 1,465 microseconds; batched or non-fsyncing variants fall between 3.6 and 241 microseconds.](2026-10-15-where-the-json-lives/fig-12-writes.svg)

*\[measured here\]* Values are taken from `_numbers.json → write`, each the mean over 1,500 operations, and bar lengths are log₁₀ of microseconds. The blue bars sit on one plateau because each pays one fsync. Nothing below that plateau is durable per write against power loss.

Read Figure 12 by colour. Every blue bar pays one fsync per update and lands between 411.1 and 1,464.5 µs. The file rewrite is the most expensive. Without the fsync it costs 241.3 µs, so the fsync accounts for about 1,223 µs, or 84% of the total. *\[measured here\]* A single-row SQLite commit under `FULL` costs about 412 µs, whether it is a text `json_set` (411.1), a `jsonb_set` (417.6) or a new event row (412.0). At that level the format does not matter. One writer gets about 2,430 durable commits a second (1,000,000 ÷ 411.1).

Batching changes the result more than anything else does. A hundred `INSERT`s in one transaction cost 8.4 µs each under `FULL`. That is 840 µs per commit, one fsync shared by a hundred rows, which works out to 49 times cheaper per row than committing each one. JSONL with an fsync every 100 lines drops from 1,153.9 to 14.0 µs, 82 times cheaper. PostgreSQL does the same thing for you under concurrency: many sessions commit behind one WAL flush, and `commit_delay` can widen that window deliberately. *\[from the docs\]*

### What `synchronous=NORMAL` buys, and what it costs

The orange bars skip the fsync at commit. SQLite in WAL mode with `synchronous=NORMAL` syncs only at checkpoints. Its documentation says WAL mode under NORMAL "is always consistent" but loses durability: "A transaction committed in WAL mode with synchronous=NORMAL might roll back following a power loss or system crash." Transactions still survive an application crash. *\[from the docs\]* That trade takes a single event insert from 412.0 to 17.6 µs, 23 times faster. PostgreSQL's equivalent is `synchronous_commit = off`, which can be set per transaction. The manual bounds the loss window at "three times wal_writer_delay", 600 ms at the 200 ms default, and is explicit that the risk "is of data loss, not data corruption". *\[from the docs\]* For usage counters and heartbeats, losing the last half-second on power loss is usually acceptable. For payments it is not.

The file rewrite without fsync (241.3 µs) is in a worse position. It costs seven times more than a NORMAL-mode SQLite update and gives no clearer guarantee. Neither this script nor `xo_cowork_state.py` fsyncs the directory after `os.replace`, and without that the rename itself may not reach disk before a power cut. *\[reconstruction\]*

### Partial versus whole

With the fsync removed, the format starts to show. Under NORMAL, a whole-document `UPDATE` costs 34.1 µs, an in-database `json_set` on text costs 21.3, and a `jsonb_set` on the binary form costs 10.8. The first serialises 2,879 bytes in Python and ships them. The second parses and re-emits text inside SQLite. The third does neither. Every variant still rewrites the whole row in SQLite. The saving comes from not serialising and not parsing. *\[measured here\]* Under FULL, whole-document updates cost 991.0 µs against about 412 for the others. That gap is far larger than serialisation can explain. The whole-document test ran first on a fresh WAL file, so part of the gap is probably WAL growth and should not be credited to the format. *\[reconstruction\]*

### Reads

**Figure 13. Parse the file, or ask the database**

![Bar chart on a logarithmic axis from 1 microsecond to 100 milliseconds. Point read of one field: parsing a whole JSON file takes 32.1 microseconds, extracting it from SQLite by id takes 7.1, 4.5 times less. Filter on owner and status across 20,000 documents: a full scan takes 22,061.9 microseconds, the same query with an expression index takes 9.2, about 2,400 times less. The query plan reads SEARCH docs USING INDEX docs_owner_status.](2026-10-15-where-the-json-lives/fig-13-reads.svg)

*\[measured here\]* Values come from `_numbers.json → read`: 5,000 point reads per variant, 20 unindexed filters, and 2,000 indexed ones. Red bars read and parse everything. Green bars let the database find the row.

Reading one field from a file means reading and parsing all of it: 32.1 µs, against 7.1 µs for `body->>'$.status'` by primary key in SQLite, 4.5 times less. The filter is the larger lesson. Counting failed sessions for one owner across 20,000 documents costs 22,061.9 µs as a full scan and 9.2 µs with an expression index on the two paths. That is 2,398 times less, and the plan confirms `SEARCH docs USING INDEX docs_owner_status` (Figure 13). *\[measured here\]* A directory of JSON files has no index, so every filter is the 22 ms case, growing linearly with the number of files.

Storage is not free. The 20,000-document SQLite file, including that index, measured 82,550,784 bytes, against an estimated 57,662,100 bytes of text JSON. A 2.9 KB row on a 4 KB page wastes much of each page. *\[reconstruction\]*

### Caveats

These results come from one machine, one document size, and one writer with no concurrency. Python interpreter overhead is included in every number. The fsync cost belongs to this cloud disk; a laptop NVMe with a volatile write cache will report less. PostgreSQL was not measured. Its numbers will differ, but the same logic applies: one fsync per commit sets the ceiling, and group commit is how you raise it. *\[reconstruction\]*

## 09 · The hybrid schema

Do not choose between columns and JSON. Put each field where its use puts it. A field you filter, sort, join, aggregate, or constrain on gets a real column. A field that changes far more often than the rest of the document also gets one. Everything else stays in a JSONB body that can grow new keys without a migration.

That is the rule of promotion, and it is the whole design. It is the default because the two halves fail in opposite ways. An all-columns schema turns every new optional field into a migration on a hot table, which is the cost [§6](#06-best-practices-that-survive-production) spends a figure avoiding. An all-JSON schema turns every filter into a scan or a guessed GIN query, and it turns every counter bump into a rewrite of the whole document, which is what [§7](#07-what-a-database-does-with-json) showed and [§8](#08-five-ways-to-keep-a-document-current-measured) measured. *\[reconstruction\]*

**Figure 14. Anatomy of a hybrid row: typed columns, one JSONB body, and the history beside it**

![A documents row drawn as nine cells. Seven typed columns in blue: id as a uuidv7, tenant_id, kind, status, updated_at, and schema_version; version in orange because it carries optimistic concurrency. A green generated column owner_id is derived from the body by a thin blue arrow from the owner key. The body cell is purple, JSONB under 64 kB, holding the long tail: agent, usage, todos, tags, notes. To the right, three indexes: a partial B-tree on tenant, kind and updated_at for live rows, a GIN jsonb_path_ops index on the body for containment, and a B-tree on owner_id. Below, an append-only document_events table split into monthly partitions. A thick black arrow shows one transaction that updates the row and inserts an event together. A dashed purple arrow shows that the snapshot can be rebuilt by folding the events.](2026-10-15-where-the-json-lives/fig-14-hybrid-row.svg)

*\[reconstruction\]* — the recommended shape, not a measured system. Blue cells are the relational contract, the purple body is the part allowed to change shape, green is derived, orange carries concurrency. The hot document stays small because its history lives beside it, not inside it.

### The table

Here is the shape in PostgreSQL 18 DDL. `uuidv7()` is new in 18 and gives time-ordered keys, so inserts land at the right edge of the primary-key B-tree. *\[from the docs\]* The body must be a JSON object and must stay under 64 kB. The `pg_column_size` guard measures the value as it is handed to the constraint, before the stored tuple is compressed, so treat it as a rough ceiling rather than a byte-exact one. *\[reconstruction\]*

    CREATE TABLE documents (
      id             uuid        PRIMARY KEY DEFAULT uuidv7(),
      tenant_id      uuid        NOT NULL,
      kind           text        NOT NULL,
      status         text        NOT NULL DEFAULT 'active',
      version        integer     NOT NULL DEFAULT 1,
      schema_version smallint    NOT NULL DEFAULT 1,
      body           jsonb       NOT NULL
                     CHECK (jsonb_typeof(body) = 'object')
                     CHECK (pg_column_size(body) < 65536),
      owner_id       text        GENERATED ALWAYS AS (body ->> 'owner') STORED,
      updated_at     timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX documents_live      ON documents (tenant_id, kind, updated_at DESC)
                                     WHERE status <> 'archived';
    CREATE INDEX documents_owner     ON documents (tenant_id, owner_id);
    CREATE INDEX documents_body_path ON documents USING gin (body jsonb_path_ops);

Two details in that block are deliberate. First, `owner_id` says `STORED`. PostgreSQL 18 made virtual the default for generated columns, but a virtual generated column cannot carry an index in 18, and the only reason to promote this path is to index it. *\[from the docs\]* Second, the GIN index uses `jsonb_path_ops`. It is smaller and faster than the default `jsonb_ops`, but it answers only containment (`@>`) and jsonpath, not key-existence (`?`). Add it only if you have ad-hoc containment queries over the long tail. If every filter is on a promoted column, drop it and stop paying its write cost. *\[from the docs\]*

The history is a separate table, append-only and range-partitioned by month, so retention means detaching a partition, not running a `DELETE`:

    CREATE TABLE document_events (
      document_id uuid        NOT NULL REFERENCES documents (id),
      seq         bigint      GENERATED ALWAYS AS IDENTITY,
      at          timestamptz NOT NULL DEFAULT now(),
      type        text        NOT NULL,
      payload     jsonb       NOT NULL,
      PRIMARY KEY (document_id, at, seq)
    ) PARTITION BY RANGE (at);

    CREATE TABLE document_events_2026_10 PARTITION OF document_events
      FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

A primary key on a partitioned table has to include the partition key, which is why `at` is in it. *\[from the docs\]* Create next month's partition ahead of time from a scheduled job; `pg_partman` does this for you if you would rather not write the job. *\[reconstruction\]*

### Writes: patch with a version check

Every write states which version it read. If someone else wrote in between, zero rows match and the caller re-reads and retries. No row lock is held across the caller's think time, and the losing writer finds out instead of silently overwriting the winner:

    UPDATE documents
       SET body       = body || $3::jsonb,      -- shallow merge of top-level keys
           version    = version + 1,
           updated_at = now()
     WHERE id = $1 AND version = $2
    RETURNING version;                          -- no row back = conflict, re-read

Know what `||` does. On two JSONB objects it is a *shallow* merge: top-level keys in the right operand replace the same keys on the left, whole. A patch of `{"usage": {"input_tokens": 5}}` replaces the entire `usage` object and drops `output_tokens`. *\[from the docs\]* For a nested field use `jsonb_set(body, '{usage,input_tokens}', to_jsonb($3::bigint))`, or, better, ask whether that field changes often enough to be a column. A counter bumped on every model call is the clearest case for promotion. It changes on every call while the rest of the document changes rarely, and [§7](#07-what-a-database-does-with-json) showed that every change rewrites the whole value. *\[reconstruction\]*

### Validation lives in two places

The full contract belongs at the edge. A Pydantic v2 model or a JSON Schema rejects bad input with a useful error before it reaches the database. The database keeps a cheap guard that no code path can skip: the type and size `CHECK`s above, plus `NOT NULL` on the promoted columns. If you want the full schema enforced in the database too, Supabase's `pg_jsonschema` extension (Apache 2.0) adds `jsonb_matches_schema(schema, body)` for use in a `CHECK`. *\[from the docs\]* It validates on every write, so measure it on your largest documents before you adopt it. *\[reconstruction\]*

### Schema versions: upgrade on read

`schema_version` lets the body change shape without a stop-the-world backfill. Readers run a chain of small pure functions, one per version step, then write the upgraded body back on their next write. Old rows migrate as they are touched, and a background job sweeps up the rest. xo-space already stamps its `todos.json` with `"schema": 1` (`services/cowork_agent/visualizer/todos_store.py`, line 144), so the habit exists. *\[from the tree\]*

    def _v1_to_v2(body: dict) -> dict:          # v2 made "tags" mandatory
        return {**body, "tags": body.get("tags", [])}

    def _v2_to_v3(body: dict) -> dict:          # v3 moved "tokens" under "usage"
        body = dict(body)
        tokens = body.pop("tokens", 0)
        return {**body, "usage": {"input_tokens": tokens, **body.get("usage", {})}}

    UPGRADES = {1: _v1_to_v2, 2: _v2_to_v3}
    CURRENT = 3

    def upgrade(version: int, body: dict) -> tuple[int, dict]:
        while version < CURRENT:
            body = UPGRADES[version](body)
            version += 1
        return version, body

### Snapshot plus events

The hot document holds current state only. Anything that grows without bound, such as messages, tool calls, status transitions, or usage samples, goes to `document_events` in the same transaction as the snapshot update (Figure 14). This keeps the snapshot small enough that a rewrite stays cheap. It gives you an audit trail for free, and it means a corrupted or mis-migrated snapshot can be rebuilt by folding its events. The event table is also what feeds analytics in [§10](#10-a-free-stack-for-loading-and-storing-json-all-day). *\[reconstruction\]*

### The same shape in SQLite

SQLite 3.45 and later store JSONB as a `BLOB`, so declare the body as `BLOB` in a `STRICT` table and write it through `jsonb()`. STRICT allows only `INT`, `INTEGER`, `REAL`, `TEXT`, `BLOB` and `ANY` as column types. *\[from the docs\]* I ran this block on SQLite 3.46.1. A text JSON value inserted without `jsonb()` is rejected with `cannot store TEXT value in BLOB column`, so STRICT does the format check for you, and the filter on `(tenant_id, owner_id, status)` plans as `SEARCH documents USING INDEX documents_owner_status`. *\[measured here\]*

    CREATE TABLE documents (
      id             TEXT    PRIMARY KEY,
      tenant_id      TEXT    NOT NULL,
      kind           TEXT    NOT NULL,
      status         TEXT    NOT NULL DEFAULT 'active',
      version        INTEGER NOT NULL DEFAULT 1,
      schema_version INTEGER NOT NULL DEFAULT 1,
      body           BLOB    NOT NULL
                     CHECK (json_valid(body, 8) AND json_type(body) = 'object'),
      updated_at     TEXT    NOT NULL,
      owner_id       TEXT    GENERATED ALWAYS AS (body ->> '$.owner') VIRTUAL
    ) STRICT;
    CREATE INDEX documents_owner_status ON documents (tenant_id, owner_id, status);

Unlike PostgreSQL 18, SQLite can index a `VIRTUAL` generated column, so the promoted path costs no extra storage in the table itself, only in the index. The `8` passed to `json_valid` asks whether the value is well-formed JSONB. *\[from the docs\]* Generate `id` in the application as a UUIDv7 string. SQLite has no built-in generator. *\[reconstruction\]*

## 10 · A free stack for loading and storing JSON all day

One database of record and three helpers, each with one job. Everything below is under an OSI-approved licence. The database of record is the one part you cannot swap cheaply, so it is the part where foundation governance matters most.

Figure 15 is the whole design. The rest of this section takes it one box at a time: what the box does, its licence, and the one setting that matters.

**Figure 15. The recommended architecture: one system of record, three helpers, one history pipe**

![An application box on the left, running FastAPI with Pydantic v2, orjson and psycopg 3. A dashed purple edge goes to Valkey 9, which holds sessions, presence, rate limits, pub/sub and caches, all with TTLs. A thin blue edge goes through PgBouncer in transaction mode to PostgreSQL 18, which holds hybrid documents, monthly event partitions, an outbox, and blob pointer rows. PostgreSQL ships WAL to pgBackRest, which stores backups in S3-compatible object storage. A second thin blue edge sends large blobs from the application straight to object storage: SeaweedFS, Garage or Ceph RGW. Below PostgreSQL, the outbox feeds Debezium or logical replication into NATS JetStream or Kafka 4, which loads ClickHouse with its JSON type or Parquet files that DuckDB reads in place from object storage.](2026-10-15-where-the-json-lives/fig-15-stack.svg)

*\[reconstruction\]* — a recommended design, not a deployed one. Only the blue boxes hold the truth. Everything purple can be wiped and rebuilt, everything green is a copy or a blob addressed from a row, and the orange pipe runs strictly after commit, so analytics can lag but never disagree with the record.

### System of record: PostgreSQL 18

PostgreSQL licence, governed by the PostgreSQL Global Development Group; no company can relicense it. 18 (25 September 2025) is the production pick. 19 is at Beta 4 (24 September 2026), not yet GA. *\[from the docs\]* It holds the hybrid tables from [§9](#09-the-hybrid-schema), the events, the outbox, and pointer rows for blobs. The one setting to decide on purpose is `synchronous_commit`. Leave it `on` for the record. Set it to `off` per transaction (`SET LOCAL`) only for writes you can afford to lose in a crash; the loss window is bounded and the database is never corrupted. *\[from the docs\]* Put PgBouncer (ISC) in front in transaction mode, because PostgreSQL forks a process per connection. Back up with pgBackRest (MIT) to object storage, and restore on a schedule. *\[from the docs\]*

### Embedded or single process: SQLite in WAL mode

If one process owns the data, SQLite (public domain) in WAL mode is the record, and there is no server to run. §8 measured it here at 411 µs per durable `json_set` with `synchronous=FULL` and 8.4 µs per event when 100 share a transaction. *\[measured here\]* Litestream (Apache 2.0) streams the WAL to S3-compatible storage for point-in-time recovery. It runs as a separate process beside the application, and shipped its 0.5.x releases through late 2025. *\[from the docs\]*

### If you need the MongoDB API: FerretDB on PostgreSQL

If existing drivers or tools speak the MongoDB wire protocol, the open answer is FerretDB 2 (Apache 2.0), which translates that protocol onto PostgreSQL with the DocumentDB extension (MIT, Linux Foundation since August 2025). MongoDB itself is under SSPL, which is source-available, not open source. *\[from the docs\]* Backups, roles and WAL stay PostgreSQL's. Check FerretDB's compatibility list against the commands you use. *\[reconstruction\]*

### Hot, ephemeral JSON: Valkey 9

Sessions, presence, rate limits, pub/sub and caches change constantly and are worthless an hour later. That is Valkey's job. It is BSD-3-licensed under the Linux Foundation, and 9.0 went GA on 21 October 2025. *\[from the docs\]* The `valkey-bundle` image ships a JSON module if you want path-level reads and writes, but plain strings holding orjson output are usually enough. *\[from the docs\]* The settings that matter are `maxmemory` with an explicit `maxmemory-policy` (`allkeys-lru` for a cache, `volatile-lru` if keys without a TTL must never be evicted). Turn on `appendonly yes` with `appendfsync everysec` only if a restart must not empty it, and accept that it can still lose about a second. *\[from the docs\]* Redis 8 is also an option now that it offers AGPLv3, but Valkey's foundation governance is the safer bet for something you will not want to migrate twice. *\[reconstruction\]*

### Large JSON and artefacts: object storage plus a pointer row

Anything over roughly 1 MB and written once, such as transcripts, exports, model outputs, or uploaded files, goes to S3-compatible storage under a content-addressed key. A row in `blob_refs` holds the key, the SHA-256, the size and the owner, so the database still answers "what exists and who owns it" without holding the bytes. *\[reconstruction\]* MinIO's community edition went into maintenance mode in December 2025 and the repository was archived in early 2026, so do not start there. *\[from the docs\]* SeaweedFS (Apache 2.0) is the default for one site. Garage (AGPLv3, v2.0 in June 2025) is built for small geo-distributed clusters; running it unmodified carries no obligation, while modifying it and serving it over a network does. Ceph RGW suits sites that already run Ceph. RustFS (Apache 2.0) is newer and not yet a default. *\[from the docs\]*

### History out: outbox, CDC, and a stream

Never write to the database and then publish to a stream as two separate steps. One of them will fail alone. Write an `outbox` row in the same transaction as the change, and let a relay publish it after commit. The relay can be Debezium (Apache 2.0, moving from Red Hat to the Commonhaus Foundation since late 2024) reading the WAL, or PostgreSQL's native logical replication. *\[from the docs\]* Fan out through NATS JetStream (Apache 2.0, CNCF), which stays open after the 2025 relicensing attempt failed. If you already operate Kafka, Apache Kafka 4 runs without ZooKeeper (KRaft only, March 2025). *\[from the docs\]* Consumers must be idempotent, because every relay here delivers at least once. *\[reconstruction\]*

### Analytics on the JSON events: ClickHouse or DuckDB

Keep analytical scans off the operational tables. ClickHouse (Apache 2.0) has a production-ready `JSON` column type from 25.3. It stores each path as its own typed subcolumn, so a `GROUP BY` over one field of a billion events reads one column. *\[from the docs\]* If the volume fits one machine, DuckDB (MIT) queries Parquet or NDJSON in place, with no server. Export closed monthly partitions to Parquet and point DuckDB at the bucket. *\[reconstruction\]*

### The thin layers

PostgREST (MIT) puts an HTTP API over tables if you want one without writing handlers. In Python, use psycopg 3 (LGPL-3.0, which allows use from code under any licence) or asyncpg (Apache 2.0). Use orjson (Apache 2.0 or MIT) or msgspec (BSD-3) for fast encoding and decoding, and Pydantic v2 (MIT) for validation at the edge. *\[from the docs\]*

None of this has to be built on day one. Figure 16 shows the same design at three sizes.

**Figure 16. Three sizes of the same design: move up only when a measured limit forces it**

- **Single node**: ONE PROCESS OWNS THE DATA SQLite in WAL mode with the §9 tables. Litestream streams the WAL to object storage. An in-process dict or functools.lru_cache instead of Valkey. DuckDB over exported Parquet for analysis. Nothing to operate but a file and a sidecar.
- **One team server**: SEVERAL PROCESSES, ONE BOX OR VM PostgreSQL 18 behind PgBouncer, pgBackRest to object storage with a tested restore, Valkey for sessions and caches, an outbox table with a small relay. This tier covers most products for their whole life.
- **Scale-out**: A MEASURED CEILING, NOT A FEAR OF ONE Add streaming read replicas, then time partitioning everywhere, then CDC into ClickHouse for analytics. Shard writes with Citus or move to YugabyteDB only when one primary's write rate is the measured limit.

*\[reconstruction\]* — the schema and the repository interface ([§11](#11-implementing-it-from-json-files-to-tables)) stay the same across all three. That is what makes it safe to start small: moving up a tier swaps a backend, not a data model.

### Do not

- **Use Valkey or Redis as the database of record.** They are memory-first, and their persistence is a recovery aid, not a durability contract.
- **Put unbounded arrays in one document.** Messages, events and samples are rows. A document that grows forever makes every update slower than the last.
- **Store multi-megabyte blobs in JSONB.** Every change rewrites the TOASTed value and its WAL ([§7](#07-what-a-database-does-with-json)). Put the bytes in object storage and keep a pointer row.
- **Pick a single-vendor, source-available engine for the system of record.** The licence can change under you, as [§5](#05-free-and-open-source-checked) shows it has for several since 2018.

## 11 · Implementing it: from JSON files to tables

xo-space keeps its state in JSON files today, and parts of it are written well. The move to tables does not start with a database. It starts with an interface, so the database can arrive behind it one phase at a time, and every phase can be undone with a flag.

### What the tree does now

The careful version is the machine-local state file. In `services/cowork_agent/xo_cowork_state.py`, lines 54–68, `_atomic_write` creates a temp file in the same directory, writes, flushes, fsyncs the file, and only then renames it over the target: *\[from the tree\]*

    def _atomic_write(payload: dict[str, Any]) -> None:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        fd, tmp_path = tempfile.mkstemp(prefix=".state-", suffix=".json", dir=STATE_DIR)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, sort_keys=True)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_path, STATE_FILE)
        except Exception:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
            raise

That is the right recipe for one JSON file. `mkstemp` gives a unique name, so two writers cannot share a temp file. The fsync puts the bytes on disk before the rename publishes them, and a failure cleans up after itself. One step is missing: nothing fsyncs the *directory*. On Linux the rename itself becomes durable only when the directory entry is flushed, so after a power cut the file can still show the old version. It will be whole, but stale. *\[reconstruction\]*

The manifest writer is lighter. In `services/xo_manifest.py`, lines 134–141, `_write_atomic` writes a fixed `.tmp` sibling and renames it, with no fsync at all. Its docstring adds "Caller holds the lock", an `asyncio.Lock` declared at line 75: *\[from the tree\]*

    async def _write_atomic(manifest: dict) -> Path:
        """Write `manifest` to xo.json via temp-file + rename. Caller holds the lock."""
        path = _xo_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        tmp.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        os.replace(tmp, path)
        return path

This is atomic against a crashing *process*: a reader sees the old file or the new one, never half of each. It is not durable against a crashing *machine*. Without an fsync, the filesystem may persist the rename before the data, and after power loss the file can come back empty or truncated. *\[reconstruction\]* The watcher's shared helper, `write_json_atomic` in `services/cowork_agent/visualizer/atomic_write.py` (lines 22–38), follows the same no-fsync pattern for `stats.json`, `todos.json` and the session lists. Its JSONL sibling `append_jsonl` does fsync after each batch (line 58). *\[from the tree\]*

Readers see a deliberately closed set. In `services/cowork_agent/scopes.py`, lines 82–89, the BFF can read exactly these paths under a project's `.xo/`, and nothing else: *\[from the tree\]*

        # Closed set of portable files the BFF endpoints read. Activity is
        # also a closed path, but lives outside _xo_root in _activity_path.
        # P4 / P6 — the route layer can't ask for an arbitrary path.
        _STATS:           str = "stats.json"
        _TODOS:           str = "todos.json"
        _TIMELINE:        str = "timeline.jsonl"
        _SESSIONSLIST:    str = "sessions/sessionslist.json"
        _SESSIONS_AUG:    str = "sessions/sessions-augment.json"

`todos.json` is the one file with two writers, the watcher's sink and the agent-facing todo endpoints, and they coordinate through `visualizer.flock.locked` (`scopes.py` line 168). The lock is honest about its limits. In `services/cowork_agent/visualizer/flock.py`, lines 88–101, it retries a non-blocking `LOCK_EX` for `_DEADLINE_S = 2.0` seconds (line 44), then proceeds anyway: *\[from the tree\]*

            deadline = time.monotonic() + _DEADLINE_S
            while True:
                try:
                    fcntl.flock(fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break  # acquired
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        logger.warning(
                            "flock: could not acquire %s within %.1fs; proceeding without lock",
                            lock_path, _DEADLINE_S,
                        )
                        break
                    time.sleep(_RETRY_INTERVAL_S)
            yield

The docstring states the trade plainly: "the worst case is a single lost update that the next tick / call recovers". *\[from the tree\]* That is a reasonable choice for a todo list. It is also the exact problem a version column and a transaction remove.

### What files do well, and where they stop

Files are inspectable with `cat`, diffable in git, readable by any agent, and need no operations at all. Keep those properties wherever humans or tools read the state. They stop in four places. Every change rewrites the whole file, 1,464.5 µs per durable update in §8. There is one writer at a time, and the lock can time out. There is no query without loading every file. And there is no transaction across files, so `todos.json` and `timeline.jsonl` can disagree after a crash. *\[measured here\]*

### Step one: a repository interface

Put every read and write behind five methods. Callers never see paths or SQL, and each method states its concurrency contract in its signature: every write names the version it read. *\[reconstruction\]*

    from typing import Any, Protocol

    class Conflict(Exception):
        """The caller's expected version is stale: re-read, re-apply, retry."""

    class DocumentStore(Protocol):
        def get(self, doc_id: str) -> tuple[int, dict[str, Any]] | None: ...
        def put(self, doc_id: str, body: dict[str, Any], *, expected: int | None) -> int: ...
        def patch(self, doc_id: str, path: tuple[str, ...], value: Any, *, expected: int) -> int: ...
        def append_event(self, doc_id: str, type: str, payload: dict[str, Any]) -> None: ...
        def query(self, *, tenant_id: str, owner_id: str | None = None,
                  status: str | None = None, limit: int = 100) -> list[dict[str, Any]]: ...

The first backend is the files themselves, wrapping today's helpers. It changes nothing on disk, and it gives every caller the new contract before any database exists.

### The SQLite backend

Against the §9 SQLite tables, this is the constructor and `patch`. I ran it on SQLite 3.46.1. A stale `expected` raises `Conflict` and rolls back the event insert with it. *\[measured here\]*

    class SqliteStore:
        def __init__(self, path: str, *, durable: bool = True):
            self.db = sqlite3.connect(path, isolation_level=None)   # we issue BEGIN ourselves
            self.db.execute("PRAGMA journal_mode=WAL")
            self.db.execute("PRAGMA synchronous=" + ("FULL" if durable else "NORMAL"))
            self.db.execute("PRAGMA busy_timeout=5000")              # wait for the writer, don't fail

        def patch(self, doc_id: str, path: tuple[str, ...], value: Any, *, expected: int) -> int:
            self.db.execute("BEGIN IMMEDIATE")                       # take the write lock up front
            try:
                cur = self.db.execute(
                    "UPDATE documents SET body = jsonb_set(body, ?, json(?)), version = version + 1,"
                    " updated_at = ? WHERE id = ? AND version = ?",
                    ("$." + ".".join(path), json.dumps(value), _now(), doc_id, expected))
                if cur.rowcount != 1:
                    raise Conflict(doc_id, expected)
                self.db.execute(
                    "INSERT INTO events (doc_id, at, type, payload) VALUES (?, ?, 'set', jsonb(?))",
                    (doc_id, _now(), json.dumps({"path": path, "value": value})))
                self.db.execute("COMMIT")
            except BaseException:
                self.db.execute("ROLLBACK")
                raise
            return expected + 1

Three choices in it are deliberate. `BEGIN IMMEDIATE` takes the write lock at the start. A plain `BEGIN` starts as a reader and upgrades on its first write. In WAL mode that upgrade fails at once with `SQLITE_BUSY` if another writer committed in between, and `busy_timeout` cannot help, because waiting would not change the reader's snapshot. *\[from the docs\]* The `json(?)` wrapper makes the bound text be read as JSON, not stored as a string. The `durable` flag is the §8 decision. `FULL` costs about 0.4 ms per commit here and survives power loss. `NORMAL` costs about 11 µs and survives an application crash, but the last commits can roll back after an OS crash or power cut. *\[measured here\]* Use `FULL` for the record and `NORMAL` for caches of something you can recompute. Never paste field names from user input into `path`.

### The PostgreSQL backend

The same method with psycopg 3 and a `psycopg_pool.ConnectionPool`. A Python list of strings binds as `text[]`, which is what `jsonb_set` takes for a path. *\[from the docs\]*

    from psycopg.types.json import Jsonb

    def patch(self, doc_id, path, value, *, expected):
        with self.pool.connection() as conn, conn.transaction():
            row = conn.execute(
                """UPDATE documents
                      SET body = jsonb_set(body, %s, %s), version = version + 1,
                          updated_at = now()
                    WHERE id = %s AND version = %s
                RETURNING version""",
                (list(path), Jsonb(value), doc_id, expected),
            ).fetchone()
            if row is None:
                raise Conflict(doc_id, expected)
            conn.execute(
                "INSERT INTO document_events (document_id, type, payload) VALUES (%s, 'set', %s)",
                (doc_id, Jsonb({"path": list(path), "value": value})),
            )
        return row[0]

Two caveats. `jsonb_set` creates a missing *last* key but not missing parents, so `('usage', 'input_tokens')` silently does nothing when `usage` is absent. Seed whole sub-objects in `put`. And psycopg 3 prepares statements after five executions by default. Behind PgBouncer in transaction mode, either run a PgBouncer release with `max_prepared_statements` set or pass `prepare_threshold=None`. *\[from the docs\]*

### Batch the hot counters

Usage counters and presence timestamps change on every model call. Do not give each change its own commit. Accumulate increments in memory, keyed by document and path, and flush every 250 ms or every 100 changes in one transaction. §8 shows the reason. On this machine one durable SQLite commit costs about 412 µs, while 100 inserts sharing a commit cost 8.4 µs each, about 49 times cheaper. *\[measured here\]* A crash loses at most one window of counts, and the window is a number you choose. If that is not acceptable for a field, the field is not a counter and should not be batched. *\[reconstruction\]*

**Figure 17. Moving xo-space off flat files without downtime: five phases, each reversible**

![Five phases left to right, joined by thick black sequence arrows. Phase 1, interface over files: reads and writes go to files and the change is only code. Phase 2, dual-write with the database as a shadow: reads from files, writes to files and the database, database errors only logged. Phase 3, backfill and compare: old files are loaded into the database and a nightly diff must reach zero. Phase 4, read from the database: files are still written, now as a projection. Phase 5, stop writing files: the database is the record and a read-only JSON export remains for humans. Underneath, a source-of-truth bar is orange for files across phases 1 to 3 and blue for the database across phases 4 and 5. Each phase has a red rollback box naming how to undo it.](2026-10-15-where-the-json-lives/fig-17-migration.svg)

*\[reconstruction\]* — a plan, not something xo-space has done. The only irreversible moment is phase 5, and even that has a way back, because the database can always regenerate the files. The cut-over in phase 4 is safe only after phase 3's diff has stayed at zero for long enough to cover every writer.

### The migration, phase by phase

Figure 17 is the plan. During phase 2 the files still decide what is true, so a bug in the new path costs a log line, not data. Phase 3 is where you learn what the files actually contain. Expect old schema versions, missing keys, and the occasional empty or truncated file that a power cut left behind a no-fsync writer. The upgrade-on-read functions from §9 earn their place here. *\[reconstruction\]* The phase 4 cut-over flips reads per file kind, starting with the least-read (`stats.json`) and ending with `todos.json`, whose two writers become two transactions with version checks and no lock file.

Keep exporting JSON after phase 5 if anything outside the service reads it. Agents read `.xo/`, and humans `cat` it. Write the export from the database with the existing `write_json_atomic`, add the directory fsync, mark the file as generated, and stop treating it as an input. The files remain a view of the data, not its source. *\[reconstruction\]*

## 12 · Where this advice stops

The stack in §10 assumes one primary, one region, and an access pattern that a general engine serves well. Each of those assumptions has a breaking point. Past it, you add a specialised system next to PostgreSQL rather than replace it.

- **Low-latency writes in several regions at once.** One primary means one region takes every write, and every other region pays a round trip. If users on two continents must both commit in milliseconds, look at YugabyteDB or TiDB (both Apache 2.0), or at CRDT-based designs that merge concurrent edits. Either way you take on clock, conflict, and operational complexity that §4 described. *\[reconstruction\]*
- **Billions of events a day.** At that rate the event table stops being a side table and becomes the system. Make Kafka the log and ClickHouse the store you query. Keep PostgreSQL for the metadata and the documents that people edit. *\[reconstruction\]*
- **Deep graph traversal.** Recursive CTEs and Apache AGE handle a few hops. Queries that walk six or more hops over a large, dense graph belong in a graph engine. *\[reconstruction\]*
- **Relevance-ranked full-text search.** PostgreSQL's `tsvector` finds matches, but tuned relevance, faceting, and typo tolerance are a search engine's job. Run OpenSearch (Apache 2.0) beside the record and feed it from the same outbox. Never write to it directly. *\[reconstruction\]*
- **Vectors at hundreds of millions.** pgvector (PostgreSQL licence) is the right default below that, because embeddings stay in the same transaction as the rows they describe. Above it, a dedicated engine such as Qdrant (Apache 2.0) handles index build and memory better. *\[reconstruction\]*

The evidence has limits too. Every number in §8 comes from one 8-CPU machine, one 2,879-byte document, a single Python thread, and no concurrency. The ratios travel; the microseconds do not. PostgreSQL was not run here. Its behaviour in this post is cited from its documentation, not measured. *\[measured here\]* And licences move. The ledger in §5 is correct as of 1 October 2026, and its MinIO entry changed within the last year. Check the date before relying on it.

> **The decision rule**
>
> If one process owns the data, use SQLite in WAL mode with Litestream. Otherwise use PostgreSQL 18. In either, put each JSON path in a real column if you filter, join, constrain, or update it often, and keep the rest in a small JSONB body. Append history as rows, never inside the document. Put ephemeral state in Valkey, large blobs in object storage behind a pointer row, and analytics in ClickHouse or DuckDB fed from an outbox. Batch what can share an fsync. Choose foundation-governed projects for anything you cannot swap in a week. Add anything else only when a measured limit forces it, and name that limit when you do. *\[reconstruction\]*

## 13 · Sources

### PostgreSQL

- [PostgreSQL 18 Released!](https://www.postgresql.org/about/news/postgresql-18-released-3142/) (25 September 2025): asynchronous I/O, `uuidv7()`, virtual generated columns as the default.
- [PostgreSQL 19 Beta 1 Released!](https://www.postgresql.org/about/news/postgresql-19-beta-1-released-3313/) and [PostgreSQL 19 Beta 4 Released!](https://www.postgresql.org/about/news/postgresql-19-beta-4-released-3386/) (24 September 2026): the 19 status and the features reverted before GA.
- PostgreSQL 18 documentation: [JSON types](https://www.postgresql.org/docs/18/datatype-json.html) (json vs jsonb, `jsonb_ops` vs `jsonb_path_ops`), [JSON functions and operators](https://www.postgresql.org/docs/18/functions-json.html) (`||`, `jsonb_set`, jsonpath, SQL/JSON), [GIN indexes](https://www.postgresql.org/docs/18/gin.html), [TOAST](https://www.postgresql.org/docs/18/storage-toast.html), [asynchronous commit](https://www.postgresql.org/docs/18/wal-async-commit.html) (`synchronous_commit` and its loss window), [UUID functions](https://www.postgresql.org/docs/18/functions-uuid.html), [generated columns](https://www.postgresql.org/docs/18/ddl-generated-columns.html), [table partitioning](https://www.postgresql.org/docs/18/ddl-partitioning.html).

### SQLite

- [JSON functions](https://sqlite.org/json1.html) and [the JSONB format](https://sqlite.org/jsonb.html) (3.45+): `jsonb()`, `jsonb_set`, `->`/`->>`, `json_valid` flags.
- [Write-ahead logging](https://sqlite.org/wal.html) and [PRAGMA synchronous](https://sqlite.org/pragma.html#pragma_synchronous): what `NORMAL` does and does not survive in WAL mode.
- [STRICT tables](https://sqlite.org/stricttables.html), [generated columns](https://sqlite.org/gencol.html), [transactions](https://sqlite.org/lang_transaction.html) (`BEGIN IMMEDIATE`).

### Other engines and licences

- [ClickHouse 25.3 release](https://clickhouse.com/blog/clickhouse-release-25-03) and [JSON data type](https://clickhouse.com/docs/sql-reference/data-types/object-data-type): production-ready JSON with per-path subcolumns.
- [FerretDB 2.0](https://blog.ferretdb.io/ferretdb-releases-v2-faster-more-compatible-mongodb-alternative/) and [DocumentDB joins the Linux Foundation](https://opensource.microsoft.com/blog/2025/08/25/documentdb-joins-the-linux-foundation/) (25 August 2025).
- [Redis is now available under the AGPLv3 open source license](https://redis.io/blog/agplv3/) (Redis 8, May 2025).
- [Valkey 9.0 GA](https://www.linuxfoundation.org/press/valkey-9.0-delivers-performance-and-resiliency-for-real-time-workloads) (21 October 2025) and [valkey-bundle](https://valkey.io/topics/valkey-bundle/) (the JSON module).
- [ScyllaDB: why we're moving to a source-available license](https://www.scylladb.com/2024/12/18/why-were-moving-to-a-source-available-license/) (18 December 2024).
- [CockroachDB ends its free Core edition](https://www.infoq.com/news/2024/09/cockroachdb-license-concerns/) (InfoQ, September 2024).
- [Elasticsearch is open source, again](https://www.elastic.co/blog/elasticsearch-is-open-source-again) (AGPL option, 29 August 2024).
- [MinIO community edition in maintenance mode, and S3 alternatives](https://infoq.com/news/2025/12/minio-s3-api-alternatives/) (InfoQ, December 2025).
- [CNCF and Synadia settle; NATS stays Apache 2.0](https://www.theregister.com/2025/05/02/cncf_synadia_nats/) (The Register, 2 May 2025).
- [Apache Kafka 4.0](https://www.confluent.io/blog/latest-apache-kafka-release/): ZooKeeper removed, KRaft only.

### Components in the stack

- [Litestream](https://github.com/benbjohnson/litestream) (Apache 2.0): SQLite WAL replication to S3-compatible storage.
- [pgBackRest](https://pgbackrest.org/) (MIT) and [PgBouncer](https://www.pgbouncer.org/) (ISC): backups with PITR and connection pooling, including `max_prepared_statements`.
- [Debezium moving to the Commonhaus Foundation](https://debezium.io/blog/2024/11/04/debezium-moving-to-commonhaus/) (Apache 2.0, CDC).
- [SeaweedFS](https://github.com/seaweedfs/seaweedfs) (Apache 2.0) and [Garage](https://garagehq.deuxfleurs.fr/) (AGPLv3): self-hosted S3-compatible object storage.
- [DuckDB](https://duckdb.org/) (MIT): in-process analytics over Parquet and NDJSON.
- [pg_jsonschema](https://github.com/supabase/pg_jsonschema) (Apache 2.0) and [PostgREST](https://github.com/PostgREST/postgrest) (MIT).
- [psycopg 3: prepared statements](https://www.psycopg.org/psycopg3/docs/advanced/prepare.html) (`prepare_threshold`), [orjson](https://github.com/ijl/orjson), [msgspec](https://github.com/msgspec/msgspec).

### xo-space files read (read-only)

- `services/cowork_agent/xo_cowork_state.py`: `_atomic_write`, lines 54–68.
- `services/xo_manifest.py`: `_write_atomic`, lines 134–141, and the `asyncio.Lock` at line 75.
- `services/cowork_agent/scopes.py`: the closed file set, lines 82–89, and the flock note at line 168.
- `services/cowork_agent/visualizer/flock.py`: `_DEADLINE_S` at line 44 and the bounded wait, lines 88–101.
- `services/cowork_agent/visualizer/atomic_write.py`: `write_json_atomic` (lines 22–38) and `append_jsonl` (fsync at line 58).
- `services/cowork_agent/visualizer/todos_store.py`: the `"schema": 1` stamp, line 144.

**Provenance.** Engine behaviour, release dates, and licence terms are taken from the project documentation, release notes, and coverage listed above, and are stated as of 1 October 2026. Licences and governance change, so check them again before you rely on them. The xo-space excerpts are quoted verbatim from its tree with line numbers, and the tree was not modified. Every number marked *measured here* comes from `_compute.py` on one 8-CPU Linux machine, Python 3.14.4 and SQLite 3.46.1: one 2,879-byte document, 1,500 updates per method, one thread, no concurrent writers, on a cloud block device whose fsync latency sets most of the results. The SQLite DDL and the `SqliteStore` code in §9 and §11 were run on that SQLite version. PostgreSQL was not installed or run here. Its DDL, the psycopg 3 code, and all PostgreSQL performance behaviour follow the documentation and have not been executed, so they need a test against a real PostgreSQL 18 before use. The recommendations, the stack, the tier boundaries, the migration plan, and the decision rule are judgement, marked *reconstruction*. They are not claims about what any named project or company does.
