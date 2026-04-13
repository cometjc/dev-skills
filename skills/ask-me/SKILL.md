---
name: ask-me
description: Use when execution needs user clarification through ask_user_questions, especially for ambiguous routing, risky trade-offs, blocked slices, async/non-blocking question sessions, timeout handling, or answer-based resume.
---

# Ask Me

Coordinate AUQ (ask-user-questions MCP) interactions for orchestration flows.

## When to Apply

Use this skill when a workflow needs user input that can unblock or de-risk execution.

Common triggers:
- ambiguous routing or strategy decisions
- high-impact trade-offs that require explicit user choice
- blocked execution slices waiting on user answers
- need to continue independent work while waiting for answers

## Core Contract

1. Prefer non-blocking AUQ for orchestration workflows.
2. Persist session IDs and blocked slices for resumable execution.
3. Poll answered state on execution triggers.
4. Resume blocked slices when answers are available.
5. Treat MCP tool descriptions and return payloads as runtime source of truth.

## Do Integration

`do` should not define its own AUQ state machine. `do` should invoke AUQ and follow tool return messages.

- MCP tool spec and behavior:
  - [`scripts/ask-user-questions-mcp/skills/ask-user-questions/SKILL.md`](scripts/ask-user-questions-mcp/skills/ask-user-questions/SKILL.md)
- `do` keeps only:
  - when AUQ must be used
  - which slices are blocked vs independent
  - that state transitions are driven by AUQ return fields (`session_id`, status, answered payload)
