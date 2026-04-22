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

1. Default to blocking AUQ when the next step is on the critical path and no independent slice can continue.
2. For the same unresolved decision/question, the **first AUQ call MUST be** `nonBlocking: false`.
3. If a blocking AUQ call times out, keep the existing `session_id` and resume via `get_answered_questions`; do not re-ask the same question as a new non-blocking AUQ call.
4. Persist session IDs and blocked slices for resumable execution.
5. Poll answered state on execution triggers.
6. Resume blocked slices when answers are available.
7. Treat MCP tool descriptions and return payloads as runtime source of truth.

## AUQ Question Rules

- Ask via MCP tools: `ask_user_questions` and `get_answered_questions`.
- Always provide 1-5 questions.
- For governance/doc-rule update requests, the **first AUQ question** must ask for selectable target path(s) before asking content details.
- Target-path question must provide 2-5 concrete path options (recommended option first), then continue with follow-up AUQ on rule content.
- Each question must include:
  - `title` (max 12 chars)
  - `prompt` (full question text ending with `?`, supports Markdown formatting)
  - `options` (2-5 choices, no manual `Other`)
  - `multiSelect` (`true`/`false`)
- Put the recommended option first and append `(Recommended)` in the label.
- Do not ask meta-process confirmations like "Is my plan ready?" or "Should I proceed?".

## Standard AUQ Prompt Templates

Use these templates as defaults and only customize labels/descriptions to the task.

1. Governance/rule update (path-first):
```json
{
  "nonBlocking": false,
  "questions": [
    {
      "title": "Target Path",
      "multiSelect": false,
      "prompt": "Which target path should we update first?",
      "options": [
        {"label": "Path A (Recommended)", "description": "Primary governance scope."},
        {"label": "Path B", "description": "Project-level override scope."},
        {"label": "Both paths", "description": "Apply consistent rule in both files."}
      ]
    }
  ]
}
```

2. Follow-up content decision (after target path is answered):
```json
{
  "nonBlocking": false,
  "questions": [
    {
      "title": "Rule Change",
      "multiSelect": false,
      "prompt": "What rule behavior should be enforced?",
      "options": [
        {"label": "Strict mode (Recommended)", "description": "Enforce on every matching case."},
        {"label": "Guarded mode", "description": "Enforce only on high-risk or ambiguous cases."}
      ]
    }
  ]
}
```

3. Fetch answers:
```json
{
  "blocking": true,
  "session_id": "<session_id>"
}
```

## Return-Message Guided Flow

1. If no independent work can continue without the answer, call `ask_user_questions` with `nonBlocking: false` (blocking) on the first attempt.
2. If that blocking call times out/errors, do not re-ask the same question as a new AUQ call and do not change question semantics.
3. Keep the same `session_id` from the timed-out call and continue only independent work.
4. Use `nonBlocking: true` directly only when the decision can be deferred and independent slices can continue.
5. Poll with `get_answered_questions(session_id, blocking: false)` on normal execution triggers.
6. Branch by returned status:
  - `pending`: continue independent slices.
  - `answered`: re-attach blocked slices and resume.
  - timeout/no answer: keep partial progress and retry later.
7. Use `get_answered_questions(..., blocking: true)` only when waiting is explicitly required at that point.

## Execution Guardrails

- Ask 1-5 questions per AUQ call; each question must follow tool schema exactly.
- Recommended option must be first and labeled `(Recommended)`.
- Never add a manual `Other` option.
- Use AUQ return payload fields as the only authority for state transitions.
- After the user selects an option, use immediate-action wording in updates (e.g., "我現在就直接..."), not deferred phrasing like "我下一步就...".

## Do Integration

`do` must not define its own AUQ state machine. It should invoke AUQ tools and follow return fields (`session_id`, status, answered payload).
