# Goal: engineering

## Purpose

This topic studies how quirq engineers build software day to day: how the
quirq repos fit together, how changes are tested and reviewed, and how AI
agents take part in that work. It complements the `infra` topic, which covers
qq, the build, test and land system. The answers inform where to invest in
engineering practice and agent tooling at quirq.

## Research questions

1. **Agent and UI integration patterns.** How do agent frameworks connect an
   agent to an app's UI, and how do CopilotKit/AG-UI, LangGraph's React SDK,
   the Vercel AI SDK and assistant-ui compare on:
   - shared state that both the agent and the UI read and write,
   - generative UI, where the agent's output renders as UI components,
   - human-in-the-loop, where the user approves or edits an agent step?

   Source idea: [#16 Idea: CopilotKit shared state](https://github.com/quirq-ai/research/issues/16).

2. **Repo structure.** How are the quirq repos structured, and how do they
   depend on each other?
3. **Testing and code review.** What testing and code review practice do the
   quirq repos follow today, and where are the gaps?
4. **AI agents in the dev loop.** How do AI agents fit into the quirq
   development loop today, and what would make them more useful?

## Research action

- For question 1, read each framework's official docs and source, build or
  run its reference examples, and compare them on the three patterns.
- For questions 2 and 3, read the quirq repos at a recorded commit: their
  manifests, dependency pins, test suites, CI workflows and branch and review
  settings, plus their merged PRs.
- For question 4, look at where agents already open, review or land changes
  in the quirq repos (PR authorship, review bots, repo agent guides) and
  compare that with what the agent tooling supports.

## Scope

**In scope:**

- The quirq repos and how engineers work across them: structure,
  dependencies, testing, code review and agent use.
- Agent and UI integration frameworks, for question 1: CopilotKit/AG-UI,
  LangGraph's React SDK, the Vercel AI SDK and assistant-ui.

**Out of scope:**

- How qq itself works (the build, test and land system). That is the `infra`
  topic.
- Product strategy and design. Those are the `product` and `design` topics.

## Done when

- Each research question has an answer whose claims cite a source: a file at
  a recorded commit, a merged PR, or official documentation.
- The gaps found under questions 3 and 4 are listed with a suggested next step
  for each.
- The onepager and the report are published and listed in the README.

## Requested outputs

Tick only the formats the requester asked for. Agents publish into these
folders and no others.

- [x] onepager: `output/onepager/`
- [ ] slide: `output/slide/`
- [x] report: `output/report/`
- [ ] app: `output/app/`

Requested by: suraj, on 2026-10-06.
