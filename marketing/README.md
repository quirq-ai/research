# marketing

Where agent builders ask questions on Reddit that quirq's own data can answer, what they ask, and what the existing replies already cover.

| | |
|---|---|
| Status | Published |
| Owner | Yash |
| Started | 2026-10-06 |
| Last updated | 2026-10-15 |

Status is one of: Proposed, Researching, Published, Paused, Archived.

## What this topic is

quirq has no Reddit presence yet. This topic reads the subreddits where
people build with agents (r/AI_Agents, r/AgentsOfAI, r/LLMDevs and
r/ClaudeAI) for open questions about agent cost, model choice, routing,
memory and handoffs between sessions, running several agents together, and
evaluating agent output. The aim is to know what is asked and what is already
answered before quirq posts anything. Purpose and research action live in
[GOAL.md](GOAL.md).

## Research and findings so far

Each finding is from the
[report](output/report/2026-10-15-reddit-agent-builder-threads.md), which
links every thread.

- **Without a login, only Reddit's public RSS feeds were readable. The JSON
  endpoints returned 403, old.reddit redirected to a login page, and the
  feeds rate-limit quickly.** Source: the report, §3.1. Verified: 2026-10-13.
- **The newest 100 posts covered about 16 hours in r/ClaudeAI, about 33 in
  r/AI_Agents, about 106 in r/LLMDevs and about 241 in r/AgentsOfAI.** Source:
  the report, §3.2. Verified: 2026-10-13.
- **Cost questions came from subscription users hitting their limits, not
  from API bills.** Source: the report, §3.4, threads 2, 5 and 6. Verified:
  2026-10-13.
- **The replies already cover shorter sessions, handoff files, simple
  routing rules, repeated eval runs, judges from other model families and
  cost per completed task.** Source: the report, §3.5. Verified: 2026-10-13.
- **Still unanswered: real numbers on cost per completed task including
  retries, what multi-session handoff costs per week, and plain advice for
  non-technical subscription users.** Source: the report, §3.6. Verified:
  2026-10-13.

### Open questions

- Which of these threads quirq should answer, from which account, and with
  which of its own numbers.
- Whether the picture holds over more than one week. The report is a single
  capture from 10 to 13 October 2026.

## Status and progress

- [x] GOAL.md filled in and agreed with the requester
- [x] AGENTS.md filled in
- [x] Research under way
- [x] Findings verified against sources
- [x] Requested outputs published

## Published outputs

| Format | File | Date | Notes |
|---|---|---|---|
| report | [2026-10-15-reddit-agent-builder-threads.md](output/report/2026-10-15-reddit-agent-builder-threads.md) | 2026-10-15 | Reddit threads on agent cost, model choice, handoffs and evals, 10 to 13 Oct 2026 |
