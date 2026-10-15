# Goal: claude

## Purpose

This topic collects suraj's research on Claude Code in one place: what a
Claude Code session is made of, where its state lives, how a host drives it,
and what an operating system for agents should own around it. The source is
suraj's writing at
[github.com/sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings).
The research informs how quirq and xo-space build on Claude Code sessions.

The topic also covers the agent runtimes around Claude Code, starting with
OpenAI's Codex. suraj's companion teardown reads a Codex session the same
way: what it contains, how it runs, where it persists and how to control it.
An explorer maps the desktop app's `.codex-global-state.json`, key by key. This
research informs the design of an operating system that can route work into
Space and other products.

This topic also covers suraj's research on Claude models themselves. The
first piece is his close reading of Anthropic's global-workspace
interpretability paper, *Verbalizable Representations Form a Global Workspace
in Language Models* (Transformer Circuits, 2026), which works with Claude
models. His post explains what a J-space is, reconstructs how to build one,
and reports what the paper found with it. It marks which claims are from the
paper and which are his own reconstruction. This topic keeps those marks.

## Research questions

1. **What is a Claude Code session made of?** Its identities, boot, turn
   loop, on-disk layout, transcript, flags, settings, permissions and
   protocols.
2. **What does the global state file `~/.claude.json` hold?** Every key,
   who writes it and what reads it.
3. **Where else does Claude Code show up in the writings?** How xo-space,
   Space Walk, the personal memory engine, the Codex teardown and quirq
   build on it.
4. **What is a Codex session made of?** Its identities and lineage, the thread, turn and item shape, boot and resume, the turn stream, the stores on disk, the commands, the App Server protocol, the configuration layers, forks and subagents.
5. **What does the desktop's `.codex-global-state.json` hold?** Each field's observed type, its owning writer, and the project and thread associations.
6. **Where should Codex's ownership end and a product's begin?** What an OS must own to offload work into Space: durable intent, routing, decisions and accepted outcomes.
7. **What is a J-space?** The Jacobian lens, the J-lens vectors and the sparse nonnegative decomposition, as the paper defines them.
8. **How would you build one?** suraj's reconstruction: the compute routes, numerical cautions, read and write operations, validation checks and a reference implementation.
9. **What did the paper find with it, and where does it say not to lean on it?** The five functional properties, the sensory, workspace and motor regions, and the limitations.
10. **What carries over to other work?** The methodological moves suraj thinks are portable.

## Research action

- Bring each Claude Code piece from the writings repo into this topic without
  changing its meaning. Credit and link every original post.
- Read every post in the writings repo, on `main` and on open branches, for
  Claude Code material, and link the relevant sections.
- Keep the source's own labels for what was measured, read from the binary,
  documented or inferred.
- Bring the Codex session teardown and the `.codex-global-state.json`
  explorer into this topic without changing their meaning. Credit suraj and
  link both originals at commit `a5a356d`.
- Keep the report's labels for what was read from the local schema, observed
  locally, read from help, documented, reconstructed, synthesized,
  interpreted or proposed.
- Link the Codex and Claude Code teardowns to each other as companions.
- Publish suraj's J-space post as a report without changing its meaning.
  Credit and link the original at `a5a356d`.
- Keep the post's two labels: *\[from the paper\]* for the paper's equations,
  procedures and numbers, and *\[reconstruction\]* for suraj's engineering.
- Link the paper as the primary source. Quote it only where the post does.
- Keep the post's cost and storage figures marked as analytical. suraj has
  not run the pipeline against a frontier model.

## Scope

**In scope:**

- Claude Code research in suraj's writings repo: the session teardown, the
  `~/.claude.json` explorer, and Claude Code sections of other posts.
- Codex research in suraj's writings repo: the session teardown (`codex-session/`) and the `.codex-global-state.json` explorer (`codex-session/codex-json/`).
- suraj's close reading of the global-workspace paper and his construction manual for a J-space, in the writings repo at `a5a356d`.

**Out of scope:**

- New measurements of Claude Code. The writings describe Claude Code 2.1.280;
  re-checking later releases would be new research.
- Acting on the related open issues below. They follow the repo's issue
  triage.
- New measurements of Codex. The teardown describes `codex-cli 0.155.0-alpha.2.6`, inspected on 25 September 2026. The explorer describes one snapshot from 3 October 2026 and cites ChatGPT desktop 26.928.31416. Re-checking later releases would be new research.
- Building or testing the proposed adapter, data model and acceptance suite. The report labels them as proposals and did not test them.
- Values from the inspected machine. The report and the explorer publish structure and placeholders only. Keep it that way.
- Running the pipeline or reproducing the paper's results. The post's costs are analytical; measuring them would be new research.
- Claims from the paper that the post does not cover.
- The philosophical implications for conscious access. The post treats them as a separate conversation.

## Related issues

- [#24 Shared session record](https://github.com/quirq-ai/research/issues/24)
- [#32 Session manager](https://github.com/quirq-ai/research/issues/32)
- [#33 Crash consistency](https://github.com/quirq-ai/research/issues/33)
- [#34 Tool-call purity](https://github.com/quirq-ai/research/issues/34)
- [#37 Attribution loss and subagents](https://github.com/quirq-ai/research/issues/37)

## Done when

- Every Claude Code post in the writings repo is published here, credited and
  linked to its original.
- A one-pager points a reader at the key findings and at every place Claude
  Code appears in the writings.
- The Codex session teardown and its explorer are published here, credited and linked to their originals.
- A one-pager points a reader at the key Codex findings and at the Claude Code teardown it accompanies.
- The J-space post is published here as a report, credited and linked to its original.
- A one-pager gives its key numbers, each labelled as from the paper or as reconstruction.
- The README lists the post's findings, the report and the one-pager.

## Requested outputs

Tick only the formats the requester asked for. Agents publish into these
folders and no others.

- [x] onepager: `output/onepager/`
- [ ] slide: `output/slide/`
- [x] report: `output/report/`
- [x] app: `output/app/`

Requested by: suraj, on 2026-10-08.
