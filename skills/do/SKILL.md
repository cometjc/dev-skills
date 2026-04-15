---
name: do
description: "Use when requests need governance routing across planning/debugging/execution workflows. WHEN: \"/do\", \"fix-errors\", \"route to brainstorming\", \"route to systematic-debugging\", \"choose executing-plans vs subagent-driven-development\"."
---

# Do

Route a request to the correct Superpowers workflow and enforce execution guardrails.

## Default `/do` invocation (chained skills)

Unless a **higher-priority** row in the routing table matches first, treat:

`/do <request>`

as semantically equivalent to:

`/do /brainstorming /grill-me /ask-me <request>`

Meaning: run the **brainstorming** discovery/design flow, then **grill-me** branch-by-branch resolution, and handle **every** user-facing question in those phases through **`ask-me`** (AUQ MCP per `ask-me`), not plain-chat Q&A or ad-hoc multiple choice.

**Does not apply** when an earlier table hit applies (for example: `/do ~N`, `fix-errors` with non-empty todo, explicit single-thread preference, existing plan-execution intent, straightforward bugfix/test-fix, or independent multi-domain `dispatching-parallel-agents`). Those routes keep their existing behavior.

## Dependencies

### Routing and Discovery

- using-superpowers
- ask-me
- brainstorming
- grill-me
- systematic-debugging
- dispatching-parallel-agents

### Planning and Execution

- writing-plans
- subagent-driven-development
- executing-plans
- using-git-worktrees

### Verification and Quality Gates

- verification-before-completion
- test-driven-development
- requesting-code-review
- receiving-code-review
- finishing-a-development-branch
- writing-skills

## Numbered Workflow (Fast-Reference)

Use this indexed flow for routing, fast-forward, and progress references (for example: "jump to (8)" or "resume at (12.b)").

### A. Entry and Routing

Apply the first matching route and stop.

#### Routing Decision Table

| Condition | Hit | Next |
|---|---|---|
| Pending AUQ feedback exists | (1) | Run AUQ continuity gate before any route |
| `/do ~N` | (3.a) | Task status listing only; stop |
| `fix-errors` and todo non-empty | (3.b) | `subagent-driven-development` |
| Explicit single-thread preference | (3.c) | `executing-plans` |
| Existing plan-execution intent with independent tasks | (3.d) | `subagent-driven-development` |
| Existing plan-execution intent with sequential/tightly coupled tasks | (3.d) | `executing-plans` |
| New feature or non-obvious bugfix | (3.e) | Spec clarification path (B) |
| Straightforward bugfix/test-fix | (3.f) | `systematic-debugging` direct |
| Multi-domain independent subproblems (>=2) | (3.g) | `dispatching-parallel-agents` |
| Unclear scope/new behavior fallback | (3.h) | Spec clarification path (B) |

**(1) AUQ continuity gate first**
- If pending user feedback exists (open AUQ session or unresolved feedback state), call `get_answered_questions` before any execution route.
- Plain-chat follow-up is forbidden while feedback state is unresolved.

**(2) Preflight**
- Check whether requested work is already applied.
- If `already_applied`, report evidence and skip execution.

**(3) Route selection (deterministic)**
- **(3.a)** `/do ~N` -> Task Status Listing only.
- **(3.b)** `fix-errors` with non-empty todo -> `subagent-driven-development` (direct, no notify).
- **(3.c)** Explicit single-thread preference -> `executing-plans`.
- **(3.d)** Existing plan-execution intent:
  - active subagents -> continue `subagent-driven-development`
  - otherwise evaluate independence:
    - independent tasks -> `subagent-driven-development` (notify + start)
    - strongly sequential -> `executing-plans`
- **(3.e)** New feature or non-obvious bugfix -> `brainstorming` + `grill-me` + `ask-me` (path B) before `writing-plans`.
- **(3.f)** Straightforward bugfix/test-fix -> `systematic-debugging` direct execution.
- **(3.g)** Independent multi-domain subproblems (>=2, truly independent) -> `dispatching-parallel-agents`.
- **(3.h)** Fallback unclear scope/new behavior -> same as (3.e): `brainstorming` + `grill-me` + `ask-me` (path B) before `writing-plans`.

### B. Spec Clarification Path (for routes 3.e and 3.h)

**(4) Brainstorming phase**
- Run full `brainstorming` gate: design -> spec write -> spec review loop -> user review.
- Under `/do`, **do not** substitute plain-chat or inline multiple-choice for user input: any elicitation that would be a user question must go through **`ask-me`** (AUQ), following `ask-me` question schema and templates.

**(5) Grill-me phase**
- Use `grill-me` to resolve decision branches and dependencies one-by-one.
- Each grill-me question to the user is an **`ask-me`** (AUQ) turn, not plain chat (same hard rule as (4)).

