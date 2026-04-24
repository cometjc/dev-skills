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

1. Default to `nonBlocking: false` for the first AUQ call on each unresolved decision.
2. For the same unresolved decision/question, the **first AUQ call MUST be** `nonBlocking: false`.
3. If a blocking AUQ call times out, keep the existing `session_id` and resume via `get_answered_questions`; do not re-ask the same question as a new non-blocking AUQ call.
4. Persist session IDs and blocked slices for resumable execution.
5. Poll answered state on execution triggers.
6. Resume blocked slices immediately when answers are available.
7. Treat MCP tool descriptions and return payloads as runtime source of truth.
8. If a blocking AUQ call returns a usable answer, treat that answer as the current turn's next instruction, not a future-turn suggestion.

## nonBlocking Decision Tree

1. Is this the first AUQ for this unresolved decision?
   - Yes: use `nonBlocking: false`.
2. Did the blocking call timeout?
   - Yes: keep the same `session_id` and resume via `get_answered_questions` (do not re-ask as a new AUQ).
3. Only use `nonBlocking: true` when both are true:
   - the decision can be deferred, and
   - independent slices can continue without the answer.
4. For final "Next Action" closeout questions, use `nonBlocking: false`.

## AUQ Question Rules

- Ask via MCP tools: `ask_user_questions` and `get_answered_questions`.
- Always provide 1-5 questions.
- For governance/doc-rule update requests, the **first AUQ question** must ask for selectable target path(s) before asking content details.
- Target-path question must provide at least 2 concrete path options (recommended option first), then continue with follow-up AUQ on rule content.
- Each question must include:
  - `title` (max 12 chars)
  - `prompt` (full question text ending with `?`, supports Markdown formatting)
  - `options` (2+ choices, no manual `Other`)
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
  - `answered`: re-attach blocked slices and resume execution in the same turn whenever the answer is sufficient.
  - timeout/no answer: keep partial progress and retry later.
7. Use `get_answered_questions(..., blocking: true)` only when waiting is explicitly required at that point.

## Answer-Resume State Machine

Treat AUQ as a control-flow boundary:

1. detect blocked or risky decision
2. ask via AUQ
3. receive answer or session state
4. translate answer into concrete task(s)
5. execute those task(s) immediately unless a real blocker remains

Do not stop at step 3 unless one of these is true:
- answers conflict with each other
- a required parameter is still missing
- the user chose a pure stop/closeout action
- tools, permissions, or external dependencies block safe execution

If none of those apply, the correct behavior is to keep going in the same turn.

## Execution Guardrails

- Ask 1-5 questions per AUQ call; each question must follow tool schema exactly.
- Recommended option must be first and labeled `(Recommended)`.
- Never add a manual `Other` option.
- Use AUQ return payload fields as the only authority for state transitions.
- After the user selects an option, use immediate-action wording in updates (e.g., "我現在就直接..."), not deferred phrasing like "我下一步就...".
- After a blocking AUQ answer, do not emit a final response that only restates the chosen option; final output should describe work already performed or a concrete blocker.
- Multi-select answers are executable backlog for the current turn, not a menu to summarize and defer.

## Anti-Patterns

- Asking AUQ, getting an answer, then ending with "I will do that next"
- Treating `answered` as a note for the next turn instead of a resume signal
- Re-asking the same question because the first blocking AUQ timed out
- Converting a clear multi-select answer into vague "preference" language and stopping

## Do Integration

`do` must not define its own AUQ state machine. It should invoke AUQ tools and follow return fields (`session_id`, status, answered payload).
