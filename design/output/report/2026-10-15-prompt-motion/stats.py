#!/usr/bin/env python3
"""Recompute the counts in the report from pm-entries.json (written by scrape.py, 14 October 2026)."""
import collections, json, re, statistics, sys

R = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "pm-entries.json"))
cjk = lambda p: bool(re.search(r"[぀-ヿ一-鿿가-힯]", p or ""))
words = lambda p: len(re.findall(r"[A-Za-z0-9'’]+", p or ""))
wl = [words(r["prompt"]) for r in R if r["prompt"] and not cjk(r["prompt"])]
q = statistics.quantiles(wl, n=4)
print("entries", len(R), "| with prompt", sum(1 for r in R if r["prompt"]), "| dates", min(r["date"] for r in R), max(r["date"] for r in R))
print("tags", collections.Counter(t for r in R for t in r["tags"]))
print("content", collections.Counter(t for r in R for t in r["content"]).most_common())
print("models", collections.Counter(r["model"] for r in R))
print("stacks", collections.Counter(r["stack"] or "(not stated)" for r in R).most_common())
print(f"median words {statistics.median(wl)} (non-CJK {len(wl)}), quartiles {q[0]}-{q[2]}, max {max(wl)}")
low = lambda r: (r["prompt"] or "").lower()
for k, rx in [("seek(", r"seek\("), ("playwright", r"playwright"), ("ffmpeg", r"ffmpeg"), ("bpm", r"\bbpm\b"),
              ("banned/avoid list", r"(^|\n)\s*(banned|avoid|don't use|do not use|never use)\b|ai giveaway"),
              ("narration/voice/tts", r"narrat|voice|tts|text-to-speech"), ("<direction>", r"<direction>"),
              ("showreel opening line", r"make a dynamic \d+-second motion graphics video")]:
    print(f"{k:24s}", sum(1 for r in R if re.search(rx, low(r), re.M)))
dup = collections.Counter(re.sub(r"[^a-z0-9 ]", "", low(r)).strip() for r in R).most_common(1)[0]
print("most repeated prompt:", dup[1], "copies")
