---
name: do
description: Use as the governance entry point for Superpowers workflow routing from idea, bugfix, spec, or plan into the correct planning/execution skills with executor and worktree guardrails.
dependencies:
  - source: https://github.com/obra/superpowers
    skills:
      - brainstorming
      - dispatching-parallel-agents
      - executing-plans
      - finishing-a-development-branch
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
---

# Do

Route the user request to the right Superpowers workflow stage and enforce execution guardrails.

## Hand-off Mapping

| Input | Route |
|---|---|
| `/do ~N` | Task Status Listing (no execution) |
| Idea / new behavior / unclear scope | `brainstorming` |
| Approved spec, no plan | `writing-plans` |
| Clear bugfix / test-fix | `systematic-debugging` → execution |
| Plan + active subagents | `subagent-driven-development` (continue parallel) |
| Plan, no active subagents | `subagent-driven-development` (notify + start) |
| `fix-errors` + non-empty todo | `subagent-driven-development` (direct, no notify) |
| Explicit single-thread preference | `executing-plans` |
| Multiple plans in one request | queue + auto-converge per plan |
| Independent multi-domain subproblems | `dispatching-parallel-agents` |

## Core Rules

1. **Artifacts first** — Start from current artifacts. Auto-detect spec/plan from `docs/superpowers/plans/*.md`, `docs/superpowers/specs/*.md`, `tasks/todo.md` in that order. Ask only if no clear candidate or multiple conflicting candidates exist.

2. **Preflight** — Before execution, check if target files/commits are already present with no actionable delta. If `already_applied`: report evidence, skip worktree and executor notification.

3. **Executor** — Proceed with `subagent-driven-development` by default; output: _"Proceeding with subagent-driven-development. Stop me now if you need single-thread execution (executing-plans) to follow the details directly."_ Then start immediately. If subagents are already active, continue parallel flow without notification. For `fix-errors` with non-empty todo, skip notification and enter directly.

4. **Worktree** — Require `using-git-worktrees` before execution except for single-thread `executing-plans`. If `.worktrees/*` paths appear as untracked, add `/.worktrees/` to `.gitignore` and include that change in the same commit.

5. **Worktree failure** — If worktree setup fails: capture the failure cause, attempt one safe fix/retry. If still failing, ask AUQ for fallback: retry with adjusted parameters, switch to `executing-plans`, or pause for manual remediation.

6. **Post-plan** — For each completed plan: verify → run feedback stage → merge to `main` (subagent flow) or commit on `main` (single-thread) → remove plan files. Continue queued plans automatically when convergence is unambiguous and low-risk. Pause only for ambiguous strategy, conflicts, or failed verification.

7. **Feedback stage** — After execution verification: review (a) current `do` skill text and (b) the execution trace. Report gaps ordered by severity with file/line evidence. Produce a remediation plan under `docs/superpowers/plans/` if fixes are needed; otherwise list residual risks.

8. **Governance** — For direct `$do` edits that are single-target, doc-only, and low-risk: auto-commit with a Conventional Commit message after verification. Stage only required files; exclude unrelated modified files.

9. **AUQ** — Default flow: `ask_user_questions(nonBlocking: true)` → append entry to `auq-registry.json` (status: `pending`) → `get_answered_questions(session_id, blocking: true)`. On timeout: mark `status → timeout`, split plan into blocked/independent slices, continue independent slice, launch `bash sleep 120` as heartbeat. On each trigger (merge, user signal, sleep): batch re-check `pending`/`timeout` entries with `get_answered_questions(blocking: false)`. When answered: derive `RESUME_READY`, re-attach blocked slices, set `consumed_at`. If `RESUME_READY` and `fix-errors` dispatch occur simultaneously, dispatch fix-errors first; proceed concurrently only if worktrees are non-overlapping.

10. **fix-errors** — In `fix-errors` mode, new `todo` items from the monitor stage trigger immediate ordered subagent dispatch in background; no pause for "continue/proceed" unless a defined blocking condition is hit.

## Task Status Listing (`~N`)

When invoked as `/do ~N` (e.g., `/do ~5`), list the most recent N tasks. Default N = 10.

Use `TaskList`; sort by `updated_at` descending; take top N. `in_progress` tasks from a previous session display as `interrupted`.

Output: compact table `N | title | status | updated_at`. Stop; do not route to execution.

| TaskList status | Display label |
|---|---|
| `in_progress` | ongoing (or `interrupted` if from prior session) |
| `completed` | done |
| `cancelled` | cancelled |
| `pending` | pending |

## AUQ Registry

Tracked in `docs/superpowers/executions/auq-registry.json` (global file, coordinator-maintained).

```json
{
  "question_id": "auq-001",          // sequential per execution session
  "session_id": "sess-abc123",
  "blocked_slices": [
    { "plan_file": "docs/superpowers/plans/foo.md", "section": "## Step 3" }
  ],                                  // {plan_file, section} for crash-safe resume; append :LN if heading repeats
  "status": "pending",               // pending | answered | timeout | consumed
  "submitted_at": "2026-04-10T10:00:00Z",
  "last_checked_at": null,
  "consumed_at": null                // set when blocked_slices execution begins; polls skip consumed entries
}
```

On first AUQ: create file as `{ "entries": [] }` if absent. On restart: resume entries with `status` in `{ pending, timeout }` or `status=answered` with `consumed_at=null`.

## AUQ Runtime State Machine

Macro state derived from `auq-registry.json` entries, evaluated in priority order:

| Macro State | Condition |
|---|---|
| `RESUME_READY` | Any entry: `status=answered` AND `consumed_at=null` |
| `WAITING_AUQ` | Any entry: `status=pending` |
| `PARTIAL_PROGRESS` | Any entry: `status=timeout`, AND no `RESUME_READY` entries |
| `RUNNING` | All entries consumed or table empty |

## Execution Guardrails

- `subagent-driven-development`: requires `using-git-worktrees`; use `dispatching-parallel-agents` only for independent subproblems.
- `dispatching-parallel-agents`: use only when ≥2 independent tasks exist; requires `using-git-worktrees` for concurrent edits.
- `executing-plans`: single-thread; can run in current session. Prefer isolated worktree if branch risk is detected.

## Execution Evidence Checklist

For each executed plan, capture:
- Selected artifact path and why it was chosen.
- Preflight result (`already_applied` or `action_required`) with command evidence.
- Executor: confirm `subagent-driven-development` proceeded (or note if user stopped for single-thread).
- AUQ state transitions when timeout/recovery occurs.
- Verification commands and outcomes.
- Feedback stage result (`findings` or `no_findings`) and report/plan path.
