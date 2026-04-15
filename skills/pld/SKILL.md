---
name: pld
description: Use when requests require multi-lane subagent execution with pld-tool as the single source of truth, or when /do routes independent execution to parallel-lane-dev.
---

# pld

Use this skill to run parallel-lane execution with strict state authority in `pld-tool` + SQLite, not chat text or ad-hoc markdown.

## When to use

- `/do` routes `fix-errors` or independent plan execution to PLD.
- User asks for `pld-go`, multi-lane dispatch, or lane-based subagent orchestration.
- You need deterministic `claim-assignment` / `report-result` flow across coder and reviewer subagents.

## Core principles

- Writable execution truth is only `.pld/executor.sqlite` via `pld-tool`.
- Main Agent is coordinator and the only actor that performs final integration/merge.
- `pld-coder` and `pld-reviewer` report state through `report-result`; they do not manage global routing policy.
- Do not treat chat, lane markdown, or scoreboard files as authoritative state.

## Command entrypoint

From repo root:

```bash
node skills/pld/scripts/pld-tool.cjs [--role coordinator|worker|coder|reviewer] <command> [options]
```

This skill vendors executable PLD scripts under `skills/pld/scripts/`.
Use `--project-root` when orchestrating another workspace.

## Roles and permissions

- `--role coordinator` (Main Agent): `import-plans`, `audit`, `go`, orchestration, integration decisions.
- `--role worker` / `--role coder` (implementer): `claim-assignment`, `report-result`, optional read-only `audit`.
- `--role reviewer` (review gate): `report-result`, optional read-only `audit`, no `claim-assignment`.

Default role is worker; coordinator must be explicit.

## Standard execution loop

1. Coordinator runs `import-plans` (if needed), then `audit --json`, then `go`.
2. For each dispatchable lane, provision/verify worktree before coder spawn.
3. Spawn `pld-coder` for one lane item, coder claims assignment, implements, verifies, reports result.
4. Spawn `pld-reviewer` for spec gate; if failed, coder fixes and a new reviewer re-runs gate.
5. Spawn `pld-reviewer` for quality gate; if failed, same fix/re-review loop.
6. After macro steps, coordinator batch-syncs with `audit --json` and refills next items.
7. Coordinator performs final merge/integration when policy gates are satisfied.

## Failure and escalation policy

- One active coder per lane item/worktree.
- Review always uses fresh reviewer subagent context.
- If the same lane fails spec/quality repeatedly, escalate via AUQ policy defined by `do`.
- Keep global throughput by continuing independent lanes while blocked slices wait for AUQ answers.

## Integration with `/do`

- `do` owns routing, AUQ gates, and governance evidence.
- `pld` owns lane execution mechanics and state transitions.
- For `/do` replacement mode, `3.b` and `3.d (independent)` should execute through this skill instead of legacy subagent-driven path.

## Bundled program files

- Runtime scripts: `skills/pld/scripts/`
  - `pld-tool.cjs`
  - `pld-tool-lib.cjs`
  - `pld-lib.cjs`
- Agent prompts: `skills/pld/agents/`
  - `pld-coder.md`
  - `pld-reviewer.md`
- Operating references: `skills/pld/spec/PLD/`
  - `communication.md`
  - `guardrails.md`
  - `operating-rules.md`

## Guardrails

- Never use chat or markdown as writable system state.
- Never let coder/reviewer perform final integration merge.
- Never run tight polling loops; batch around macro steps with `audit --json`.
- Never dispatch overlapping write sets to parallel coders.

## Minimal evidence checklist

- Route selection and why PLD path was chosen.
- `audit --json` snapshots before/after dispatch waves.
- `report-result` transitions for coder/spec/quality outcomes.
- Escalation events (if any) and AUQ session linkage.
- Final integration evidence by coordinator only.
