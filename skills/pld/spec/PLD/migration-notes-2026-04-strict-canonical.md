# PLD strict canonical migration (April 2026)

This note documents the **breaking** cut-over to a single canonical vocabulary for `pld-tool` **report-result** and related PLD governance docs.

## Breaking changes

- **No compatibility layer.** Older spellings and informal gate tokens are **not** accepted as `--status` values.
- **legacy payloads fail** validation immediately with `E_STATUS_INVALID` and do not write to `.pld/executor.sqlite`.

## What you must do

- Read **`skills/pld/spec/PLD/canonical-contract.md`** and use only the listed `--status` literals (for example **`READY_TO_COMMIT`** for implementer handoff, not ad-hoc aliases).
- Update any automation or prompts that still emit `spec_pass`, `quality_pass`, `PASS`/`FAIL` as if they were executor statuses.

## Verification

- Run `node --test skills/pld/scripts/__tests__/*.test.cjs` from the repo root.
- Prefer `pld-tool` JSON output for logs; SQLite remains the authority for lane state.
