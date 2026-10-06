# Agent guide

This file tells an agent how to create and work a research topic in this
repository. Read it in full before changing anything.

Each topic folder also has its own `AGENTS.md` with topic-specific
instructions. That file adds to this one; it does not replace it.

## Ground rules

1. Commit only verified, shareable outcomes. If you cannot verify a claim,
   leave it out or list it as an open question.
2. Never invent findings, sources, quotes, numbers or citations.
3. Produce only the output formats the requester asked for.
4. Work in one topic folder at a time. Do not edit other topics. Do not edit
   `_template/` unless you were asked to change the template.
5. Never commit secrets, credentials, personal data, customer data or
   internal-only material.

## Workflow

### 1. Create the topic folder from the template

From the repo root:

```sh
scripts/new-topic.sh <slug>
```

- `<slug>` uses lowercase letters, digits and single hyphens, for example
  `claude` or `agent-evals`.
- The script copies `_template/` to `<slug>/` and replaces `{{TOPIC}}` with the
  slug and `{{DATE}}` with today's date.
- It refuses to overwrite an existing folder. If the topic already exists,
  work in it instead of creating a new one.
- Add a row for the topic to the Topics table in the root `README.md`, with
  status `Proposed`.
- Run `npm install` at the repo root so the new topic is linked as a
  workspace, and commit the updated `package-lock.json`.
- Slugs `dist`, `node_modules`, `packages` and `scripts` are reserved.

### 2. Fill in GOAL.md

Agree these with the requester and write them into `<slug>/GOAL.md`:

- **Purpose**: why this research is being done and what it informs.
- **Research questions**: the specific questions to answer.
- **Research action**: what will be done to answer them (sources to review,
  experiments to run, comparisons to make).
- **Scope** and **done when** criteria.
- **Requested outputs**: tick only the formats the requester asked for.

If the request does not say which output format is wanted, ask. Do not guess.

### 3. Fill in the topic AGENTS.md

Turn `GOAL.md` into concrete instructions in `<slug>/AGENTS.md`: what to
research, which sources to prefer or avoid, how to verify results, and any
topic-specific conventions. Then set the topic status to `Researching` in
`<slug>/README.md` and in the root Topics table.

### 4. Research

- Keep scratch notes and drafts out of the main branch. Only verified results
  are committed.
- Record a source for every claim as you go.
- Verify before you publish: open each source and confirm it says what you
  claim, re-run experiments, and re-check numbers.
- Keep three things apart: what is established, what is your inference, and
  what is still open.

### 5. Publish verified results into output/

Write results only into the folders for the requested formats:

| Requested format | Write to |
|---|---|
| onepager | `<slug>/output/onepager/` |
| slide | `<slug>/output/slide/` |
| report | `<slug>/output/report/` |
| app | `<slug>/output/app/<app-name>/` |

- Name files `YYYY-MM-DD-<short-name>.<ext>` so versions sort by date.
- Every output lists its sources.
- Each format folder has a README describing what belongs there. Follow it.
- Do not create outputs in formats nobody asked for. Unused format folders keep
  only their README.

### 6. Check how the topic is presented

Each topic is a workspace with its own `package.json`. Its `build` script
must write a static site to `<slug>/dist/` with relative links; the hub
deploys it at `/<slug>/` and lists it on the index page, using the title,
first paragraph and status from `<slug>/README.md`.

- By default the topic uses `@research/present`, which turns `README.md`,
  `GOAL.md` and the onepager, slide and report files into a site. Nothing
  else is needed.
- If the topic should present itself another way (for example as its app),
  change the `build` and `dev` scripts in `<slug>/package.json`. See
  `infra/package.json`, which publishes its app.
- Run `npm run dev` from the repo root and check the topic on the hub at
  `http://localhost:3000/<slug>/` before you commit. Do not commit `dist/`.

### 7. Update the topic README

In `<slug>/README.md`:

- Add each verified finding under "Research and findings so far", with its
  source.
- Update the status and the progress checklist.
- Add each published file to the "Published outputs" table.
- Update "Last updated".

Then update the topic's row in the root `README.md` Topics table.

### 8. Commit

- Keep each commit to one topic where possible.
- Use the message form `<slug>: <what changed>`, for example
  `claude: publish onepager on context window limits`.

## Checklist before you finish

- [ ] `npm run check` at the repo root passes. It checks the topic's required
      files, that no `{{TOPIC}}` or `{{DATE}}` placeholder is left, output
      file names, that outputs exist only in ticked formats, that every
      output is in the README Published outputs table and every link there
      exists, and that the root Topics table row matches the topic's status.
- [ ] Outputs exist only in the requested formats.
- [ ] Every claim has a source and was checked against it.
- [ ] Topic README findings, status, progress and outputs table are current.
- [ ] Root README Topics table is current.
- [ ] `npm run build` at the repo root succeeds.
- [ ] No secrets, personal data or internal-only material.
