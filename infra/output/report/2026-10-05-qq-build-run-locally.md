# Build and run any repo locally

Guide, 2026-10-05. Requested by suraj. This is the 2026-10-04 "Build and run
any repo locally" guide (quirq internal planning docs, not public), kept here
as a guide (not re-verified against that doc in this repo). Only the dated
facts are refreshed.

## What this covers

Every quirq-ai repo with an `infra/repo.toml` manifest is built and run the
same way, in five steps: **get the code, sync, build, test, run**. `qq` runs
the same build and test steps CI runs for each kind; CI itself runs them from
workflows infra-config generates, not through `qq` yet. You never need to know
the repo's language or package manager; the manifest says. Today two repos
have a manifest:

- **xo-space**: Python, a FastAPI server and the Space UI.
- **innernet**: Next.js, searching folders on your machine.

For any other GitHub repo, the last section shows how to run it by hand and
then give it a manifest, using **quirq-ai/sync** as the example.

Each repo goes in its own practice folder, `~/qq-try/<repo>`, never your own
checkout. Every command runs inside `( … )`, so your current folder and
environment never change, and each is safe to run again: it removes what a
previous try left behind first. Stop a running server (**Ctrl-C**) before you
re-run that repo's step 1, because step 1 deletes the folder it runs from.

## Before you start

- **qq and qqsync installed once**, as in
  [qq setup: depot and sync only](2026-10-05-qq-setup-depot-sync.md) (steps 1
  and 2). This page uses the same full paths, `~/qq-tools/depot/bin/qq` and
  `~/qq-tools/qqsync/bin/qqsync`, so it works without the optional PATH step.
- **git** and **python3 3.11.4 or newer**, which that page already checks.
- **On Linux x86_64**, nothing else: `qq` downloads the exact Python and Node
  each repo pins.
- **On a Mac**, bring the pinned toolchains yourself, because they are built
  for Linux only so far (still true on 2026-10-05: `qq sync` stops with "no
  pin for platform …"):
  - for xo-space, **CPython 3.14.8** from python.org;
  - for innernet, **Node 24** and **pnpm** on your `PATH`: for example Node 24
    from nodejs.org, then `sudo npm install -g pnpm`; or
    `brew install node@24 pnpm`, with node@24's `bin` folder first on your
    `PATH`.
- **Disk:** about 2 GB for all three examples, most of it innernet's packages,
  xo-space's venv and the toolchains, plus pnpm's shared caches
  (`~/.cache/pnpm` and `~/.local/share/pnpm` on Linux, `~/Library/Caches/pnpm`
  and `~/Library/pnpm` on a Mac).

## The loop, for any repo with a manifest

Run every step inside the repo's folder. `NAME` is the repo, `TARGET` one of
its targets.

| Step | Command | What it does |
|---|---|---|
| 1. Get the code | `qq fetch https://github.com/quirq-ai/NAME` (Linux), or `git clone` (Mac) | clones the repo; on Linux it also runs step 2 |
| 2. Sync | `qq sync` | downloads the pinned toolchains, checks each digest, links them under `.qq/toolchains/` |
| 3. See the targets | `qqsync show infra/repo.toml` | prints the manifest; each entry under `targets` has a `name` and a `kind` |
| 4. Build | `qq build [TARGET]` | installs dependencies (`.qq/venv` for Python, `node_modules` for Node) and builds |
| 5. Test | `qq test [TARGET]` | builds, then tests; results in `.qq/out/results.json`, JUnit in `.qq/out/junit` |
| 6. Run | the repo's own start command, using what step 4 set up | see the examples below |

On a Mac, add `--toolchain python=ROOT` to `qq build` and `qq test` for a
pinned Python, where `ROOT/bin/python3` is CPython at exactly the pinned
version. A Node app needs nothing extra: with no synced Node, `qq` uses the
`node` and `pnpm` on your `PATH` and checks the major version.

**There is no `qq run` yet.** The kinds know how to start a service, but
`qq`'s only goal commands today are `build` and `test`. Until it has one,
step 6 starts the app with the environment `qq` built:

- a **python-service** target: `.qq/venv/bin/python <entry>`, where `entry` is
  in the target's `params` (or is the first `.py` in its `srcs`);
- a **node-app** target: `pnpm start`, with `.qq/toolchains/node/bin` first on
  `PATH`.

## Example 1: xo-space (Python)

xo-space's manifest has five targets: **server** (kind `python-service`, entry
`server.py`, port from `PORT`) and four `pytest` targets, **tests**,
**route-parity**, **plugin-bundles** and **space-ui-syntax**. It pins CPython
3.14.8.

