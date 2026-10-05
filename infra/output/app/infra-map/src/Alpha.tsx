// The alpha checklist: what each alpha user does, step by step, and what the team finishes first.
// Commands come from src/commands/*.sh, imported raw so the page shows exactly the tested text.
import { useEffect, useRef, useState, type ReactNode } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import setupSh from "@/commands/setup.sh?raw"
import getRepoSh from "@/commands/get-repo.sh?raw"

const TICKS_KEY = "qq-alpha-ticks-v1"
function loadTicks(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(TICKS_KEY) || "{}") || {} } catch { return {} }
}

/* ---------- small building blocks, all on shadcn components ---------- */

function Command({ text, label }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "select">("idle")
  const pre = useRef<HTMLPreElement>(null)
  const copy = () => {
    const select = () => {
      const r = document.createRange(); r.selectNodeContents(pre.current!)
      const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); setState("select")
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => { setState("copied"); setTimeout(() => setState("idle"), 1600) }, select)
    else select()
  }
  return (
    <div className="my-3 grid min-w-0 gap-1">
      {label && <div className="font-mono text-xs text-muted-foreground">{label}</div>}
      <div className="relative min-w-0">
        <pre ref={pre} className="m-0 overflow-x-auto rounded-lg bg-code p-4 pr-24 font-mono text-[13px] leading-relaxed whitespace-pre text-code-foreground">{text}</pre>
        <Button size="sm" variant="secondary" className="absolute top-2 right-2 h-7" onClick={copy}>
          {state === "copied" ? <><CheckIcon /> Copied</> : state === "select" ? "Selected" : <><CopyIcon /> Copy</>}
        </Button>
      </div>
    </div>
  )
}

function How({ title = "What it does", children }: { title?: string; children: ReactNode }) {
  return <Alert className="my-3"><AlertTitle>{title}</AlertTitle><AlertDescription className="block text-foreground/85">{children}</AlertDescription></Alert>
}
function Warn({ title, children }: { title: string; children: ReactNode }) {
  return <Alert className="my-3 border-warn/60"><AlertTitle className="text-warn">{title}</AlertTitle><AlertDescription className="block text-foreground/85">{children}</AlertDescription></Alert>
}

/** Buttons that each reveal one explanation: how the page explains what can happen. */
function Outcomes({ label, prompt, options }: { label: string; prompt: string; options: { id: string; button: string; title: string; body: ReactNode }[] }) {
  const [v, setV] = useState("")
  const o = options.find(x => x.id === v)
  return (
    <div className="my-3 grid gap-2">
      <ToggleGroup type="single" variant="outline" value={v} onValueChange={setV} aria-label={label} className="flex flex-wrap justify-start">
        {options.map(x => <ToggleGroupItem key={x.id} value={x.id} className="h-auto px-3 py-1.5 text-sm">{x.button}</ToggleGroupItem>)}
      </ToggleGroup>
      <Card className="gap-1 bg-muted/60 px-4 py-3 text-sm shadow-none" aria-live="polite">
        {o ? <><div className="font-semibold">{o.title}</div><div className="text-foreground/85">{o.body}</div></> : <div className="text-muted-foreground">{prompt}</div>}
      </Card>
    </div>
  )
}

type Step = { id: string; title: string; sub: string; who?: string; body: ReactNode }

