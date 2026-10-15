# /// script
# requires-python = ">=3.14,<3.15"
# dependencies = [
#   "PyYAML==6.0.3",
#   "ruamel.yaml==0.19.1",
#   "tomli==2.5.0",
#   "tomlkit==0.15.1",
#   "json5==0.15.0",
# ]
# [tool.uv]
# exclude-newer = "2026-10-09T00:00:00Z"
# ///
"""Measure the exact snippets shown in the JSON vs TOML video.

Reuses the "What the Parser Hears" harness read-only (writings/what-the-parser-hears/_compute.py and
its probes in ~/config-ref/bench/hears): same parsers, same pinned versions, same calls, same result
normalisation. Only the case list differs: every case here is the base config of the video plus one
edit, byte for byte what appears on screen. Writes results.json next to this file.

Run:  uv run --script measure.py
"""
import base64, importlib.util, json, shutil, sys, tempfile, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
COMPUTE = Path.home() / "xo-projects/writings/what-the-parser-hears/_compute.py"
spec = importlib.util.spec_from_file_location("hears", COMPUTE)
H = importlib.util.module_from_spec(spec)
sys.modules["hears"] = H
spec.loader.exec_module(H)

JSON_BASE = ['{', '  "title": "app",', '  "server": {', '    "host": "0.0.0.0",', '    "port": 8080', '  }', '}']
TOML_BASE = ['title = "app"', '', '[server]', 'host = "0.0.0.0"', 'port = 8080']


def doc(lines):
    return "\n".join(lines) + "\n"


def edit(base, at, new=(), drop=0, replace=None):
    out = list(base)
    if replace:
        for i, s in replace.items():
            out[i] = s
    out[at:at + drop] = list(new)
    return out


VIDEO = {
    # scene: (json lines, toml lines)
    "base": (JSON_BASE, TOML_BASE),
    "comment": (edit(JSON_BASE, 4, ['    // admin UI port']), edit(TOML_BASE, 4, ['# admin UI port'])),
    "trailing_comma": (edit(JSON_BASE, 4, ['    "port": 8080,'], drop=1), TOML_BASE),
    "duplicate": (edit(JSON_BASE, 4, ['    "port": 8080,', '    "port": 9090'], drop=1), edit(TOML_BASE, 5, ['port = 9090'])),
    "big_int": (edit(JSON_BASE, 2, ['  "id": 9007199254740993,']), edit(TOML_BASE, 1, ['id = 9007199254740993'])),
    "date": (edit(JSON_BASE, 2, ['  "deployed": "2026-10-09T09:30:00Z",']), edit(TOML_BASE, 1, ['deployed = 2026-10-09T09:30:00Z'])),
    "null": (edit(JSON_BASE, 2, ['  "proxy": null,']), edit(TOML_BASE, 1, ['proxy =' ])),
    "scope": (edit(JSON_BASE, 5, ['  },', '  "debug": true'], drop=1), TOML_BASE + ['', '# top-level switch', 'debug = true']),
    "toml11": (JSON_BASE, ['title = "app"', '', 'server = {', '  host = "0.0.0.0",', '  port = 8080,', '}']),
}

CASES = []
for name, (jl, tl) in VIDEO.items():
    for fmt, lines in (("json", jl), ("toml", tl)):
        CASES.append(dict(id=f"v_{name}_{fmt}", format=fmt, title=name, trap="", input=doc(lines).encode(), mode="doc",
                          source="video snippet", extra=[], order_matters=False))


def main():
    P = {k: v for k, v in H.py_parsers().items() if v["format"] in ("json", "toml") and not v.get("extra")}
    probes = H.make_probes()
    req = {
        "cases": [{"id": c["id"], "format": c["format"], "mode": c["mode"], "input_b64": base64.b64encode(c["input"]).decode()}
                  for c in CASES],
        "cross": {"repeats": 1, "warmup": 0, "files": {k: base64.b64encode(v.encode()).decode() for k, v in H.CROSS.items()}},
        "roundtrip": {"files": {k: base64.b64encode(v.encode()).decode() for k, v in H.CROSS.items()},
                      "edit": {"path": H.EDIT["path"], "value": H.EDIT["value"]}, "trap_strings": H.TRAP_STRINGS},
    }
    tmp = Path(tempfile.mkdtemp(prefix="video-hears-"))
    req_path = tmp / "request.json"
    req_path.write_text(json.dumps(req))
    results, versions, skipped = {}, {}, {}
    for pid, p in P.items():
        versions[pid] = p["version"]
        results[pid] = {c["id"]: H.run_py_case(p, c) for c in CASES if c["format"] == p["format"]}
    if H.PY315.exists():
        out, err, _ = H.run_cmd([str(H.PY315), str(COMPUTE), "--child", "cases315", str(req_path)])
        if err:
            skipped["py315:tomllib"] = err
        else:
            o = json.loads(out)
            results["py315:tomllib"] = o["results"]
            versions["py315:tomllib"] = f"stdlib (Python {o['version']}, release candidate)"
    if shutil.which("jq"):
        versions["jq"] = H.jq_version()
        results["jq"] = {c["id"]: H.jq_case(c["input"]) for c in CASES if c["format"] == "json"}
    else:
        skipped["jq"] = "jq not found"
    for name, pr in probes.items():
        if not pr.ensure():
            skipped[name] = pr.status
            continue
        o, err = pr.call(req_path, "cases")
        if err:
            skipped[name] = err
            continue
        for pid, meta in o["parsers"].items():
            if meta.get("format") in ("json", "toml"):
                versions[pid] = meta["version"]
                results[pid] = {k: v for k, v in o["results"][pid].items() if k.startswith("v_")}
    out = {"about": "exact video snippets through the What the Parser Hears harness (JSON + TOML parsers only)",
           "harness": str(COMPUTE), "measured_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "versions": versions, "skipped": skipped, "cases": []}
    for c in CASES:
        groups = {}
        for pid, rs in results.items():
            r = rs.get(c["id"])
            if r is None:
                continue
            key = H.result_heard(r)
            groups.setdefault(json.dumps(key, sort_keys=True, default=str), []).append(pid)
        out["cases"].append({"id": c["id"], "format": c["format"], "scene": c["title"], "input": c["input"].decode(),
                             "heard": [{"heard": json.loads(k), "parsers": sorted(v)} for k, v in
                                       sorted(groups.items(), key=lambda kv: -len(kv[1]))],
                             "raw": {pid: results[pid].get(c["id"]) for pid in sorted(results) if c["id"] in results[pid]}})
    (HERE / "results.json").write_text(json.dumps(out, indent=1, ensure_ascii=False, default=str) + "\n")
    for c in out["cases"]:
        print(f"{c['id']:22s}", " | ".join(f"{len(g['parsers'])}: {str(g['heard'])[:70]}" for g in c["heard"]))
    print("skipped:", skipped)


if __name__ == "__main__":
    main()
