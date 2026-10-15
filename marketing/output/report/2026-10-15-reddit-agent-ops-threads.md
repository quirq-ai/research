# Agent operations on Reddit: what builders asked, 12 to 15 October 2026

A second read of Reddit, wider than the
[threads report](2026-10-15-reddit-agent-builder-threads.md). This one covers
eight subreddits and looks for threads about running agents in practice: parallel
sessions, memory, stopping runaway work, routing and caching, tool failures,
logging, permissions and pricing. These are the areas quirq works on.

## Question

Which recent Reddit threads ask about running agents in practice, what do the
replies already cover, and what is still open?

## Method

- About 14:15 UTC on 15 October 2026, read the newest 100 and rising 25 posts
  from r/AI_Agents, r/AgentsOfAI, r/LLMDevs, r/ClaudeAI, r/LocalLLaMA,
  r/ChatGPTCoding, r/ExperiencedDevs and r/SaaS through their public RSS feeds,
  without logging in. 584 posts were from the previous 72 hours.
- Kept threads matching the topics above with fewer than about 60 comments.
  Dropped vendor posts and polls. Read each kept thread with its first eight
  top-sorted comments.
- Threads are cited by link. No usernames are recorded, and comments are
  paraphrased.

## Findings

Ages are as of 15 October, about 14:15 UTC. Comment counts are approximate.

| # | Topic | Thread | Age | Comments | Already covered in replies | Still open |
|---|---|---|---|---|---|---|
| 1 | Stopping runaway work | [When has a coding agent spent enough time?](https://www.reddit.com/r/AI_Agents/comments/1x5xbqu/how_do_you_decide_when_a_coding_agent_has_spent/) | ~21h | ~16 | Stop on empty diffs, repeated identical errors, or a retry that can't name a new hypothesis | Limits on a whole multi-agent task, not on each worker |
| 2 | Routing vs caching | [Does prompt caching make routing pointless?](https://www.reddit.com/r/LLMDevs/comments/1x57ywp/does_prompt_caching_make_routing_to_a_cheaper/) | ~42h | ~12 | Route on expected output length, keep the small model's cache warm, give cheap routes a short prompt | Measured results from choosing a model once per session |
| 3 | Tool failures | [My agent's worst mistakes were my tool's fault](https://www.reddit.com/r/AI_Agents/comments/1x6ivzt/the_worst_agent_mistakes_ive_seen_were_my_tools/) | ~3h | ~10 | Ambiguous tool contracts; put examples in tool descriptions | How often tool calls fail in practice |
| 4 | Unattended runs | [What do you record when an agent runs unattended?](https://www.reddit.com/r/LLMDevs/comments/1x5ksgn/what_do_you_actually_record_when_an_agent_runs/) | ~31h | ~22 | Keep the run skeleton, expire the payload; hash the arguments | Using the log to repair failed runs automatically |
| 5 | Parallel sessions | [How many sessions before you lose track?](https://www.reddit.com/r/AI_Agents/comments/1x6dig4/how_many_agent_sessions_can_you_run_before_you/) | ~9h | ~12 | A status file per run, isolated output paths, someone owning the merge | Who decides whether new work starts a new session or joins one |
| 6 | Memory | [How are you handling memory across sessions?](https://www.reddit.com/r/AI_Agents/comments/1x5want/how_are_you_handling_memory_across_your_agents/) | ~21h | ~42 | Versioned facts; a state file for mutable decisions; similarity search is the wrong tool for decisions | Decisions made mid-conversation that nobody writes down |
| 7 | Pricing agents | [Metered credits and flat-rate agent pricing](https://www.reddit.com/r/SaaS/comments/1x5xq8a/anthropic_moving_agent_sdk_to_metered_api_credits/) | ~21h | ~3 | Outcome credits instead of raw tokens | Bring-your-own-key models (barely discussed) |
| 8 | Permissions | [Where do you enforce agent limits?](https://www.reddit.com/r/AI_Agents/comments/1x6ehwq/where_do_you_enforce_limits_on_what_your_agent/) | ~8h | ~9 | Scoped credentials, wrapper checks, an interception layer, splitting by reversibility | Credentials that exist only while a session runs |
| 9 | Business adoption | [What are people struggling to implement?](https://www.reddit.com/r/AI_Agents/comments/1x5mmd6/everyone_wants_to_use_ai_in_their_business_what/) | ~29h | ~11 | Getting prototypes into production; edge cases; bounded scope | Cases where the real problem was the data, not the agent |
| 10 | Harness vs model | [Our model comparison measured a broken harness](https://www.reddit.com/r/LLMDevs/comments/1x5xb7h/our_model_comparison_was_mostly_measuring_a/) | ~21h | ~10 | Fixture sets the checker must reject; logging the finish reason; mutation testing | Little; well covered |
| 11 | Coding-agent tests | [First three regression tests for a coding agent](https://www.reddit.com/r/AI_Agents/comments/1x6bhn9/what_are_the_first_three_regression_tests_you/) | ~10h | ~9 | Allowed-file lists, snapshots of test files, injected failures, planted instructions | Little; well covered |
| 12 | Engineering basics | [Agent builders forgetting software engineering](https://www.reddit.com/r/AI_Agents/comments/1x6bwg9/is_anyone_else_noticing_that_people_building_ai/) | ~10h | ~30 | Schema-first memory; vibe coding skips the design step | Mostly agreement |
| 13 | Company data access | [Agents and company data without every key](https://www.reddit.com/r/LLMDevs/comments/1x44qib/how_are_you_giving_ai_agents_access_to_company/) | ~71h | ~11 | Read-only views, server-side scoped tools, row-level security | Combining two allowed calls to leak data |
| 14 | Mixing harnesses | [Claude Code and Codex on one project](https://www.reddit.com/r/ClaudeAI/comments/1x6dhb0/whats_the_best_way_to_have_claude_code_and_codex/) | ~9h | ~21 | One builds and one reviews; or just pick one | The poster doesn't code, so it isn't a technical thread |

Patterns across the 14 threads:

- **People want accounts from experience more than generic advice.** The
  replies that drew the original poster back in (1, 3, 5, 6) described a
  specific setup or failure.
- **Most of the obvious answers are already given.** Threads 10 to 13 have
  little left to add.
- **Some questions draw almost no answers.** Bring-your-own-key pricing (7),
  how often tool calls fail (3), and how to stop a multi-agent task as a
  whole (1) had little or no data in the replies.
- **No matching threads in two subreddits.** Nothing in r/LocalLLaMA or
  r/ChatGPTCoding matched these topics closely.

## Limitations

- A single capture, read around 15 October 2026. Threads age out within a
  day or two in the faster subreddits.
- Comment counts and the "still open" column reflect only the first eight
  top-sorted comments of each thread.

## References

The 14 thread links in the table above, read on 2026-10-15.
