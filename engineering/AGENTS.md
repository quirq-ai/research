# Agent instructions: engineering

Read the root [AGENTS.md](../AGENTS.md) first. This file adds instructions for
this topic only.

## What to research

Answer the four questions in [GOAL.md](GOAL.md), in this order:

1. Agent and UI integration patterns. Compare CopilotKit/AG-UI, LangGraph's
   React SDK, the Vercel AI SDK and assistant-ui on shared state, generative
   UI and human-in-the-loop. Start from the write-up in issue #16.
2. Repo structure: map the quirq repos and their dependencies.
3. Testing and code review: record each repo's tests, CI and review settings,
   then list the gaps.
4. AI agents in the dev loop: record where agents act today and what would
   help them most.

## Sources

**Prefer:** the quirq repos read at a recorded commit, their merged PRs and
CI runs, each framework's official docs and source repo, and examples you
ran yourself.

**Avoid:** vendor marketing pages and blog comparisons as the only source for
a claim, and anything that cannot be checked or cited.

## How to verify

- Open every source and confirm it says what the finding claims.
- Reproduce numbers where possible; otherwise quote them with their source.
- Cite repo claims as a file path at a commit SHA.
- For framework comparisons, record the package versions you checked. Mark
  anything you did not run yourself as read from docs.

## Publishing

Follow steps 5 to 8 of the root [AGENTS.md](../AGENTS.md): publish only into
the formats ticked in [GOAL.md](GOAL.md), then update [README.md](README.md)
and run `npm run topics` at the repo root.

## Topic-specific notes

- Don't duplicate the `infra` topic. Link to it where qq is relevant.
