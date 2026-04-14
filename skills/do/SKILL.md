---
name: do
description: "Use when requests need governance routing across planning/debugging/execution workflows. WHEN: \"/do\", \"fix-errors\", \"route to brainstorming\", \"route to systematic-debugging\", \"choose executing-plans vs subagent-driven-development\"."
---

# Do

Route a request to the correct Superpowers workflow and enforce execution guardrails.

## Dependencies

- brainstorming
- dispatching-parallel-agents
- executing-plans
- finishing-a-development-branch
- grill-me
- receiving-code-review
- requesting-code-review
- subagent-driven-development
- systematic-debugging
- test-driven-development
- using-git-worktrees
- using-superpowers
- verification-before-completion
- writing-plans
- writing-skills
- ask-me

## Routing Priority (Deterministic)

Apply the first matching rule and stop.

1. `/do ~N` -> Task Status Listing only.
2. `fix-errors` with non-empty todo -> `subagent-driven-development` (direct, no notify).
3. Explicit single-thread preference -> `executing-plans`.
4. Existing plan-execution intent detected:
- active subagents -> continue `subagent-driven-development`.
- otherwise -> evaluate plan task independence:
  - has independently executable tasks -> start `subagent-driven-development` (notify + start)
  - no independent tasks / strongly sequential -> start `executing-plans` (Inline Execution)
5. New feature or non-obvious bugfix (multiple plausible approaches) -> `brainstorming` + `grill-me` before `writing-plans`.
6. Straightforward bugfix/test-fix -> `systematic-debugging` -> execution (no plan/spec gate).
7. Independent multi-domain subproblems (>=2, truly independent) -> `dispatching-parallel-agents`.
8. Fallback for unclear scope/new behavior -> `brainstorming`.

## Core Rules

1. **Plan-intent artifact discovery (for route 4)** - Treat a request as plan-execution intent only when at least one is true:
- user explicitly references a plan/spec/todo artifact or asks to continue an existing plan
- active subagents already belong to an existing plan execution
- execution context already has an unresolved selected plan artifact
If plan intent is not explicit, do not auto-promote to route 4. This prevents preemption of straightforward bugfix routing.

2. **Preflight** - Before execution, check whether work is already applied. If `already_applied`, report evidence and skip execution.

3. **Executor selection** - Execute strictly according to selected route:
- `systematic-debugging` route: run directly (no planning/spec generation).
- `brainstorming` + `grill-me` route: follow full brainstorming gate (design -> spec write -> spec review loop -> user review), then hand off to `writing-plans`.
- plan-execution routes: evaluate the selected plan before execution.
  - if tasks can run independently (disjoint files/modules or no strict sequential dependency), use `subagent-driven-development`.
  - if tasks are strongly sequential or tightly coupled, use `executing-plans` (Inline Execution).
  - explicit single-thread preference still overrides to `executing-plans`.
- `subagent-driven-development` start message: _"Proceeding with subagent-driven-development. Stop me now if you need single-thread execution (executing-plans) to follow the details directly."_

4. **Worktree policy** - Require `using-git-worktrees` before concurrent execution routes (`subagent-driven-development` and `dispatching-parallel-agents`). Single-thread `executing-plans` may run without worktree when risk is low. For detailed failure diagnosis and remediation, follow [Worktree Recovery](references/worktree-recovery.md).

5. **Post-plan** - For each completed plan: verify -> feedback stage -> stage only plan-related files + delete plan file -> auto-commit with Conventional Commit message. Exclude unrelated files and emit one-line hints for each excluded file.

6. **Feedback stage** - Run when execution verification reports failure, ambiguity, or policy drift. Report gaps by severity with file/line evidence; create remediation plan only when findings require follow-up work.

7. **Governance edits** - For direct `$do` edits that are single-target, doc-only, low-risk: auto-commit after verification; stage only required files.

8. **AUQ policy** - Use AUQ for ambiguity/risk decisions and resumable blocked slices. **REQUIRED SUB-SKILL:** `ask-me` is the source of truth. `do` must follow AUQ MCP tool description and return messages (for example `session_id`, status, answered payload) instead of defining a local AUQ state machine.

9. **fix-errors** - In `fix-errors` mode, new todo items from monitor stage trigger ordered background dispatch; no pause unless explicit blocking condition is hit.

10. **Planning trigger policy** - Planning is required only for new features or non-obvious bugfixes with meaningful trade-offs. Straightforward fixes bypass plan/spec and go directly through `systematic-debugging`.

## Task Status Listing (`~N`)

When invoked as `/do ~N` (for example, `/do ~5`), list the most recent N tasks. Default N = 10.

Use `TaskList`; sort by `updated_at` descending; take top N. `in_progress` tasks from a previous session display as `interrupted`.

Output: compact table `N | title | status | updated_at`. Stop; do not route to execution.

| TaskList status | Display label |
|---|---|
| `in_progress` | ongoing (or `interrupted` if from prior session) |
| `completed` | done |
| `cancelled` | cancelled |
| `pending` | pending |

## Validation Matrix (Minimum)

Validate routing behavior with these checks:
- `/do ~N` -> lists tasks only
- straightforward bugfix/test-fix -> `systematic-debugging` direct execution
- non-obvious feature/bugfix -> `brainstorming` + `grill-me` first
- explicit single-thread request -> `executing-plans`
- `fix-errors` with non-empty todo -> direct `subagent-driven-development`
- existing plan-execution intent + independent tasks -> `subagent-driven-development`
- existing plan-execution intent + sequential tasks -> `executing-plans`

## Execution Evidence Checklist

For each execution, capture route-aware evidence:
- selected route and why it matched first
- preflight result (`already_applied` or `action_required`) with command evidence
- executor used (`systematic-debugging`, `subagent-driven-development`, or `executing-plans`)
- AUQ usage and transitions (if any)
- verification commands and outcomes
- feedback stage result (`findings` or `no_findings`) and output path when applicable

## References

- [Ask Me Skill](../ask-me/SKILL.md)
- [Worktree Recovery](references/worktree-recovery.md)
