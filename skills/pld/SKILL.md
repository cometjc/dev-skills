---
name: pld
description: Use when requests require multi-lane subagent execution with pld-tool as the single source of truth, or when /do routes independent execution to parallel-lane-dev.
---

# pld

Run parallel-lane execution with `pld-tool` + SQLite as the only writable state.

## Quick Start

1. Coordinator runs `import-plans` (if needed), `audit --json`, then `go`.
2. Worker claims one lane assignment, implements, verifies, reports result.
3. Reviewer gates run in order using fresh reviewer context.
4. Refill lanes by `dispatch_mode` (`auto`, `streaming`, `wave`).
5. Coordinator performs final integration only after gates pass.

## When to Use

- `/do` routes `fix-errors` or independent plan execution to PLD.
- User requests lane-based parallel dispatch (`pld-go` style).
- You need deterministic `claim-assignment` / `report-result` orchestration.

## Core Authority Rules

- Writable truth is `.pld/executor.sqlite`, mediated by `pld-tool`.
- Canonical status vocabulary is defined only in `spec/PLD/canonical-contract.md`.
- Chat text, markdown scoreboards, or ad-hoc notes are never authoritative state.
- Only coordinator can perform final integration/merge.

## Entrypoint

```bash
node skills/pld/scripts/pld-tool.cjs [--role coordinator|worker|reviewer] <command> [options]
```

Use `--project-root` when orchestrating another workspace.

## Roles

- `coordinator`: orchestration (`import-plans`, `audit`, `go`), integration decisions.
- `worker`: `claim-assignment`, implementation, `report-result`, optional read-only `audit`.
- `reviewer`: review gate `report-result`, optional read-only `audit`, no `claim-assignment`.

Default role is worker; coordinator must be explicit.

## Dispatch Modes

- `auto` (default): use `streaming` if async refill is safe, else `wave`.
- `streaming`: refill immediately when a slot is free.
- `wave`: dispatch by batch; wait for barrier before next batch.
- Mixed mode is allowed per lane while coordinator maintains one canonical state stream.

## Standard Execution Loop

1. Coordinator bootstrap:
   - `import-plans --json`
   - `audit --json`
   - `go --json`
2. For each dispatchable lane:
   - verify/provision worktree
   - spawn worker and claim assignment
   - implement + verify
   - worker `report-result`
3. Review gates:
   - first gate reviewer
   - if fail: worker fixes and reports, then fresh reviewer reruns gate
   - second gate reviewer with same retry pattern
4. Scheduler:
   - `streaming`: refill continuously when safe
   - `wave`: refill after wave barrier closes
5. Coordinator integrates after all policy gates pass.

## Failure and Escalation

- One active worker per lane item/worktree.
- Always use fresh reviewer context for each review gate.
- If repeated gate failures hit escalation threshold, raise escalation via `/do` AUQ policy.
- Keep throughput by continuing independent lanes while blocked slices wait.
- If async refill cannot run safely, degrade to `wave` automatically.

## `/do` Boundary

- `do` owns routing, AUQ gates, and governance evidence.
- `pld` owns lane mechanics and state transitions.
- `/do` routes `3.b` and `3.d (independent)` to this skill.

## Guardrails

- Never write state outside executor SQLite.
- Never allow worker/reviewer to perform final integration merge.
- Never run tight polling loops; batch around macro checkpoints with `audit --json`.
- Never dispatch overlapping write sets to parallel workers.

## Minimal Evidence Checklist

- why PLD route was selected
- chosen `dispatch_mode` and rationale
- `audit --json` snapshots before/after macro dispatch
- worker/reviewer `report-result` transitions
- escalation event linkage (if any)
- coordinator-only final integration evidence

## Bundled Files

- Runtime scripts: `skills/pld/scripts/`
  - `pld-tool.cjs`
  - `pld-tool-lib.cjs`
  - `pld-lib.cjs`
- Agent prompts: `skills/pld/agents/`
  - `pld-coder.md`
  - `pld-reviewer.md`
- Spec references: `skills/pld/spec/PLD/`
  - `canonical-contract.md`
  - `communication.md`
  - `guardrails.md`
  - `operating-rules.md`

## References

- [PLD canonical contract](spec/PLD/canonical-contract.md)
