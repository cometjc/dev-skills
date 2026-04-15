---
name: do
description: "Use when requests need governance routing across planning/debugging/execution workflows. WHEN: \"/do\", \"fix-errors\", \"route to brainstorming\", \"route to systematic-debugging\", \"choose executing-plans vs pld\"."
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
- pld
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
| `fix-errors` and todo non-empty | (3.b) | `pld` |
| Explicit single-thread preference | (3.c) | `executing-plans` |
| Existing plan-execution intent with independent tasks | (3.d) | `pld` |
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
- **(3.b)** `fix-errors` with non-empty todo -> `pld` (direct, no notify).
- **(3.c)** Explicit single-thread preference -> `executing-plans`.
- **(3.d)** Existing plan-execution intent:
  - active subagents -> continue `pld`
  - otherwise evaluate independence:
    - independent tasks -> `pld` (notify + start)
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
- If plan is complete and execution mode is undecided (`PLD` vs `Inline`), ask via AUQ.
- Do not ask this choice in plain chat.

### D. Execution Path

**(10) Executor selection**
- `systematic-debugging` route executes directly (no spec/plan generation).
- Plan-execution routes:
  - independent tasks -> `pld`
  - tightly coupled/sequential -> `executing-plans`
  - explicit single-thread preference always overrides to `executing-plans`
- `pld` start message:
  - _"Proceeding with pld execution. Stop me now if you need single-thread execution (executing-plans) to follow the details directly."_

**(10.a) PLD dispatch mode contract (`auto` / `streaming` / `wave`)**
- When route (3.b) or (3.d independent) selects `pld`, set `dispatch_mode` before first launch:
  - `auto` (default): detect executor/agent capability and choose `streaming` when safe, else `wave`.
  - `streaming`: asynchronous lane progression; refill immediately when a slot frees.
  - `wave`: batch-only progression; dispatch one wave, wait for all in-wave results, then schedule next wave.
- If capability is mixed, allow per-lane mixed execution in one run:
  - async-capable lanes keep `streaming`
  - barrier-constrained lanes stay `wave`
  - coordinator keeps one executor state surface (no split truth).
- Do not ask the user to choose dispatch mode unless a high-cost trade-off is unresolved; otherwise default to `auto`.

**(10.b) Quiet-autopilot (reduced user interruption)**
- During PLD execution, continue dispatch/review/refill without per-lane confirmation prompts.
- User-facing interruption is allowed only for:
  - AUQ high-cost decision gates
  - repeated lane failure escalation threshold
  - all lanes blocked / no safe dispatchable work
  - irreversible integration action requiring explicit confirmation by policy.
- For normal progress, emit concise progress snapshots instead of questions.

**(11) Worktree policy**
- Require `using-git-worktrees` before concurrent execution routes (`pld`, `dispatching-parallel-agents`).
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

### D1. PLD command templates (operational)

Use these templates when route (3.b) or (3.d independent) selects `pld`.

**Canonical vocabulary:** executor `report-result` statuses, lane phases, and review-gate ordering are defined only in `skills/pld/spec/PLD/canonical-contract.md` (not duplicated here). If this skill and the contract disagree, follow the contract and update this routing doc.

Set `PLD_TOOL_CMD` to the project-valid command first.

- bundled skill example: `PLD_TOOL_CMD="node skills/pld/scripts/pld-tool.cjs"`
- external PLD repo example: `PLD_TOOL_CMD="node /home/jethro/repo/agent/parallel-lane-dev-plugin/scripts/pld-tool.cjs"`

**Coordinator bootstrap (repo root)**
- `$PLD_TOOL_CMD --role coordinator import-plans --json`
- `$PLD_TOOL_CMD --role coordinator audit --json`
- `$PLD_TOOL_CMD --role coordinator go --json`

**Coder lane cycle (per lane item)**
- `$PLD_TOOL_CMD --role worker claim-assignment --execution <id> --lane "<Lane N>" --json`
- implement + verify in assigned worktree
- `$PLD_TOOL_CMD --role worker report-result --execution <id> --lane "<Lane N>" --status <status> --result-branch <branch> --verification-summary "<short summary>" --json`
- If the environment still emits `--role coder`, treat `E_ROLE_ALIAS_REJECTED` as an auto-recoverable tooling mismatch and retry once with `--role worker` before escalating.

**Reviewer gate cycle (fresh reviewer subagent each gate)**
- For each review gate (spec compliance, then code quality), run `$PLD_TOOL_CMD --role reviewer report-result ...` using the **reviewer `--status` tokens** named in `skills/pld/spec/PLD/canonical-contract.md` (and accepted by this repo’s `pld-tool` build). Put the human-readable PASS/FAIL rationale in `--verification-summary` / payload fields as required by your lane prompt — do **not** treat narrative “pass/fail” wording as a second canonical status system.
- on fail: coder fixes and reports; then spawn a new reviewer for re-review.

**Batch synchronization cadence**
- `streaming` mode: run `audit --json` at macro checkpoints and after each refill burst (not every single lane event).
- `wave` mode: run one `audit --json` at the end of each full wave and before launching the next wave.
- avoid tight polling loops; use scheduler snapshots for orchestration decisions.

