---
name: do
description: "Use when requests need governance routing across planning/debugging/execution workflows. WHEN: \"/do\", \"fix-errors\", \"route to brainstorming\", \"route to systematic-debugging\", \"choose executing-plans vs pld\"."
---

# Do

Route each request to one execution workflow with deterministic guardrails.

## Quick Start

1. Run AUQ continuity first if unanswered AUQ feedback exists.
2. Match the first row in the routing table and stop.
3. Run the selected workflow with required gates only.
4. Capture minimal evidence before completion.

## Routing Table (First Hit Wins)

| Condition | Route |
|---|---|
| Pending AUQ feedback exists | AUQ continuity gate, then re-evaluate |
| `/do ~N` | Task status listing only (stop) |
| Design intent is incomplete (spec completeness score < 4/5) | Spec clarification path |
| `fix-errors` with non-empty todo | `pld` |
| Explicit single-thread preference | `executing-plans` |
| Existing plan execution + independent tasks | `pld` |
| Existing plan execution + sequential/tightly-coupled tasks | `executing-plans` |
| Straightforward bugfix/test-fix | `systematic-debugging` |
| Multi-domain independent subproblems (`>=2`) | `dispatching-parallel-agents` |
| New feature / non-obvious bugfix / unclear scope | Spec clarification path |

## Route Semantics

- `/do <request>` default chain is `brainstorming` -> `grill-me` -> `ask-me`.
- Any higher-priority table hit overrides the default chain.
- During spec clarification path, user-facing questions must go through `ask-me`, not plain chat.
- Straightforward bugfix path bypasses spec/plan and executes via `systematic-debugging`.
- Under `/do`, any user confirmation/approval/choice prompt must use AUQ (`ask-me`) tooling.

## Spec Completeness Score

Score each request on 5 required fields (1 point each):

- objective is explicit
- constraints are explicit
- acceptance criteria are explicit
- risk/rollback boundary is explicit
- verification approach is explicit

Routing rule:

- score `< 4` -> treat as design intent incomplete -> route to spec clarification path
- score `>= 4` -> continue evaluating lower rows

### Fast examples

- "Add instruction_proposer + metric penalties" with no thresholds/acceptance -> `< 4` -> spec clarification
- "Change X to Y in file Z; pass test A and B; keep API unchanged" -> `>= 4` candidate

## Straightforward Bugfix (Narrow Definition)

A request is "straightforward bugfix/test-fix" only when **all** are true:

- scope is single file/function or tightly local
- failure signal is explicit and reproducible
- no strategy trade-off (single obvious fix path)
- no new behavior/governance/routing policy changes
- no cross-module side effects expected

If any item is false, do **not** use straightforward route; continue table matching (typically spec clarification).

## Spec Clarification Path

Use this path for new behavior, non-obvious bugfixes, and unclear scope.

1. `brainstorming`: design, spec write, review loop, user review.
2. `grill-me`: resolve key branches one-by-one.
3. `ask-me` hard gate:
   - unresolved key decision -> AUQ required
   - approach selection (A/B/C) -> AUQ required
   - high-cost decision before execution -> AUQ required
   - any user confirmation/approval prompt -> AUQ required
4. `writing-plans` only after spec approval.

## Plan and Execution Selection

- Plan complete but execution mode undecided (`PLD` vs `Inline`) -> ask via AUQ.
- Choose executor:
  - independent tasks -> `pld`
  - tightly coupled tasks -> `executing-plans`
  - explicit single-thread request always overrides to `executing-plans`

### PLD Dispatch Mode

- `auto` (default): choose `streaming` when async refill is safe, else `wave`.
- `streaming`: refill when slots free.
- `wave`: wait for wave barrier, then dispatch next wave.
- Mixed capability is allowed per lane; keep one canonical coordinator state.

### Quiet Autopilot

During PLD execution, do not interrupt per lane. Interrupt only for:

- AUQ high-cost decision gates
- lane escalation events
- all lanes blocked
- irreversible integration actions requiring confirmation