**(6) AUQ decision gate during spec**
- Unresolved key design decisions must use AUQ (`ask-me`), not plain chat.
- For multiple viable approaches (A/B/C), final selection must be asked via AUQ.
- This includes **single-question strategy clarifications** during planning (for example target tmux-session selection); do not ask them in plain chat.
- This applies throughout path B, including phases (4) and (5); plain-chat substitution remains forbidden.

**(7) Spec handoff quality gate**
- Do not send path-only prompts.
- Must include:
  - newly specified items since Q&A
  - impact if changed now
  - spec path as supporting reference

### C. Plan Writing Path

**(8) Write plan**
- Use `writing-plans` after spec approval.

**(9) AUQ execution-choice gate**
- If plan is complete and execution mode is undecided (`Subagent-Driven` vs `Inline`), ask via AUQ.
- Do not ask this choice in plain chat.

### D. Execution Path

**(10) Executor selection**
- `systematic-debugging` route executes directly (no spec/plan generation).
- Plan-execution routes:
  - independent tasks -> `subagent-driven-development`
  - tightly coupled/sequential -> `executing-plans`
  - explicit single-thread preference always overrides to `executing-plans`
- `subagent-driven-development` start message:
  - _"Proceeding with subagent-driven-development. Stop me now if you need single-thread execution (executing-plans) to follow the details directly."_

**(11) Worktree policy**
- Require `using-git-worktrees` before concurrent execution routes (`subagent-driven-development`, `dispatching-parallel-agents`).
- Single-thread `executing-plans` may skip worktree only when risk is low.
- Follow [Worktree Recovery](references/worktree-recovery.md) when needed.

**(12) Subagent git-context hard gate (when branch/worktree assigned)**
- **(12.a)** Before first write and before commit, each subagent MUST run:
  - `scripts/ensure_git_context.sh --branch <expected_branch> --toplevel <expected_worktree_root>`
- **(12.b)** If check fails, subagent MUST stop and report `BLOCKED` (no writes/commit allowed).
- **(12.c)** Controller MUST verify after subagent completion:
  - `git -C <worktree> rev-parse --abbrev-ref HEAD`
  - `git branch --contains <commit_sha>`
  - Reject reviewer handoff if commit appears on unexpected branch.

**(13) fix-errors monitor mode**
- In `fix-errors`, new todo items trigger ordered background dispatch.
- Do not pause unless explicit blocking condition is hit.

### E. Verification, Feedback, and Completion

**(14) Feedback stage**
- Run when verification reports failure, ambiguity, or policy drift.
- Report gaps by severity with file/line evidence.
- Create remediation plan only when findings require follow-up work.

**(15) Post-plan completion**
- For each completed plan: verify -> feedback stage -> integration-to-base-branch gate -> stage only plan-related files -> delete plan file -> auto-commit (Conventional Commit).
- Exclude unrelated files and emit one-line hint per excluded file.
- Resolve base branch by auto-detecting `origin/HEAD` (fallback: repository default branch policy).
- Plan cleanup is forbidden before implementation commits are integrated into base branch (merge or cherry-pick), unless explicit `defer-integration` is set.
- `defer-integration` exception branch:
  - mark plan status as `implemented_not_integrated`
  - keep plan file (no cleanup)
  - do not run post-plan auto-commit/cleanup
  - report integration remains pending
- "Plan finish" means implementation commits are reachable from base branch; feature-branch-only commits are `implemented_not_integrated`, not finished.
- Required evidence before cleanup:
  - detected base branch name
  - implementation commit SHA(s) are reachable from base branch (`git branch --contains <sha>` includes base branch)
  - post-integration verification passes on base branch

**(16) Governance doc-only edits**
- For direct `$do` edits that are single-target, doc-only, low-risk:
  - auto-commit after verification
  - stage only required files.
- When the request includes edits in an external repo (outside the current workspace repo), finish by creating commits in each affected external repo after verification.

## AUQ Operational Rules (`ask-me`)

`do` decides **when** to invoke AUQ. `ask-me` defines **how** to ask.

`do` keeps only AUQ trigger conditions and hard gates. Question wording, options, batching, and templates are fully delegated to `ask-me`.

For the default `/do` chained stack (`brainstorming` + `grill-me`), treat **all** user prompts that would otherwise appear as chat questions as **`ask-me`** invocations (see Default `/do` invocation above).

- Trigger AUQ when a key decision is not finalized and cannot be derived from context.
- Mandatory AUQ gate before execution when unresolved decision carries high-cost side effects.
- Hard gate: pending feedback must be resolved through AUQ tooling before route execution.
- Even when only one clarification question is needed, use AUQ tooling instead of plain chat.
- Plan-complete execution-choice gate must use AUQ tooling (not plain chat).
- Governance/rule/process doc updates must use `ask-me` ordering contract.

