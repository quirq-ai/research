# Where agent builders ask on Reddit: cost, model choice, handoffs and evals

A read of four subreddits from 10 to 13 October 2026, to find open questions
that quirq's own data could answer, and what the existing replies already say.

## 1. Question and context

quirq has no Reddit presence yet. Before posting, we wanted to know:

1. Which recent threads in r/AI_Agents, r/AgentsOfAI, r/LLMDevs and
   r/ClaudeAI ask about agent cost, model choice, routing, memory across
   sessions, running several agents or harnesses together, or evaluating agent
   output?
2. What do the posters ask, and what do the replies already cover?
3. Which questions are still open?
4. How fast do these subreddits move, and can they be read without a login?

## 2. Method

- **Capture.** On 13 October 2026, between 15:30 and 17:00 UTC, we read the
  newest 100 and rising 25 posts of each subreddit from Reddit's public
  `.rss` feeds, from a residential connection, without logging in. Nothing was
  posted, voted on or commented on.
- **Filter.** We kept posts from the previous 72 hours on the topics above and
  dropped link-only promotion, vendor write-ups and "best framework?" polls.
- **Shortlist.** We picked 15 open questions with fewer than about 60
  comments, then read the full post and the first ten top-sorted comments of
  the 10 strongest, between 21:00 and 22:00 UTC the same day.
- **Counts.** Comment counts are the number of comments in each thread's
  public feed when we read it. Treat them as approximate.
- **Privacy.** Threads are cited by link only. No usernames are recorded, and
  comments are paraphrased.

## 3. Findings

### 3.1 Access: only the RSS feeds are open without a login

| Endpoint | Result on 13 Oct 2026 |
|---|---|
| `www.reddit.com/r/<sub>/new.json` | HTTP 403, a "blocked by network security" page |
| `api.reddit.com/r/<sub>/new` | HTTP 403 |
| `old.reddit.com/r/<sub>/new.json` | HTTP 302 to a login page |
| `www.reddit.com/r/<sub>/new/.rss` | HTTP 200, but HTTP 429 after a few quick requests |

The RSS feeds carry title, link, date, author and body, but no score or
comment count. Comment counts need one more request per thread, to the
thread's own feed.

### 3.2 How fast the subreddits move

| Subreddit | Newest 100 posts span | Posts in the last 72 h |
|---|---|---|
| r/ClaudeAI | about 16 hours | 100 or more |
| r/AI_Agents | about 33 hours | 100 or more |
| r/LLMDevs | about 106 hours | 73 |
| r/AgentsOfAI | about 241 hours | 38 |

A new post in r/ClaudeAI leaves the newest 100 within a day. In r/LLMDevs
and r/AgentsOfAI, a thread stays findable for days.

### 3.3 The ten threads read in full

Posted dates are in UTC. Comment counts are from about 21:30 UTC on 13 October.

