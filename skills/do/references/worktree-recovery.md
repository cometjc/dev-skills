# Worktree Recovery

## Pre-flight Before `git worktree add`
1. Run `git worktree prune`.
2. If target path exists but is not a valid git dir, remove leftover path.

## Failure Diagnosis

### Case A: "already exists"
- Meaning: path is already a valid worktree (often for another branch).
- Action: pick a new path, or remove existing worktree if safe.

### Case B: "branch already checked out"
- Meaning: branch is active in another worktree.
- Action: locate with `git worktree list`; reuse or remove that worktree.

### Case C: other errors
- Capture full error.
- Attempt one targeted fix.
- If unresolved, escalate via AUQ with fallback options.

## Safety Notes
- Never apply destructive git cleanup without explicit safety checks.
- Prefer deterministic remediation over repeated retries.