**Escalation trigger**
- if the same lane reaches 3 consecutive review-gate failures (per `skills/pld/spec/PLD/canonical-contract.md`), raise AUQ escalation and mark affected slices blocked until recovery decision arrives.

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
- During `pld` execution, high-cost decisions should default to non-blocking AUQ and continue independent lanes; restore blocked slices when answers arrive.
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
- (3.b) `fix-errors` with non-empty todo -> direct `pld`
- (3.d) existing plan-execution intent + independent tasks -> `pld`
- (3.d) existing plan-execution intent + sequential tasks -> `executing-plans`
- routing decision table row coverage -> each active request path maps to exactly one first-hit rule
- (12.a) subagent on worktree branch -> `ensure_git_context.sh` passes before first write and before commit
- (12.b) subagent context mismatch -> task reports `BLOCKED` and does not write/commit
- (7) brainstorming user-review handoff -> includes "newly specified items since Q&A" summary, not path-only prompt
- AUQ governance flow -> follows `ask-me` question-order contract and templates
- AUQ trigger -> unresolved key decision (not finalized) is queried before execution
- mandatory AUQ gate -> unresolved high-cost key decision blocks execution until explicit AUQ answer
- AUQ pending-feedback gate -> unresolved feedback state is polled/handled via AUQ before execution
- (9) plan-complete execution choice -> `PLD` vs `Inline Execution` is asked via AUQ (no plain chat choice prompt)
- (6) path B (3.e, 3.h) key decisions -> AUQ tool used (no plain-chat substitution)
- (6) path B approach choice -> A/B/C recommendation selected via AUQ
- `pld` non-blocking AUQ -> pending answer blocks only affected slices while independent lanes keep running
- `pld` escalation policy -> same lane review-gate failures escalate after 3 consecutive failures (see `skills/pld/spec/PLD/canonical-contract.md`)
- `pld` dispatch mode `auto` -> selects `streaming` when async capability exists, else `wave`
- mixed-capability execution -> async lanes keep progressing while wave-constrained lanes wait at barrier
- quiet-autopilot -> no per-lane confirmation prompts during normal progression
- (15) base-branch detection -> base branch auto-detected from `origin/HEAD` or repository policy fallback
- (15) post-plan cleanup gate -> cleanup is blocked when commits are not yet on base branch
- (15) defer-integration exception -> status set to `implemented_not_integrated` and cleanup skipped
- (15) plan finish definition -> feature-branch-only implementation is reported as `implemented_not_integrated`

### Validation Scenarios (PLD-focused)

Use these concrete scenarios to validate route, AUQ continuity, and PLD recovery behavior.

1. **fix-errors -> PLD route**
   - Input: `/do fix-errors` with non-empty todo queue.
   - Expected: first-hit (3.b), executor = `pld`.
   - Evidence: route match note + `audit --json` snapshot before first dispatch.

2. **independent plan intent -> PLD route**
   - Input: explicit continue-plan intent with independent tasks.
   - Expected: first-hit (3.d independent), executor = `pld`.
   - Evidence: independence rationale + coordinator `go --json` output.

3. **sequential plan intent -> executing-plans**
   - Input: continue-plan intent with tightly coupled sequence.
   - Expected: first-hit (3.d sequential), executor = `executing-plans`.
   - Evidence: dependency rationale captured in route decision note.

4. **non-blocking AUQ in PLD loop**
   - Trigger: high-cost decision appears during active PLD cycle.
   - Expected: AUQ opened in non-blocking mode; only impacted slices blocked.
   - Evidence:
     - AUQ session id
     - blocked slice ids
     - proof at least one independent lane progressed while AUQ pending

5. **AUQ answered -> blocked slice restore**
   - Input: prior pending AUQ becomes answered.
   - Expected: `get_answered_questions` consumed before next route action; blocked slices reattached.
   - Evidence: answered payload summary + resumed lane ids + next `audit --json` delta.

6. **lane failure escalation at 3 consecutive failures**
   - Trigger: same lane fails consecutive review gates (per gate ordering in `skills/pld/spec/PLD/canonical-contract.md`).
   - Expected: attempts 1-2 remain auto-repair; attempt 3 escalates to AUQ decision gate.
   - Evidence:
     - lane failure counter trail (`attempt=1`, `attempt=2`, `attempt=3`)
     - escalation AUQ session id
     - post-decision action note (re-scope, pause, or recover path)

## Execution Evidence Checklist

For each execution, capture route-aware evidence:
- selected route and why it matched first
- preflight result (`already_applied` or `action_required`) with command evidence
- executor used (`systematic-debugging`, `pld`, or `executing-plans`)
- AUQ usage and transitions (if any)
- verification commands and outcomes
- feedback stage result (`findings` or `no_findings`) and output path when applicable
- post-plan integration evidence (if cleanup requested): base branch detection, commit reachability from base branch, and verification on base branch
- defer-integration evidence (if used): explicit marker, pending-integration note, and skipped-cleanup rationale

### Evidence Record Format (PLD additions)

For PLD-routed runs, add these normalized fields to execution notes:

- `pld_route_hit`: `3.b` or `3.d.independent`
- `auq_mode`: `blocking` or `non_blocking`
- `auq_session_id`: `<id>` when AUQ is used
- `blocked_slices`: `[slice_id...]` (empty when none)
- `lane_failure_counter`: `{ "<execution>/<lane>": <n> }`
- `resume_event`: `answered|pending|timeout|none`
- `dispatch_mode`: `auto|streaming|wave`
- `scheduler_barrier`: `none|wave_waiting|mixed`
- `user_interrupt_reason`: `auq_gate|escalation|all_blocked|irreversible_action|none`

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
- [PLD Skill](../pld/SKILL.md)
- [PLD canonical contract](../pld/spec/PLD/canonical-contract.md)
- [Worktree Recovery](references/worktree-recovery.md)