| # | Subreddit | Thread | Posted | Comments |
|---|---|---|---|---|
| 1 | r/ClaudeAI | [Fable, Opus, Sonnet, Haiku: how do you decide which Claude model to use?](https://www.reddit.com/r/ClaudeAI/comments/1x4q63a/fable_opus_sonnet_haiku_how_do_you_decide_which/) | 13 Oct 07:22 | ~11 |
| 2 | r/AI_Agents | [Multi-agent orchestration with Claude Pro + Google AI Pro + Cursor](https://www.reddit.com/r/AI_Agents/comments/1x4vf7g/multiagent_orchestration_with_claude_pro_google/) | 13 Oct 12:34 | ~16 |
| 3 | r/ClaudeAI | [When you split work across several Claude Code / Codex sessions, how do you hand off state?](https://www.reddit.com/r/ClaudeAI/comments/1x4x7dd/when_you_split_work_across_several_claude_code/) | 13 Oct 13:51 | ~16 |
| 4 | r/LLMDevs | [How do you tell whether an agent change made it better when the output is never the same twice?](https://www.reddit.com/r/LLMDevs/comments/1x4q76a/how_do_you_tell_whether_an_agent_change_made_it/) | 13 Oct 07:23 | ~13 |
| 5 | r/LLMDevs | [How to keep costs down?](https://www.reddit.com/r/LLMDevs/comments/1x486gs/how_to_keep_costs_down/) | 12 Oct 17:30 | ~21 |
| 6 | r/ClaudeAI | [Best way to not hit limit without losing this level of output](https://www.reddit.com/r/ClaudeAI/comments/1x4vo93/best_way_to_not_hit_limit_without_losing_this/) | 13 Oct 12:46 | ~9 |
| 7 | r/LLMDevs | [I tested dynamic model routing for an agentic browser-testing system](https://www.reddit.com/r/LLMDevs/comments/1x2ry42/i_tested_dynamic_model_routing_for_an_agentic/) | 10 Oct 22:30 | ~10 |
| 8 | r/LLMDevs | [Non-coder here: building a pipeline whose whole point is using frontier intelligence as cost-effectively as possible](https://www.reddit.com/r/LLMDevs/comments/1x3gzj9/noncoder_here_building_a_pipeline_whose_whole/) | 11 Oct 19:23 | ~17 |
| 9 | r/AI_Agents | [Eight AI models, the same media-buying task, 12 attempts each](https://www.reddit.com/r/AI_Agents/comments/1x3yoyk/eight_ai_models_the_same_mediabuying_task_12/) | 12 Oct 10:50 | ~9 |
| 10 | r/LLMDevs | [How do you tell if a model swap actually made your app worse, or if it's just sampling noise?](https://www.reddit.com/r/LLMDevs/comments/1x4ju8s/how_do_you_tell_if_a_model_swap_actually_made/) | 13 Oct 01:32 | ~13 |

Also shortlisted but not read in full:
[personal finance dashboard burning Claude Code limits](https://www.reddit.com/r/ClaudeAI/comments/1x4qzpy/building_a_personal_finance_dashboard_with_claude/)
(~48 comments),
[Mac mini as a headless agent machine](https://www.reddit.com/r/ClaudeAI/comments/1x4w1ay/mac_mini_m6_32_gb_as_a_headless_agent_machine_how/)
(~6),
[moving beyond Claude Code + browser + local apps](https://www.reddit.com/r/AI_Agents/comments/1x4qh86/for_those_who_moved_beyond_claude_code_browser/)
(~15),
[testing agent behaviour when the final answer looks fine](https://www.reddit.com/r/AgentsOfAI/comments/1x4g6c4/how_are_you_testing_agent_behavior_when_the_final/)
(~14) and
[a logger to find which feature eats the OpenAI budget](https://www.reddit.com/r/LLMDevs/comments/1x38imj/i_built_a_tiny_logger_to_prove_which_feature_was/)
(~8).

### 3.4 What the posters ask

**Cost means subscription limits more than API bills.** Threads 2, 5 and 6,
and the finance-dashboard thread, come from people on a Claude subscription
(Pro, Max 5x) who hit their 5-hour or weekly limit within hours or days.
They ask which model to switch to, or whether to switch vendor. None of them
asks how to cut an API invoice.

**Model choice turns on retries.** The poster of thread 1 runs an agent on
Haiku and asks whether a bigger model would pay for itself. In the comments,
the poster and others agree that retries and corrections are what make a
cheap model expensive. Nobody in the thread gives numbers.

**Several agents means routing plus handoff.** Thread 2 asks how to split
work across Claude, Gemini and Cursor so that only the hard work goes to the
expensive model. Thread 3 asks how state passes between Claude Code and Codex
sessions, and what it costs per week.

**Evals mean telling a real change from noise.** Threads 4 and 10 ask how to
know whether a prompt or model change made an agent better or worse when no
two runs are the same.

**Routing data is rare and mixed.** Thread 7 is one of the few posts with
data. The poster reports that 120 cross-provider runs gave no overall token
advantage from dynamic routing, while guardrails around one fixed model cut
tokens by 13.7%. The poster now asks for the cheapest successful path
through the whole task, not the cheapest model per step. These are the
poster's figures, linked from the thread, and we have not reproduced them.

### 3.5 What the replies already cover

Across the ten threads, these answers are given several times:

- **Shorter sessions.** Clear context between tasks, keep CLAUDE.md short,
  stop the agent re-reading big files, and don't keep everything in one
  long chat (threads 5 and 6).
- **Handoff files.** A handoff or state file per project, often with a
  decision log, and a git worktree per session so two sessions don't edit the
  same files (thread 3).
- **Simple rules before routers.** Send small, well-tested edits to the
  cheaper tool and escalate when they fail. Use a script or a fixed rule
  before paying a model to choose, and add an "unsure" label that escalates
  (thread 2).
- **Repeated runs.** Run each case 5 to 10 times and compare pass rates,
  measure the noise floor first by running the same version twice, replay
  real past failures, and score the tool-call transcript as well as the final
  answer (threads 4 and 10).
- **Judges from other model families.** A judge from the same family as the
  model under test shares its blind spots (threads 4 and 7).
- **Cost per completed task.** Count failed attempts and recovery, not cost
  per step (threads 1 and 7).

### 3.6 What is still open

- **Real numbers on total cost per completed task**, cheap model against big
  model, retries included. Thread 1 asks for this directly and gets no data.
  Thread 7 has one workload's data and asks what to isolate next.
- **What multi-session handoff costs** in time or money per week. Thread 3
  asks; the replies give methods but no figures.
- **Plain advice for non-technical subscription users.** Thread 6 is a team
  lead in real estate on Claude Pro. The useful replies are about working
  habits, such as keeping chats short and asking for only the changed rows,
  not about model choice.
- **Whether an agent's process changed when its answers did not.** The
  AgentsOfAI thread on tool-call order, and the tool-path comments in thread
  10, point at this. Nobody has a settled method.

### 3.7 The replies themselves

Several top comments across these threads read as generic and AI-assisted,
and one commenter labels their own reply "ai-assisted reply" (thread 7).
Short, polished replies that restate the advice in section 3.5 are already
common in these threads.

## 4. What this means for quirq (our inference)

This section is our reading, not something the threads say.

- The gap is data, not advice. A reply that adds measured cost per completed
  task, retry rates by model, or the weekly cost of handoffs would answer the
  open questions in section 3.6. Restating section 3.5 would not.
- Subscription-limit threads are the most frequent and the least technical.
  They suit short, practical answers about habits more than product talk.
- r/LLMDevs and r/AgentsOfAI move slowly enough that a reply a day or two
  late is still seen. In r/ClaudeAI, a thread drops out of the newest 100
  within a day.

## 5. Limitations

- One capture, over three days of one week. Topics and volumes change week
  to week.
- RSS feeds give no scores, so "rising" is Reddit's ranking, not ours, and we
  could not rank by votes.
- Comment counts are approximate, and only the first ten top-sorted comments
  of each thread were read.
- The shortlist used our own topic filter and judgement. Posts outside the
  four subreddits were not read.

## 6. References

All threads were read on 13 October 2026, and were still live when checked
on 15 October 2026.

1. [Fable, Opus, Sonnet, Haiku: how do you decide which Claude model to use?](https://www.reddit.com/r/ClaudeAI/comments/1x4q63a/fable_opus_sonnet_haiku_how_do_you_decide_which/) (r/ClaudeAI)
2. [Multi-agent orchestration with Claude Pro + Google AI Pro + Cursor](https://www.reddit.com/r/AI_Agents/comments/1x4vf7g/multiagent_orchestration_with_claude_pro_google/) (r/AI_Agents)
3. [When you split work across several Claude Code / Codex sessions, how do you hand off state?](https://www.reddit.com/r/ClaudeAI/comments/1x4x7dd/when_you_split_work_across_several_claude_code/) (r/ClaudeAI)
4. [How do you tell whether an agent change made it better?](https://www.reddit.com/r/LLMDevs/comments/1x4q76a/how_do_you_tell_whether_an_agent_change_made_it/) (r/LLMDevs)
5. [How to keep costs down?](https://www.reddit.com/r/LLMDevs/comments/1x486gs/how_to_keep_costs_down/) (r/LLMDevs)
6. [Best way to not hit limit without losing this level of output](https://www.reddit.com/r/ClaudeAI/comments/1x4vo93/best_way_to_not_hit_limit_without_losing_this/) (r/ClaudeAI)
7. [I tested dynamic model routing for an agentic browser-testing system](https://www.reddit.com/r/LLMDevs/comments/1x2ry42/i_tested_dynamic_model_routing_for_an_agentic/) (r/LLMDevs)
8. [Non-coder here: a pipeline for using frontier intelligence cost-effectively](https://www.reddit.com/r/LLMDevs/comments/1x3gzj9/noncoder_here_building_a_pipeline_whose_whole/) (r/LLMDevs)
9. [Eight AI models, the same media-buying task, 12 attempts each](https://www.reddit.com/r/AI_Agents/comments/1x3yoyk/eight_ai_models_the_same_mediabuying_task_12/) (r/AI_Agents)
10. [How do you tell if a model swap made your app worse, or if it's sampling noise?](https://www.reddit.com/r/LLMDevs/comments/1x4ju8s/how_do_you_tell_if_a_model_swap_actually_made/) (r/LLMDevs)
11. [Building a personal finance dashboard with Claude Code, burning through limits](https://www.reddit.com/r/ClaudeAI/comments/1x4qzpy/building_a_personal_finance_dashboard_with_claude/) (r/ClaudeAI)
12. [Mac mini M6 (32 GB) as a headless agent machine](https://www.reddit.com/r/ClaudeAI/comments/1x4w1ay/mac_mini_m6_32_gb_as_a_headless_agent_machine_how/) (r/ClaudeAI)
13. [For those who moved beyond Claude Code + browser + local apps, was it worth it?](https://www.reddit.com/r/AI_Agents/comments/1x4qh86/for_those_who_moved_beyond_claude_code_browser/) (r/AI_Agents)
14. [How are you testing agent behavior when the final answer still looks fine?](https://www.reddit.com/r/AgentsOfAI/comments/1x4g6c4/how_are_you_testing_agent_behavior_when_the_final/) (r/AgentsOfAI)
15. [I built a tiny logger to prove which feature was eating my OpenAI budget](https://www.reddit.com/r/LLMDevs/comments/1x38imj/i_built_a_tiny_logger_to_prove_which_feature_was/) (r/LLMDevs)
