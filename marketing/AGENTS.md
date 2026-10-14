# Agent instructions: marketing

Read the root [AGENTS.md](../AGENTS.md) first. This file adds instructions for
this topic only.

## What to research

Derived from [GOAL.md](GOAL.md).

1. Read the newest and rising posts of r/AI_Agents, r/AgentsOfAI, r/LLMDevs
   and r/ClaudeAI from their public feeds.
2. Keep posts from the last 72 hours about agent cost, model choice, routing,
   memory across sessions, running several agents or harnesses together, or
   evaluating agent output.
3. Shortlist open questions with fewer than about 60 comments.
4. For each shortlisted thread, read the full post and the top comments, and
   record what is asked, what the replies cover and what is still open.

## Sources

**Prefer:** the threads themselves, read from Reddit's public feeds. Cite every
thread by its permalink.

**Avoid:** third-party Reddit mirrors, scraped datasets, and anything that
needs a login.

## How to verify

- Open every cited thread and confirm it is still live and says what the
  report claims.
- Comment counts and ages come from the feed at a stated time. Give them as
  approximate and date them.
- Keep what the threads say apart from our reading of what it means for
  quirq.

## Publishing

Follow steps 5 to 8 of the root [AGENTS.md](../AGENTS.md): publish only into
the formats ticked in [GOAL.md](GOAL.md), then update [README.md](README.md)
and run `npm run topics` at the repo root.

## Topic-specific notes

- Never post, comment, vote or log in on Reddit as part of this research.
- Do not record Reddit usernames. Paraphrase comments; quote only short
  phrases where the exact wording matters.
- From a residential connection, `reddit.com/.../*.json` returned 403 and
  `old.reddit.com` redirected to a login page. The public `.rss` feeds work
  but rate-limit quickly (HTTP 429), so space requests about 10 seconds apart.
