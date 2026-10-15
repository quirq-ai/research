# Goal: infra

## Purpose

quirq infra (qq) is the build, test and land system behind the quirq repos,
modelled on Chromium's infrastructure and split across 13 public repos. This
topic makes that system easy to understand: what each repo does, how the repos
use each other, and how one change travels through them. It informs anyone
joining quirq work, starting with the internal alpha of qq v0.

The infra topic also collects suraj's research on compute infrastructure
outside qq. The first piece is his research note on Mixture-of-Kittens (MoK),
Cursor's open-source training kernel for mixture-of-experts layers on NVIDIA
GB300 NVL72 racks. The source is suraj's writing at
[github.com/sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings),
read at commit `a5a356d`. The measurements in the note are Cursor's. The
explanation and the analysis are suraj's.

## Research questions

1. What does each of the 13 infra repos do, and which Chromium piece is it
   modelled on?
2. Which repos use which, and what do they do to the product repos
   (innernet and xo-space)?
3. What path does one change take, from a developer's machine to main and,
   later, to a release channel?
4. What is live today, and what are the known limits?
5. What are qq's phases (v0, v1, v2), and how far is v0 from its exit test?
6. How does a developer set up qq and build and run a repo with it locally?
7. What does MoK fuse into one kernel, and why did the mixture-of-experts layer need it?
8. Which design choices make the fusion work on an NVL72 rack: transfer direction, minibatch size, the split of SMs and the ring buffer?
9. What did Cursor measure for MoK, at the layer and end to end, and how does suraj read the results?
10. What does MoK require to run?

## Research action

Read each repo at a recorded main commit: its README, pinned dependencies
(pyproject.toml, pins.toml), source, workflows and live repository settings.
Record each finding with the file it comes from, and present them as an
interactive map with one page per repo. For the phase plan, read the version
plans and check each v0 exit test against the repos; publish the phases, the
v0 status and the two guides as reports, a one-pager and a slide deck.

- Bring suraj's Mixture of Kittens note into this topic as a report without
  changing its meaning. Credit suraj and link the original post at commit
  `a5a356d`.
- Keep the note's labels. Cursor's measurements stay Cursor's. suraj's
  analysis stays marked as his reading.
- Publish a one-pager with the note's claim, its key numbers and links into
  the report.

## Scope

**In scope:**

- The 13 infra repos: depot, sync, recipes, toolchains, remote-build,
  infra-config, gate, test-pipelines, gardener, rollers, perf, release,
  installer.
- How they act on the two product repos, innernet and xo-space.
- The qq alpha checklist and before-alpha list, which suraj asked to live in
  this app. These two tabs are operational content for the alpha, not
  sourced research findings; their facts are still checked against the repos.
- The qq phase plan (v0, v1 and v2): each phase's goal, contents and exit
  test, and where v0 stands against its exit test. v1 and v2 are reported as
  plans, cited from the version plans, not as findings (suraj, 2026-10-05).
- The v0 one-pager and slide deck shared on 2026-10-04, refreshed to the
  repos' current commits, and the two hands-on guides, "qq setup: depot and
  sync only" and "Build and run any repo locally", kept with their commands
  (suraj, 2026-10-05).
- suraj's research note on Mixture-of-Kittens, published 5 August 2026, as read at writings commit `a5a356d`.

**Out of scope:**

- The product repos' own code.
- Plans for later versions, except where a repo states what is not live yet,
  the alpha tabs above and the phase plan above.
- New benchmarks or runs of MoK. The note describes MoK as Cursor open-sourced it on 4 August 2026. Checking later releases would be new research.
- Links between MoK and qq. The note does not mention qq.

## Done when

- Every repo has a page whose claims cite a file at a recorded commit.
- Every link on the map is backed by a pin or a README statement.
- An independent reviewer has checked the claims against the repos.
- The note is published as a report in `output/report/`, credited to suraj and linked to its original post at `a5a356d`.
- A one-pager gives the note's claim and key numbers, each traceable to the report.
- The README lists the note's findings and both outputs.

## Requested outputs

Tick only the formats the requester asked for. Agents publish into these
folders and no others.

- [x] onepager: `output/onepager/`
- [x] slide: `output/slide/`
- [x] report: `output/report/`
- [x] app: `output/app/`

Requested by: suraj, on 2026-10-05 (app first; onepager, slide and report
added the same day).
Mixture of Kittens: suraj asked on 2026-10-15 for his writings to be brought into the matching topics.
