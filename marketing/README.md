# marketing

How quirq gets in front of the people who build and run AI agents, starting with Reddit.

| | |
|---|---|
| Status | Researching |
| Owner | yash |
| Started | 2026-10-06 |
| Last updated | 2026-10-15 |

Status is one of: Proposed, Researching, Published, Paused, Archived.

## What this topic is

Marketing research for quirq: which channels and communities to use, how
each one works, and where quirq can add something real. The first piece
covers starting from zero on Reddit. Purpose and research action live in
[GOAL.md](GOAL.md).

## Research and findings so far

Checked on 2026-10-13 and 2026-10-14 against the sources linked. The full
evidence is in the [Reddit presence report](output/report/2026-10-14-reddit-presence.md)
and the [threads report](output/report/2026-10-15-reddit-agent-builder-threads.md).

- **Reddit asks people whose posts are mostly links to their own business to
  post less often, and to post authentic content in communities they care
  about.** Source: [Reddit Help: What constitutes spam?](https://support.reddithelp.com/hc/en-us/articles/360043504051-What-constitutes-spam-Am-I-a-spammer).
  Verified: 2026-10-14.
- **Subreddits can remove posts automatically, based on the poster's account
  age and karma, with thresholds each community sets.** Source:
  [AutoModerator docs (mirror)](https://lr.eu.psf.lt/r/AutoModerator/wiki/can_do).
  Verified: 2026-10-14.
- **r/AgentsOfAI had 129k members, up 89% in a year, and asks members to
  explain projects in the post body and put links in the comments.** Source:
  [GummySearch](https://gummysearch.com/r/AgentsOfAI/),
  [wiki (mirror)](https://r.datuan.dev/r/AgentsOfAI/wiki/index). Verified:
  2026-10-14.
- **Agent builders on Reddit are asking for model costs that count retries,
  and most don't trust automatic routers.** Source: threads linked in the
  Reddit presence report. Verified: 2026-10-13.
- **Without a login, only Reddit's public RSS feeds were readable; the JSON
  endpoints returned 403 and old.reddit redirected to a login page.** Source:
  threads report, §3.1. Verified: 2026-10-13.
- **The newest 100 posts covered about 16 hours in r/ClaudeAI, 33 in
  r/AI_Agents, 106 in r/LLMDevs and 241 in r/AgentsOfAI.** Source: threads
  report, §3.2. Verified: 2026-10-13.
- **Cost questions came mostly from subscription users hitting their limits,
  not from API bills.** Source: threads report, §3.4. Verified: 2026-10-13.
- **Across 14 agent-operations threads from 12 to 15 October, the questions
  with little data in the replies were bring-your-own-key pricing, how often
  tool calls fail, and how to stop a multi-agent task as a whole.** Source:
  [agent operations report](output/report/2026-10-15-reddit-agent-ops-threads.md).
  Verified: 2026-10-15.

### Open questions

- What new-account limits do r/AI_Agents, r/AgentsOfAI, r/LLMDevs and
  r/ClaudeAI set? Their sidebars need checking from a logged-in browser.
- Does answering threads turn into signups for quirq?

## Status and progress

- [x] GOAL.md filled in and agreed with the requester
- [x] AGENTS.md filled in
- [x] Research under way
- [x] Findings verified against sources
- [x] Requested outputs published

## Published outputs

| Format | File | Date | Notes |
|---|---|---|---|
| report | [2026-10-14-reddit-presence.md](output/report/2026-10-14-reddit-presence.md) | 2026-10-14 | Starting quirq on Reddit |
| report | [2026-10-15-reddit-agent-builder-threads.md](output/report/2026-10-15-reddit-agent-builder-threads.md) | 2026-10-15 | Reddit threads on agent cost, model choice, handoffs and evals, 10 to 13 Oct 2026 |
| report | [2026-10-15-reddit-agent-ops-threads.md](output/report/2026-10-15-reddit-agent-ops-threads.md) | 2026-10-15 | 14 agent-operations threads across 8 subreddits, 12 to 15 Oct 2026 |