## Planning Trigger Policy

- Planning is required for new features or non-obvious bugfixes with meaningful trade-offs.
- Straightforward fixes bypass spec/plan and go directly through `systematic-debugging`.
- Plan-execution intent is valid only if at least one is true:
  - user explicitly references plan/spec/todo artifact or asks to continue an existing plan
  - active subagents already belong to an existing plan execution
  - execution context already has unresolved selected plan artifact
- If not explicit, do not auto-promote to route (3.d).

## Task Status Listing (`~N`)

When invoked as `/do ~N` (for example, `/do ~5`), list the most recent N tasks. Default N = 10.

Use tasks performed in the current session as the source of truth; sort by `updated_at` descending; take top N. `in_progress` tasks from a previous session display as `interrupted`.

Output: compact table `N | title | status | updated_at`. Stop; do not route to execution.

| Session status | Display label |
|---|---|
| `in_progress` | ongoing (or `interrupted` if from prior session) |
| `completed` | done |
| `cancelled` | cancelled |
| `pending` | pending |

## Validation Matrix (Minimum)

Validate routing behavior with these checks:
- (3.a) `/do ~N` -> lists session-task status only
- (1) pending user feedback -> AUQ continuity gate runs before route selection/execution
- (3.f) straightforward bugfix/test-fix -> `systematic-debugging` direct execution
- (3.e) non-obvious feature/bugfix -> path B: `brainstorming` + `grill-me` + `ask-me` first
- (3.h) unclear fallback -> same path B stack as (3.e)
- default `/do` (no higher-priority hit) -> path B user questions only via `ask-me` (no plain-chat substitution)
- (3.c) explicit single-thread request -> `executing-plans`
- (3.b) `fix-errors` with non-empty todo -> direct `subagent-driven-development`
- (3.d) existing plan-execution intent + independent tasks -> `subagent-driven-development`
- (3.d) existing plan-execution intent + sequential tasks -> `executing-plans`
- routing decision table row coverage -> each active request path maps to exactly one first-hit rule
- (12.a) subagent on worktree branch -> `ensure_git_context.sh` passes before first write and before commit
- (12.b) subagent context mismatch -> task reports `BLOCKED` and does not write/commit
- (7) brainstorming user-review handoff -> includes "newly specified items since Q&A" summary, not path-only prompt
- AUQ governance flow -> follows `ask-me` question-order contract and templates
- AUQ trigger -> unresolved key decision (not finalized) is queried before execution
- mandatory AUQ gate -> unresolved high-cost key decision blocks execution until explicit AUQ answer
- AUQ pending-feedback gate -> unresolved feedback state is polled/handled via AUQ before execution
- (9) plan-complete execution choice -> `Subagent-Driven` vs `Inline Execution` is asked via AUQ (no plain chat choice prompt)
- (6) path B (3.e, 3.h) key decisions -> AUQ tool used (no plain-chat substitution)
- (6) path B approach choice -> A/B/C recommendation selected via AUQ
- (15) base-branch detection -> base branch auto-detected from `origin/HEAD` or repository policy fallback
- (15) post-plan cleanup gate -> cleanup is blocked when commits are not yet on base branch
- (15) defer-integration exception -> status set to `implemented_not_integrated` and cleanup skipped
- (15) plan finish definition -> feature-branch-only implementation is reported as `implemented_not_integrated`

## Execution Evidence Checklist

For each execution, capture route-aware evidence:
- selected route and why it matched first
- preflight result (`already_applied` or `action_required`) with command evidence
- executor used (`systematic-debugging`, `subagent-driven-development`, or `executing-plans`)
- AUQ usage and transitions (if any)
- verification commands and outcomes
- feedback stage result (`findings` or `no_findings`) and output path when applicable
- post-plan integration evidence (if cleanup requested): base branch detection, commit reachability from base branch, and verification on base branch
- defer-integration evidence (if used): explicit marker, pending-integration note, and skipped-cleanup rationale

## Minimal Verification Commands

Use these minimum commands when validating routing and post-plan gates:

- Detect base branch:
  - `git symbolic-ref --short refs/remotes/origin/HEAD | sed 's@^origin/@@'`
- Verify current branch:
  - `git rev-parse --abbrev-ref HEAD`
- Verify commit reachability from base branch:
  - `git branch --contains <commit_sha>`
- Verify pending workspace state before cleanup/commit:
  - `git status --short`
- Verify first-hit routing evidence (when needed):
  - capture request condition, matched row in routing decision table, and selected route in execution notes

## References

- [Ask Me Skill](../ask-me/SKILL.md)
- [Worktree Recovery](references/worktree-recovery.md)