function Checklist({ steps, ticks, toggle, idPrefix }: { steps: Step[]; ticks: Record<string, boolean>; toggle: (id: string) => void; idPrefix: string }) {
  const [open, setOpen] = useState("")
  const markDone = (i: number) => {
    const id = steps[i].id
    const nowDone = !ticks[id]
    toggle(id)
    if (nowDone) {
      const next = steps.slice(i + 1).find(s => !ticks[s.id])
      setOpen(next ? next.id : "")
      if (next) requestAnimationFrame(() => document.getElementById(`${idPrefix}-${next.id}`)?.focus())
    }
  }
  return (
    <Accordion type="single" collapsible value={open} onValueChange={setOpen} className="grid min-w-0 gap-2">
      {steps.map((s, i) => {
        const done = !!ticks[s.id]
        return (
          <AccordionItem key={s.id} value={s.id} className="min-w-0 rounded-xl border bg-card px-4 last:border-b">
            <AccordionTrigger id={`${idPrefix}-${s.id}`} className="items-center gap-3 hover:no-underline">
              <span className="flex min-w-0 items-center gap-3">
                <span className={done ? "grid size-6 shrink-0 place-items-center rounded-full bg-good/20 text-good" : "grid size-6 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs text-muted-foreground"}>
                  {done ? <CheckIcon className="size-3.5" /> : i + 1}
                </span>
                <span className={done ? "min-w-0 opacity-70" : "min-w-0"}>
                  <span className="block font-semibold">{s.title}{s.who && <Badge variant="secondary" className="ml-2 align-middle font-mono text-[10px] uppercase">{s.who}</Badge>}</span>
                  <span className="block text-[13px] font-normal text-muted-foreground">{s.sub}</span>
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="min-w-0 pl-9 text-[15px] leading-relaxed max-sm:pl-0 [&_p]:mb-2.5 [&_ul]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
              {s.body}
              <Button variant={done ? "secondary" : "outline"} className="mt-2" onClick={() => markDone(i)}>{done ? "Done · undo" : "Mark as done"}</Button>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

/* ---------- content ---------- */

const REPO_CHOICES = [
  { id: "innernet", label: "innernet (Next.js)" },
  { id: "xo-space", label: "xo-space (Python)" },
]

function GetRepo() {
  const [repo, setRepo] = useState("innernet")
  return (<>
    <p>Pick the repo you will work on. The command below changes to match.</p>
    <ToggleGroup type="single" variant="outline" value={repo} onValueChange={v => v && setRepo(v)} aria-label="Repo" className="justify-start">
      {REPO_CHOICES.map(r => <ToggleGroupItem key={r.id} value={r.id} className="px-3 text-sm">{r.label}</ToggleGroupItem>)}
    </ToggleGroup>
    <Command label="Terminal" text={getRepoSh.trimEnd().replace("__REPO__", repo)} />
    <How>The first time, <code>qq fetch</code> clones the repo into <code>~/quirq</code> and runs <code>qq sync</code>. Sync reads the repo's manifest, <code>infra/repo.toml</code>, downloads each pinned toolchain once per machine (checked against its digest) and links it under <code>.qq/</code>. Later runs only sync. It runs in a subshell, so your terminal stays where it was.</How>
    <Warn title="On a Mac, sync stops at the toolchains">Toolchains are built for Linux x86_64 only so far, so on a Mac sync stops with <b>no pin for platform macos-arm64</b> (or macos-x86_64 on an Intel Mac; linux-arm64 on Linux ARM machines). The clone is fine. Install the tools yourself and carry on: Node 24 and pnpm for innernet; for xo-space, Python 3.14.8 exactly, as <code>python3</code> on your PATH (qq checks the full version). Homebrew gives the newest 3.14 patch, so use pyenv (<code>pyenv install 3.14.8</code>, then <code>pyenv local 3.14.8</code> in the xo-space folder) or uv instead. <code>qq build</code> and <code>qq test</code> use what is on your PATH.</Warn>
    <p>On Linux, if it stops with <b>cloned into …; fix the problem and run qq sync there</b>, a download failed. Paste the command again once your network is fine.</p>
  </>)
}

const USER_STEPS: Step[] = [
  { id: "u1", title: "Know what you signed up for", sub: "Four weeks, public repos, real feedback", body: <>
    <p>The alpha tests quirq infra (<b>qq</b>), the build and test system behind every quirq repo, with 10 to 15 of us before anything else is built. You keep doing your normal work on <b>innernet</b> or <b>xo-space</b>, just through qq.</p>
    <ul>
      <li><b>Week 1:</b> a pilot group of 3 to 5 people. <b>Weeks 2 to 4:</b> everyone. <b>Week 5:</b> we read your feedback and replan.</li>
      <li><b>What we ask:</b> land at least 3 PRs through the merge queue, answer a three-question check-in each Monday, and do a 20-minute exit chat.</li>
      <li><b>Help:</b> open a feedback issue (step 12). We read every one.</li>
    </ul>
    <Warn title="Everything is public">All quirq-ai repos are public, so your PRs, CI logs and test failure messages are public too, and failure messages are stored permanently. Never put a secret, token or private data in a PR, a commit or a test.</Warn>
  </> },
  { id: "u2", title: "See how qq fits together", sub: "The map, one step at a time", body: <>
    <p>qq is 13 small repos that hand work to each other. Open the map, press <b>Follow a change</b> and step through what happens from your laptop to <code>main</code>. Then tap any repo to see what it does, what it uses and what uses it.</p>
    <Button variant="outline" asChild><a href="#map" className="no-underline hover:no-underline">Open the map</a></Button>
  </> },
  { id: "u3", title: "Install qq", sub: "One paste, safe to run again", body: <>
    <p>You need <code>git</code> and Python 3.11.4 or newer. Paste this into a terminal (macOS or Linux, bash or zsh). It runs in a subshell, so it never changes your current folder or shell.</p>
    <Command label="Terminal" text={setupSh.trimEnd()} />
    <How>It checks git and Python (<code>$QQ_PYTHON</code> if you set it), then clones <a href="https://github.com/quirq-ai/depot" target="_blank" rel="noreferrer">quirq-ai/depot</a> into <code>~/depot</code>, or fast-forwards it if it is already there, and prints <code>qq 0.1.0</code>. The first run installs qq's Python packages, from pinned hashes, into <code>~/.cache/qq</code>. It never edits your shell profile; if <code>qq</code> is not on your PATH, it prints the one line to add. Running it twice is safe: the second run only updates.</How>
    <p>When it says <b>done</b>, add the PATH line it shows (if any), open a new terminal, and check that <code>qq --version</code> works. If <code>gh</code> is missing or signed out, install the <a href="https://cli.github.com" target="_blank" rel="noreferrer">GitHub CLI</a> and run <code>gh auth login</code>. qq uses gh to open and land PRs.</p>
    <p className="text-sm text-muted-foreground">Behind a company proxy? See the proxy and CA note under <a href="https://github.com/quirq-ai/depot#version-pinning" target="_blank" rel="noreferrer">Version pinning in the depot README</a>.</p>
  </> },
  { id: "u4", title: "Get a repo", sub: "Clone it and sync its pinned toolchains", body: <GetRepo /> },
  { id: "u5", title: "Build and test on your machine", sub: "Results land in .qq/out", body: <>
    <p>Inside the repo, make your change on a branch, then build every target, or build and run the tests:</p>
    <Command label="Terminal · inside the repo" text="qq build" />
    <Command text="qq test" />
    <How>qq hands the manifest to <a href="https://github.com/quirq-ai/recipes" target="_blank" rel="noreferrer">recipes</a>, which plans each build and test action, and writes JUnit XML, logs and <code>results.json</code> to <code>.qq/out</code>. Add target names after the command to run fewer.</How>
    <Warn title="Your laptop and CI can differ">CI does not run through qq yet; its workflows install their own tools. innernet's CI uses pnpm 10 while qq uses pnpm 11.28.2, and innernet's CI "test" is a typecheck. If your laptop and CI disagree, tell us (step 12).</Warn>
  </> },
  { id: "u6", title: "Open your first PR", sub: "qq try, or plain GitHub", body: <>
    <p>Commit on a branch (not <code>main</code>), then push it, open the PR and get a run ID back at once:</p>
    <Command label="Terminal · inside the repo" text="qq try" />
    <p>Or push the branch and open the PR on GitHub as you always do. Both reach the same checks.</p>
    <How title="What happens">qq try pushes your branch, opens or updates its PR and exits with a run ID. A watcher follows the checks and writes the verdict to <code>~/.cache/qq/verdicts/</code>, so you can close the terminal. <code>qq upload</code> does the push and PR without watching; add <code>--draft</code> for a draft.</How>
  </> },
  { id: "u7", title: "Read the verdict", sub: "Pass, refused or pending", body: <>
    <p>Run <code>qq status</code> in the repo, or look at the checks on the PR. Pick what you see:</p>
    <Outcomes label="Verdict" prompt="Pick a verdict to see what it means and what to do." options={[
      { id: "pass", button: "pass · exit 0", title: "Pass: every required check is green.", body: <>Land it (step 8). If you push again, the verdict starts over for the new commit.</> },
      { id: "refused", button: "refused · exit 1", title: "Refused: a required check failed.", body: <>Open the failing check on the PR and fix it locally with <code>qq test</code>, then push again. Today a check fails as soon as a test fails; automatic retry and compare-with-base are built but not switched on yet. If you think a failure is flaky, re-run that check once before you debug it.</> },
      { id: "pending", button: "pending · exit 3", title: "Pending: checks are still running.", body: <>Nothing to do. Run <code>qq status</code> again later; your qq try watcher also writes the final verdict to <code>~/.cache/qq/verdicts/</code>.</> },
      { id: "error", button: "exit 2", title: "qq could not get a verdict.", body: <>The line qq printed says why, for example gh being signed out or no PR for this branch. Fix that (<code>gh auth status</code> is a good first check) and run it again.</> },
      { id: "notmine", button: "refused, but not by me", title: "A refusal you think is not yours.", body: <>Check whether the same check is red on main (tree status, step 9). If it is, or the error is about runners, downloads or setup, open an alpha issue with the PR link (step 12). We track every infra failure.</> },
    ]} />
    <p className="text-sm text-muted-foreground">The watcher's verdict file can also say dequeued, superseded, timed-out or error, and qq status says landed or closed once the PR is merged or closed. The glossary under <a href="#reference">Commands and terms</a> explains each.</p>
  </> },
  { id: "u8", title: "Land it", sub: "Through the merge queue", body: <>
    <p>On innernet, once the PR is green or while it is still running:</p>
    <Command label="Terminal · inside the repo" text="qq land" />
    <How title="What happens">qq queues nothing until the checks pass. Then it asks GitHub to squash-merge through the merge queue, which tests your change on top of everything ahead of it before it reaches <code>main</code>. Nobody can push to <code>main</code> directly. If the queue drops your PR, the verdict says <b>dequeued</b>.</How>
    <Warn title="On xo-space, use the button">xo-space has auto-merge turned off, so qq land can't queue the PR there. Open the PR on GitHub and click <b>Merge when ready</b> once checks are green.</Warn>
  </> },
  { id: "u9", title: "Know what happens after you land", sub: "Post-submit, tree status, reverts, rolls", body: <>
    <ul>
      <li><b>Post-submit</b> runs on each push to <code>main</code> and is never cancelled.</li>
      <li><b>Tree status</b> is <b>closed</b> while any post-submit builder is red, <b>open</b> when all are green, and <b>unknown</b> while one has no result yet. The <a href="https://github.com/quirq-ai/gardener/tree/tree-status/status" target="_blank" rel="noreferrer">tree-status branch</a> has the live state and its history.</li>
      <li><b>If main goes red</b>, the gardener groups failures, bisects to the culprit commit and opens a revert PR with a failure record (once its GitHub App is set up). During the alpha suraj merges reverts on xo-space and innernet; nothing is reverted behind your back.</li>
      <li><b>Roll PRs</b> from rollers move pinned toolchains and dependencies forward through the same checks. You do not need to act on them.</li>
    </ul>
    <p>Pick what happened to you:</p>
    <Outcomes label="After landing" prompt="Pick a situation to see what to do." options={[
      { id: "revert", button: "A revert PR names my change", title: "A revert PR names your change.", body: <>Read its failure record: it links the failing builder and the regression range. If the revert is right, fix the break on a new branch and land it again. If it is wrong, close the revert PR saying why (the gardener then never reverts that commit again) and open an alpha issue. We count wrong reverts from these issues.</> },
      { id: "red", button: "main is red", title: "main is red and you don't know why.", body: <>The <a href="https://github.com/quirq-ai/gardener/tree/tree-status/status" target="_blank" rel="noreferrer">tree-status branch</a> names the red builder and the suspect commits. Hold unrelated landings until it reopens, and ask in Discussions if it stays red.</> },
      { id: "roll", button: "A roll PR touched my area", title: "A roll PR touched your area.", body: <>No action needed; it passed the same checks as your PRs. If something you own broke after it landed, open an alpha issue with the roll PR link.</> },
    ]} />
  </> },
  { id: "canary", title: "See your change ship in the canary", sub: "Daily at 06:17 UTC", body: <>
    <p>Once a day, release takes each product repo's lkgr (the newest <code>main</code> commit with every post-submit builder green), builds it, runs the full tests and the property tests again, starts it and runs its health probes (xo-space's /health; innernet's home page for now). Only if all of that passes does the <b>canary</b> channel move to that build. Your change ships in the first canary after it lands and post-submit goes green.</p>
    <p>Each day's result is a <a href="https://github.com/quirq-ai/release/issues?q=label%3Acanary-report" target="_blank" rel="noreferrer">Canary report issue</a> in the release repo: what shipped, what was held and why, and what canary names now.</p>
    <Outcomes label="Canary result" prompt="Pick what the report says about your repo." options={[
      { id: "shipped", button: "shipped", title: "Shipped.", body: <>The canary channel now names that commit. If it includes your change, it passed the full tests and the health check. Nothing to do.</> },
      { id: "held", button: "held", title: "Held.", body: <>A stage failed, so the previous canary stays. The report links a failure record with the stage and the evidence. If the commit includes your change, read it; a hold tagged possible runner fault means the canary could not judge that commit in 3 runs, which usually points at the machine rather than your change; say so in an alpha issue.</> },
      { id: "noop", button: "no-op", title: "No-op.", body: <>lkgr has not moved since the last canary, or its commit was held before, so nothing new was built. Nothing to do.</> },
    ]} />
  </> },
  { id: "u10", title: "Work beside Claude agents", sub: "Same queue, same checks", body: <>
    <p>Claude sessions open PRs in these repos too, through the same checks and queue. You will see their PRs in the list.</p>
    <ul>
      <li>An agent PR says it was generated with Claude Code and links its Claude Code session. Review it like any colleague's PR.</li>
      <li>Agents use the same commands as you; qq try returns at once so an agent never sits waiting on CI.</li>
      <li>Today no review is required on innernet or xo-space, so any green PR, an agent's included, can land. Owner review of tests and <code>infra/</code> is planned.</li>
    </ul>
  </> },
  { id: "u11", title: "Tell us what hurt", sub: "Feedback, questions, weekly check-in", body: <>
    <p>Feedback lives on GitHub, in the <a href="https://github.com/quirq-ai/wiki" target="_blank" rel="noreferrer">wiki repo</a>, next to the work.</p>
    <ul>
      <li><b>Something broke or was confusing:</b> <a href="https://github.com/quirq-ai/wiki/issues/new?title=alpha%3A%20" target="_blank" rel="noreferrer">open an alpha issue</a>. Say what you tried, what happened, and paste the PR or run link.</li>
      <li><b>A question:</b> ask in wiki Discussions, so the next person finds the answer.</li>
      <li><b>Each Monday:</b> answer the pinned check-in. What slowed you down? What surprised you? From 1 to 5, how likely are you to keep using qq?</li>
    </ul>
    <p className="text-sm text-muted-foreground">Small things count. "I didn't know what dequeued meant" is exactly the feedback we want.</p>
  </> },
]

const TEAM_STEPS: Step[] = [
  { id: "t1", who: "suraj", title: "Run the second settings command", sub: "Makes toolchains' promotion-gate check required", body: <p>gate's settings apply (quirq-ai/gate docs/apply-settings.md) at current main; it applies gate #25, which adds promotion-gate to toolchains' required checks.</p> },
  { id: "t2", title: "Finish the open v0 checks", sub: "Proof each part works live", body: <ul>
    <li>A deliberately red PR is refused on innernet.</li><li>The first daily canary runs for both product repos.</li><li>Tree status is live on both product repos.</li>
    <li>A bot-opened toolchains PR proves code-owner review.</li><li>The first pin-changing toolchains PR lands under the required promotion-gate and rolls into a product repo.</li>
    <li>A planted build break gets a revert PR and a failure record.</li></ul> },
  { id: "t3", title: "Make qq work on a Mac", sub: "Toolchains are Linux x86_64 only today", body: <p>Most users are on macOS. Either publish macos-arm64 toolchains and pin them in both manifests, or make sync skip a missing platform with a clear "bring your own" message. Until then step 4 tells Mac users to install Node 24 and pnpm, or Python 3.14.8, themselves.</p> },
  { id: "t4", who: "suraj", title: "Create the alpha team", sub: "Write access to innernet and xo-space", body: <p>One idempotent command that Claude prepares and audits. Then a test account with write but not admin proves it can push a branch, open a PR and queue it, and is refused a direct push to main.</p> },
  { id: "t5", title: "Load test the queues", sub: "5 PRs into each queue at once", body: <p>Record queue wait, runner wait and verdict time. GitHub Free limits concurrent Actions jobs per org, so this shows where 15 people start waiting. Compare the result with the scorecard's per-repo gate time-to-green.</p> },
  { id: "t6", title: "Safety sweep", sub: "Logs, kill switches, results store", body: <ul>
    <li>No workflow log prints a token or secret.</li>
    <li>A one-page runbook lists every kill switch: <code>QQ_TREE_STATUS_CHAIN=off</code>, rollers auto-land (off), pausing the queue, pausing reverts.</li>
    <li>Decide the results store retention: now up to 1,000 characters per failure, permanent.</li></ul> },
  { id: "t7", title: "Open the feedback channels", sub: "Wiki issue form, label, Discussions", body: <p>Add an alpha issue form (it sets the label, so users need no triage rights), turn on Discussions with an alpha category, and pin the first Monday check-in and a known-issues issue.</p> },
  { id: "t8", title: "Walk this page on fresh machines", sub: "Every command, macOS and Linux", body: <p>Steps 3 to 8 on a clean macOS and a clean Linux account, timed, in bash and zsh. The goal is a first green PR within 60 minutes with no help.</p> },
  { id: "t9", who: "suraj", title: "Answer the open decisions", sub: "Claude's recommendation is marked on each", body: <ul>
    <li>Invite list and the 3 to 5 pilot users.</li><li>Trim stored failure messages to 200 characters? (recommended)</li>
    <li>Require 1 approval on product PRs? (recommended; needs a small gate change)</li>
    <li>Keep the revert cap at 10 a day? (recommended)</li><li>Keep reverts as PRs a person merges? (recommended)</li>
    <li>Feedback in quirq-ai/wiki? (recommended)</li><li>Document the local and CI tool mismatch instead of fixing it now? (recommended)</li></ul> },
  { id: "t11", who: "suraj", title: "Set up the canary", sub: "In the alpha, decided 5 October", body: <>
    <ul>
      <li>Create the release executor GitHub App and add its client ID and private key to the release repo (one checked command from Claude); three of release's jobs (lkgr, the canary's finish, channel rollback) mint <code>QQ_RELEASE_TOKEN</code> from them; the canary report and release-hold jobs still push with the workflow's own token. Without it the canary still moves in release's own record, but not as a branch in the product repos, and that record is only as safe as push access to release.</li>
      <li>Approve the gate change that adds the App to the qq-release-refs bypass, and apply it; until then the rulesets refuse its writes of lkgr and channels/canary.</li>
      <li>Approve the ruleset that lets only that App write release's state branch, after Claude switches all five jobs that push release-state (lkgr, the canary's finish and report, channel rollback, release-hold) to its token. Until report and release-hold switch, that ruleset would refuse the daily report.</li>
      <li>Approve the infra-config change that opens the canary to alpha users; channels.toml says agents only today.</li>
      <li>Keep 06:17 UTC as the canary hour, or pick another.</li>
    </ul>
    <p>No machines are needed: in v0 the canary is built, started and checked on the GitHub runner. Persistent canary environments come in v1.</p>
  </> },
  { id: "t12", title: "Prove the canary end to end", sub: "Claude's part", body: <ul>
    <li>Watch the first canary runs for both repos and fix whatever holds them.</li>
    <li>Give innernet a real health page; its probe checks the home page today.</li>
    <li>Install from the canary channel on a test account, and see the installer's live-manifest check turn green.</li>
    <li>Run the rollback drill against the live channel.</li></ul> },
  { id: "t13", who: "suraj", title: "Create the gardener App", sub: "So reverts are really opened", body: <p>Without its own GitHub App, gardener only reports the reverts it would open. Claude prepares the steps and the ledger setup that follows.</p> },
  { id: "t10", who: "suraj", title: "Send the invites", sub: "Pilot first, everyone a week later", body: <>
    <p>Message to send, with this page's link:</p>
    <Command text={"You're in the quirq infra alpha. For the next four weeks, please land your\ninnernet or xo-space work through qq, our build and test system, and tell us\nwhere it hurts. Start here and work down the checklist: <link to this page>\nEverything is in public repos, so keep secrets out of PRs and tests."} />
  </> },
]


/** Ticks live in this browser only (localStorage), shared by both checklists. */
function useTicks() {
  const [ticks, setTicks] = useState<Record<string, boolean>>(loadTicks)
  useEffect(() => { try { localStorage.setItem(TICKS_KEY, JSON.stringify(ticks)) } catch { /* private window */ } }, [ticks])
  return { ticks, toggle: (id: string) => setTicks(t => ({ ...t, [id]: !t[id] })), clear: () => setTicks(t => Object.fromEntries(Object.entries(t).filter(([k]) => !USER_STEPS.some(s => s.id === k)))) }
}

export function AlphaChecklist() {
  const { ticks, toggle, clear } = useTicks()
  const done = USER_STEPS.filter(s => ticks[s.id]).length
  return (
    <div className="grid min-w-0 gap-4">
      <div><h2 className="text-xl font-semibold">Alpha checklist: ship your first change through qq</h2>
        <p className="mt-1 text-muted-foreground">For the 10 to 15 people in the quirq infra alpha. Work down the steps, tick each one, and tell us where it hurt. Ticks are saved in this browser only.</p></div>
      <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
        <span className="tabular-nums">{done} of {USER_STEPS.length} done</span>
        <Progress value={(100 * done) / USER_STEPS.length} className="flex-1" aria-label="Checklist progress" />
        <Button variant="ghost" size="sm" onClick={clear}>Clear my ticks</Button>
      </div>
      <Checklist steps={USER_STEPS} ticks={ticks} toggle={toggle} idPrefix="u" />
    </div>
  )
}

export function BeforeAlpha() {
  const { ticks, toggle } = useTicks()
  return (
    <div className="grid min-w-0 gap-3">
      <h2 className="text-xl font-semibold">Before the alpha starts</h2>
      <p className="text-muted-foreground">Nobody is invited until every box above the invites is ticked. Items marked <Badge variant="secondary" className="font-mono text-[10px] uppercase">suraj</Badge> need suraj; Claude does the rest. Ticks are per browser, for whoever is tracking.</p>
      <Checklist steps={TEAM_STEPS} ticks={ticks} toggle={toggle} idPrefix="t" />
    </div>
  )
}
