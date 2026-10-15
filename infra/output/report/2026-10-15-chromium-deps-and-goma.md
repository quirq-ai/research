# DEPS, gclient and what replaced goma

Chromium is one git repository plus a 5,188-line file that declares 451 more dependencies across three transports. This is how <code>gclient sync</code> reads that file, how rollers rewrite it about 940 times a week, how the compiler is pinned in text — and how the distributed build underneath went from goma to reclient to Siso.

By **Suraj Sharma**, XO Labs · Engineering. First published 23 September 2026 as *DEPS, gclient and what replaced goma* in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/chromium/deps-and-goma). Subject: `chromium/src@f288fed6` (156.0.8067.0) and `depot_tools@0306e468`

Source: [`chromium/deps-and-goma/index.html`](https://github.com/sharmasuraj0123/writings/blob/a5a356d418d45b63d34624b12ec3d7809167b309/chromium/deps-and-goma/index.html) in [sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings) at `a5a356d`. Brought into this repo on 2026-10-15 with its text, tables and figures unchanged; only the format moved from HTML to Markdown.

> **How to read the badges**
>
> *\[from the tree\]* marks facts read from a checkout of `chromium/src`, `depot_tools`, or `v8` — quoted with file paths and line numbers. *\[from the docs\]* marks facts from Chromium's own documentation and announcements. *\[reconstruction\]* marks mechanism I have worked out from the sources but which no single file states outright. The closing provenance note says what was not verified.

## 01 · One repository, 451 dependencies

Chromium is not a monorepo. It is one git repository plus a declarative description of everything else it needs, and the program that reads that description never executes it.

The description is `src/DEPS`. At the commit this post reads — `chromium/src@f288fed6`, `chrome/VERSION` `156.0.8067.0`, checked out 18 September 2026 — it is 5,188 lines of Python syntax declaring 451 dependency entries: 273 git, 147 CIPD and 31 Google Cloud Storage, the last two carrying 153 CIPD packages and 87 GCS objects between them. Around the entries sit 143 `vars`, 61 `hooks`, 9 `recursedeps`, 24 `allowed_hosts` and 49 root `include_rules` *\[from the tree\]*. None of those counts is an estimate: I parsed the file twice, with depot_tools' own `gclient_eval.Exec` and with a plain `ast.parse`, and the two agree. The census is host-independent, because `gclient_eval` never evaluates a condition at parse time. Figure 1 collects the eight numbers this post keeps coming back to.

Three kinds of entry exist, and the tree says so in one sentence: "`gclient` supports three dependency types: git, gcs, and cipd" \[`src/docs/dependencies.md`:9–10\] *\[from the docs\]*. The middle one is a service, not a format: CIPD is Chrome Infrastructure Package Deployment, at `chrome-infra-packages.appspot.com`, where a package is content-addressed by instance ID, labelled with tags, and installed by one `cipd ensure`. The reader is gclient, a "Meta checkout dependency manager for Git" whose entire on-disk state is three files, named in its own module docstring \[`depot_tools/gclient.py`:5–20\]: `.gclient`, the "Current client configuration, written by 'config' command", defining the solutions; `.gclient_entries`, "A cache constructed by 'update' command", recording what is on disk; and each module's `DEPS`. The first belongs to the developer, the third to the project, and `gclient sync` is the thing that reconciles them.

**Figure 1. Eight numbers that bound the topic**

- **5,188** · lines in src/DEPS at f288fed6
- **451** · dependency entries — 273 git, 147 CIPD, 31 GCS
- **143** · vars , the substitution namespace every entry draws on
- **61** · hooks; 13 of them run on a default Linux x64 sync
- **320** · of the 451 entries carry a condition string
- **195** · entries active on default Linux x64 — 154 git, 24 CIPD, 17 GCS
- **≈25.1 GB** · unique content a first sync moves, with history — a lower bound
- **9** · recursedeps : the only children whose own DEPS are read

All eight measured *\[from the tree\]*. The structural counts — lines, entries, vars, hooks, conditions, `recursedeps` — come from parsing `src/DEPS` twice, once with `gclient_eval` and once with `ast`; the two active counts, 195 entries and 13 hooks, re-evaluate every `condition` against default Linux x64 built-ins. The byte figure is 15.48 GB of `chromium/src` mirror plus 8.06 GB of unique dependency mirrors plus 0.92 GB of GCS objects plus 0.62 GB of CIPD packages = 25,075,599,060 B; six active deps have no published mirror snapshot and were not counted, so it can only be too low. §05 does that arithmetic properly.

Seven lines near the top carry the handoff that organises the whole post \[`src/DEPS`:35–41\]:

    # We expect all git dependencies specified in this file to be in sync with git
    # submodules (gitlinks).
    git_dependencies = 'SYNC'

    gclient_gn_args_file = 'src/build/config/gclient_args.gni'
    gclient_gn_args = [
      'android_ndk_version',

That list runs to line 58 and holds exactly 17 names. When a sync finishes, gclient resolves each one against the evaluated vars and writes it into `src/build/config/gclient_args.gni`, a generated GN file whose first line records the DEPS it came from \[`depot_tools/gclient.py`:1612–1631\]. Three lines into `build/toolchain/siso.gni` sits `import("//build/config/gclient_args.gni")`, and nine lines later `build_with_chromium` — one of those 17 — decides whether Siso is the default build tool \[`src/build/toolchain/siso.gni`:3–14\]. That import is the seam. Everything above it is dependency description. Everything below it is the distributed build: goma, then reclient, then Siso.

The thesis the rest of this post argues is visible from here. A declarative file is cheap to change and the ecosystem that parses it is not. Rollers, presubmits, codesearch, release tooling and a decade of scripts all read `DEPS`, so Chromium's answer to every migration has been to keep the old interface alive and move the load to a new mechanism underneath it, indefinitely.

The post reads the machine in that order: the three files a checkout is made of, the grammar gclient parses but never executes, one sync step by step and the same sync in bytes, the compiler pinned in text, the programs that rewrite that text around the clock, the submodule migration that landed stage one and stopped — and then the other side of that import.

Two facts to file away now and collect later. The first is in the excerpt above: `git_dependencies = 'SYNC'` is stage one of a submodule migration \[`src/DEPS`:35–37\] *\[from the tree\]* whose stage two was scheduled for 2023 Q4 *\[from the docs\]* and has not shipped, nearly three years on. The second is at the other end of the pipeline: a June 2025 PSA said "Reclient will be removed from Chromium at the end of September" *\[from the docs\]*, and this tree — pulled a year after that deadline — still declares `use_reclient = use_remoteexec && !use_siso` as a GN argument \[`src/build/toolchain/rbe.gni`:29–31\] and still pins `re_client_version:0.185.0.db415f21-gomaip` in DEPS \[`src/DEPS`:304–307\]. Neither fact is explained yet. Both are the same fact.

## 02 · The tool belt and the three files

depot_tools is a bag of scripts on your `PATH`. `fetch` is a recipe runner. The division of labour worth learning is between three files: `.gclient` is yours, `DEPS` is the project's, `.gclient_entries` is gclient's own memory.

Start with the belt. depot_tools' README names four tools as the important ones — `fetch`, `gclient`, `git cl` and `roll-dep` — and lists `gn`, `autoninja`, `siso` and `ninja` separately, as "shell script/batch file for tools required to build chromium" \[`depot_tools/README.md`:10–33\] *\[from the tree\]*. That second list bundles nothing. `gn.py` asks `gclient_paths` for the primary solution, looks for `<solution>/third_party/gn/gn`, falls back to `buildtools/<platform>/gn`, and reaches `$PATH` only when there is no buildtools directory at all \[`depot_tools/gn.py`:39–87\]. The binary it finds was installed by DEPS. The wrapper is a locator.

The belt updates itself. The `gclient` entry point is a bash script that runs `update_depot_tools` before every subcommand except nine named in a hard-coded string — `grep`, `fetch`, `cleanup`, `diff`, `help`, `getdep`, `root`, `setdep`, `recurse` — then execs `gclient.py` under `vpython3`; `DEPOT_TOOLS_UPDATE=0` turns that off \[`depot_tools/gclient`:8–29; `depot_tools/README.md`:73–75\]. depot_tools is also, recursively, a Chromium dependency: `src/third_party/depot_tools` is pinned at `0306e468` — the exact revision of the clone this post reads — and a hook named `disable_depot_tools_selfupdate` keeps it there \[`src/DEPS`:2211–2212; :4456–4466\].

> **Three Pythons, not one**
>
> Later sections depend on the difference. The host `python3` that runs depot_tools needs 3.8+, gsutil 3.9–3.13 \[`depot_tools/README.md`:3–5\]. The uv-backed `vpython3` environment hooks run inside is pinned by `requires-python = '>=3.11,<3.12'` \[`src/vpython.toml`:14\]. The hermetic CIPD `cpython3`, `version:3@3.11.9.chromium.38`, is what GN executes scripts with: `script_executable = "//third_party/cpython3/host/bin/python3"` \[`src/DEPS`:295; `src/.gn`:12\]. Three ranges, three interpreters, no contradiction.

`fetch chromium` is a recipe runner, and the recipe is short. `fetch_configs/chromium.py` returns a spec whose single solution is four keys \[`depot_tools/fetch_configs/chromium.py`:15–38\]:

        def fetch_spec(props):
            url = "https://chromium.googlesource.com/chromium/src.git"
            solution = {
                "name": "src",
                "url": url,
                "custom_deps": {},
                "custom_vars": {},
            }
            if props.get("webkit_revision", "") == "ToT":
                solution["custom_vars"]["webkit_revision"] = ""
            if ast.literal_eval(props.get("internal", "False")):
                solution["custom_vars"]["checkout_src_internal"] = True
            spec = {
                "solutions": [solution],
            }
            if props.get("target_os"):
                spec["target_os"] = props["target_os"].split(",")
            if props.get("target_os_only"):
                spec["target_os_only"] = props["target_os_only"]

            return {
                "type": "gclient_git",
                "gclient_git_spec": spec,
            }

The whole configuration of a Chromium checkout: one name, one URL, two empty dicts. `GclientGitCheckout.init` then runs `gclient config --spec …` followed by `gclient sync`, appending `--nohooks`, `--no-history` or `--with_branch_heads` if asked, and sets `diff.ignoreSubmodules=dirty` on the new repository \[`depot_tools/fetch.py`:142–166\]. `fetch android`, `fetch ios` and `fetch chrome` are not separate recipes: each returns an `alias` re-invoking `chromium` with extra props — `--target_os=android`; `--target_os=ios --target_os_only=True`; `--internal=True` \[`depot_tools/fetch_configs/android.py`:14–20; `ios.py`:14–20; `chrome.py`:14–22\]. The newest flag, `--git-cache`, adds two keys to the same spec, `cache_dir` and `cache_mode='bootstrap'`; §04 and §05 return to them \[`depot_tools/fetch.py`:222–231; :323–332\]. The docs still say `fetch --nohooks chromium`, and warn that you should "Expect the command to take 30 minutes on even a fast connection" \[`src/docs/linux/build_instructions.md`:70–100\] *\[from the docs\]*; the size that command moves is §05's subject.

`gclient config --spec` writes `.gclient`, and `.gclient` is Python-shaped data, not a program: `gclient_eval.ParseLocalConfig` runs `ast.parse` and accepts only assignments of literals \[`depot_tools/gclient_eval.py`:699–774\]. A solution carries eight keys — `name`, `url`, `deps_file` (default `DEPS`), `managed`, `custom_deps`, `custom_vars`, `custom_hooks` and `protocol_override` \[`depot_tools/gclient.py`:2215–2239\]. Top-level keys add `target_os` and `target_cpu`, unioned with the host through `DEPS_OS_CHOICES` where `linux` becomes `unix`, plus `cache_dir`, `cache_mode` and a root `hooks` list \[`depot_tools/gclient.py`:2043–2059; :2160–2256\]. Two of those keys are a developer's only leverage over a file they do not own. `custom_vars` overrides a variable, but only one that already exists — §03 has the filter that enforces it. `custom_deps` replaces an entry's URL, appends an entry DEPS never had, or — set to `None` — removes one \[`depot_tools/gclient.py`:756–796\]. Figure 2 draws what crosses between the files.

`managed` deserves dates, because the folklore is wrong in both directions. `fetch chromium` has produced unmanaged checkouts since 22 August 2013, when its recipe flipped the key from `True` to `False` because unmanaged "works in a better, more predictable and robust way" \[depot_tools `943f35a5f`\]. gclient's own default did not follow: flipped on 28 June 2016, reverted three weeks later on 18 July inside a four-commit revert whose stated reason was "Breaks iOS release branch builds" \[depot_tools `d4aedc811`, `ae7ea3167`\]. The durable flip came ten years later — on 16 June 2026 the default became `False`, `--managed` was added, and the explicit `managed: False` was dropped from every fetch config \[depot_tools `7447d59a5`\] — which is why the excerpt above has no `managed` key at all. Today `SetConfig` reads `managed=s.get("managed", False)` \[`depot_tools/gclient.py`:2225\].

The third file is gclient's own. `_SaveEntries` writes `.gclient_entries` next to `.gclient` as one Python dict, `entries = { name: url }`, one line per checked-out module \[`depot_tools/gclient.py`:2338–2354\]. It is read twice. The next sync diffs it against the tree it just built and treats anything listed there but no longer present as an orphan — what happens to that orphan is the second step of §04's epilogue. And every thin wrapper leans on it: `gclient_paths.FindGclientRoot` climbs from the current directory to a `.gclient`, then — if it had to climb — checks that the directory it started in sits inside one of the paths listed in `.gclient_entries` before accepting that root \[`depot_tools/gclient_paths.py`:21–72\]. That check is how `gn` and `ninja` find the tree from any subdirectory.

**Figure 2. Three files, three owners, and what crosses between them**

![Three columns. Left: the .gclient file you own, with solutions, custom_vars, custom_deps and custom_hooks. Middle: the project's src/DEPS, with deps, vars, a single entry URL and hooks. Right: gclient's own .gclient_entries cache, written at the end of a sync and diffed against the tree on the next one. A strip along the bottom shows the variable precedence ladder: DEPS vars, then parent vars, then built-ins, then custom_vars.](2026-10-15-chromium-deps-and-goma/fig-02-three-files.svg)

Every key, default, count and line number in the boxes comes from the file named above it, at `chromium/src@f288fed6` and `depot_tools@0306e468` *\[from the tree\]*. The three-column arrangement is mine *\[reconstruction\]*; gclient ships no such diagram. The bottom ladder is the comment inside `get_vars()`, in its own order.

## 03 · A grammar that is parsed, never run

DEPS is Python syntax that no interpreter executes. `gclient_eval` hands the bytes to `ast.parse`, walks the tree against an allow-list, and refuses whatever it does not recognise. Four structures survive: variables, string interpolation, conditions, and three shapes of dependency.

`gclient_eval.Exec` calls `ast.parse(content, mode="exec")` and discards most of the language. A top-level statement must be an `ast.Assign` with one target, the target must be a plain `Name`, and no name may be assigned twice — "invalid assignment: overrides var" \[`depot_tools/gclient_eval.py`:486–516\] *\[from the tree\]*. Values go through `_convert`: constants, lists, tuples, dicts (a repeat raises "duplicate key in dictionary"), `True`/`False`/`None`, one-argument calls to `Str()` and `Var()` — "Str and Var are the only allowed functions" — and the operators `+` and `%`. An import, a `def` or an f-string raises "unexpected AST node" \[:360–480\]. Figure 3 is the whole sequence.

Every string constant is then expanded. `_ExpandVars` pushes it through `_SafeFormatter`, a `string.Formatter` whose `get_field` rejects field names containing `.` or `[`; the docstring states the threat model, since such access "would otherwise allow a malicious DEPS file to traverse into Python internals (e.g. `__globals__`) and read process state such as `os.environ`" \[:51–71\]. Because every string meets `str.format`, a literal brace must be doubled: CIPD templates are written `${{platform}}` and reach the cipd client as `${platform}`. `src/DEPS` spells it that way 16 times, plus 3 `${{arch}}` and 1 `${{os}}` \[:1202, :1172, :1850, :2776\].

The `Var()` arm of `_convert` carries the whole variable contract. `depot_tools/gclient_eval.py`:447–468, dedented eight spaces and otherwise verbatim:

        arg = _convert(node.args[0])
        if not isinstance(arg, str):
            raise ValueError(
                "Var's argument must be a variable name (file %r, line %s)"
                % (filename, getattr(node, "lineno", "<unknown>"))
            )
        if vars_dict is None:
            return "{" + arg + "}"
        if arg not in vars_dict:
            raise KeyError(
                "%s was used as a variable, but was not declared in the vars dict "
                "(file %r, line %s)"
                % (arg, filename, getattr(node, "lineno", "<unknown>"))
            )
        val = vars_dict[arg]
        if isinstance(val, ConstantString):
            val = val.value
        return val
    elif isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        return _convert(node.left) + _convert(node.right)
    elif isinstance(node, ast.BinOp) and isinstance(node.op, ast.Mod):
        return _convert(node.left) % _convert(node.right)

`+` and `%` being the only operators is why git URLs are assembled by concatenation. And `Var()` unwraps the `ConstantString` that `Str()` builds. `Str()` exists because `WriteGNArgsFile` runs a plain-string variable through `EvaluateCondition` before emitting it, and emits a `ConstantString` verbatim \[`depot_tools/gclient.py`:1626–1631\]. Nine of Chromium's 143 vars are `Str()` — `android_ndk_version` = `Str('2@30.0.16248370')`, `rbe_instance`, `cros_boards` and six more — every one either an empty string or a value `EvaluateCondition` could not parse *\[from the tree\]*.

Order inside `Exec` is fixed: `vars` first, so the rest of the file can interpolate it; then built-ins; then `.gclient` `custom_vars`, "but only if they are already present (overrides do not introduce new variables)" \[:543–567\]. The built-ins come from `target_os` and `target_cpu` — `checkout_android` through `checkout_win`, `host_os`, ten `checkout_<cpu>` names, `host_cpu` \[`gclient.py`:1898–1922\]. Precedence is DEPS vars \< parents \< built-ins \< `custom_vars` \[:1924–1940\], drawn in Figure 2, not restated here. The result is validated against a schema naming 21 legal top-level keys \[`gclient_eval.py`:258–357\]; `src/DEPS` uses 10.

**Figure 3. Twelve steps from DEPS bytes to an evaluated dependency**

![A twelve-step pipeline in three rows of four. Row one: DEPS bytes, ast.parse in exec mode, the statement rule, the node-kind allow-list. Row two: vars evaluated, built-ins layered, custom_vars overrides, \_ExpandVars. Row three: schema validation, \_StandardizeDeps, deps_os and hooks_os folded into conditions, EvaluateCondition at sync time. Below, two inset boxes explain Var versus Str and why CIPD platform templates are written with doubled braces.](2026-10-15-chromium-deps-and-goma/fig-03-grammar-pipeline.svg)

Steps 01–11 are the call order inside `gclient_eval.Exec` and `Parse`, read off `gclient_eval.py`:360–686 *\[from the tree\]*; step 12 runs later, per dependency, during the sync walk. Counts are measured by parsing `src/DEPS` at `f288fed6`. The serpentine is mine *\[reconstruction\]*.

`condition` is a second whitelist language with its own walker: string constants, names, `and`, `or`, `not`, and one comparison using `==`, `!=` or `in` — "invalid compare: exactly 1 operator required" \[:777–892\]. A name resolving to a string variable is recursively re-parsed as a condition, with cycle detection — load-bearing here: `non_git_source` is declared as the *string* `'True'` and 108 conditions name it, and `checkout_openxr` is `'checkout_win or checkout_linux or checkout_android'` — a condition kept in a variable. 320 of the 451 entries are conditional, but only 74 distinct strings exist between them, and `checkout_src_internal` alone gates 61. Of the 320, 136 use `and`, 29 `==`, 19 `or`, 2 `not`, and none `in` or `!=` \[every condition re-parsed with `ast`\].

`deps_os` and `hooks_os` are the last trace of the pre-2017 model, no longer a mechanism: `UpdateCondition` rewrites them into an AND-ed `checkout_<os>` string, `"(%s) %s (%s)"` \[:572–686, :624–642\]. gclient stopped handling either key on 2018-05-16; `src/DEPS` declares neither. The dependency shapes themselves are in Figure 4.

**Figure 4. Three dependency shapes, and what each must carry**

| dep_type | Value shape | Required keys | A real entry | Count | Inner count | Fetched by |
|----|----|----|----|----|----|----|
| `git` | `None`, `'url@revision'`, or a dict | `url` (may be `None`) | `'src/v8':` · `Var('chromium_git') + '/v8/v8.git'` · `+ '@' + Var('v8_revision')` \[:3342–3343\] | 273 | 124 bare strings, 149 dicts | fetch via the git cache, check out the pin |
| `cipd` | dict with `packages` | per package: `package` plus `version` *or* `version_file` | `'src/buildtools/linux64'` → `gn/gn/linux-${{arch}}` at `Var('gn_version')` \[:1169–1178\] | 147 | 153 packages, 4 on `version_file` | one `cipd ensure`, after the tree walk |
| `gcs` | dict with `bucket` and `objects` | `bucket`; per object `object_name`, `sha256sum`, `size_bytes`, `generation` | `'src/third_party/llvm-build/Release+Asserts'`, bucket `chromium-browser-clang` \[:924–928\] | 31 | 87 objects, 31 with own condition | `gsutil cp` in the walk, hash and size checked |

Shapes and required keys are the schema at `gclient_eval.py`:181–236 *\[from the tree\]*; entries are quoted from `src/DEPS`. Counts come from running `gclient_eval.Exec` over that file: 273 + 147 + 31 = 451. The last column compresses machinery §04 takes apart.

§01 quoted the head of this block. Here is `src/DEPS`:35–58 whole, for the exported list:

    # We expect all git dependencies specified in this file to be in sync with git
    # submodules (gitlinks).
    git_dependencies = 'SYNC'

    gclient_gn_args_file = 'src/build/config/gclient_args.gni'
    gclient_gn_args = [
      'android_ndk_version',
      'build_with_chromium',
      'checkout_android',
      'checkout_android_prebuilts_build_tools',
      'checkout_clang_coverage_tools',
      'checkout_copybara',
      'checkout_fuchsia',
      'checkout_glic_e2e_tests',
      'checkout_ios_webkit',
      'checkout_mutter',
      'checkout_openxr',
      'checkout_src_internal',
      'checkout_src_internal_infra',
      'checkout_clusterfuzz_data',
      'cros_boards',
      'cros_boards_with_qemu_images',
      'generate_location_tags',
    ]

Seventeen names, three of them `Str()` vars and one (`checkout_openxr`) the condition-in-a-variable that `WriteGNArgsFile` re-evaluates. Two keys remain. `hooks` is a flat list of `{action, name?, pattern?, cwd?, condition?}` whose schema retires a field in place — "In practice, with git, gclient runs all the hooks regardless of this field" \[:238–256\]; ordering is §04's. `recursedeps` names the nine children whose own DEPS is read — angle, dawn, instrumented_libs, openscreen, devtools-frontend, clank, the internal optimization-guide, ios_internal, webpagereplay \[`src/DEPS`:5170–5188\]. The older `recursion = N` has been logged and ignored since 2018-06-11 \[`gclient.py`:1106–1111\].

Nothing above the schema is enforced, and the file shows it: three spellings of a git dependency coexist. 124 entries are bare strings — 10 interpolating braces, `'{chromium_git}/vulkan-deps@5d15b738…'` \[:3217–3226\], the rest concatenating `Var()` with `+` \[:3342–3343\] — and 149 are dicts with a `url` key, the form required to attach a condition \[:3347–3348\]. The parser normalises all three into one dict. Nothing normalises the text.

## 04 · What gclient sync actually does

`gclient sync` is a scheduler with a fixed epilogue. The order is the mechanism: everything that can run in parallel runs first, and five things happen strictly after the queue drains.

`CMDsync` parses options. `--jobs` defaults to `max(8, NumLocalCpus())`, except on a non-Mac ARM machine where it is 1 — "Some arm boards have issues with parallel sync" \[`depot_tools/gclient.py`:5409–5414\] *\[from the tree\]*. `LoadCurrentConfig` calls `FindGclientRoot` — the upward walk to `.gclient`, confirmed against `.gclient_entries`, that §02 traced \[`depot_tools/gclient_paths.py`:21–73\]. Then `RunOnDeps("update")` runs — unless the checkout is a Cog cloud workspace, where git is not gclient's to manage and the command becomes `runhooks` \[:4769–4772\].

`RunOnDeps` checks each managed solution's remote against `.gclient`, applies `--revision` and `--patch-ref` overrides, stores the solutions' `custom_vars` for the next run, and builds the queue \[`gclient.py`:2786–2845\]:

            work_queue = gclient_utils.ExecutionQueue(
                self._options.jobs,
                pm,
                ignore_requirements=ignore_requirements,
                verbose=self._options.verbose,
            )
            for s in self.dependencies:
                if s.should_process:
                    work_queue.enqueue(s)
            with trace_utils.trace(
                f"ExecutionQueue.flush ({command})", cat="gclient"
            ):
                work_queue.flush(
                    revision_overrides,
                    command,
                    args,
                    options=self._options,
                    patch_refs=patch_refs,
                    target_branches=target_branches,
                    skip_sync_revisions=skip_sync_revisions,
                )

The queue is dependency-aware, not merely parallel. `flush` starts a queued `Dependency` only when every name in its `requirements` is in `ran` and no running job shares a resource with it \[`gclient_utils.py`:1047–1059\]. Requirements are three rules: the parent, implicitly; every top-level solution, if this is a second-level node; and any dep whose name is a path prefix of its own, so `src/third_party/angle` waits for `src` \[`gclient.py`:672–708\]. The resource is the repository URL with the revision stripped — `self.url.split("@")[0]`, since "The @123 portion is irrelevant" \[:538–542\] — so two deps pinned to two commits of one repo are serialised. Figure 5 is one run, top to bottom.

Two timers watch the queue. After 60 s with no task finishing it prints "Still working on:" and names the running items; after 300 s of total silence it prints "STALL DETECTED: gclient has been silent for 5 minutes.", the active tasks with their durations, and suggestions \[`gclient_utils.py`:977, 1085\]. They read as one feature and are twelve years apart: the reminder landed in `fe0d1902b`, "Revamped terminal output for update.", on 2014-04-08; the stall diagnostic in `442cbd6d5` on 2026-04-16 *\[from the tree\]*.

**Figure 5. One sync, in order — the queue, its two gates, and the five-step epilogue below the line**

![A vertical sequence. CMDsync, LoadCurrentConfig and SetConfig feed an ExecutionQueue. The queue runs a per-dependency block of four steps — checkout, parse DEPS, pre_deps_hooks, enqueue children — whose children loop back into the queue. Two gates on the right govern what may start: the requirements rule and the one-job-per-URL rule. A timer gutter on the left marks sixty seconds and three hundred seconds. A dashed branch on the right shows GCS objects downloading during the walk. A heavy bar marks the queue draining, below which five steps run in order: gclient_args.gni, removing unversioned directories, one cipd ensure, hooks, and writing the previous sync commits.](2026-10-15-chromium-deps-and-goma/fig-05-sync-sequence.svg)

Steps 01–13 are the call order read off `gclient.py`:4769–4772, 2786–2945 and 1502–1525, the gates off `gclient_utils.py`:1047–1059 and `gclient.py`:672–708 *\[from the tree\]*. Timer marks are placed for legibility, not to scale. The layout is mine *\[reconstruction\]*.

Inside the repeating unit: check out, then — only if this node may recurse — parse its DEPS, run its `pre_deps_hooks` unless `--noprehooks`, and enqueue the children whose conditions came out true \[`gclient.py`:1502–1525\]. Recursion is capped at two: `GClient.__init__` sets `self._recursion_limit = 2` under "Do not change previous behavior. Only solution level and immediate DEPS are processed" \[:2084–2086\]. Children inherit the parent's condition, ANDed in so a flattened tree keeps the restriction \[:798–806\].

The git mechanics are `GitWrapper.update`, a decision tree — Figure 6. A fresh dep is cloned with `git clone --no-checkout --progress`, plus `--shared` when a cache exists and the mode is not bootstrap, into a temporary directory beside the target whose `.git` is moved into place; `--no-history` skips the clone for `git init --object-format=…` and a depth-1 fetch \[`gclient_scm.py`:1742–1775\]. Either way HEAD is left detached, with gclient's message standing in for git's \[:1811–1821\]. An existing dep meets the fast path first \[:1109–1121\]:

            # Special case for rev_type = hash. If we use submodules, we can check
            # information already.
            if rev_type == "hash":
                if self.current_revision == revision:
                    if verbose:
                        self.Print("Using submodule information to skip check")
                    if options.reset or options.force:
                        self._EnsureValidHeadObjectOrCheckout(
                            revision, options, url
                        )
                        self._Scrub("HEAD", options)

                    return revision

`current_revision` was seeded from the parent's submodule index and diff before `update` was called \[`gclient.py`:1384–1460\]; when it equals the pin, nothing runs — no fetch, no checkout, no subprocess. Past it, gclient switches the remote if the URL moved, fetches only when the revision is not already a valid local SHA, and falls through to the five documented cases in Figure 6 — detached HEAD through a branch switch needing `--force` \[`gclient_scm.py`:1198–1214, 1241–1266\]. Underneath sits `git_cache.Mirror`: one bare repository per URL, populated under a lock, re-bootstrapped from a `gs://<bucket>/v2/<dir>` snapshot when it is absent, empty, or holds more than `GC_AUTOPACKLIMIT = 50` pack files \[`git_cache.py`:29, 175, 575–632\] — and only ten googlesource hosts have snapshots \[:137–150\].

**Figure 6. GitWrapper.update — five questions, then five cases**

![A decision tree. Five questions in a column: is the solution managed, does the checkout have a .git directory, does the gitlink already equal the pinned hash, does the remote URL match DEPS, and is the revision already a local SHA. Each has an outcome box to its right: skip, clone, return without running anything, switch the remote, or fetch. Below them a box lists the five fall-through cases zero to four. On the right, a panel lists the four git config values set after update returns, and a second panel describes the git cache mirror.](2026-10-15-chromium-deps-and-goma/fig-06-git-cases.svg)

The branch order is `gclient_scm.py`:1099–1266, the case list quoted verbatim from the comment at :1198–1214, the panels :838–931 and `git_cache.py`:137–150, 575–632 *\[from the tree\]*. Drawing five questions as one column is mine — the code interleaves them with lock-breaking *\[reconstruction\]*.

Then the epilogue, in this order and only once `flush` returns — "Once all the dependencies have been processed, it's now safe to write out the gn_args_file and run the hooks" \[`gclient.py`:2895–2943\]. One: `gclient_args.gni` is regenerated, and written only if the bytes differ \[:1681–1688\]. Two: `_RemoveUnversionedGitDirs` diffs the previous `.gclient_entries` against the new tree, deletes an orphan only with `-D` and no local modifications — otherwise warning again on every sync — restores a submodule mount point with `git restore`, and re-saves the entries file \[:2554–2766\]. Three: one `cipd ensure` for every package from every DEPS, through a generated ensure file that opens `$ParanoidMode CheckPresence` and `$OverrideInstallMode copy` and groups packages under `@Subdir` blocks \[`gclient_scm.py`:2351–2370\] — after the deletions, so a dep that moved from git to CIPD does not land on its own old directory \[`gclient.py`:2911–2916\]. Four: hooks. Five: the commit each dep landed on is written to `.gclient_previous_sync_commits` \[:2940–2943\].

That fifth step exists for a sync that has not shipped. On a later run with `--experiment no-sync`, `_EnforceSkipSyncRevisions` reads the file back and subtracts: a `--patch-ref` naming anything that is not a solution disables the optimisation outright, and any solution whose `custom_vars` changed is dropped with a printed reason \[`gclient.py`:2394–2448\]. What survives becomes one question per dependency, asked after patches are applied — `check_diff(skip_sync_rev, files=["DEPS"])` — and a dependency whose `DEPS` has not moved since the recorded commit has `_should_sync` set false and is never walked \[:1482–1499\] *\[from the tree\]*.

GCS objects are the exception. They download during the tree walk, not in the epilogue: `gsutil cp`, a check of both the `sha256sum` and the `size_bytes` declared in DEPS, auto-extraction, then three hidden markers beside the artefact: `.<prefix>_hash`, `.<prefix>_content_names` — the JSON list of every name the archive held — and `.<object_name>_is_first_class_gcs`, which holds one character and whose existence is the whole message \[:3141–3167, :3318–3465\]. A root-level `.gcs_entries` maps each path to the objects installed under it; when that count changes, the files listed in `_content_names` and the markers are deleted before the re-download \[`gclient_scm.py`:2579–2735\]. Hooks are flat and last: `GetHooks` returns the root's first, then each dependency's, depth-first, and `pattern` is documented as a "noop with git; deprecated", so every hook runs \[:1698–1716, 184\]. One that fails takes the sync with it — "a discrete exit status code of 2" \[:270, 283–287\].

The file is larger than the work it causes. On a default Linux x64 host 154 of the 273 git deps, 24 of the 147 CIPD entries and 17 of the 31 GCS entries are active, and 13 of the 61 hooks run \[`src/DEPS` at `f288fed6`, every condition evaluated against default Linux built-ins\]. What those counts weigh is §05.

## 05 · A checkout on a bot, and in bytes

A continuous-integration builder never runs `fetch`. It runs one Python script that does the same things in the same order on every machine, prints its own timings, and leaves behind a record of how many bytes it moved.

The launch path is uniform. Every chromium/src builder is a Buildbucket job whose `exe` is `infra/chromium/bootstrapper`; the bootstrapper pulls the tools/build recipe bundle at `refs/heads/main` and reads the builder's own `properties.json` back out of chromium/src \[`src/infra/config/generated/luci/cr-buildbucket.cfg`:17–37\] *\[from the tree\]*. The 2026 tree generates 1,066 of those files — 584 under `ci`, 438 under `try`, the remaining 44 under `build`, `webrtc`, `webrtc.fyi` and `infra`; that is a count of `generated/builders/*/*/properties.json` on the `f288fed6` checkout, not an estimate. The recipe calls `prepare_checkout`, which forwards to `bot_update.ensure_checkout` \[`depot_tools/recipes/recipe_modules/bot_update/api.py`:420\], and the step runs `vpython3 -u bot_update.py` \[:306–323\] with `CHROME_HEADLESS=1` \[:359–379\]; the `depot_tools.on_path()` context that call enters also sets `DEPOT_TOOLS_UPDATE=0`, so a bot never self-updates depot_tools \[`depot_tools/recipes/recipe_modules/depot_tools/api.py`:64–68\].

This is the command line that step logged on `chromium/ci/Linux Builder` \#228484, build 8669987184970100865, on 22 September 2026:

    Executing command [
      '/b/s/w/ir/cipd_bin_packages/vpython3',
      '-u',
      '/b/s/w/ir/x/w/packages/cipd/exe/depot_tools/recipes/recipe_modules/bot_update/resources/bot_update.py',
      '--spec-path',
      '/b/s/w/ir/x/t/tmpq6jcyij7',
      '--revision_mapping_file',
      '/b/s/w/ir/x/t/tmpbpb4zjyg.json',
      '--git-cache-dir',
      '/b/s/w/ir/cache/git',
      '--cleanup-dir',
      '/b/s/w/ir/x/w/rc/bot_update',
      '--output_json',
      '/b/s/w/ir/x/t/tmpstmue3zb.json',
      '--revision',
      'src\@44c197b6d5d37dedd191319b0546c69b4a0e240d',
      '--refs',
      'refs/heads/main',
      '--no_fetch_tags',
    ]
    in dir /b/s/w/ir/cache/builder

Note what is absent: no `--experiments`, no `--clobber`, no `--no-history` or `--shallow`. Inside, the order never varies. bot_update sets `core.trustctime false` — gn's hardlinks would otherwise make `git reset` rewrite the sources and trigger rebuilds \[`bot_update.py`:1436–1442\] — reads or creates `.cache_epoch` in the git cache dir \[:1241–1247\], moves the entire workspace into the cleanup dir if a `.dirty_bot_checkout` marker survived a previous run \[:1265–1267\], then per solution runs `git cache populate` (only when the pin is missing or `--enforce_fetch` is set), `git clone --no-checkout --local --shared <mirror>`, `git fetch origin <pin>`, `git checkout --force` and `git clean -dff` \[:768–847\], writes `.gclient`, and runs the sync below \[:453–462\] with `--revision src@unmanaged`, then `gclient revinfo -a --ignore-dep-type cipd --output-json` to build the manifest \[:524–542\]. Every subprocess carries two timers: `ps auxwwf` after 300 s of silence, a kill at `STALE_PROCESS_DURATION` = 1200 s \[:34–38, :198–201\]. Figure 7 is that path with the durations attached.

    gclient sync --verbose --reset --force --upstream \
                 --nohooks --noprehooks --delete_unversioned_trees

**Figure 7. One builder, two lanes — how a bot gets a checkout, and what each step cost**

![Left lane: a Buildbucket job runs the chromium bootstrapper, which loads the tools/build recipe bundle and the builder's properties.json, and the recipe's prepare_checkout runs bot_update.py in the builder cache. Right lane: the ten fixed steps inside bot_update.py, with horizontal bars for the four that the CI build timed — git cache populate 1.7 minutes, git checkout --force 3.4 minutes, gclient sync 6.6 minutes, gclient revinfo 0.1 minutes — and a compressed ghost bar for the 80-second warm try run below.](2026-10-15-chromium-deps-and-goma/fig-07-bot-lanes.svg)

Measured: the four bars and the ghost bar are the durations the two builds printed for their own sub-steps, read off `logs.chromium.org`. Reconstructed: the ordering of the six grey rows, which comes from reading `bot_update.py` top to bottom — those steps were never timed individually, and the residual bounds them at about seven seconds together. Sub-step times print to 0.1 min, so that residual carries roughly ±12 s.

Two knobs exist and nobody turns them. `clobber`, `no_history` and `shallow` are fields on the builder spec; across the 1,666 `builder_spec` entries in the generated properties, not one sets any of the three. And `bot_update_experiments` — the only route by which `gclient sync --experiment no-sync` could ever reach a bot \[`api.py`:703–707\] — appears in none of the 1,066 properties files and zero times in `cr-buildbucket.cfg`; I grepped both. So §04's fifth epilogue step writes, on every builder in the fleet, a file that nothing on that builder will read: the incremental-sync optimisation is dormant plumbing.

### The same sync, in bytes

GCS is exact, because DEPS declares `size_bytes` beside every object. A default Linux x64 checkout activates 17 GCS entries holding 46 objects, 917,327,049 bytes. The largest is the Meet GPU test bundle at 276,997,227 B — the "~278MB" DEPS' own comment warns of \[`src/DEPS`:148–150, :1220–1232\] *\[from the tree\]* — and the second is the Rust toolchain tarball at 276,524,576 B \[:1093–1104\]. Clang is 63,156,692 B in two objects \[:924–1091\]. CIPD carries no sizes in DEPS, so the 26 packages inside the 24 active CIPD entries had to be resolved live against chrome-infra-packages on 22 September 2026: 621,162,316 bytes, led by the JDK at 148,797,791 B. The git side is readable from the public bootstrap bucket: the chromium/src snapshot is 15,481,300,760 B in 46 files — seven packs capped at 2 GiB, 842 MB of `.idx`, a 58.7 MB commit-graph, a packed-refs holding 47,639 refs — and the 148 active deps that have a snapshot cover 142 distinct repositories worth 8,055,808,935 B.

Add them and a first sync moves 25,075,599,060 bytes of unique content, of which the non-git part is 1,538,489,365 B — 6.1% of the bytes for 41 of the 195 active entries — the 17 GCS and 24 CIPD ones. Sum by checkout path instead and you get 25,701,532,050 B, because git_cache keys a mirror by URL and not by path \[`depot_tools/git_cache.py`:105–112\]: JetStream is checked out at three paths and Speedometer at five, so 625,932,990 B gets counted more than once. Both totals are lower bounds, for the reason the caption gives. The docs compress the whole question into one parenthesis: the cache "mirrors every repo it fetches (~30 GB for Chromium)" \[`src/docs/linux/build_instructions.md`:95\] *\[from the docs\]*. Figure 8 splits that number four ways.

**Figure 8. Where 25 GB goes — git mirrors, GCS objects, CIPD packages**

![A stacked bar of 25.08 gigabytes of unique content: the chromium/src git mirror is 15.48 GB or 61.7 percent, the deduplicated dependency mirrors 8.06 GB or 32.1 percent, GCS objects 0.92 GB or 3.7 percent, CIPD packages 0.62 GB or 2.5 percent, with a dashed tail for the 0.63 GB of paths counted more than once. Below, two area-proportional treemaps: the 46 GCS objects dominated by test data and toolchains, and the 26 CIPD packages dominated by the JDK.](2026-10-15-chromium-deps-and-goma/fig-08-sync-bytes.svg)

Measured, three different ways. The GCS column is arithmetic on `size_bytes` literals in `src/DEPS`. The CIPD column was resolved package by package against chrome-infra-packages on 22 September 2026, because DEPS does not record CIPD sizes. The git columns are the file listings of the public `chromium-git-cache` bootstrap snapshots. Six active git deps have no snapshot in that bucket, so both git figures — and therefore the 25.08 GB total — are lower bounds; the docs' own "~30 GB" is the number to hold beside them.

## 06 · Pinning a toolchain in text

Chromium's compiler is not installed. It is pinned — two constants in a Python file, a list of hashed objects in DEPS, and an assert in GN that refuses to build when the two disagree. Nothing fetches clang from a hook.

The pin is two lines. `tools/clang/scripts/update.py` holds `CLANG_REVISION = 'llvmorg-24-init-7747-g62397f8b'` and `CLANG_SUB_REVISION = 29`; together they make `PACKAGE_VERSION`, while `RELEASE_VERSION` records the LLVM major as `'24'` \[`src/tools/clang/scripts/update.py`:36–47\] *\[from the tree\]*. The revision is not a tag; it is the output of `git describe` on the LLVM monorepo. The comment above it names writer and reader:

    # Do NOT CHANGE this if you don't know what you're doing -- see
    # https://chromium.googlesource.com/chromium/src/+/main/docs/updating_clang.md
    # Reverting problematic clang rolls is safe, though.
    # This is the output of `git describe` and is usable as a commit-ish.
    # These fields are written by //tools/clang/scripts/upload_revision.py, and
    # should not be changed manually.
    # They are also read by build/config/compiler/BUILD.gn.
    CLANG_REVISION = 'llvmorg-24-init-7747-g62397f8b'
    CLANG_SUB_REVISION = 29

    PACKAGE_VERSION = '%s-%s' % (CLANG_REVISION, CLANG_SUB_REVISION)
    RELEASE_VERSION = '24'

No sync runs that script. Since June 2024 `src/third_party/llvm-build/Release+Asserts` has been a first-class GCS dep — bucket `chromium-browser-clang`, condition `not llvm_force_head_revision` — carrying 23 objects \[`src/DEPS`:924–1091\]. Get the count right: re-parsing the block with depot_tools' `gclient_eval.Exec` gives Linux_x64 6, Mac 6, Win 6 and Mac_arm64 5 — Mac_arm64 has no runtime-library package. "Six per host platform" is wrong by one. Each object carries its own condition; with `checkout_clang_tidy`, `checkout_clangd` and `checkout_clang_coverage_tools` all defaulting to `False` \[`:176, 179, 170`\], a plain Linux checkout resolves two of the 23.

Text alone is a wish; something has to check it. `config("clang_revision")` in `build/config/compiler/BUILD.gn` reads the `cr_build_revision` stamp shipped inside the tarball, parses both constants back out of `update.py`, and asserts they agree — lines 1499–1522, the stamp read four lines earlier.

          # Ensure that the synced clang version matches what's in git.
          if (_perform_consistency_checks) {
            # Parse the clang version from the Python script.
            _clang_version_lines = filter_include(
                    read_file("//tools/clang/scripts/update.py", "list lines"),
                    [ "CLANG_*REVISION = *" ])
            _py_revision =
                string_replace(_clang_version_lines[0], "CLANG_REVISION = '", "")
            _py_revision = string_replace(_py_revision, "'", "")
            _py_subrevision =
                string_replace(_clang_version_lines[1], "CLANG_SUB_REVISION = ", "")
            _expected_clang_revision = "$_py_revision-$_py_subrevision"

            # TODO(agrieve): Change filter_include to _clang_revision ==
            # _expected_clang_revision once angle & webrtc use a GCS DEPS entry
            # rather than a update.py runhook.
            assert(
                filter_include([ _clang_revision ],
                               [
                                 _expected_clang_revision,
                                 "$_expected_clang_revision,*",
                               ]) != [],
                "clang_revision=\"$_clang_revision\" but update.py expected \"$_expected_clang_revision\". Did you forget to gclient sync?")
          }

The same config then emits `defines = [ "CR_CLANG_REVISION=\"$_clang_revision\"" ]` \[`:1591`\], so a roll changes a define every translation unit sees; the tree rebuilds whole. A second assert ties `clang_version = "24"` to the same string \[`…/BUILD.gn`:1525–1531; the arg is declared in `src/build/toolchain/toolchain.gni`:43–45\]. Rust moves in lockstep because rustc is built against the pinned LLVM: its package name is `<RUST_REVISION>-<RUST_SUB_REVISION>-<CLANG_REVISION>` \[`src/tools/rust/update_rust.py`:69–72\].

A roll is a two-file edit plus a mechanical DEPS rewrite — Figure 9. `upload_revision.py` resolves the newest LLVM commit, computes the revision with `git describe --long --abbrev=8 --match=*llvmorg-*-init` \[`src/tools/clang/scripts/build.py`:352–364\], patches both update scripts and fires the eight upload bots \[`…/upload_revision.py`:155–213; bots named at :48–59, triggered by `git cl try` at :453–471\]. `package.py` uploads to `chromium-browser-clang-staging` under `-h x-goog-if-generation-match:0` \[`…/package.py`:36, 140\]; a reused hash-plus-sub-revision is refused and the bot still reports success \[`src/docs/updating_clang.md`:90–96\] *\[from the docs\]*. Staging is untrusted, so a Googler with promote rights copies the chosen packages to production and runs `sync_deps.py`, which stats and hashes each object, then calls `gclient setdep --revision=path@object,sha256,size,generation` \[`…/sync_deps.py`:56–153\]. Cadence: 2–4 weeks \[`src/docs/toolchain_support.md`:35–37\].

**Figure 9. One lap of a clang roll, from git describe to rebuild**

![Four stacked lanes. Lane one, author: upload_revision.py resolves the newest LLVM commit with git describe, patches update.py and update_rust.py by regex, and uploads a roll CL on a branch. Lane two, upload bots: eight bots run package.py, which compresses with xz preset 9 EXTREME and writes to the staging bucket with x-goog-if-generation-match zero; a reused hash plus sub-revision is skipped silently while the bot still reports success. Lane three, promotion: a Googler with promote rights copies staging to the production bucket, then sync_deps.py stats and hashes each object and calls gclient setdep. Lane four, tree: the DEPS CL lands, GN asserts the stamp matches update.py, and the CR_CLANG_REVISION define forces every object file to rebuild. One lap takes two to four weeks.](2026-10-15-chromium-deps-and-goma/fig-09-clang-roll.svg)

Every box is a script, a bucket or an assert named in the tree *\[from the tree\]*; the lane grouping is mine *\[reconstruction\]*. The cadence band is documented, not measured.

Every other build input has the same shape — a version in text, a transport, something that rewrites it. Only the transport changes, tracking size and churn (Figure 10).

**Figure 10. Where each pinned artefact's version literally lives**

| Artefact | Where the version lives | Transport | What rewrites it |
|----|----|----|----|
| clang and five sibling packages | `CLANG_REVISION`, `CLANG_SUB_REVISION` \[`update.py`:43–44\]; 23 objects \[`DEPS`:924–1091\] | GCS `chromium-browser-clang` | `upload_revision.py` → bots → promote → `sync_deps.py` |
| Rust, crubit, bindgen | `RUST_REVISION`, `RUST_SUB_REVISION` \[`update_rust.py`:47–51\]; object name embeds `CLANG_REVISION` | GCS, same bucket | same CL as clang |
| GN, ninja, Siso, CPython 3.11.9 | `gn_version`, `ninja_version`, `siso_version`, `cpython3_version` \[`DEPS`:571, 578, 292, 295\] | CIPD | DEPS var edit; GN by `gn-chromium-autoroll` |
| clang-format, nine Debian sysroots | object name is a hash; a sysroot's is the tarball sha256 \[`DEPS`:754–808; :637–752\] | GCS, hash-named | `build_and_upload.py` → `gclient setdep`; clang-format by hand |
| libc++, libc++abi, libunwind | `libcxx_revision` \[`DEPS`:568\] *and* `buildtools/deps_revisions.gni`:8; `libcxxabi_revision` \[`DEPS`:524\], `libunwind_revision` \[`DEPS`:528\] | git sub-repo | one CL, both files |
| Android NDK, SDK | `android_ndk_version = '2@30.0.16248370'` \[`DEPS`:64\] | CIPD, conditional on `checkout_android` | DEPS var edit |
| Windows SDK, MSVC | `TOOLCHAIN_HASH = '3bfcb536c8'`, `SDK_VERSION = '10.0.28000.0'` \[`build/vs_toolchain.py`:62–63\] | hook `win_toolchain` \[`DEPS`:4527\] | hand edit |
| Xcode, macOS SDK | `MAC_BINARIES_TAG` \[`build/mac_toolchain.py`:58–59\] | hook `mac_toolchain` → internal CIPD | hand edit |
| PGO and AFDO profiles | `chrome/build/<target>.pgo.txt` | nine PGO hooks \[`DEPS`:4925–5026\] | nothing; the hook takes the newest, ~4×/day |

Every cell is a file-and-line reading of the `f288fed6` tree *\[from the tree\]*; the grouping by transport is mine *\[reconstruction\]*. The last column is mechanism, not team. When row one's check fails, GN says: `clang_revision="…" but update.py expected "…". Did you forget to gclient sync?`

The last row explains the others. PGO profiles stay hooks on purpose: `tools/update_pgo_profiles.py`:5–12 drops stale profiles after two days "to save disk spaces because profiles are large (~1GB) and updated frequently (~4 times a day)" *\[from the tree\]*. A DEPS entry names one immutable object; an artefact that turns over four times a day would make every refresh a CL.

The cheapest illustration of the design is the version string. Five of the 61 hooks call `build/util/lastchange.py` \[`src/DEPS`:4564–4605\]; it runs `git log -1 --format=%H %ct` filtered by the default `--grep=^Change-Id:`, reads the `Cr-Commit-Position` footer, and writes `LASTCHANGE=<sha>-refs/heads/main@{#N}` \[`src/build/util/lastchange.py`:153–189; :770–796\]. `build/util/version.py` combines it with `chrome/VERSION` — `MAJOR=156 MINOR=0 BUILD=8067 PATCH=0` — for every `@KEY@` substitution \[`:33–88`\]. The rest of the list is housekeeping: `vpython3_common` first, then `landmines`, `disable_depot_tools_selfupdate`, seven `.sha1` downloads in four families (ciopfs, dsymutil, rc, apache_win32), and `configure_siso` at position 57 of 61. Sixty-one hooks sounds like a lot until you notice none of them fetches a compiler.

## 07 · Editing DEPS by machine

DEPS is editable by program because gclient parses it twice — once into a syntax tree, once into a stream of tokens. A roll rewrites one string token. Every other byte, comments included, comes back as it was.

The two parses are kept together. `gclient_eval.Exec` builds the AST and, in the same pass, keys every `tokenize` token by its `(line, column)` start position; the result is a `_NodeDict` holding values and tokens side by side \[`depot_tools/gclient_eval.py`:95; :536–541\]. Writing is the inverse. `_UpdateAstString` changes exactly one entry — reading the original quote character out of the token's own text and putting it back around the new value — and `RenderDEPSFile` sorts the token dict by position and hands it to `tokenize.untokenize` \[`gclient_eval.py`:895–909\] *\[from the tree\]*. Nothing ever renders the AST. The AST only says which token to touch.

Choosing the token is the whole trick. It is fifteen lines of `depot_tools/gclient_eval.py`:1137–1151:

            var_name = _GetVarName(node)
            if var_name is not None:
                SetVar(gclient_dict, var_name, new_revision)
            else:
                if "@" in node.value:
                    # '@' is part of the last string, which we want to modify.
                    # Discard whatever was after the '@' and put the new revision in
                    # its place.
                    new_revision = node.value.split("@")[0] + "@" + new_revision
                elif "@" not in dep_dict[dep_key]:
                    # '@' is not part of the URL at all. This mean the dependency is
                    # unpinned and we should pin it.
                    new_revision = node.value + "@" + new_revision
                _UpdateAstString(tokens, node, new_revision)
                dep_dict.SetNode(dep_key, new_revision, node)

`src/v8` is spelled `Var('chromium_git') + '/v8/v8.git' + '@' + Var('v8_revision')` \[`src/DEPS`:3342–3343\], so `_GetVarName` returns `v8_revision` and the edit lands on the *variable*, at `src/DEPS`:344 — never on the URL. Running `gclient setdep -r src/v8@0000…` against a copy of `src/DEPS` produces a diff of exactly one line: line 344 — re-run here at `f288fed6` *\[from the tree\]*. The same function refuses multi-line and implicitly concatenated strings: "Consider reformatting the DEPS file" \[:1122–1129\]. Its two siblings are narrower still: `SetCIPD` evaluates and strips a `'version:' + Var(…)` prefix before writing what is left \[:1046–1106\], and `SetGCS` may only touch `object_name`, `sha256sum`, `size_bytes` and `generation`, and rejects any update whose object count differs from the one already in the file \[:1016–1043\].

`gclient getdep` reads. It takes `--var`, and `-r` with a path for a git dep or `path:package` for a CIPD one; a missing key prints the `KeyError` and exits 2 \[`depot_tools/gclient.py`:5034–5119\]. When `git_dependencies` is `SUBMODULES` it stops reading DEPS and reads the gitlinks instead \[:5091–5101\].

`gclient setdep` writes, and in `SYNC` or `SUBMODULES` state it writes twice: the DEPS token, then the gitlink — the entry in git's index with mode `160000` whose object id is a commit in another repository. It collects the submodule paths with `git ls-files --format=%(objectmode) %(path)`, keeps the `160000` lines, and warns that "gitlinks won't be updated" if that fails \[:5191–5219\]. Then, per dependency, the gitlink \[`depot_tools/gclient.py`:5314–5335\]:

                    # Update the gitlink for the submodule.
                    subprocess2.call(
                        [
                            "git",
                            "update-index",
                            "--add",
                            "--cacheinfo",
                            f"160000,{value},{git_module_name}",
                        ],
                        cwd=cwd,
                    )

        with open(options.deps_file, "wb") as f:
            f.write(gclient_eval.RenderDEPSFile(local_scope).encode("utf-8"))

        if git_modules:
            subprocess2.call(["git", "add", options.deps_file], cwd=cwd)
            print(
                "Changes have been staged. See changes with `git status`.\n"
                'Use `git commit -m "Manual roll"` to commit your changes. \n'
                "Run gclient sync to update your local dependency checkout."
            )

Figure 11 follows one command through both writes.

**Figure 11. One gclient setdep , two staged artefacts — and the two-file diff that reaches Gerrit**

![A two-column diagram. The left column shows gclient setdep parsing DEPS into an AST and a token stream, both stored in a \_NodeDict; a panel of DEPS text shows the v8 dependency line hopping back up to the v8_revision variable; below it, \_UpdateAstString rewrites one token and RenderDEPSFile untokenizes the file. The right column shows the second write: git ls-files finds the submodule paths, the path prefix is stripped, a missing .gitmodules entry raises KeyError, and git update-index writes the gitlink, after which DEPS is staged and a message is printed. A bottom band shows the two files a real roll CL touches.](2026-10-15-chromium-deps-and-goma/fig-11-setdep.svg)

Code path, line numbers and token position are read from depot_tools at `0306e468` and `src/DEPS` at `f288fed6`; the bottom band is the file list and diff of a landed CL *\[from the tree\]*. The two columns are drawn side by side; in the source they are one loop body and one trailing write *\[reconstruction\]*.

`roll-dep` is the wrapper a human uses. It will not start on a tree that differs from `origin/main`, staged or unstaged, without `--ignore-dirty-tree`; it fetches the dependency, resolves `--roll-to` (default `origin/HEAD`) to a hash, calls `gclient setdep` once with every `-r`, checks the dep out at the new commit, rewrites `README.chromium` only when it finds exactly one `Revision:` line, stages the gitlink itself, and commits a message headed `Roll <dep>/ <from[:9]>..<to[:9]> (N commits)` \[`depot_tools/roll_dep.py`:99–107; :204–222; :467–493; :239–276; :143–166\].

The rest of the surface is read-mostly. `gclient revinfo -s` prints a snapshot `.gclient` — header `# Snapshot generated with gclient revinfo --snapshot` — pinning every recursive dependency into `custom_deps` \[`gclient.py`:4932–4989; :2975–3008; :2078–2081\]. `gclient flatten` merges the whole tree into one hermetic DEPS, and `--pin-all-deps` expands refs and short hashes to full 40-hex SHAs \[:4059–4114\]; I found no consumer of `flatten` in the tree or in the infra configs on disk. `gclient recurse`, `gclient runhooks` and `gclient gitmodules` round it out — the last regenerating `.gitmodules` and staging gitlinks in `update-index` batches of 100, "Windows has limit how long" \[:4044–4046\].

A machine edit is safe only because presubmit re-checks it. depot_tools' `CheckForCommitObjects` enforces DEPS/gitlink parity whenever `git_dependencies` is `SYNC`, and the only exemptions are hard-coded: ANGLE's `third_party/dummy_chromium` and Dawn's `third_party/placeholder_chromium` \[`depot_tools/presubmit_canned_checks.py`:2875–3138; :3056–3066\]. `src/PRESUBMIT.py` adds five more: `CheckNewDEPSHooksHasRequiredReviewers` and `CheckValidHostsInDEPSOnUpload`, which shells out to `gclient verify` \[:6573–6578\]; `CheckForNewDEPSDownloadFromGoogleStorageHooks`, a flat ban on new `download_from_google_storage` hooks \[:4042–4071\]; `CheckLibcxxRevisionsMatch`, which requires `libcxx_revision` to be identical in DEPS and `buildtools/deps_revisions.gni` \[:8303–8330\]; and `CheckUnwantedDependencies` over added includes \[:3555–3667\]. A sixth guards nothing: `CheckNoDEPSGIT` still rejects edits to `.DEPS.git`, a generated file deleted from trunk on 2014-08-23 \[:3341–3353\]. The interface outlived its mechanism by twelve years, which is this post's thesis in one function.

## 08 · The roller fleet

Almost nobody rolls by hand. A fifth of chromium/src's commit stream is machine-written, continuously, around the clock — and the machine that writes it deliberately does not use gclient.

The machine is AutoRoll, "a program which creates and manages DEPS rolls of a child project, eg. Skia, into a parent project, eg. Chrome" \[`autoroll/README.md`:3–4, in Skia's buildbot repository\] *\[from the docs\]*. Its public dashboard listed 343 rollers on 20 September 2026, 188 of them with a parent whose name begins "Chromium". 158 of those target chromium/src `main`: the 152 whose parent is labelled "Chromium", five AFDO-profile rollers labelled "Chromium Main", and one labelled "Chromium main branch". The other 30 target beta, stable, LTS, m109 and m114 *\[counted 2026-09-20\]*. A roller sits in one of four modes — `RUNNING`, `STOPPED`, `DRY_RUN`, `OFFLINE`, the last "similar to STOPPED, but the roller does not update its checkouts" \[`autoroll/go/config/config.proto`:859–875\] — and picks revisions by one of three strategies: `BATCH` (always the newest), `N_BATCH`, where "N is hard-coded to 20 as of May 2 2022", and `SINGLE` \[`README.md`:82–105\]. Three defaults set the pace: a ten-minute `roll_cooldown`, three commit-queue attempts per CL, three CLs to the same target revision \[`config.proto`:43–45; :93–98\]. The per-roller configs are text protos, in a repository only Googlers can read \[`README.md`:49–57\].

The interesting part is what the roller refuses to do. It is Go, and Skia's `deps_parser` exists so that rolling never shells out to gclient. It rewrites the pinned string at the line and column where it parsed it; when the DEPS file declares `git_dependencies` of `SYNC` or `SUBMODULES` it also fetches the gitlink at the dep's path and replaces the hash there — "automatically updating submodule" — then uploads both files through Gerrit's change-edit API \[`version_file_common.go`:259–280, under `autoroll/go/repo_manager/common/version_file_common/`; `autoroll/go/repo_manager/parent/gitiles.go`:146–176\] *\[from the tree\]*. That is the two-file write §07 traced through `gclient setdep`, reimplemented in another language in another repository, with no depot_tools in the path. §09 takes up what the second file means.

One roll, whole. The commit message of CL 8433063, landed 20 September 2026, is the default Go template with its fields filled in:

    Roll V8 from 37fb84941c9b to 036aa7eb7170 (3 revisions)

    https://chromium.googlesource.com/v8/v8.git/+log/37fb84941c9b..036aa7eb7170

    2026-09-20 v8-ci-autoroll-builder\@chops-service-accounts.iam.gserviceaccount.com Version 15.6.22
    2026-09-20 yahan\@iscas.ac.cn [riscv][wasm-wide-arith] Fix incorrect carry in Add128
    2026-09-20 fanchen.kong\@intel.com [x64] Fix CPUID detection of AVX-VNNI-INT8

    If this roll has caused a breakage, revert this CL and set the roller
    to dry run mode using the controls here:
    https://autoroll.skia.org/r/v8-chromium-autoroll
    Please CC liviurau\@google.com,machenbach\@google.com,v8-waterfall-gardener\@grotations.appspotmail.com on the revert to ensure that a human
    is aware of the problem.

    To report a problem with the AutoRoller itself, please file a bug:
    https://issues.skia.org/issues/new?component=1389291&template=1850622

    Documentation for the AutoRoller is here:
    https://skia.googlesource.com/buildbot/+doc/main/autoroll/README.md

    Cq-Include-Trybots: luci.chromium.try:linux-blink-rel;luci.chromium.try:linux_optional_gpu_tests_rel;luci.chromium.try:mac_optional_gpu_tests_rel;luci.chromium.try:gpu-fyi-cq-mac-arm64;luci.chromium.try:win_optional_gpu_tests_rel;luci.chromium.try:gpu-fyi-cq-win-arm64;luci.chromium.try:android_optional_gpu_tests_rel;luci.chromium.try:dawn-linux-x64-deps-rel
    Skip-Performance-Test: false

Now the traffic. In the week 2026-09-14 to 2026-09-21 Gerrit merged 5,519 chromium/src changes across 22 branches, 4,513 on `main`. 940 — 20.8% — were owned by the two Skia autoroll service accounts; 972 (21.5%) had subjects starting `Roll `. The gitiles log agrees commit-for-commit: those 4,513 commits form the contiguous range `Cr-Commit-Position` \#1697016 to \#1701528, and the week's first and last commits are both rolls *\[counted 2026-09-22\]*. Over four weeks the share barely moves — 3,893 of 16,973, 22.9% — peaking at 26.3% in the US Labor Day week, because humans pause and rollers do not. Figure 12 is the week and the month together.

**Figure 12. The roll weather — one week, four weeks, and what rolls change**

- **343** · rollers listed by autoroll.skia.org on 2026-09-20
- **158** · of the 188 "Chromium"-parent rollers target chromium/src main ; 30 target release branches
- **20.8%** · of one week's 4,513 main commits — 940 — are machine-written
- **14** · of 3,893 roll commits in four weeks carry a Reviewed-by footer

![Three panels. Left: seven equal-height columns, one per day from Monday 14 to Sunday 20 September 2026, each filled from the bottom in purple to the roller share of that day's merged commits — 20.1, 20.6, 19.7, 17.7, 16.7, 40.6 and 68.1 percent, with a dashed line at the 20.8 percent weekly mean. Right: four horizontal bars for the weeks beginning 24 August, 31 August, 7 September and 14 September, at 21.7, 23.3, 26.3 and 20.8 percent. Bottom: one bar splitting the week's 940 roller commits into 720 template rolls and 220 PGO profile rolls.](2026-10-15-chromium-deps-and-goma/fig-12-roll-weather-1.svg)

Counted, not modelled. The census is one `GetRollers` call, 20 September 2026. The week is Gerrit's merged-change list for 2026-09-14 to 2026-09-21, paged exhaustively and cross-checked against the gitiles log; the four-week bars are the gitiles log alone, paged back to 22 August. The one judgement call is the definition of a roll: I counted by author service account — narrower than the 972 subjects beginning "Roll ", wider than the 720 matching the template.

Not every roll edits DEPS. 220 of the week's 940 roller commits are PGO-profile rolls that rewrite the one line of `chrome/build/<platform>.pgo.txt`, and orderfile rolls rewrite files like `android_webview/tools/android-webview-arm64.orderfile.txt`, which DEPS names as the `version_file` of a CIPD package \[`src/DEPS`:1341\] *\[from the tree\]*. Counting the other way, 625 of the week's `main` commits (13.8%) touched DEPS at all, 591 roller-owned. None of this is reviewed: of 3,893 roll commits in four weeks, 3,428 (88%) carry a `Tbr:` footer and 14 carry `Reviewed-by`. The checkout this post reads is itself one of them — `f288fed6` is "Roll clank/internal/apps from e0c57b1d688e to 821dc468f907 (1 revision)" by `chromium-internal-autoroll@skia-corp`, with `Tbr:` and `No-Try: true` *\[from the tree\]*.

Rolls run both ways. `chromium-angle-autoroll` lands "Roll Chromium from 40a71e004321 to ef3359c076e1 (970 revisions)" into ANGLE, generated by ANGLE's `scripts/roll_chromium_deps_v2.py`; V8's `v8_auto_roller` recipe diffs chromium/src's DEPS against V8's and lands "Update V8 DEPS (trusted)". In that one week Chromium was parent to 92 distinct rolled children, and child to a few.

The package systems bring their own vocabulary. A CIPD pin is an instance ID (base64url of the digest plus one hash-algo byte — 44 characters for SHA-256), a tag unique to one instance such as `git_revision:<hash>` or `version:3@1.12.1.chromium.4`, or a moving ref like `latest`. Re-parsing `src/DEPS` gives 153 CIPD packages: 76 instance IDs, 63 `version:` tags, 8 `git_revision:` tags, 4 pinned by `version_file`, one `re_client_version:` and one bare `version_37.0.0` *\[re-parsed here, 2026-09-22\]*. The `version:` tags carry an epoch, because 3pp — Third Party Packages, the infra module that builds outside software into CIPD packages — uploads `<prefix>/<pkg>/${platform}` tagged `version:<epoch>@<semver>` — `2` in the Python `support_3pp` module, `3@` in the Go `pkgbuild` loader, which is why the NDK is spelled `'version:' + Var('android_ndk_version')` over `Str('2@30.0.16248370')` \[`src/DEPS`:1851; :64\] *\[from the tree\]*.

One last measurement. The `gn` CIPD instance tagged `git_revision:127dd2a6d582…` was registered at 02:43Z on 18 September 2026. CL 8428489, "Roll gn from 5649e56e9e32 to 127dd2a6d582", was created eight minutes later. That hash is the literal at `src/DEPS`:571 in the tree this post reads *\[from the tree\]*.

## 09 · Submodules, stage one, forever

In 2023 Chromium announced that it would replace the git entries in DEPS with native git submodules, in three stages, with bugs and dates attached. Stage one landed. Stage two has not moved since. The mechanism is not what failed: the tree is exactly consistent. What did not move is everything else that reads DEPS.

On 2 March 2023 Josip Sokcevic posted to chromium-dev that the project was "moving away from git dependencies being managed by gclient DEPS to native Git submodules", to "simplify tooling" and to "unlock our long term vision of … getting the Chromium codebase with just git client" *\[from the docs\]*. The design doc names a concrete win — Code Search would stop needing a synthetic commit for `codesearch/chromium/src` — and sets out three stages, each with a bug and an ETA: the top band of Figure 13. Two conditions never moved. CIPD stays in DEPS — "we have no plans for CIPD dependencies". gclient, not git, stays in charge through stage two.

A second document, from June 2023, defines the mechanism: the `git_dependencies` key with three states — still three string constants in `depot_tools/gclient_eval.py`:20–24 *\[from the tree\]* — and a custom `gclient-condition` key native git does not know about. It is candid about the price. In `SUBMODULES` mode you can no longer pin a dependency to a branch or `HEAD`, override a host, repo or hash through a DEPS variable, or express selective recursion *\[from the docs\]*.

Stage one landed on 23 August 2023 in commit `ef72622958e9`: `.gitmodules`, 231 gitlinks, and `git_dependencies = 'SYNC'`. M118 is the first release branch to carry it. Within hours the thread filled with submodules showing as uncommitted changes and `git cl upload` failing. depot_tools spent months absorbing it: `gclient gitmodules` and `gclient installhooks` \[`gclient.py`:3934; :4916\], and a sync-time config pass setting `diff.ignoreSubmodules=dirty`, `fetch.recurseSubmodules=off` and `push.recurseSubmodules=off` in every managed repo \[`gclient_scm.py`:893; :916; :926\]. gclient adopted git's file format and then told git not to act on it.

An entry is a name, a path and a URL; a conditional one adds a fourth line git will not read. The first eleven of `src/.gitmodules`:

    # LINT.IfChange
    [submodule "third_party/clang-format/script"]
        path = third_party/clang-format/script
        url = https://chromium.googlesource.com/external/github.com/llvm/llvm-project/clang/tools/clang-format
    [submodule "chrome/browser/resources/preinstalled_web_apps/internal"]
        path = chrome/browser/resources/preinstalled_web_apps/internal
        url = https://chrome-internal.googlesource.com/chrome/components/default_apps
        gclient-condition = checkout_src_internal
    [submodule "third_party/compiler-rt/src"]
        path = third_party/compiler-rt/src
        url = https://chromium.googlesource.com/external/github.com/llvm/llvm-project/compiler-rt

Figure 13 is the plan and the tree together.

**Figure 13. Three stages announced, one executed — and the list of things the second one is waiting on**

![Top band: the three announced submodule migration stages as boxes, stage one green and closed, stage two open with an ETA of 2023 Q4, stage three aspirational, with a you-are-here marker under stage one. Middle band: one dependency, third_party/fontconfig, shown three times — as a DEPS entry, as a .gitmodules section with a gclient-condition key, and as a 160000 gitlink in the index — with the counts 273, 273, 273 beside them. Right inset: the three repositories that reached SUBMODULES, and lists of repositories still in SYNC or never migrated. Bottom band: six labelled rows naming what stage two is waiting on.](2026-10-15-chromium-deps-and-goma/fig-13-submodule-ladder.svg)

Stage dates, bugs and quotes come from the announcement, the two design docs and the tracker pages. Every count in the middle and bottom bands comes from the checkout at `f288fed6` (2026-09-18); 1,122 days is arithmetic on the landing date. Only the tracker status fields are reconstructed, read from page metadata rather than comments.

Three years on, the state is unchanged and the parity exact. At `f288fed6` (2026-09-18) `src/DEPS` declares 273 git dependencies, `src/.gitmodules` has 273 sections, and `git ls-files -s` reports 273 entries with mode `160000`; `git submodule status` lists all 273, uninitialised. Zero path or hash mismatches. DEPS still carries `'SUBMODULE_MIGRATION': 'True'`, the flag that predated `git_dependencies` and that no depot_tools code reads any more \[`src/DEPS`:580–582\] *\[from the tree\]*.

The tree answers why in its own FAQ \[`src/docs/git_submodules.md`:249–253\]: "Lots of Chromium infrastructure already parse DEPS file directly. Instead of a massive switch, it's easier to transition to Git submodules this way." That infrastructure has names. WebRTC's `roll_deps.py` and ANGLE's `roll_chromium_deps.py` both `exec()` Chromium's DEPS fetched from gitiles. V8's `tools/release/roll_bisect.py`:311–316 rewrites it through Gerrit with `re.sub(r"'v8_revision': '[0-9a-fA-F]+'", …)`. Chromium's own `CheckLibcxxRevisionsMatch` \[`src/PRESUBMIT.py`:8303–8329\] compares `libcxx_revision` in DEPS against `buildtools/deps_revisions.gni` and fails the CL. Each stops working the day git deps leave DEPS.

The other five blockers are the bottom band of Figure 13, measured the same way, and four share one shape: something DEPS can express that `.gitmodules` cannot. A variable standing in for a hash, so a `custom_vars` override can move 47 of the 49 `*_revision` pins. Selective recursion — the gclient parser reads only `url`, `gclient-condition` and `path` out of a submodule section \[`gclient.py`:1248–1249\]. Paths relative to their own DEPS. A dep with no gitlink at all, which is what ANGLE and Dawn need. The fifth is Cog, where `gclient gitmodules` refuses to run outright \[`gclient.py`:3944–3948\] *\[from the tree\]*.

Three repositories in Chromium's orbit did reach `SUBMODULES`, all infrastructure: infra_superproject on 2023-09-08, sixteen days after chromium/src entered `SYNC`; infra/infra on 2025-03-07, whose change description gives one reason — "having infra in the SYNC state is pretty annoying for dev-ex"; and luci-py on 2025-04-30, which adopted it on replacing a vendored python-adb with its first submodule *\[from the docs\]*.

> **The advertised end state, measured**
>
> `git clone --recurse-submodules` parses Chromium's `.gitmodules` — custom keys and all. It does not produce a checkout. 85 of the 273 URLs are on `chrome-internal.googlesource.com` and return `PERMISSION_DENIED` anonymously; the first one git reaches ends the clone. Its 144 `gclient-condition` keys are invisible to git, which fetches every dependency on every platform. 25 of the 188 public submodules carry their own `.gitmodules`, only 5 of them Chromium `recursedeps`; git descends into the other 20. And nothing outside git happens: no CIPD, no GCS, no hooks, no `gclient_args.gni`.

What is not knowable from outside: no public statement explains the slip from 2023 Q4. The stage-two bug — crbug 1409734, now issues.chromium.org/40254050 — is still open; its page metadata gives created 2023-01-24, last modified 2025-03-24, and the comments require sign-in *\[reconstruction\]*. Read the tree rather than the bug and stage one stops looking half-finished. It is a steady state: two files saying the same thing, held identical by presubmit, one legible to git and the other legible to everything else.

## 10 · What goma was, and why it ended

Goma solved the right problem with a protocol it invented for itself. The protocol is what killed it. The engineering that outlived the system is the include scanner, still in the build today under a suffix.

Everything so far has been the half of §01's seam above the line where `gclient_args.gni` is imported into `siso.gni`. Below it the subject changes: the files are on disk, something has to compile them, and from 2012 to 2024 that something was goma.

The README states the mechanism: "Goma hooks a compile request, and sends it to a backend compile server", so a build could run at `-j500`, and "the Goma backend caches the compile result" \[`infra/goma/client@5de52a5ece34 README.md`:16–24\] *\[from the docs\]*. Nico Weber had described it publicly in June 2012, on the chromium.org clang list: "similar to pump-mode distcc, but it's google-internal and not available as open source". What it bought is in Chromium's own transcripts: a clean build takes "seven to eight hours" on a laptop, "a few minutes" on a Goma-backed workstation \[`src/docs/transcripts/wuwt-e06-open-source.md`:887–889\] *\[from the tree\]*.

The client had two halves. `gomacc` — prepended to the compiler command, or symlinked over it in "masquerade mode" — parsed the flags, serialised an `ExecReq` and passed it to a daemon over a unix socket, `goma.ipc`. `compiler_proxy` was that daemon: one worker thread per CPU, `MAX_ACTIVE_TASKS` 2,048, a status page on `localhost:8088`. Every request became a `CompileTask`; the task is the design. The states are declared in `client/compile_task.h`, lines 62–75, at `5de52a5ece34` — the last substantive commit that repository took, 11 January 2024:

      enum State {
        // running state, or state at response sent if abort_ is true.
        INIT,  // Initialize the task.  Run subprocess for fast fallback/verify.
        SETUP,  // Setup the request. Run include processor.
        FILE_REQ,  // Upload input files.
        CALL_EXEC,  // Call Exec request.
        LOCAL_OUTPUT,  // LocalOutputCache lookup succeeded.
        FILE_RESP,  // Download output files.
        // finished state:  response sent.
        FINISHED,  // Finished.
        LOCAL_RUN,  // Local run started and didn't issue goma call.
        LOCAL_FINISHED,  // Local run finished for fast fallback.
        NUM_STATE,
      };

SETUP is where the good work happened. Goma ran its own directive-level C preprocessor rather than asking the compiler for a dependency list. A filter reduced each file to its `#` lines, a parser turned those into directives, an optimiser dropped what could not change the answer, an include-guard detector marked files that need not be reopened \[`doc/include-processor.md`:55–75\] *\[from the docs\]*; `#if` and `#ifdef` were evaluated against a real macro environment with a condition stack, `#pragma once` and `#include_next` honoured, and only files a compiler would open were inserted \[`client/cxx/include_processor/cpp_parser.cc`:119–198, :602–635, :714–733; `cpp_include_processor.cc`:124–186\] *\[from the tree\]*. The cost is documented: a macro table averaging about 4,000 entries on Linux, sometimes over 15,000 on Windows "since `windows.h` is large", and 200–300 MB in the `IncludeCache` after all of Chrome \[`doc/include-processor.md`:77–83, 106–115\]. That cache holds 140,000 entries — "35000x4", because Chrome needed "more than 35000 header files" as of 2018-08-21 \[`client/goma_flags.cc`:372–379 in `infra/goma-input-processor`, the fork reclient links\]. A `DepsCache` keyed by a SHA-256 command identifier skipped the walk whenever the file stats, then a hash of each file's directive lines, still validated \[`client/deps_cache.h`:32–43\].

FILE_REQ uploaded what SETUP found, content-addressed: `hash_key = sha256(serialized FileBlob)`, files under 2 MB embedded, larger ones split into a `FILE_META` blob referencing `FILE_CHUNK`s \[`lib/goma_data.proto`:19–36\]. CALL_EXEC sent that as protobuf over HTTP/1.1 — TLS on port 443, never HTTP/2 — to `goma.chromium.org`, path prefix `/cxx-compiler-service` \[`client/http.cc`:1813, `client/goma_flags.cc`:206–222\], where a Go frontend routed `/ping`, `/e`, `/blobs/`, `/s`, `/l` and `/sl` \[`infra/goma/server@49e8b0076afc frontend/frontend.go`:131–157\]. `GOMA_HERMETIC` defaulted to `"error"`: the backend had to "use the compiler with the same version string and binary hash", or the task failed and would "never try sending request again for the same compiler" \[`client/goma_flags.cc`:280–289\] *\[from the tree\]*. Figure 14 is that path, with the state machine beside it.

**Figure 14. One compile through goma, and the states it moved between**

![Left two-thirds: ninja invokes gomacc, which passes an ExecReq over the unix socket goma.ipc to the compiler_proxy daemon holding the IncludeProcessor, DepsCache, FileHashCache and LocalOutputCache; compiler_proxy calls the goma backend at goma.chromium.org port 443 under /cxx-compiler-service over HTTP/1.1 with protobuf bodies, which routes to internal exec workers or to remoteexec_proxy in front of RBE. Right third: the CompileTask state chain INIT, SETUP, FILE_REQ, CALL_EXEC, FILE_RESP, FINISHED, with a parallel branch to LOCAL_RUN and LOCAL_FINISHED and a LOCAL_OUTPUT cache-hit shortcut, all rejoining FINISHED.](2026-10-15-chromium-deps-and-goma/fig-14-goma-task.svg)

Every box, port, path and constant on the left is quoted from the archived goma client at `5de52a5ece34` and server at `49e8b0076afc`. The right panel is the enum above, laid out; where the local branches attach is my reading of the state comments *\[reconstruction\]*, not a graph either repository ships. Nothing here is measured: no production timing or cache-hit rate was ever published.

The transport is the pivot, and EngFlow named it three days after the deprecation notice: "Goma uses plain HTTP/1, so it needs lots of connections, and files need to be broken into chunks" — against the Remote Execution API, which is gRPC over HTTP/2 and therefore multiplexes every one of those requests down a single connection. By November 2020 Goma's own backend was running on RBE — Remote Build Execution, Google's hosted implementation of that API, at `remotebuildexecution.googleapis.com:443` — leaving the Goma protocol to translate in front of a standard one. The same team then wrote reclient, mirroring the halves — `gomacc` became `rewrapper`, `compiler_proxy` became `reproxy` — and kept the include scanner as the `-gomaip` build. §11 takes that stack up.

The end was a dated ratchet. On 8 September 2023 — the archive timestamp is UTC, so US Pacific readers date it the 7th — Takuto Ikuta posted "PSA:Goma deprecation" to infra-dev, chromium-dev and chrome-build-team: "Goma will be deprecated by the end of January of next year"; Google would "delete support for goma in Chromium builds around the beginning of 2024" and "stop maintaining the goma client and server". Then: `gn gen` began warning on 26 September 2023; the last client roll landed on the 27th; a five-second delay appeared on 23 January 2024; `autoninja` began exiting for `use_goma` on Linux and macOS on 13 February, Windows on the 21st; the CIPD package went on 15 April; the `use_goma` and `goma_dir` GN args on 15 May, at `r1301182`; and on 21 May both repositories were emptied to one line: "Goma is not maintained any more, please use reclient instead."

Three fossils survive in the tree this post reads. The RBE project list at `src/build/config/siso/configure_siso.py`:21 opens with `'goma-foundry-experiments'`; the clang release doc at `src/docs/updating_clang.md`:28 names `copy_staging_to_prod_and_goma.sh`; `src/DEPS`:307 pins `re_client_version:0.185.0.db415f21-gomaip`. `use_goma` itself appears nowhere *\[from the tree\]*.

Two things this section will not claim. The "30 minutes to more than 150 minutes" figure quoted when Goma was open-sourced on 9 January 2018 is not a Chrome measurement: its source is a June 2017 jumbo thread whose chart caption reads "Time to compile Opera for Mac on one particular build machine" *\[provenance check\]*. The numbers that would settle whether Goma earned its protocol were never published: fleet size, external user counts, production cache-hit rates, the date `goma.chromium.org` was switched off. The public record is anecdote and source code; this section is built on the second half.

## 11 · reclient, RBE and Siso

Three GN args decide everything. Siso is the default everywhere. Reclient survives as plumbing for one consumer. The deepest difference between the generations is not the transport — it is how each decides what to upload.

`use_remoteexec` defaults to `false`. `use_siso` defaults to `true` when three conditions hold at once: gclient has written `build/config/siso/.sisoenv`, `build_with_chromium` is defined and set, and the out dir holds no Ninja `.ninja_deps`. The third arg is not a choice at all — `use_reclient = use_remoteexec && !use_siso` \[`src/build/toolchain/rbe.gni`:31\]. The default is computed in `src/build/toolchain/siso.gni`, lines 5–22 *\[from the tree\]*:

    # use_siso_default is default value of use_siso.
    # need to match with autoninja's logic.
    use_siso_default = false

    _is_ninja_used = path_exists(rebase_path(".ninja_deps", root_build_dir))

    if (path_exists("//build/config/siso/.sisoenv") &&
        defined(build_with_chromium) && build_with_chromium && !_is_ninja_used) {
      use_siso_default = true
    }

    declare_args() {
      # Placeholder to allow having use_siso in args.gn file.
      # Explicit `use_siso` in args.gn can override default.
      # This is used only for autoninja (to dispatch siso or ninja),
      # and for use_reclient's default.
      use_siso = use_siso_default
    }

A file that `gclient sync` writes is the switch: no `.sisoenv`, no Siso. The `.ninja_deps` test refuses a tool change inside a populated out dir.

GN then refuses bad combinations. Four asserts: `use_reclient` without `use_remoteexec`; `use_remoteexec` with neither client \[`rbe.gni`:57–64\]; `cc_wrapper` alongside `use_remoteexec` \[`src/build/toolchain/cc_wrapper.gni`:36–37\]; and an out dir not exactly two levels below `src`, whose comment reads "Different nesting levels technically work, but cache hits are basically zero" \[`src/BUILD.gn`:1649–1656\]. Since 13 November 2025 `gn gen` also prints "WARNING: crbug.com/424659245 - Reclient is deprecated." \[`rbe.gni`:66–69\]. Its decisions land in `out/<dir>/gn_logs.txt` as `use_remoteexec=true` \[`rbe.gni`:71–81\] — and that file, not `args.gn`, is what Siso's starlark reads.

The documented setup is three lines in two files — in `.gclient`, under `custom_vars`:

    "rbe_instance": "projects/rbe-chromium-untrusted/instances/default_instance"

— and `use_remoteexec = true` with `use_siso = true` in `args.gn` \[`src/docs/linux/build_instructions.md`:271, :375–376\] *\[from the docs\]*. The bots generate the same thing: of 914 `gn-args.json` files under `src/infra/config/generated/builders/`, 867 carry `use_remoteexec: true, use_siso: true, use_reclient: false` inside their `gn_args` object, counted at `f288fed6` *\[from the tree\]*.

### Reclient, and the one consumer that keeps it

The binaries are downloaded only when `download_reclient` is true, and its default is `checkout_chromeos` \[`src/DEPS`:300\]. The pin is `re_client_version:0.185.0.db415f21-gomaip` \[`src/DEPS`:307\]. depot_tools carries a second, older pin of the same package — `re_client_version:0.124.1.13f78cc-gomaip`, under a comment reading "reclient, currently this is only for ChromeOS build" \[`depot_tools/cipd_manifest.txt`:81–83\]. Two files, two versions, one surviving consumer.

Where it does run, the shape is Goma's. `rewrapper -cfg=<cfg> -exec_root=<root>` becomes the `compiler_prefix` on every compile command \[`src/build/toolchain/gcc_toolchain.gni`:200\]. `reclient_helper.py` brackets it with `bootstrap --re_proxy=<reproxy> --cfg=<cfg>` and `bootstrap --shutdown` \[:57–81\], and sets racing defaults `RBE_local_resource_fraction=0.2` and `RBE_racing_bias=0.95` \[:288–290\]. Racing is one of reproxy's four `exec_strategy` values, beside `local`, `remote` and `remote_local_fallback`: when a remote action has not come back in time and local resources are free, reproxy starts the same action locally too, and "the results of the first to finish are used" \[reclient `docs/cmd-line-flags.md`:170–174\] *\[from the docs\]*. Upstream sets the bias at 0.75; depot_tools overrides it to 0.95 and caps the local racer at a fifth of the machine — except on Windows, which is given `remote_local_fallback` instead, "while racing performance on windows is addressed" \[:304–319\]. Even Siso-native builds keep a foot in it: `use_reclient_cfgs` is true whenever `use_reclient` is, and also for Windows and macOS `use_remoteexec` builds, because "Siso native also uses rewrapper cfg file to get remote platform property" \[`rbe.gni`:91–94\].

### Siso

A Ninja-compatible Go build tool with a REAPI client inside the process, a digest-based filesystem and starlark configs, pinned like any other dependency: CIPD `build/siso/${platform}` at `git_revision:22353054…` \[`src/DEPS`:292, 2783–2789\]. The unconditional `configure_siso` hook \[`src/DEPS`:5100–5116\] writes `.sisoenv` and copies a backend config — `google.star` for the eleven named Google RBE projects \[`configure_siso.py`:20–32, :105, :116–128\] — which declares two platforms on one pinned container image: `default`, and `large` for "slow actions that can benefit from multi-cores and/or faster disk I/O" \[`backend_config/google.star`:9–28\].

`main.star` reads `gn_logs.txt` and sets `remote = False` on every rule unless `use_remoteexec` is the string `"true"` \[`src/build/config/siso/main.star`:37–43\]. The rules under it are specific. Clang compiles run remote with a 2 m timeout \[`clang_unix.star`:214–227\]. Links get 10 m, 80 m under ThinLTO, and `remote_link = False` on darwin \[`clang_unix.star`:102–110\]. Mojom generators take `large`, justified by a measurement left in the comment — "n2-highmem-8: exec: 880.202978ms" against "n2-custom-2-3840: exec: 2.42808488s" \[`mojo.star`:15–20\]. Sixty-four paths — 55 Python scripts, eight node scripts, one binary — are denylisted back to local \[`denylist.star`\]. Concurrency is derived, not configured: step 512×CPUs, scandeps 2×, local = CPUs, remote 80×CPUs. On the bots, 866 of 1,066 generated `properties.json` files carry `$build/siso`; the five that carry `$build/reclient` are all `*-build-perf-developer` builders that A/B the old stack *\[from the tree\]*. Figure 15 sets the three stacks against the same five rows.

**Figure 15. Three generations of the same five layers, and when each one moved**

![A table of three columns — Goma, Reclient, Siso — against five rows: wrapper, daemon, input discovery, transport, cache. Goma uses gomacc, compiler_proxy, a full C preprocessor, HTTP/1.1 with protobuf bodies, and its own backend cache. Reclient uses rewrapper, reproxy, the same include scanner under the name scandeps_server, gRPC REAPI, and the RBE action cache. Siso has no wrapper and no daemon, a forged scanner called scandeps, a built-in gRPC REAPI client, and the RBE action cache plus a local digest cache. Underneath, three timeline tracks on one axis from 2012 to 2026 mark goma described 2012-06, open-sourced 2018-01, backend moved to RBE 2020-11, deprecation PSA 2023-09, GN args deleted 2024-05; reclient landing 2020-12 and deprecated in GN 2025-11; Siso dogfood 2023-04, all CQ 2024-03, default on gLinux 2024-11, default for everyone 2025-06, fast-deps deleted 2026-04.](2026-10-15-chromium-deps-and-goma/fig-15-three-generations.svg)

Every cell is read from a file — the 2026 tree, Siso's own source, the archived goma client — and every date is the one its commit or announcement carries. The axis is linear in time. The five-row decomposition is mine *\[reconstruction\]*; Goma's transport row is the only one whose service is gone and cannot be re-checked.

### What each generation uploads

Both survivors speak one protocol, so name its parts. REAPI is the Remote Execution API, `build.bazel.remote.execution.v2`, a gRPC service whose faces are Execution, ActionCache and ContentAddressableStorage — the CAS, a store addressed by digest: a `<hash, size_bytes>` pair. A directory is itself a blob: a `Directory` message naming its files and subdirectories by digest, so a tree of them is a Merkle tree whose root digest stands for the whole tree. An `Action` carries a `command_digest` and an `input_root_digest`, and actions "can be succinctly identified by the digest of their wire format encoding" \[`remote_execution.proto`:141–147, :653–687\] *\[from the docs\]*. That identity is the cache key: the ActionCache maps an action digest to an `ActionResult`, which is how one machine's compile becomes another machine's hit. Siso builds the message itself: `Action{CommandDigest, InputRootDigest, Timeout, DoNotCache, Salt}`, the input root a `treeDigest` over precomputed subtrees plus the hashfs entries of every scanned input \[`siso/execute/cmd.go`:487–563\] *\[from the tree\]*.

The input-root digest is half the action digest, so "which files does this compile need" is the whole question. Goma answered it exactly, with a preprocessor that evaluated `#if`. Reclient kept that engine and renamed it: `scandeps_server` is the `-gomaip` in both version pins above — the goma-input-processor fork, still linked.

Siso inverts the trade. Its scanner calls itself "forged", exists "to construct inputs for remote execution", and is explicitly "not used to check whether the action needs to re-execute". Lines 14–34 of `siso/scandeps/doc.go`, in `go.chromium.org/build/siso`, state the choice in the authors' own words *\[from the docs\]*:

    // Compared with Goma's input processor, scandeps only supports simple
    // form of C preprocessor directives and uses precomputed subtree
    // for sysroots or complicated include dirs.
    //
    // Scandeps only checks the following forms of #include
    //
    //  #include "foo.h"
    //  #include <foo.h>
    //  #include FOO_H
    //
    // to support last case, it also checks the following forms of #define
    //
    //  #define FOO_H "foo.h"
    //  #define FOO_H <foo.h>
    //  #define FOO_H OTHER_FOO_H
    //
    // Since scandeps doesn't process `#if` or `#ifdef`, it expands all possible
    // values of macros for `#include FOO_H`.  Using extra inputs is
    // not problem, but may have potential cache miss issues, since
    // there is discrepancy between simple scandeps vs clang's *.d outputs.
    // TODO(b/283341125): fix cache miss issue.

Three include forms, three define forms, no conditional evaluation, every recorded value of a macro expanded. The result is a deliberate superset, and the comment names the price: a discrepancy against clang's own `.d` output, filed as a cache-miss bug.

The superset is affordable because of what is never scanned. A directory carrying a `:headers` label in `input_deps` — sysroots, the libc++ include tree, the clang toolchain root — is attached whole as a precomputed Merkle tree, digested once per build, with only its root digest probed against the CAS; if the root is there, the rest is assumed there. That assumption is bought by upload order, not by faith: `subtree.init` uploads every non-root blob first and the root `Directory` last, so a root that exists in the CAS can only have got there after everything beneath it \[`siso/build/tree_input.go`:176–219\]. The commit that landed the root-only probe says what it saves: a subtree "would have many files (~7k), so checking missing blobs for all of them would take 2-3s". It measured a full Chromium build at 378.307 s ± 12.431 s before and 372.878 s ± 4.512 s after, over ten runs *\[from the tree\]*.

One repeated claim about this layer is now stale. *fast-deps* — rebuilding a remote command's inputs from the previous build's deps log so scandeps could be skipped — was deleted on 10 April 2026, because "it's not possible to know whether the cached dependency information is still safely usable". Its successor, two-phase caching, is gated behind `SISO_EXPERIMENTS=two-phase-caching`, and nothing under `src/build/config/siso`, `src/infra` or depot_tools sets it. Siso scans every time, and pays for it with a superset it digests in one shot.

A superset of inputs still has to survive the worker. `runRemote` is the ladder that decides: the first `startLocal` steps run locally; then a cache lookup; then, if local capacity is free, a local run; then remote execution; and on failure, `fallbackLocal` \[`siso/build/run_remote.go`:27–40, :145–156\] *\[from the tree\]*. That last rung is typed. `PermissionDenied`, `Unauthenticated`, `InvalidArgument` and `FailedPrecondition` never take it — a missing credential or a bad container image is a build error, because a build that quietly compiles everything locally is §10's seven-to-eight-hour build. Exit 137 does, under the comment "we still see unexpected SIGKILL (OOM?)", as do a deadline, a scandeps timeout and an output-flush error \[:55–109\]. Each is reported by name — `fallback-on-SIGKILL`, `fallback-on-scandeps-slow` — and too many stop the build with `TooManyFallbackError`. Which is `GOMA_HERMETIC=error` two generations on: a remote build that silently becomes a local one is worse than one that stops.

## 12 · What this design buys, and what it costs

Both halves of this system are parked in a stable intermediate state. The dependency description is stuck at `git_dependencies = 'SYNC'`; the build still ships the client it announced it would delete. That is one fact, not two: the price of what makes the design work.

**One text file is the whole dependency graph.** 5,188 lines declare 451 entries, and a roll touches one string — the one-line diff at `src/DEPS`:344 that §07 ran. Because the edit is that small, a machine makes it constantly: in the week of 14–21 September 2026, 940 of 4,513 commits on `main` came from the two autoroll accounts, 591 touching DEPS (§08) *\[from the tree\]*.

**Hermeticity is declared, not installed.** The compiler is 23 GCS objects, the sysroots hash-named tarballs, and GN, ninja, Siso and CPython 3.11.9 CIPD pins at `src/DEPS`:571, 578, 292 and 295. `gclient sync` materialises the toolchain; `gn gen` refuses to proceed when text and tarball disagree (§06). **Conditions and three transports do the rest**: 320 entries carry a condition, a default Linux x64 host materialises 195 of them and runs 13 of 61 hooks, and one grammar covers git, CIPD and GCS — so when clang moved from a hook to a GCS dep in June 2024, its consumer did not change at all (§01, §03, §04, §06) *\[from the tree\]*. Figure 16 prices all six.

**Figure 16. Six properties, each priced**

| Property | What it buys | What the same property costs | Where |
|----|----|----|----|
| One declarative file | 5,188 lines of text; a one-line roll, 591 times a week | Everything that reads DEPS is coupled to its syntax | §01, §07, §08 |
| Toolchain pinned in text | `gclient sync` and `gn gen` reproduce a compiler; GN asserts the pin | One version in two places; a presubmit holds them equal | §06 |
| Conditions | One file, every platform; 195 of 451 entries active on Linux x64 | A second whitelist language; an expression git cannot store | §03, §04, §09 |
| Three transports | One grammar for git, CIPD and GCS; clang changed transport, consumers did not | Three fetchers, three failure modes, three pin vocabularies | §03, §06, §08 |
| gclient owns the tree | One command reconciles 451 entries, 61 hooks and `gclient_args.gni` | `git clone --recurse-submodules` parses `.gitmodules`, cannot check it out | §04, §09 |
| `SYNC` dual-writing | 273 git deps, 273 gitlinks, zero mismatches | Every writer writes twice; the stage that ends it has no date | §07, §09 |

Counts and line numbers are measured at `f288fed6` *\[from the tree\]*. The pairing is mine: no file says a benefit and its cost are one thing *\[reconstruction\]*.

Now the bill. **A parse-only grammar is still a grammar**: a format-field filter, a 21-key schema, a condition walker with exactly one comparison operator, a token-level editor (§03, §07). All of it exists because DEPS must be machine-editable and untrusted at once.

**Interfaces outlive mechanisms.** The survivors are on the page. `git_dependencies = 'SYNC'` at `src/DEPS`:37, three years after a stage two scheduled for 2023 Q4. `use_reclient_cfgs`, which makes Siso parse rewrapper configs on Windows and macOS for one platform property \[`src/build/toolchain/rbe.gni`:91–94\]. `re_client_version:0.185.0.db415f21-gomaip` at `src/DEPS`:307, in a tree cut 18 September 2026, nearly a year past its announced removal at end-September 2025. `CheckNoDEPSGIT` at `src/PRESUBMIT.py`:3341, still refusing edits to a `.DEPS.git` deleted from trunk in 2014. And `'SUBMODULE_MIGRATION': 'True'` at `src/DEPS`:582, which nothing reads *\[from the tree\]*.

**Every parser of DEPS is a dependency on DEPS.** The FAQ sentence §09 quotes — "Lots of Chromium infrastructure already parse DEPS file directly" \[`src/docs/git_submodules.md`:251\] *\[from the docs\]* — is both the rationale for the two-stage plan and the reason the second stage has not happened. Those parsers have names, and each breaks the day git deps leave DEPS.

Two costs are measured. A first sync moves 25,075,599,060 B before one object file exists, 93.9% of it git mirror content — packs, indexes, a commit-graph and 47,639 refs, of which the build compiles one (§05). And what git cannot represent blocks the end state: 49 `*_revision` variables, nine `recursedeps`, 144 `gclient-condition` keys git reads as noise (§09).

So: **the declarative file is easy to change and the ecosystem around it is not, so Chromium keeps the old interface alive while the new mechanism carries the load underneath.** That sentence is the whole post.

What happens next is not in the tree *\[reconstruction\]*. Nothing says stage two is abandoned; nothing says it is scheduled, and the bug's last recorded modification is 2025-03-24. The same holds for reclient: the warning is in `rbe.gni`, the pin in DEPS, and no commit removes either. Both states are cheap to hold and expensive to end — an equilibrium, not a plan. I predict no date.

## 13 · Sources

Two checkouts are the subject. `chromium/src` at `f288fed6c601ae22461c9c9d8189004050abfaeb` — `chrome/VERSION` 156.0.8067.0, HEAD committed 2026-09-18, itself a roll of `clank/internal/apps` — and `depot_tools` at `0306e4682b4ac35287c726fa35a983157a625902`, not arbitrary: the revision `src/DEPS`:2212 pins for `src/third_party/depot_tools` *\[from the tree\]*. Every path:line below is from those trees unless the entry says otherwise.

### The tree

- **`chromium/src`** — `DEPS` (the census, three transports, every pin); `.gitmodules` (the 273 gitlinks); `PRESUBMIT.py` (`CheckNoDEPSGIT`); `build/toolchain/rbe.gni` and `siso.gni` (the three GN args, the reclient warning); `build/config/siso/*.star`; `build/config/compiler/BUILD.gn` (the clang and Rust asserts); `build/util/lastchange.py` and `version.py`; `tools/clang/scripts/update.py`, `upload_revision.py` and `sync_deps.py` (the clang roll); `tools/rust/update_rust.py`; `infra/config/generated` (builder properties).
- **`depot_tools`** — `gclient.py` (config, the execution queue, hooks, `setdep`); `gclient_eval.py` (the parser and the token-level editor); `gclient_scm.py` (git, CIPD and GCS checkout); `gclient_paths.py` (how a wrapper finds the tree); `git_cache.py` (mirrors and bootstrap); `roll_dep.py`; `presubmit_canned_checks.py` (DEPS versus submodules); `fetch.py`; `autoninja.py` and `reclient_helper.py` (which client runs); `recipes/recipe_modules/bot_update` (the same sync on a bot).
- **`v8`** — `tools/release/roll_bisect.py`: one evidenced out-of-tree DEPS consumer, rewriting `v8_revision` by regex.

### Chromium's own docs

- `src/docs/dependencies.md`:9 — "`gclient` supports three dependency types: git, gcs, and cipd" (§01).
- `src/docs/git_submodules.md`:251 — the FAQ answer that is also the reason stage two stalled — "Lots of Chromium infrastructure already parse DEPS file directly."
- `src/docs/linux/build_instructions.md`:95, 99 — "~30 GB for Chromium" and "Expect the command to take 30 minutes on even a fast connection" — the figures §05 measures against.
- `src/docs/clang.md`:3–5 (bumped "every two weeks or so"), `clang_gardening.md`:54–72 (the gardener's `15 */2 * * *` dry-run cron) and `updating_clang.md`:90–96 (a reused commit-hash + sub-revision pair makes the upload bots skip the upload yet "still consider the run a success").
- `src/docs/toolchain_support.md`:35–37 — the toolchain is updated "every 2-4 weeks": the cadence §06 cites for a clang lap.
- `src/docs/mac_build_instructions.md`:182 — the Mac setup section is still headed "Use Reclient" in this tree: a stale-doc observation, not a statement of practice.

### Announcements and design docs

- [chromium-dev, 2 March 2023](https://groups.google.com/a/chromium.org/g/chromium-dev/c/weYzs3_WWts) (Josip Sokcevic) — the submodules announcement and the complaints under it.
- ["Chromium Browser development using Git submodules"](https://docs.google.com/document/d/1NhgzGAaApCds2yEhtnDDGoXeCcqS6MKYLY4SosY9inA/view) (8 February 2023) — the three stages; ["depot_tools submodules support"](https://docs.google.com/document/d/1N_fseFNOj10ETZG3pZ-I30R__w96rYNtvx5y_jFGJWw/view) (20 June 2023) — the `git_dependencies` states and `gclient-condition`.
- ["PSA:Goma deprecation"](https://groups.google.com/a/chromium.org/g/chromium-dev/c/rajt7THxIng) (Takuto Ikuta, archive timestamp 8 September 2023 UTC) — the sentences quoted in §10.
- [chromium-dev, 16 June 2025](https://groups.google.com/a/chromium.org/g/chromium-dev/c/v-WOvWUtOpg) (Junji Watanabe) — Ninja to Siso, and "Reclient will be removed from Chromium at the end of September": the deadline §11 measures the tree against.

### Outside the tree

- Skia [AutoRoll](https://skia.googlesource.com/buildbot/+/main/autoroll/README.md) — `README.md` (modes and strategies), `go/commit_msg/default.go` (the roll subject template) and `go/repo_manager/common/version_file_common/version_file_common.go` (why a roller writes the gitlink too).
- [github.com/bazelbuild/reclient](https://github.com/bazelbuild/reclient) — the four binaries and the `-gomaip` lineage.
- Siso, at [chromium.googlesource.com/build](https://chromium.googlesource.com/build/+/refs/heads/main/siso/) — `scandeps/doc.go` (the "forged" scanner), `build/run_remote.go` (the fallback ladder), `build/limits.go` (the concurrency factors).
- The goma [client at 5de52a5ece34](https://chromium.googlesource.com/infra/goma/client/+/5de52a5ece34/) and [server at 49e8b0076afc](https://chromium.googlesource.com/infra/goma/server/+/49e8b0076afc/) — the revisions read here; `5de52a5ece34` (11 January 2024) is the last substantive client commit, and on 21 May 2024 both repositories were reduced to a README.
- [EngFlow, 11 September 2023](https://blog.engflow.com/2023/09/11/goma-is-gone--put-everything-into-reclient/) — the HTTP/1-versus-gRPC contrast quoted in §10, from outside Google.

### Measurement endpoints

- `chromium-review.googlesource.com/changes/` with the query `?q=project:chromium/src+status:merged` `+mergedafter:2026-09-14+mergedbefore:2026-09-21` — that week's 5,519 merged changes, 4,513 on `main`.
- `chromium.googlesource.com/chromium/src/+log/refs/heads/main?format=JSON` — the four-week roller share, 3,893 of 16,973, and the footer counts.
- `storage.googleapis.com/storage/v1/b/chromium-git-cache/o?prefix=v2/…` — snapshot sizes, anonymously; chromium/src is 15,481,300,760 B in 46 files.
- `chrome-infra-packages.appspot.com/prpc/` — the `cipd.Repository` methods `ResolveVersion` and `GetInstanceURL` — plus an HTTP `HEAD` on the signed URL — CIPD bytes, which `DescribeInstance` omits.
- `logs.chromium.org` builds `8669987184970100865` (`chromium/ci/Linux Builder`) and `8669976255482942481` (`chromium/try/linux-rel-compilator`) — the checkouts timed in §05.
- The Google Code Archive JSON commit list for `gclient` — the 2008 origin; and the GitHub API mirror of `chromium/src` for pre-2017 commits, because gitiles serves path-filtered history only behind sign-in.

**Provenance.** *Sourced:* every path:line quotation is read from the two checkouts above, or — where the path lies outside the sparse checkout’s cone — from the same file at `f288fed6` on the public mirror; every date comes from a primary commit, thread or archive, not from secondary coverage. *Derived:* the dependency census (451 entries, 273/147/31), the active-on-Linux counts and the byte totals are computed, not quoted — `src/DEPS` parsed with depot_tools' own `gclient_eval` and again with `ast.parse`, public buckets listed anonymously. The method is named at each number, so each is reproducible. *Reconstruction:* the ordering narratives in the sync and roll figures assemble many files into one picture no single file states, and are badged *\[reconstruction\]* where they appear. *Not verified:* whether Chromium still intends stage 2 (bug 40254050 is open, last modified 2025-03-24, comments behind sign-in); reclient's real removal date (`crbug.com/424659245` and `crbug.com/448517720` are sign-in gated); the internal rewrapper cfgs, so the Windows and macOS platform properties are unknown; goma's fleet size, cache-hit rates and shutdown date, never published; and any per-action timing comparison between Siso's `scandeps` and goma or reclient's include processor — none is public, and I did not make one. Two caveats: the byte totals are lower bounds, because six active deps have no cache snapshot and were omitted, not estimated; and the "30 minutes to more than 150 minutes" figure in goma's open-sourcing announcement is cited there from a 2017 unity-build thread whose chart measures Opera for Mac, so it is never used above as a Chrome number.
