# PLD Command Templates

Operational commands used when `/do` routes to `pld` (via `fix-errors` with non-empty todo, or plan-execution intent with independent tasks).

**Canonical vocabulary:** executor `report-result` statuses, lane phases, and review-gate ordering are defined only in [`pld/spec/PLD/canonical-contract.md`](../../pld/spec/PLD/canonical-contract.md) (not duplicated here). If this doc and the contract disagree, follow the contract and update this doc.

## PLD_TOOL_CMD setup

Set `PLD_TOOL_CMD` to the project-valid command first.

- bundled skill example: `PLD_TOOL_CMD="node skills/pld/scripts/pld-tool.cjs"`
- external PLD repo example: `PLD_TOOL_CMD="node /home/jethro/repo/agent/parallel-lane-dev-plugin/scripts/pld-tool.cjs"`

## Coordinator bootstrap (repo root)

- `$PLD_TOOL_CMD --role coordinator import-plans --json`
- `$PLD_TOOL_CMD --role coordinator audit --json`
- `$PLD_TOOL_CMD --role coordinator go --json`

## Coder lane cycle (per lane item)

- `$PLD_TOOL_CMD --role worker claim-assignment --execution <id> --lane "<Lane N>" --json`
- implement + verify in assigned worktree
- `$PLD_TOOL_CMD --role worker report-result --execution <id> --lane "<Lane N>" --status <status> --result-branch <branch> --verification-summary "<short summary>" --json`

If the environment still emits `--role coder`, treat `E_ROLE_ALIAS_REJECTED` as an auto-recoverable tooling mismatch and retry once with `--role worker` before escalating.

## Reviewer gate cycle (fresh reviewer subagent each gate)

For each review gate (spec compliance, then code quality), run `$PLD_TOOL_CMD --role reviewer report-result ...` using the **reviewer `--status` tokens** named in [`canonical-contract.md`](../../pld/spec/PLD/canonical-contract.md) (and accepted by this repo's `pld-tool` build). Put the human-readable PASS/FAIL rationale in `--verification-summary` / payload fields as required by your lane prompt — do **not** treat narrative "pass/fail" wording as a second canonical status system.

On fail: coder fixes and reports; then spawn a new reviewer for re-review.

## Batch synchronization cadence

- `streaming` mode: run `audit --json` at macro checkpoints and after each refill burst (not every single lane event).
- `wave` mode: run one `audit --json` at the end of each full wave and before launching the next wave.
- avoid tight polling loops; use scheduler snapshots for orchestration decisions.

## Escalation trigger

If PLD emits a lane escalation event (per [`canonical-contract.md`](../../pld/spec/PLD/canonical-contract.md) policy), raise AUQ escalation and mark affected slices blocked until recovery decision arrives.
