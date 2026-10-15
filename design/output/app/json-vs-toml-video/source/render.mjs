// Render index.html frame by frame: every frame is window.seek(t), captured by headless Chrome,
// piped to ffmpeg. Prompt Motion's "plain HTML + Playwright + ffmpeg" build.
//
//   node render.mjs stills 0,3.5,12.8 [outdir]   one PNG per time (the review step)
//   node render.mjs beats [outdir]               one PNG per scene beat, plus a contact sheet
//   node render.mjs audio                        soundtrack only -> out/soundtrack.wav
//   node render.mjs full [fps]                   frames -> out/video-silent.mp4, audio, mux -> out/json-vs-toml.mp4
import { chromium } from "playwright-core";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME; // path to a Chrome or chrome-headless-shell binary
const FFMPEG = process.env.FFMPEG || "ffmpeg"; // needs libx264
const W = 1920, H = 1080;
const [mode = "beats", arg1, arg2] = process.argv.slice(2);

async function open() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--font-render-hinting=none",
    "--disable-lcd-text", "--force-color-profile=srgb", "--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on("pageerror", e => { console.error("pageerror:", e.message); process.exitCode = 1; });
  page.on("console", m => { if (m.type() === "error") console.error("console:", m.text()); });
  await page.goto("file://" + resolve(HERE, "index.html"));
  await page.evaluate(() => window.ready);
  const cdp = await page.context().newCDPSession(page);
  const duration = await page.evaluate(() => window.DURATION);
  const shot = async (t, type = "png") => {
    await page.evaluate(x => window.seek(x), t);
    const r = await cdp.send("Page.captureScreenshot", { format: type, quality: type === "jpeg" ? 95 : undefined, optimizeForSpeed: type === "png" });
    return Buffer.from(r.data, "base64");
  };
  return { browser, page, shot, duration };
}

function ff(args, input) {
  const p = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: [input ? "pipe" : "ignore", "inherit", "inherit"] });
  const done = new Promise((ok, bad) => p.on("close", c => (c === 0 ? ok() : bad(new Error("ffmpeg exited " + c)))));
  return { p, done };
}

async function stills(times, outdir) {
  mkdirSync(outdir, { recursive: true });
  const { browser, shot } = await open();
  const files = [];
  for (const t of times) {
    const f = resolve(outdir, `t${t.toFixed(2).padStart(6, "0")}.png`);
    writeFileSync(f, await shot(t));
    files.push(f);
  }
  await browser.close();
  return files;
}

if (mode === "stills") {
  const times = (arg1 || "0").split(",").map(Number);
  const files = await stills(times, resolve(HERE, arg2 || "review"));
  console.log(files.join("\n"));
} else if (mode === "beats") {
  // one still per scene beat: the moments the brief says to check before the full render
  const B = 60 / 90;
  const beats = [3, 6.5, 12, 17, 20.5, 26.5, 31, 34, 43, 50, 56, 61, 69, 74, 80, 85, 90, 95, 102, 108, 116, 119.5, 124, 133, 140, 150];
  const outdir = resolve(HERE, arg1 || "review/beats");
  const files = await stills(beats.map(n => n * B), outdir);
  // contact sheet, 4 x N at quarter size
  const cols = 4, rows = Math.ceil(files.length / cols);
  const inputs = files.flatMap(f => ["-i", f]);
  const scaled = files.map((_, i) => `[${i}:v]scale=480:270[s${i}]`).join(";");
  const layout = files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join("|");
  const stack = files.map((_, i) => `[s${i}]`).join("") + `xstack=inputs=${files.length}:layout=${layout}:fill=white[out]`;
  await ff([...inputs, "-filter_complex", `${scaled};${stack}`, "-map", "[out]", "-frames:v", "1", resolve(outdir, "contact.png")]).done;
  console.log(`${files.length} stills + contact sheet in ${outdir} (${rows} rows)`);
} else if (mode === "audio" || mode === "full") {
  mkdirSync(resolve(HERE, "out"), { recursive: true });
  const { browser, page, shot, duration } = await open();
  const wav = resolve(HERE, "out/soundtrack.wav");
  const b64 = await page.evaluate(() => window.renderAudio());
  writeFileSync(wav, Buffer.from(b64, "base64"));
  console.log("soundtrack", wav, statSync(wav).size, "bytes");
  if (mode === "full") {
    const fps = Number(arg1 || 60);
    const n = Math.round(duration * fps);
    const silent = resolve(HERE, "out/video-silent.mp4");
    const enc = ff(["-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
      "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-tune", "animation",
      "-movflags", "+faststart", silent], true);
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const buf = await shot(i / fps, "png");
      if (!enc.p.stdin.write(buf)) await new Promise(r => enc.p.stdin.once("drain", r));
      if (i % (fps * 5) === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    enc.p.stdin.end();
    await enc.done;
    const final = resolve(HERE, "out/json-vs-toml.mp4");
    await ff(["-i", silent, "-i", wav, "-c:v", "copy", "-af", "volume=10dB,alimiter=limit=0.89:level=false", "-c:a", "aac", "-b:a", "192k",
      "-ar", "48000", "-shortest", "-movflags", "+faststart", final]).done;
    console.log("done", final, statSync(final).size, "bytes", `${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await browser.close();
}
void spawnSync;
