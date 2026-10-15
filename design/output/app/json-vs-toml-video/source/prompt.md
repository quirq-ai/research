# JSON vs TOML, in motion — the prompt

Written in the structure Prompt Motion's blog found behind the gallery's best-received videos
(prompt-motion.com/blog: one concept, a banned list, a beat grid, a build method, a review step),
plus the two things its explainer study says almost every explainer prompt leaves out: the audience
and an accuracy rule. Model: Claude Opus 5.5.

```
<inputs>
The research: XO Research, "What the Parser Hears" (quirq.ai/what-the-parser-hears) — 71 cases sent
through 34 parser configurations on one machine, October 2026 — and its harness. Every snippet shown on
screen is re-measured through the same 10 JSON and 10 TOML parsers before it is drawn
(measure/results.json). Audience: developers who write config files and have never wondered which
parser reads them.
</inputs>

<direction>
An 90-second explainer in 16:9, the XO Research paper look: warm off-white ground, near-black ink,
Source Serif 4 for the claims, JetBrains Mono for the files, Inter for labels. Colour carries meaning
only: blue is JSON, purple is TOML, green means a parser heard what was written, red means it refused,
orange means it heard something else without saying so.
One concept, never cut: one config file, written twice — JSON on the left, TOML on the right — and
twenty readers under it, one pill per real parser. Every scene is the writer making one edit; the edit
is sent; each pill turns to what that parser heard. Nothing on screen is decoration: every move is an
edit, a send, or a verdict.
Banned: glows, particle bursts, crossfades between scenes, camera shake, gradients, bouncy easing
(springs with a tiny overshoot at most), text or frame marks in the corners, holds without something
to read, Math.random, anything that looks like a template.
</direction>

<structure>
90 BPM, about 135 beats. A caption at the top states the finding in one line; the edit, the send and
the verdict land on beats.
Hook: "A config file has two readers." — the person who writes it, and the program that loads it.
Setup: the same settings typed in both formats; twenty parsers appear; all twenty hear the same thing.
Edits, one per scene, each reverted before the next: a comment; a trailing comma; the port pasted
twice; an ID one past 2^53; a date, then a missing value; a top-level key added after [server];
the server table rewritten in TOML 1.1 syntax.
Verdict: the three practices the research gives, then the end card with the source.
</structure>

<build>
1. One HTML file, 1920x1080, 60 fps. Compute every style from time inside window.seek(t): no CSS
   transitions or animations, no timers, no state carried between frames.
2. Text is typed by revealing characters as a function of time; inserted lines push the file down on a
   closed-form spring; reverted lines are erased right to left.
3. Pill states come from measure/results.json, copied into the page as data, never typed by hand.
4. Write the soundtrack in code with OfflineAudioContext: a soft pad that changes chord per scene, a
   quiet key click per typed character, one tone per verdict colour. Seeded noise only. Render to WAV.
5. Capture with Playwright and headless Chrome, frame by frame, pipe to ffmpeg (libx264, yuv420p),
   mux the audio, loudness-normalise.
6. Before the full render, render one still per scene beat and look at them. Fix anything cramped,
   overlapping, off the beat or too fast to read.
</build>

<gotchas>
Every number on screen must match measure/results.json; never round a parser count for rhythm.
Captions change with separate exit and entry timing so words never overlap. Reading time wins over
pace: a caption with a number stays at least three seconds. Monospace lines must fit the card at
25 px; widen the card before shrinking the type.
</gotchas>

<start>
Write the beat map and the stills first, then build and render without asking. Give me the MP4.
</start>
```
