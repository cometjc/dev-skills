---
name: ask-me
description: Use when execution needs user clarification through ask_user_questions, especially for ambiguous routing, risky trade-offs, blocked slices, async/non-blocking question sessions, timeout handling, or answer-based resume.
---

# Ask Me

Coordinate AUQ (`ask-user-questions` MCP) interactions for orchestration flows.

## When to Apply

Use this skill when a workflow needs user input that can unblock or de-risk execution.

Common triggers:
- ambiguous routing or strategy decisions
- high-impact trade-offs that require explicit user choice
- blocked execution slices waiting on user answers
- need to continue independent work while waiting for answers

## Applicability Rules

- MUST use AUQ when any of these are true:
  - routing/plan choice is ambiguous
  - decision has non-trivial risk or irreversible cost
  - execution is blocked by missing user intent
- SHOULD continue without AUQ when answers are derivable from code/docs/runtime evidence.
- MUST NOT replace AUQ with plain-text multiple-choice prompts.

## Core Contract

1. Prefer non-blocking AUQ for orchestration workflows.
2. Persist session IDs and blocked slices for resumable execution.
3. Poll answered state on execution triggers.
4. Resume blocked slices when answers are available.
5. Treat MCP tool descriptions and return payloads as runtime source of truth.

## AUQ Question Rules

- Ask via MCP tools: `ask_user_questions` and `get_answered_questions`.
- Always provide 1-5 questions.
- Each question must include:
  - `title` (max 12 chars)
  - `prompt` (full question text ending with `?`)
  - `options` (2-5 choices, no manual `Other`)
  - `multiSelect` (`true`/`false`)
- Put the recommended option first and append `(Recommended)` in the label.
- Do not ask meta-process confirmations like "Is my plan ready?" or "Should I proceed?".

## Return-Message Guided Flow

1. Call `ask_user_questions` with `nonBlocking: true` for resumable flows.
2. Persist returned `session_id` with blocked work slices.
3. Poll with `get_answered_questions(session_id, blocking: false)` on normal execution triggers.
4. Branch by returned status:
  - `pending`: continue independent slices.
  - `answered`: re-attach blocked slices and resume.
  - timeout/no answer: keep partial progress and retry later.
5. Use `blocking: true` only when the next critical-path step is fully blocked on user answers.

## Execution Guardrails

- Ask 1-5 questions per AUQ call; each question must follow tool schema exactly.
- Recommended option must be first and labeled `(Recommended)`.
- Never add a manual `Other` option.
- Use AUQ return payload fields as the only authority for state transitions.

## Do Integration

`do` must not define its own AUQ state machine. It should invoke AUQ tools and follow return fields (`session_id`, status, answered payload).
