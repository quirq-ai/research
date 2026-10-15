# How motion graphics are made with Claude

What [Prompt Motion](https://prompt-motion.com/), a public gallery of motion videos made with Claude, shows about
how those videos are built, what the best-received prompts have in common, and what we learned by applying the
method to turn one piece of research into a video.

Requested by **suraj** on 14 October 2026; researched and built with Claude Opus 5.5 the same day. Counts marked
*[measured]* come from the gallery's public pages, fetched on 14 October 2026 with the two scripts in
[`2026-10-15-prompt-motion/`](2026-10-15-prompt-motion/) (`scrape.py` fetches, `stats.py` counts). Figures marked
*[from the blog]* are the gallery's own analyses, dated 10 October 2026. The gallery keeps growing, so a later run
returns more entries.

## 01 · What Prompt Motion is

Prompt Motion describes itself as "A collection of motion videos made with Claude Opus 5.5, with the prompts and
skills behind them" ([homepage](https://prompt-motion.com/)). It is curated by @p4nthera_, and each entry links the
creator's post on X; the footer says "Videos and prompts belong to their creators, linked on each entry."

On 14 October 2026 the gallery held **234 entries**, dated 23 September to 10 October 2026. 231 are tagged *Prompt*
and 4 *Skill*, so one entry is both. **Every entry names Opus 5.5 as its model.** *[measured]*

| Content tag | Entries |
|---|---|
| Product UI | 101 |
| Kinetic type | 97 |
| Music | 51 |
| Shapes | 44 |
| Particles | 43 |
| Charts | 33 |
| Diagrams | 31 |
| Characters | 27 |
| Photos | 23 |
| Phone | 22 |
| Code | 21 |

*[measured]* An entry can carry several tags.

Each entry page shows the prompt text, the model, the rendering stack when the creator named one, the date, and a
*Customize* button that turns the prompt into a fill-in template in the browser. The site also has
[Templates](https://prompt-motion.com/templates) (rewritten prompts, each run once and shown with "no edits"),
[Customize](https://prompt-motion.com/customize), and a [blog](https://prompt-motion.com/blog) of five analyses
published on 10 October 2026.

## 02 · Every video is code, captured frame by frame

"When Claude makes a motion graphics video, it doesn't produce pixels directly. It writes code that draws each
frame, and something else turns that code into an MP4." ([Remotion vs HyperFrames vs plain HTML](https://prompt-motion.com/blog/remotion-vs-hyperframes))

57 of the 234 entries name their rendering stack *[measured]*. Grouped the way the blog groups them:

| Stack | Entries | What Claude writes |
|---|---|---|
| Plain HTML, canvas, SVG or JavaScript, captured with a headless browser | 24 | One page and a `seek(t)` function; a script steps through time and screenshots each frame |
| Remotion | 13 | React components that read the frame number |
| HyperFrames | 10 | HTML with data attributes, often with GSAP; HeyGen's renderer, Apache 2.0 |
| Three.js | 5 | Real 3D, captured the same way |
| Manim, Blender, Python with ffmpeg, OpenEdit | 5 | One each |

*[measured]* The blog counted 56 of 233 on 10 October, with 23 in the plain-HTML group *[from the blog]*.

All three main approaches work the same way underneath: "A headless browser loads the animation, moves it to an
exact time, takes a screenshot, and repeats for every frame. ffmpeg then encodes the screenshots into a video.
Because every frame is computed from the time, not played back live, a slow machine can't drop frames or drift off
the beat." The blog's advice: "Whichever you pick, name it in the prompt. Without a build method, Claude chooses one
each time, and the results are harder to repeat." *[from the blog]*

## 03 · What the best-received prompts share

The most-copied prompt in the gallery is one line asking Claude for a 15-second showreel of its own skills. Its runs
show why a short prompt scatters: "Thirty-three people pasted the same 26-word prompt into Claude and posted the
video it made. The least successful posts got no likes at all. The most successful got 17,023."
([What 230 real examples show](https://prompt-motion.com/blog/ai-motion-graphics-prompts)) *[from the blog]*

The long prompts behind the best-received videos share five parts, as the blog lists them *[from the blog]*:

1. **One concept.** "One shape, never cut" gives every shot a reason to exist; without one, "Claude tends to make a
   tour of effects instead."
2. **A banned list.** Glows, particle bursts, bouncy easing, crossfades, "anything that looks like a template."
   Only 16 prompts had one, "but four of the 20 most-liked entries do."
3. **Timing to a beat.** "A tempo and a bar count, such as '120 BPM, 7 bars, something happens on every beat,' in
   place of the word 'dynamic.'"
4. **A build method.** One HTML file where every frame is computed from the time, captured frame by frame, often with
   sub-frames blended by ffmpeg for motion blur.
5. **A review step.** "Render one frame per beat before the full render. Fix anything off the grid, cramped or hard
   to read."

The blog's banned-list analysis adds the reason behind each item: glows and particle bursts "read as decoration"
when nothing calls for them; a crossfade "is what you get when no one designed the transition"; corner labels
"suggest detail without carrying any information"; and with `Math.random`, "every render comes out different".
([Why AI motion graphics look AI-made](https://prompt-motion.com/blog/make-ai-motion-graphics-look-less-ai))
*[from the blog]*

Several of the top prompts use the same layout, which the gallery's own templates follow: `<inputs>`, `<direction>`
(style and banned list), `<structure>` (beats), `<build>` (a numbered render recipe), `<gotchas>` and `<start>`
(show a storyboard or stills before building). See [The showreel prompt](https://prompt-motion.com/templates/showreel).

## 04 · What explainer prompts leave out

The gallery has 27 explainers, and they have "the shortest prompts of any category, a median of 15 words". The best
"gave Claude a process to show from start to finish", such as a cocktail made "from start to finish (empty glass to
completed cocktail)". ([AI explainer video prompts](https://prompt-motion.com/blog/ai-explainer-video-prompts))
*[from the blog]*

| What the prompt specifies | Prompts, of 27 |
|---|---|
| A length | 8 |
| A visual style | 8 |
| Narration, music or sound | 6 |
| Who the video is for | 2 |
| Checking facts or citing sources | 0 |

*[from the blog]* "An explainer is only useful if it's right, and no prompt asks Claude to check what it puts on
screen."

## 05 · Our counts, 14 October 2026

| Measure | Value |
|---|---|
| Median prompt length, 216 prompts not in Chinese, Japanese or Korean | 28 words (middle half 18 to 38; longest 2,095) |
| Prompts opening with "make a dynamic N-second motion graphics video" | 75 |
| Copies of the single most repeated prompt, ignoring case and punctuation | 30 |
| Prompts with a banned or avoid list | 13 |
| Prompts mentioning `seek(`, Playwright, ffmpeg | 12, 10, 8 |
| Prompts giving a tempo in BPM | 14 |
| Prompts asking for narration or a voice | 12 |
| Prompts using `<direction>` blocks | 11 |

*[measured]* These differ a little from the blog's (26-word median, 33 identical copies, 16 banned lists) because
the gallery had grown by a day and the blog normalises text its own way. Likes were not collected; they live on X.

## 06 · Applying it: research as a video

We used the method to turn one finished piece of research, suraj's
[What the Parser Hears](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/what-the-parser-hears), into a 101-second explainer. The result and its
full source are this topic's app, [JSON vs TOML, in motion](../app/json-vs-toml-video/).

- **The brief** follows the gallery's layout with all five parts, plus the two things the explainer analysis found
  missing: the audience ("developers who write config files and have never wondered which parser reads them") and an
  accuracy rule.
- **The concept** is one config file written twice, JSON on the left and TOML on the right, with twenty readers under
  it, one pill per real parser. Each scene is one edit; the edit is sent; every pill shows what that parser heard.
- **The accuracy rule** went further than any gallery prompt: every snippet on screen was first run through the same
  10 JSON and 10 TOML parser configurations the original research measured, and the video reads its verdicts from
  that output. *[measured]*
- **The build** is the plain-HTML recipe: one page where `window.seek(t)` computes every frame, captured by Playwright
  in headless Chrome and encoded by ffmpeg, with a soundtrack written in code using the Web Audio API.
- **The review step** caught eight problems before the full render, among them a send that fired before the TOML file
  had finished typing and a duplicate-key underline on the wrong line.

## Sources

- Prompt Motion: [homepage](https://prompt-motion.com/), [templates](https://prompt-motion.com/templates),
  [customize](https://prompt-motion.com/customize), and every entry page, fetched 14 October 2026.
- Prompt Motion blog, 10 October 2026:
  [Remotion vs HyperFrames vs plain HTML](https://prompt-motion.com/blog/remotion-vs-hyperframes),
  [AI motion graphics prompts: what 230 real examples show](https://prompt-motion.com/blog/ai-motion-graphics-prompts),
  [Why AI motion graphics look AI-made](https://prompt-motion.com/blog/make-ai-motion-graphics-look-less-ai),
  [AI explainer video prompts](https://prompt-motion.com/blog/ai-explainer-video-prompts) and
  [How to prompt an AI launch video](https://prompt-motion.com/blog/ai-launch-video-prompts).
- Prompt Motion templates: [The showreel prompt](https://prompt-motion.com/templates/showreel) and
  [The 3D template](https://prompt-motion.com/templates/realtime).
- The scripts that produced the *[measured]* counts: [`scrape.py`](2026-10-15-prompt-motion/scrape.py) and
  [`stats.py`](2026-10-15-prompt-motion/stats.py).
- The research the video presents: suraj's [What the Parser Hears](https://github.com/sharmasuraj0123/writings/tree/a5a356d418d45b63d34624b12ec3d7809167b309/what-the-parser-hears), and the
  engineering topic's copy of it in this repo.
