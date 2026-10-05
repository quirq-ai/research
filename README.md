# research

Verified, shareable research outcomes from quirq.

This repository is not a scratchpad. Notes, drafts, raw dumps and half-checked
claims stay out. Everything committed here has been checked against its
sources and is safe to share outside the team.

## How it is organised

Every research topic is a top-level folder named with a short slug. Each topic
folder has the same four parts:

| Part | What it holds |
|---|---|
| `README.md` | What the topic is, the research and verified findings so far, and current status/progress. |
| `GOAL.md` | The purpose of the research, the research action, and which output formats were requested. |
| `AGENTS.md` | Instructions for an agent: what to research, how to verify it, and how to put results into `output/`. |
| `output/` | Published results, split by format: `onepager/`, `slide/`, `report/`, `app/`. |

### Worked example: `claude/`

`claude` is used here only as an example name to show the layout. It is not a
topic in this repository.

```text
claude/
├── README.md        # what the "claude" research covers, findings so far, status
├── GOAL.md          # purpose and research action
├── AGENTS.md        # what an agent researches and how it publishes to output/
└── output/
    ├── onepager/    # single-page summary
    ├── slide/       # slide deck
    ├── report/      # long-form report
    └── app/         # runnable demo, with run instructions
```

You would create it from the repo root with:

```sh
scripts/new-topic.sh claude
```

The script copies `_template/` to `claude/` and fills in the topic name and
today's date. It refuses to overwrite a folder that already exists.

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
│   └── build-hub.mjs     # puts every topic into one site with an index page
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
(Markdown becomes HTML pages, other files such as PDFs are copied as-is).

To present a topic another way, change the scripts in its `package.json`. For
example `infra` publishes its app: its build copies the output of
`output/app/infra-map` (a Vite app, and its own workspace) into `infra/dist/`.
Any tool works as long as the build ends with a static site in `dist/`.

The root build runs every topic's build, then `scripts/build-hub.mjs` copies
each `<topic>/dist/` to `dist/<topic>/` and writes `dist/index.html`, which
lists the topics with the title, first paragraph and status from each topic's
`README.md`.

### Run locally

Node.js 22 or newer. From the repo root:

```sh
npm install                          # installs every workspace
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

| Topic | Status | Summary |
|---|---|---|
| [infra](infra/) | Published | How quirq infra (qq) fits together across its 13 repos, as an interactive map with a page per repo, plus its phases (v0, v1, v2), a v0 one-pager, setup and build guides, and slides. |

When you create a topic, add a row here and keep its status in step with the
topic README.

## Licence

MIT. See [LICENSE](LICENSE).
