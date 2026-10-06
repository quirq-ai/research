# qq setup: depot and sync only

Guide, 2026-10-05. Requested by suraj. This is the 2026-10-04 "qq setup:
depot and sync only" guide (quirq internal planning docs, not public), kept
here as a guide (not re-verified against that doc in this repo). Only the dated
facts are refreshed: the commits, and a re-check that the Mac behaviour of
`qq sync` has not changed.

New to qq? [The qq guide](2026-10-06-qq-guide.md) covers all of qq in one
simplified page; this page goes into more detail on one part.

## What you get

Two tools, usable on their own without the rest of quirq infra (no gate, no
settings run, no GitHub Apps):

- **depot** is `qq`, the command line. In any repo that has an
  `infra/repo.toml` manifest, `qq sync` fetches the pinned toolchains and
  checks each one against its digest, and `qq build` / `qq test` run the
  targets the same way CI does, leaving JUnit and logs in `.qq/out`.
- **sync** is the manifest itself (schema `quirq-repo/1`) and `qqsync`, the
  only tool that reads or edits it: `qqsync validate`, `show`, `pins`, `pin`.

Every command below runs inside `( … )`, so your current folder and
environment never change, and each one is safe to run again: it removes what a
previous try left behind before starting. Your files live in two folders you
can delete at any time: `~/qq-tools` (the tools) and `~/qq-try` (practice
checkouts and their test state). `qq` also caches under `~/.cache/qq`, and pip
under `~/.cache/pip`. On a fresh Mac, the first `git` or `python3` may offer
to install Apple's command line developer tools: click **Install**.

