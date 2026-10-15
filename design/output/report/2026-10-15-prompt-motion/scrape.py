#!/usr/bin/env python3
"""Fetch the Prompt Motion gallery and every entry page; write pm-cards.json and pm-entries.json.

Run on 14 October 2026 for this report. The gallery grows, so a later run returns more entries.
Sequential requests, 0.6 s apart, with an identifying user agent. Needs curl. Usage: python3 scrape.py
"""
import html
import json
import re
import subprocess
import time
from pathlib import Path

UA = "Mozilla/5.0 (research; quirq-ai/research design topic)"
pages = Path("pm")
pages.mkdir(exist_ok=True)


def get(url, dest):
    if dest.exists() and dest.stat().st_size > 1000:
        return dest.read_text(errors="replace")
    r = subprocess.run(["curl", "-sSL", "-A", UA, "--max-time", "40", "-o", str(dest), "-w", "%{http_code}", url],
                       capture_output=True, text=True)
    time.sleep(0.6)
    return dest.read_text(errors="replace") if r.stdout.strip() == "200" else ""


def flight(s):
    """The page's embedded Next.js data, decoded."""
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', s, re.S)
    return "".join(json.loads('"' + c + '"') for c in chunks)


home = flight(get("https://prompt-motion.com/", pages / "_index.html"))
start = home.find('{"cards":') + len('{"cards":')
cards, _ = json.JSONDecoder().raw_decode(home[start:])
json.dump(cards, open("pm-cards.json", "w"), indent=1)


def text_of(s):
    t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", s, flags=re.S)
    return re.sub(r"\n\s*\n+", "\n", html.unescape(re.sub(r"<[^>]+>", "\n", t)))


rows = []
for c in cards:
    t = text_of(get(f"https://prompt-motion.com/{c['slug']}", pages / f"{c['slug']}.html"))
    field = lambda name: (m.group(1).strip() if (m := re.search(rf"\n{name}\n(.*?)\n", t)) else None)
    m = re.search(r"\nCopy\n(.*?)\n(?:This prompt was taken|This skill|Model\n)", t, re.S)
    rows.append(dict(slug=c["slug"], title=c["title"], date=c["date"], tags=c["tags"], content=c["contentTags"],
                     handle=c["handle"], model=field("Model"), stack=field("Stack"), prompt=m.group(1).strip() if m else None))
json.dump(rows, open("pm-entries.json", "w"), indent=1, ensure_ascii=False)
print(len(rows), "entries")