**1. Get the code.** On Linux, `qq fetch` clones and syncs in one go; the last
line prints `python`.

```sh
( set -e; mkdir -p ~/qq-try; cd ~/qq-try; rm -rf xo-space; ~/qq-tools/depot/bin/qq fetch https://github.com/quirq-ai/xo-space; ls xo-space/.qq/toolchains )
```

On a Mac, clone it with git instead:

```sh
( set -e; mkdir -p ~/qq-try; cd ~/qq-try; rm -rf xo-space; git clone -q https://github.com/quirq-ai/xo-space )
```

**2. Build the server.** This checks the Python version, makes `.qq/venv`,
installs `requirements.txt` and byte-compiles every source. Each step prints
`PASS`.

```sh
( cd ~/qq-try/xo-space || exit 1; ~/qq-tools/depot/bin/qq build server )
```

On a Mac, point it at your CPython 3.14.8:

```sh
( cd ~/qq-try/xo-space || exit 1; ~/qq-tools/depot/bin/qq build server --toolchain python=/Library/Frameworks/Python.framework/Versions/3.14 )
```

**3. Test.** `route-parity` is the quickest check; `qq test` with no target
builds the server and runs all four pytest targets. The two settings in front
keep the test's state inside `~/qq-try`, so your own `~/.quirq` is untouched.
On a Mac, add the same `--toolchain` flag as in step 2.

```sh
( cd ~/qq-try/xo-space || exit 1; QUIRQ_STATE_ROOT=$HOME/qq-try/state RCLONE_CONFIG=$HOME/qq-try/state/rclone.conf ~/qq-tools/depot/bin/qq test route-parity; echo "qq test finished with exit $? (0 means every check passed)" )
```

**4. Run it.** This starts the server from the venv `qq` built, in the
foreground. Open **http://127.0.0.1:5002/space/** in a browser; press
**Ctrl-C** to stop it. Run it again any time.

```sh
( P=~/qq-try/xo-space-home; mkdir -p $P/workspace; cd ~/qq-try/xo-space || exit 1; HOME=$P STAGE=local QUIRQ_SKIP_BOOT_INSTALL=1 AGENT_NAME=claude_code XO_PROJECTS_ROOT=$P/workspace AI_WORKSPACE_ROOT=$P/workspace QUIRQ_STATE_ROOT=$P/.quirq PORT=5002 .qq/venv/bin/python server.py )
```