**Which commits.** The commands were checked on 2026-10-04 against depot
`20d5f1c` and sync `9e66e6c`. On 2026-10-05 their `main` branches are depot
[`741967c`](https://github.com/quirq-ai/depot/tree/741967cc7fba1e486a65856b05c4abb2b1486b8b) and sync [`d97e2f7`](https://github.com/quirq-ai/sync/tree/d97e2f747cfa7dd04fac3cd8e9973eb7eab091dd); the only changes since
are CODEOWNERS, AGENTS.md and a test of CODEOWNERS, so the steps behave the
same. `qq` itself bundles sync `9f4c77e` and recipes `2dc05d0`
([depot `pyproject.toml`](https://github.com/quirq-ai/depot/blob/741967cc7fba1e486a65856b05c4abb2b1486b8b/pyproject.toml)), so in rare edge cases
`qqsync validate` is stricter than `qq`.

## Before you start

- **git**, and **python3 3.11.4 or newer** with its `venv` module (the qq
  launcher needs it). On a Mac, `python3` is often Apple's 3.9; installing
  CPython 3.14.8 from python.org (needed for step 3b anyway) covers this too.
- **Network** to github.com, PyPI, and ghcr.io (toolchains are public; no
  login is used).
- **Which machine.** Toolchains are built for **Linux x86_64 only** so far.
  There, `qq sync` fetches whichever toolchains the repo pins (xo-space:
  CPython 3.14.8; innernet: Node 24.21.0). On a Mac (or any other platform)
  `qq sync` stops with "no pin for platform …", and you supply the toolchain
  yourself (step 3b). Re-checked on 2026-10-05: toolchains still accepts only
  `linux-x86_64` ([`tools/qqtc.py`](https://github.com/quirq-ai/toolchains/blob/44f8f959458eab59baf46cbae5866a36657f7eeb/tools/qqtc.py)), and sync
  still raises that error for any other platform
  ([`src/qqsync/pins.py`](https://github.com/quirq-ai/sync/blob/d97e2f747cfa7dd04fac3cd8e9973eb7eab091dd/src/qqsync/pins.py)).
- **gh** is needed only for `qq upload`, `try`, `land` and `status`, which
  this page does not cover.

Check the basics (prints both versions, or says what is missing):

```sh
( git --version && python3 -c 'import sys; v = sys.version.split()[0]; sys.version_info >= (3, 11, 4) or sys.exit("python3 is " + v + "; need 3.11.4 or newer"); import venv; print("python3", v, "ok")' )
```

## Install (run again any time to update)

**1. depot (`qq`).** Clones depot fresh into `~/qq-tools/depot` and runs it
once. The first run prints "qq: setting up the launcher …", then `qq 0.1.0`.

```sh
( set -e; mkdir -p ~/qq-tools; rm -rf ~/qq-tools/depot; git clone -q https://github.com/quirq-ai/depot ~/qq-tools/depot; ~/qq-tools/depot/bin/qq --version )
```

**2. sync (`qqsync`).** Builds a fresh virtual environment in
`~/qq-tools/qqsync` and installs qqsync from sync's `main`. Ends with
`qqsync 0.1.0`.

```sh
( set -e; mkdir -p ~/qq-tools; rm -rf ~/qq-tools/qqsync; python3 -m venv ~/qq-tools/qqsync; ~/qq-tools/qqsync/bin/pip install -q --disable-pip-version-check "qqsync @ git+https://github.com/quirq-ai/sync@main"; ~/qq-tools/qqsync/bin/qqsync --version )
```

**Optional: type `qq` and `qqsync` without the full path.** This is the one
step that changes your setup: it links just `qq` and `qqsync` into
`~/qq-tools/bin` and adds that folder to `PATH` in `~/.zshrc` once (running it
again adds nothing, and your own `python3` and `pip` stay as they were). Open a
new terminal afterwards. On bash, use `~/.bashrc` on Linux or
`~/.bash_profile` on a Mac. If you added an older line naming
`qq-tools/depot/bin`, delete it. The rest of this page keeps the full paths, so
you can skip this.

```sh
( mkdir -p ~/qq-tools/bin && ln -sf ~/qq-tools/depot/bin/qq ~/qq-tools/qqsync/bin/qqsync ~/qq-tools/bin/ && { grep -qs 'qq-tools/bin:' ~/.zshrc || printf '\nexport PATH="$HOME/qq-tools/bin:$PATH"\n' >> ~/.zshrc; } )
```

## Use it on a repo that already has a manifest

xo-space and innernet both have `infra/repo.toml`. These steps use a fresh
copy of xo-space in `~/qq-try`, never your own checkout.

**3a. On Linux x86_64: clone and sync in one step.** `qq fetch` clones the
repo, then runs `qq sync`, which downloads CPython 3.14.8 from ghcr, checks
its digest, and links it under `.qq/toolchains/`. The last line lists
`python`.

```sh
( set -e; mkdir -p ~/qq-try; cd ~/qq-try; rm -rf xo-space; ~/qq-tools/depot/bin/qq fetch https://github.com/quirq-ai/xo-space; ls xo-space/.qq/toolchains )
```

Then run one target the way CI does. `qq test` with no target runs them all.
The two settings in front keep xo-space's test state inside `~/qq-try`, so
your own `~/.quirq` and `~/.config/rclone` are untouched.

```sh
( cd ~/qq-try/xo-space || exit 1; QUIRQ_STATE_ROOT=$HOME/qq-try/state RCLONE_CONFIG=$HOME/qq-try/state/rclone.conf ~/qq-tools/depot/bin/qq test route-parity; echo "qq test finished with exit $? (0 means every check passed); details in ~/qq-try/xo-space/.qq/out/results.json" )
```

**3b. On a Mac: bring your own Python.** `qq sync` has no Mac toolchain to
fetch, so clone with plain git and point `qq` at an installed CPython. The
version must be exactly the pinned one, **3.14.8**: install it from python.org
(the macOS installer puts it under
`/Library/Frameworks/Python.framework/Versions/3.14`). Otherwise the first
check fails with "pinned CPython 3.14.8, found …".

```sh
( set -e; mkdir -p ~/qq-try; cd ~/qq-try; rm -rf xo-space; git clone -q https://github.com/quirq-ai/xo-space )
```

```sh
( cd ~/qq-try/xo-space || exit 1; QUIRQ_STATE_ROOT=$HOME/qq-try/state RCLONE_CONFIG=$HOME/qq-try/state/rclone.conf ~/qq-tools/depot/bin/qq test route-parity --toolchain python=/Library/Frameworks/Python.framework/Versions/3.14; echo "qq test finished with exit $? (0 means every check passed); details in ~/qq-try/xo-space/.qq/out/results.json" )
```

**Read the manifest** (works on any machine): `validate` prints
`infra/repo.toml: PASS`, `pins` lists every pin with its digest, and `show`
prints the whole manifest as JSON.

```sh
( cd ~/qq-try/xo-space && ~/qq-tools/qqsync/bin/qqsync validate infra/repo.toml && ~/qq-tools/qqsync/bin/qqsync pins infra/repo.toml && ~/qq-tools/qqsync/bin/qqsync show infra/repo.toml )
```

## Add qq to a repo of your own

A repo needs one file, `infra/repo.toml`. This builds a throwaway demo repo in
`~/qq-try/demo` with one test and a manifest, validates the manifest, and runs
the test with `qq`. It works on any machine: with no toolchain pinned, `qq`
uses the `python3` on your `PATH`. The last line lists `tests.pytest.xml`.

```sh
( set -e; mkdir -p ~/qq-try; cd ~/qq-try; rm -rf demo; mkdir -p demo/tests demo/infra; cd ./demo; git init -q
  printf 'pytest\n' > requirements-dev.txt
  printf 'def test_ok():\n    assert 1 + 1 == 2\n' > tests/test_ok.py
  printf 'schema = "quirq-repo/1"\n\n[qq]\nversion = "0.1.0"\n\n[[targets]]\nname = "tests"\nkind = "pytest"\nsrcs = ["tests/**", "requirements-dev.txt"]\n' > infra/repo.toml
  ~/qq-tools/qqsync/bin/qqsync validate infra/repo.toml
  ~/qq-tools/depot/bin/qq sync
  ~/qq-tools/depot/bin/qq test
  ls .qq/out/junit )
```

To copy this into a real repo, add the same `infra/repo.toml` with your own
targets. Kinds that work today: `python-service`, `pytest` (installs
`requirements-dev.txt` by default) and `node-app` (Next.js with pnpm). The
schema is `src/qqsync/schema/quirq-repo-1.schema.json` in sync, with an
example in sync's README.

**Pin the toolchain, as CI does.** This pins CPython 3.14.8 for Linux x86_64
with the digest quirq-ai/toolchains promoted (its `promoted.toml`), then
validates. After this, `qq sync` fetches it on Linux and `qq test` insists on
exactly 3.14.8 everywhere (on a Mac, pass `--toolchain` as in 3b).

```sh
( set -e; cd ~/qq-try/demo; ~/qq-tools/qqsync/bin/qqsync pin toolchains python --version 3.14.8 --platform linux-x86_64 --source oci://ghcr.io/quirq-ai/toolchains/python@sha256:32c0b762db5ec5453e63cf057ab4fa072751a19f1af70f08c07ac4f5fb70a716 --digest sha256:230c6677ccbaba9043c810b9c4a6096ed354c8a981bb62ea90bd059b12d1b03c; ~/qq-tools/qqsync/bin/qqsync validate infra/repo.toml )
```

Change pins only with `qqsync pin`; edit targets by hand and run
`qqsync validate`. Never parse the manifest yourself: `qqsync guard .` fails
any code in a repo that does.

## Cheat sheet

Run these inside a repo that has `infra/repo.toml` (with the optional PATH
step, drop the `~/qq-tools/…/bin/` prefix).

| Command | What it does | Exit |
|---|---|---|
| `qq fetch <url> [dir]` | clone, then `qq sync` in it | 0 ok, 1 failed (a finished clone stays) |
| `qq sync` | fetch every pin into `$QQ_HOME/store`, check its digest, link it under `.qq/` | 0 ok, 1 fetch or pin failed, 2 no manifest or an invalid one |
| `qq build [TARGET …]` | build targets as CI does | 0 all passed, 1 a step failed or bad target, 2 no manifest or an invalid one |
| `qq test [TARGET …]` | build and test; JUnit, logs and `results.json` in `.qq/out` | 0 all passed, 1 a step failed or bad target, 2 no manifest or an invalid one |
| `qq test --toolchain python=ROOT` | use the CPython under `ROOT/bin` instead of the synced one | as above |
| `qqsync validate [FILE]` | check a manifest against `quirq-repo/1` | 0 PASS, 1 problems listed |
| `qqsync show [FILE]` | the manifest as JSON (for scripts in any language) | 0 ok, 1 manifest unreadable or invalid |
| `qqsync pins [--strict] [FILE]` | list every pin and digest | 0 ok, 1 manifest unreadable or invalid, or `--strict` found placeholders |
| `qqsync pin SECTION NAME --digest …` | set one pin; untouched lines are left exactly as they were | 0 ok, 1 bad manifest or bad pin |
| `qqsync guard [DIR]` | fail if anything else parses the manifest | 0 PASS, 1 findings |

Usage mistakes exit 2 for every command. After `qq test`, read
`.qq/out/results.json`: it is rewritten on each run, while old JUnit files can
stay behind. `qq` keeps its launchers, pinned versions and toolchain store in
`QQ_HOME` (default `$XDG_CACHE_HOME/qq`, else `~/.cache/qq`). Each new depot
commit adds a launcher there, and old ones are not cleaned up yet.

## If something goes wrong

| You see | Why | Do this |
|---|---|---|
| `no pin for platform macos-arm64` (or another platform) | toolchains exist for Linux x86_64 only | use step 3b with your own CPython 3.14.8 |
| `pinned CPython 3.14.8, found 3.x.y` | the Python `qq test` found is not the pinned one (the console shows `FAIL … toolchain-check`; this text is in that step's log) | install 3.14.8 and pass `--toolchain python=ROOT`, or run on Linux after `qq sync` |
| FAIL … toolchain-check, and its log says could not start …/bin/python3 | nothing at ROOT/bin/python3 | install CPython 3.14.8, or fix the --toolchain path |
| `requirements file 'requirements-dev.txt' not found` | the `pytest` kind installs that file | add it, or set `params = { requirements = "…" }` on the target |
| glob '…' match no file; fix srcs in the manifest | a file listed in a target's srcs is missing | add the file, or fix srcs |
| `… already exists; run qq sync inside it instead` | `qq fetch` never overwrites a folder | re-run the step as written: it deletes the old copy first |
| `… changed after qq fetched it, so it is not shared any more` | something edited a fetched toolchain | run the `chmod -R u+w … && rm -rf …` command the message prints, then `qq sync` again |
| a fetch fails behind a proxy | pip, git and qq's own downloads all go through `HTTPS_PROXY` | set `HTTPS_PROXY`; for your own CA set `SSL_CERT_FILE` (qq, pip) and git's `http.sslCAInfo`; ghcr needs no login |

## Limits today

As of 2026-10-04, re-checked against the repos on 2026-10-05:

- **Linux x86_64 only** for fetched toolchains; Mac and ARM users bring their
  own Python and Node at the pinned versions.
- **Only `qq` 0.1.0 exists.** A repo pinning `version = "0.1.0"` runs depot
  `main`. No depot `v*` release tag has been cut (none on 2026-10-05), so
  another version cannot be pinned until the release executor exists.
- **Live on GitHub, not checked here.** Fetching the toolchains from ghcr runs
  every day in depot's `e2e-sync` workflow (06:17 UTC) for xo-space and
  innernet; that workflow does not run `qq test`.

To remove everything (the `chmod` is needed because fetched toolchains are
read-only):

```sh
( chmod -R u+w ~/.cache/qq 2>/dev/null; rm -rf ~/qq-tools ~/qq-try ~/.cache/qq )
```

If you set `QQ_HOME` or `XDG_CACHE_HOME`, remove that folder instead of
`~/.cache/qq`. Delete the PATH line from `~/.zshrc` if you added it.

Next: [2026-10-05-qq-build-run-locally.md](2026-10-05-qq-build-run-locally.md)
builds and runs xo-space, innernet and any other repo with these tools.

## Sources

- "qq setup: depot and sync only", 2026-10-04: quirq internal planning docs
  (not public).
- [depot `741967c`](https://github.com/quirq-ai/depot/tree/741967cc7fba1e486a65856b05c4abb2b1486b8b): [README](https://github.com/quirq-ai/depot/blob/741967cc7fba1e486a65856b05c4abb2b1486b8b/README.md),
  [`pyproject.toml`](https://github.com/quirq-ai/depot/blob/741967cc7fba1e486a65856b05c4abb2b1486b8b/pyproject.toml),
  [`e2e-sync.yml`](https://github.com/quirq-ai/depot/blob/741967cc7fba1e486a65856b05c4abb2b1486b8b/.github/workflows/e2e-sync.yml).
- [sync `d97e2f7`](https://github.com/quirq-ai/sync/tree/d97e2f747cfa7dd04fac3cd8e9973eb7eab091dd): [README](https://github.com/quirq-ai/sync/blob/d97e2f747cfa7dd04fac3cd8e9973eb7eab091dd/README.md),
  [`src/qqsync/pins.py`](https://github.com/quirq-ai/sync/blob/d97e2f747cfa7dd04fac3cd8e9973eb7eab091dd/src/qqsync/pins.py),
  [schema](https://github.com/quirq-ai/sync/blob/d97e2f747cfa7dd04fac3cd8e9973eb7eab091dd/src/qqsync/schema/quirq-repo-1.schema.json).
- [toolchains `44f8f95`](https://github.com/quirq-ai/toolchains/tree/44f8f959458eab59baf46cbae5866a36657f7eeb): [`tools/qqtc.py`](https://github.com/quirq-ai/toolchains/blob/44f8f959458eab59baf46cbae5866a36657f7eeb/tools/qqtc.py),
  [`promoted.toml`](https://github.com/quirq-ai/toolchains/blob/44f8f959458eab59baf46cbae5866a36657f7eeb/promoted.toml).
- [xo-space `14b21a4`](https://github.com/quirq-ai/xo-space/tree/14b21a41668bc8124b4cf5cf9cd59fb44dc7d419): [`infra/repo.toml`](https://github.com/quirq-ai/xo-space/blob/14b21a41668bc8124b4cf5cf9cd59fb44dc7d419/infra/repo.toml).
- [innernet `8f383a3`](https://github.com/quirq-ai/innernet/tree/8f383a3d6c28f1e4495ff177efe70dca43d17604): [`infra/repo.toml`](https://github.com/quirq-ai/innernet/blob/8f383a3d6c28f1e4495ff177efe70dca43d17604/infra/repo.toml).
