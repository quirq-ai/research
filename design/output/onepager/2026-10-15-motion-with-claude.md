# Motion design with Claude at a glance

How people make motion graphics with Claude, from the public gallery
[Prompt Motion](https://prompt-motion.com/), and what happened when we used its method to turn a piece of
research into a video. Researched on 14 October 2026; the gallery's own analyses are dated 10 October 2026.

## The claim

> When Claude makes a motion graphics video, it doesn't produce pixels directly. It writes code that draws each
> frame, and something else turns that code into an MP4.

From the Prompt Motion blog, quoted in [How motion graphics are made with Claude](../report/2026-10-15-prompt-motion.md#02-every-video-is-code-captured-frame-by-frame).

## In numbers

| | |
|---|---|
| **234** | entries in the gallery on 14 October 2026, every one made with Claude Opus 5.5 |
| **57** | of them name the stack that rendered the video; 24 are plain HTML captured by a headless browser |
| **5** | parts the best-received prompts share: one concept, a banned list, a beat grid, a build method, a review step |
| **0 of 27** | explainer prompts ask Claude to check its facts |
| **2 of 27** | explainer prompts say who the video is for |
| **20** | real parsers (10 JSON, 10 TOML) every snippet in our video went through before it was drawn |
| **101 s** | length of that video: 1920 × 1080, 60 fps, 6,080 frames, rendered in about 14 minutes on 2 CPUs |
| **8** | problems the review step caught before the full render |

## Where to go next

| Read | For |
|---|---|
| [How motion graphics are made with Claude](../report/2026-10-15-prompt-motion.md) | The gallery, the rendering stacks, what the best prompts share, our counts, and how we applied it |
| [JSON vs TOML, in motion](../app/json-vs-toml-video/) | The video, its brief, its frame-by-frame source and its measured verdicts |

## What we took from it

- Name the build method. One HTML page whose `seek(t)` computes every frame from time, captured frame by frame,
  needs nothing but a headless browser and ffmpeg.
- Write the banned list and say what to do instead: no glows, crossfades, bouncy easing or text in the corners.
- For explainers, add the two lines almost every prompt leaves out: the audience, and an accuracy rule. Ours measured
  every on-screen claim before drawing it.
- Render one still per beat and look at them before the full render.

## Sources

- [Prompt Motion](https://prompt-motion.com/) and its [blog](https://prompt-motion.com/blog), fetched 14 October 2026.
- suraj's [What the Parser Hears](https://quirq.ai/what-the-parser-hears/), the research the video presents.
- This topic's [report](../report/2026-10-15-prompt-motion.md) and [app](../app/json-vs-toml-video/).