Why the long line: on start, xo-space writes its state, logs and a skills
folder for every agent it supports into your home folder; on apt-based Linux
it also tries to install rclone, gh and gnupg and runs the agent's setup
script. The settings point all of that at `~/qq-try/xo-space-home` and turn the
installs off (as xo-space's own installer does), so your real setup is
untouched. The cost: this practice copy cannot see your agents' logins, so
chats will not work. To use XO Space for real, install it with the one command
in xo-space's README.

## Example 2: innernet (Next.js)

innernet's manifest has one target, **app** (kind `node-app`), and pins Node
24.21.0, which bundles pnpm. These steps run innernet as its **public demo**:
it searches the quirq-ai repos from an index committed in the repo, so it
reads and writes nothing in your home folder apart from pnpm's caches.
`INNERNET_DEMO=1` makes the build a demo build.

innernet's `main` now includes its first Dependabot roll, typescript 5.9.3 to
7.0.2 (#43, commit `8f383a3`), the commit listed under Sources.

**1. Get the code.** On Linux, `qq fetch` clones and syncs; the last line
prints `node`.

```sh
( set -e; mkdir -p ~/qq-try; cd ~/qq-try; rm -rf innernet; ~/qq-tools/depot/bin/qq fetch https://github.com/quirq-ai/innernet; ls innernet/.qq/toolchains )
```

On a Mac, clone it with git instead; `qq` then uses your own Node 24 and pnpm.

```sh
( set -e; mkdir -p ~/qq-try; cd ~/qq-try; rm -rf innernet; git clone -q https://github.com/quirq-ai/innernet )
```

**2 and 3. Build and test.** For a Node app, `qq test` does both: it checks
the Node version, runs `pnpm install --frozen-lockfile`, `pnpm run build` and
the type check. The same command works on Linux and Mac.

```sh
( cd ~/qq-try/innernet || exit 1; INNERNET_DEMO=1 ~/qq-tools/depot/bin/qq test; echo "qq test finished with exit $? (0 means every check passed)" )
```

**4. Run it.** This starts the built app with the synced Node first on `PATH`
(on a Mac that folder does not exist, so your own Node is used). Open
**http://127.0.0.1:3470** and try **http://127.0.0.1:3470/wiki**; press
**Ctrl-C** to stop it.

```sh
( cd ~/qq-try/innernet || exit 1; PATH="$PWD/.qq/toolchains/node/bin:$PATH" pnpm start )
```

Run step 2 again before step 4 whenever you have built without
`INNERNET_DEMO=1`: that makes a local build, which creates `~/.innernet` as
soon as it starts and shows nothing until you run `pnpm index`. To set that up
for real, follow "Get started" in innernet's README (choose your folders in
`innernet.config.json`, then `pnpm index` and `pnpm dev`).

## A repo with no manifest yet: quirq-ai/sync

Most GitHub repos have no `infra/repo.toml`; neither do the quirq infra repos
themselves. For those, `qq` has nothing to read, so you build and run them the
way their README or CI says, then add a manifest so the next person can use
the loop above. quirq-ai/sync is a Python package whose CI installs it with its
test extras and runs pytest.

**By hand.** Clone, make a venv inside the clone, install, run the tests, then
run the tool it ships. Ends with `158 passed` and `qqsync 0.1.0`.

```sh
( set -e; mkdir -p ~/qq-try; cd ~/qq-try; rm -rf sync; git clone -q https://github.com/quirq-ai/sync; cd ./sync; python3 -m venv .venv; .venv/bin/pip install -q --disable-pip-version-check -e ".[test]"; .venv/bin/python -m pytest -q; .venv/bin/qqsync --version )
```

**Give it a manifest.** This writes a one-target manifest into the practice
copy: a `pytest` target over the package and its tests, plus the
`requirements-dev.txt` that kind installs (here a single line, `-e .[test]`,
the same install as by hand). It then validates the manifest and runs the
loop's test step. The last line lists `tests.pytest.xml`.

```sh
( set -e; cd ~/qq-try/sync; mkdir -p infra
  printf '%s\n' '-e .[test]' > requirements-dev.txt
  printf '%s\n' 'schema = "quirq-repo/1"' '' '[qq]' 'version = "0.1.0"' '' '[[targets]]' 'name = "tests"' 'kind = "pytest"' 'srcs = ["src/**", "tests/**", "pyproject.toml", "requirements-dev.txt"]' > infra/repo.toml
  ~/qq-tools/qqsync/bin/qqsync validate infra/repo.toml
  ~/qq-tools/depot/bin/qq test
  ls .qq/out/junit )
```

The output includes `tests build: missing (declared)`: the `pytest` kind has
no build step, so that line is expected. With no toolchain pinned, `qq` uses
the `python3` on your `PATH`. To match CI, pin one with `qqsync pin` as in the
setup page.

**For any other repo**, pick the kind that fits and write the same file:

| The repo is | Kind | It needs |
|---|---|---|
| a Python server or app | `python-service` | `requirements.txt`; the script to start (`params.entry`, or the first `.py` in `srcs`) |
| Python tests | `pytest` | `requirements-dev.txt` (including pytest), or `params.requirements` naming another file |
| a Next.js app | `node-app` | `package.json` with a `build` script and a `typecheck` or `test` script (or a `tsconfig.json`), and `pnpm-lock.yaml` |

Anything else (Go, Rust, a plain npm project) has no kind yet: run it by hand
as its README says.

To put a manifest into a real repo, commit `infra/repo.toml` in a pull
request. For a quirq-ai repo, also add it to infra-config's
`config/repos.toml` and give it a builder in `config/pipelines.toml`;
infra-config generates the CI workflows from those files, not from the
manifest.

## If something goes wrong

| You see | Why | Do this |
|---|---|---|
| `no pin for platform macos-arm64` from `qq fetch` or `qq sync` | toolchains are built for Linux x86_64 only | use the Mac steps: `git clone`, then `--toolchain` (Python) or your own Node |
| `FAIL … toolchain-check`, log says `pinned CPython 3.14.8, found …` | the Python `qq` found is not the pinned one | install CPython 3.14.8 and pass `--toolchain python=ROOT` |
| `FAIL … toolchain-check`, log says `pinned Node 24, found 22` | your Node is another major version | install Node 24, or run on Linux after `qq sync` |
| `no such file or directory: .qq/venv/bin/python` (zsh) or `.qq/venv/bin/python: No such file or directory` (bash) | the run step came before the build | run step 2 (`qq build server`) first |
| `Could not find a production build in the '.next' directory` | the run step came before the build | run step 2 and 3 (`qq test`) first |
| xo-space prints `Local port 5002 is already in use; using … 5003` | another server holds 5002 | open the address it prints, or stop the other server |
| innernet fails with `EADDRINUSE` on 3470 | another innernet holds the port | stop it first |
| xo-space prints `Composio MCP: not installed` or `skill install skipped … does not exist` | the practice home has no agent logins | expected; install XO Space for real to chat |
| `qq: no infra/repo.toml here or above …` (exit 2) | the repo has no manifest | build it by hand, or add one as shown above |

Every `FAIL` line names its log file; the message is in that log, and
`.qq/out/results.json` lists every step.

## Limits today

As of 2026-10-04, re-checked against the repos on 2026-10-05:

- **No `qq run` yet**, so step 6 uses each repo's own start command.
- **Toolchains for Linux x86_64 only.** On a Mac you install the pinned Python
  and Node yourself.
- **Live on GitHub, not checked here.** Downloading toolchains from ghcr runs
  daily in depot's `e2e-sync` workflow for xo-space and innernet.
- Only `qq` 0.1.0 exists; no depot release tag has been cut yet (none on
  2026-10-05).

**To remove the examples:**

```sh
( rm -rf ~/qq-try/xo-space ~/qq-try/xo-space-home ~/qq-try/state ~/qq-try/innernet ~/qq-try/sync )
```

This keeps `qq` itself and its cache; the setup page's last line removes those
too. It also keeps `~/.innernet`, which exists only if you made a local
innernet build. pip and pnpm keep shared caches: `~/.cache/pip`, plus
`~/.cache/pnpm` and `~/.local/share/pnpm` on Linux or `~/Library/Caches/pnpm`
and `~/Library/pnpm` on a Mac; `pnpm store prune` trims pnpm's.

## Sources

- "Build and run any repo locally", 2026-10-04: quirq internal planning docs
  (not public).
- [depot `741967c`](https://github.com/quirq-ai/depot/tree/741967cc7fba1e486a65856b05c4abb2b1486b8b): [README](https://github.com/quirq-ai/depot/blob/741967cc7fba1e486a65856b05c4abb2b1486b8b/README.md),
  [`e2e-sync.yml`](https://github.com/quirq-ai/depot/blob/741967cc7fba1e486a65856b05c4abb2b1486b8b/.github/workflows/e2e-sync.yml).
- [sync `d97e2f7`](https://github.com/quirq-ai/sync/tree/d97e2f747cfa7dd04fac3cd8e9973eb7eab091dd): [README](https://github.com/quirq-ai/sync/blob/d97e2f747cfa7dd04fac3cd8e9973eb7eab091dd/README.md),
  [`src/qqsync/pins.py`](https://github.com/quirq-ai/sync/blob/d97e2f747cfa7dd04fac3cd8e9973eb7eab091dd/src/qqsync/pins.py).
- [recipes `db6ce0a`](https://github.com/quirq-ai/recipes/tree/db6ce0a19ea0adb6bc71cd553524064bdd18d5b0): [README](https://github.com/quirq-ai/recipes/blob/db6ce0a19ea0adb6bc71cd553524064bdd18d5b0/README.md) (the kinds
  and what each needs).
- [toolchains `44f8f95`](https://github.com/quirq-ai/toolchains/tree/44f8f959458eab59baf46cbae5866a36657f7eeb): [`tools/qqtc.py`](https://github.com/quirq-ai/toolchains/blob/44f8f959458eab59baf46cbae5866a36657f7eeb/tools/qqtc.py).
- [infra-config `310e326`](https://github.com/quirq-ai/infra-config/tree/310e3264f5de3cd9822b3a4712ae0a372b97dac3):
  [`config/repos.toml`](https://github.com/quirq-ai/infra-config/blob/310e3264f5de3cd9822b3a4712ae0a372b97dac3/config/repos.toml),
  [`config/pipelines.toml`](https://github.com/quirq-ai/infra-config/blob/310e3264f5de3cd9822b3a4712ae0a372b97dac3/config/pipelines.toml).
- [xo-space `14b21a4`](https://github.com/quirq-ai/xo-space/tree/14b21a41668bc8124b4cf5cf9cd59fb44dc7d419): [`infra/repo.toml`](https://github.com/quirq-ai/xo-space/blob/14b21a41668bc8124b4cf5cf9cd59fb44dc7d419/infra/repo.toml),
  [README](https://github.com/quirq-ai/xo-space/blob/14b21a41668bc8124b4cf5cf9cd59fb44dc7d419/README.md).
- [innernet `8f383a3`](https://github.com/quirq-ai/innernet/tree/8f383a3d6c28f1e4495ff177efe70dca43d17604): [`infra/repo.toml`](https://github.com/quirq-ai/innernet/blob/8f383a3d6c28f1e4495ff177efe70dca43d17604/infra/repo.toml),
  [README](https://github.com/quirq-ai/innernet/blob/8f383a3d6c28f1e4495ff177efe70dca43d17604/README.md).