## Worktree and Git Context Gates

- Require `using-git-worktrees` before concurrent routes (`pld`, `dispatching-parallel-agents`).
- Subagents with assigned branch/worktree must run:
  - `scripts/ensure_git_context.sh --branch <expected_branch> --toplevel <expected_worktree_root>`
  - before first write and before commit
- If check fails, subagent reports `BLOCKED` and must not write/commit.

Controller validation after subagent completion (see [verification commands](references/verification-commands.md)):

- `git -C <worktree> rev-parse --abbrev-ref HEAD`
- `git branch --contains <commit_sha>`
- Reject reviewer handoff if commit appears on unexpected branch.

## fix-errors Monitor Mode

- For `/do fix-errors` with non-empty todo, route directly to `pld`.
- New todo items dispatch in order.
- Pause only on explicit blocking conditions.

## Completion Gates

For plan-based work:

1. Verify implementation.
2. Run feedback stage (findings or no_findings).
3. Ensure implementation commits are reachable from base branch (see [verification commands](references/verification-commands.md)).
4. Stage only plan-related files.
5. Delete plan file only after integration gate passes.
6. Auto-commit with Conventional Commits.

"Plan finish" means implementation commits are reachable from base branch; feature-branch-only commits are `implemented_not_integrated`, not finished.

`defer-integration` exception:

- mark status `implemented_not_integrated`
- skip cleanup and post-plan auto-commit
- report integration pending

### Post-cleanup process-improvement prompt (mandatory)

After cleanup completes for a `/do` execution, ask once via AUQ:

> "Do you want to run a `/do` process-improvement pass for this run?"

- **Yes** -> run focused improvement pass on this run's execution history: summarize friction points with evidence, propose 2-4 options (recommended first), confirm selected option(s) before editing `do`/`pld` governance docs.
- **No** -> end without additional process-rule edits.

## Governance Doc-only Edits

For low-risk, single-target doc-only `/do` governance edits:

- verify first
- stage only required files
- auto-commit

## AUQ Hard Rules

- AUQ continuity must run before any route when pending feedback exists.
- If one clarification is needed, still use AUQ tooling.
- Do not replace AUQ with plain chat in governed decision points.
- Do not use plain chat for any user confirmation/approval/choice under `/do`.
- During PLD, non-blocking AUQ should block only affected slices while independent lanes continue.

## Minimal Validation Matrix

- `/do ~N` lists only task status.
- pending AUQ feedback triggers AUQ continuity before route selection.
- design intent incomplete (score < 4/5) routes to spec clarification path before straightforward fix row.
- straightforward bugfix goes direct to `systematic-debugging`.
- straightforward route only applies when all narrow-definition checks pass.
- any user confirmation/approval/choice in `/do` flow uses AUQ (no plain-chat confirmation).
- new feature / non-obvious bugfix follows spec clarification path.
- explicit single-thread request routes to `executing-plans`.
- `fix-errors` with non-empty todo routes to `pld`.
- plan intent + independent tasks routes to `pld`; sequential routes to `executing-plans`.
- subagent git-context mismatch reports `BLOCKED` and prevents writes.
- plan completion cleanup is blocked when commits are not on base branch.

## Minimal Evidence Checklist

- first-hit route and why
- preflight result (`already_applied` or `action_required`)
- executor used
- AUQ session transitions (if any)
- verification command outcomes
- feedback stage result
- base-branch integration evidence for plan cleanup

For PLD-routed runs, also capture the normalized fields in [evidence-record.md](references/evidence-record.md).

## References

- [Ask Me Skill](../ask-me/SKILL.md)
- [PLD Skill](../pld/SKILL.md)
- [PLD canonical contract](../pld/spec/PLD/canonical-contract.md)
- [PLD command templates](references/pld-commands.md)
- [Verification commands](references/verification-commands.md)
- [Evidence record format](references/evidence-record.md)
- [Worktree Recovery](references/worktree-recovery.md)
