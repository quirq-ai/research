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

## Research action

Read each repo at a recorded main commit: its README, pinned dependencies
(pyproject.toml, pins.toml), source, workflows and live repository settings.
Record each finding with the file it comes from, and present them as an
interactive map with one page per repo.

## Scope

**In scope:**

- The 13 infra repos: depot, sync, recipes, toolchains, remote-build,
  infra-config, gate, test-pipelines, gardener, rollers, perf, release,
  installer.
- How they act on the two product repos, innernet and xo-space.

**Out of scope:**

- The product repos' own code.
- Plans for later versions, except where a repo states what is not live yet.

## Done when

- Every repo has a page whose claims cite a file at a recorded commit.
- Every link on the map is backed by a pin or a README statement.
- An independent reviewer has checked the claims against the repos.

## Requested outputs

Tick only the formats the requester asked for. Agents publish into these
folders and no others.

- [ ] onepager: `output/onepager/`
- [ ] slide: `output/slide/`
- [ ] report: `output/report/`
- [x] app: `output/app/`

Requested by: suraj, on 2026-10-05.
