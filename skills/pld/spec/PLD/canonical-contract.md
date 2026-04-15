# PLD Canonical Contract (strict)

This file is the **single vocabulary** for `pld-tool` **report-result** statuses and related governance text in this repo. Tools and prompts should cite this file instead of duplicating or inventing alternate spellings.

## Report-result statuses (canonical)

Only these exact strings are accepted by `pld-tool report-result --status`:

- `RUNNING`
- `BLOCKED`
- `READY_TO_COMMIT`
- `READY_FOR_REVIEW`
- `DONE`
- `FAILED`
- `CANCELLED`

Implementers typically finish verified work with **`READY_TO_COMMIT`** so the coordinator can create the lane-item commit. Reviewers use **`READY_FOR_REVIEW`**, **`DONE`**, **`FAILED`**, or **`BLOCKED`** per coordinator workflow.

## Role ACL (summary)

- **coordinator:** `import-plans`, `audit`, `go`, `claim-assignment`, `report-result`
- **worker / coder:** `audit`, `claim-assignment`, `report-result`
- **reviewer:** `audit`, `report-result` (never `claim-assignment`)

Details live in `skills/pld/spec/PLD/operating-rules.md` and the `pld-tool.cjs` role matrix.

## Lane phase mapping (executor projection)

Executor `lanes.phase` is derived from the last canonical **report-result** status (see `skills/pld/scripts/pld-tool-lib.cjs`). It is a projection for scheduling, not an alternate vocabulary for `--status`.
