# Goal: infra

## Purpose

quirq infra (qq) is the build, test and land system behind the quirq repos,
modelled on Chromium's infrastructure and split across 13 public repos. This
topic makes that system easy to understand: what each repo does, how the repos
use each other, and how one change travels through them. It informs anyone
joining quirq work, starting with the internal alpha of qq v0.

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

## Research action

Read each repo at a recorded main commit: its README, pinned dependencies
(pyproject.toml, pins.toml), source, workflows and live repository settings.
Record each finding with the file it comes from, and present them as an
interactive map with one page per repo. For the phase plan, read the version
plans and check each v0 exit test against the repos; publish the phases, the
v0 status and the two guides as reports, a one-pager and a slide deck.

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
  sync only" and "Build and run any repo locally", kept with their verified
  commands (suraj, 2026-10-05).

**Out of scope:**

- The product repos' own code.
- Plans for later versions, except where a repo states what is not live yet,
  the alpha tabs above and the phase plan above.

## Done when

- Every repo has a page whose claims cite a file at a recorded commit.
- Every link on the map is backed by a pin or a README statement.
- An independent reviewer has checked the claims against the repos.

## Requested outputs

Tick only the formats the requester asked for. Agents publish into these
folders and no others.

- [x] onepager: `output/onepager/`
- [x] slide: `output/slide/`
- [x] report: `output/report/`
- [x] app: `output/app/`

Requested by: suraj, on 2026-10-05 (onepager, slide and report requested by
suraj on 2026-10-05).
