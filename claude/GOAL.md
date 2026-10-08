# Goal: claude

## Purpose

This topic collects suraj's research on Claude Code in one place: what a
Claude Code session is made of, where its state lives, how a host drives it,
and what an operating system for agents should own around it. The source is
suraj's writing at
[github.com/sharmasuraj0123/writings](https://github.com/sharmasuraj0123/writings).
The research informs how quirq and xo-space build on Claude Code sessions.

## Research questions

1. **What is a Claude Code session made of?** Its identities, boot, turn
   loop, on-disk layout, transcript, flags, settings, permissions and
   protocols.
2. **What does the global state file `~/.claude.json` hold?** Every key,
   who writes it and what reads it.
3. **Where else does Claude Code show up in the writings?** How xo-space,
   Space Walk, the personal memory engine, the Codex teardown and quirq
   build on it.

## Research action

- Bring each Claude Code piece from the writings repo into this topic without
  changing its meaning. Credit and link every original post.
- Read every post in the writings repo, on `main` and on open branches, for
  Claude Code material, and link the relevant sections.
- Keep the source's own labels for what was measured, read from the binary,
  documented or inferred.

## Scope

**In scope:**

- Claude Code research in suraj's writings repo: the session teardown, the
  `~/.claude.json` explorer, and Claude Code sections of other posts.

**Out of scope:**

- New measurements of Claude Code. The writings describe Claude Code 2.1.280;
  re-checking later releases would be new research.
- Acting on the related open issues below. They follow the repo's issue
  triage.

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

## Requested outputs

Tick only the formats the requester asked for. Agents publish into these
folders and no others.

- [x] onepager: `output/onepager/`
- [ ] slide: `output/slide/`
- [x] report: `output/report/`
- [x] app: `output/app/`

Requested by: suraj, on 2026-10-08.
