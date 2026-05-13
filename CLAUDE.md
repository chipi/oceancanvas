# CLAUDE.md

> Claude-specific overlay. The canonical AI-agent instructions for this repo live in [`AGENTS.md`](AGENTS.md) — read that first.

This file exists because Claude Code auto-loads `CLAUDE.md` at the start of every session. Its job is to point Claude at `AGENTS.md` (which is portable across coding agents) and to layer on any Claude-specific behavioural overrides on top.

---

## Read this first

**Read [`AGENTS.md`](AGENTS.md) in full at the start of any non-trivial session.** It contains:

- where things live (concept package, definition tree, code layout)
- the locked stack and the non-negotiable constraints
- code conventions for Python, Node.js, React, YAML, commits, branches, testing
- doc-system rules (PRD / UXS / RFC / ADR mechanics and the cross-doc consistency rule)
- voice
- "do / don't" — the rules that hold across every PR
- Phase 1 / 2 / 3 scope

The conventions there are firm; nothing on this page supersedes them.

---

## Claude-specific addenda

None at the moment. The project's working conventions are tool-agnostic and live in `AGENTS.md`. If Claude-specific tuning becomes warranted (e.g., a particular planning style, output verbosity, autonomy ceiling for this codebase), it lands here as additions on top of `AGENTS.md`, never replacing its rules.
