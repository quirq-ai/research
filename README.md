# research

Verified, shareable research outcomes from quirq.

This repository is not a scratchpad. Notes, drafts, raw dumps and half-checked
claims stay out. Everything committed here has been checked against its
sources and is safe to share outside the team.

## How it is organised

Every research topic is a top-level folder named with a short slug, created
from `_template/` and holding the same parts:

| Part | What it holds |
|---|---|
| `README.md` | What the topic is, the research and verified findings so far, and current status/progress. |
| `GOAL.md` | The purpose of the research, the research action, and which output formats were requested. |
| `AGENTS.md` | Instructions for an agent: what to research, how to verify it, and how to put results into `output/`. |
| `package.json` | The topic's `build` and `dev` scripts, which decide how it is presented (see below). |
| `output/` | Published results, split by format: `onepager/`, `slide/`, `report/`, `app/`. |

Create a topic from the repo root with `scripts/new-topic.sh <slug>`, for
example `scripts/new-topic.sh agent-evals`. The script copies `_template/` to
`<slug>/` and fills in the topic name and today's date. It refuses to
overwrite a folder that already exists. [AGENTS.md](AGENTS.md) has the full
workflow.

## Output formats

Results go only into the format or formats the requester asked for, as ticked
under "Requested outputs" in the topic's `GOAL.md`. An empty format folder
(holding only its README) is normal.

| Folder | Format |
|---|---|
| `output/onepager/` | Single-page summary: the question, the answer, key findings, sources. |
| `output/slide/` | Slide deck for presenting the findings. |
| `output/report/` | Long-form write-up: method, findings, limitations, references. |
| `output/app/` | Runnable demo, each in its own folder with a README covering setup and run instructions. |

## What "verified" means here

- Every claim traces to a source someone else can check: a link, paper,
  dataset, or a reproducible experiment included in the topic.
- Numbers are either reproduced or quoted with their source.
- Limitations and open questions are stated, not hidden.

## What "shareable" means here

- No secrets, credentials, personal data, customer data, or internal-only
  material.
- Third-party content is linked or quoted within its licence.

## Topic status

Each topic README carries one status:

| Status | Meaning |
|---|---|
| Proposed | Folder created; goal being defined. |
| Researching | Goal agreed; research under way. |
| Published | At least one requested output is published and verified. |
| Paused | Work stopped for now; findings so far still stand. |
| Archived | No further work planned. |

## Repository layout

```text
.
├── README.md             # this file
├── AGENTS.md             # how agents create and work a topic
├── LICENSE
├── package.json          # npm workspaces: every topic, every app, packages/*
├── turbo.json            # Turborepo tasks: build and dev
├── vercel.json           # Vercel settings for the hub site
├── _template/            # copied for every new topic
│   ├── README.md
│   ├── GOAL.md
│   ├── AGENTS.md
│   ├── package.json      # the topic's build and dev scripts
│   └── output/{onepager,slide,report,app}/
├── packages/
│   └── present/          # default presentation: Markdown to a static site
├── scripts/
│   ├── new-topic.sh      # creates a topic folder from _template/
│   ├── check.mjs         # checks every topic follows the rules (npm run check)
│   ├── topics-table.mjs  # writes the Topics table below (npm run topics)
│   ├── lib/topics.mjs    # finds topics and reads their READMEs, for the scripts
│   └── build-hub.mjs     # puts every topic into one site with an index page
├── .github/workflows/    # CI: npm run check and npm run build on every PR
└── <topic>/              # one folder per topic
```

## How topics are presented and deployed

The repo is a [Turborepo](https://turborepo.dev) monorepo using npm
workspaces, deployed as one site: a hub page listing every topic, with each
topic at `/<topic>/`.

Each topic folder is a workspace with its own `package.json`, and each topic
decides how it presents its findings. The only contract is:

- `npm run build` in the topic writes a static site to `<topic>/dist/`, using
  relative links so it works under `/<topic>/`.
- `npm run dev` in the topic serves it locally.

A new topic starts with the default presentation, `@research/present`, which
renders the topic's `README.md`, `GOAL.md` and the files in
`output/onepager/`, `output/slide/` and `output/report/` into a small site
(Markdown becomes HTML pages, other files such as PDFs are copied as-is). It
also adds each app in `output/app/<name>/` that has a built `dist/`, at
`output/app/<name>/` with an App link in the menu. For example `infra` lists
`infra-map` (a Vite app, and its own workspace) as a devDependency, so
Turborepo builds the app first and the hub shows the map next to the reports.

To present a topic another way, change the scripts in its `package.json`.
Any tool works as long as the build ends with a static site in `dist/`.

The root build runs every topic's build, then `scripts/build-hub.mjs` copies
each `<topic>/dist/` to `dist/<topic>/` and writes `dist/index.html`, which
lists the topics with the title, first paragraph and status from each topic's
`README.md`.

### Run locally

Node.js 22 or newer. From the repo root:

```sh
npm install                          # installs every workspace
npm run check                        # checks every topic follows the repo rules
npm run build                        # builds the whole hub into dist/
npm run dev                          # builds it and serves it on http://localhost:3000
npx turbo run build --filter=infra   # builds one topic and what it depends on
cd infra && npm run dev              # works on one topic on its own
```

### Deploy on Vercel

One Vercel project serves the whole hub:

1. In Vercel, add a new project and import `quirq-ai/research`.
2. Leave **Root Directory** as the repo root (`./`).
3. Set **Application Preset** to **Other**.
4. Deploy. The root `vercel.json` sets the install command (`npm ci`), build
   command (`npm run build`) and output directory (`dist`), so leave Build
   and Output Settings as they are.

A new topic appears on the hub after its next push, with no Vercel changes.

## Topics

<!-- topics:start -->
| Topic | Status | Summary | Outputs |
|---|---|---|---|
| [design](design/) | Proposed | Design research for quirq. Scope is still being agreed. | None yet |
| [engineering](engineering/) | Proposed | Engineering research for quirq. Scope is still being agreed. | None yet |
| [infra](infra/) | Published | How quirq infra (qq), the build, test and land system behind the quirq repos, fits together across its 13 public repos. | onepager, slide, report, app |
| [marketing](marketing/) | Proposed | One sentence: what this topic is about. | None yet |
<!-- topics:end -->

This table is generated from each topic's README (status, first
paragraph and published formats). Run `npm run topics` after
you create a topic or change its README; `npm run check` fails while the
table is out of date.

## Licence

MIT. See [LICENSE](LICENSE).
