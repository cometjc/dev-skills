# AUQ Runtime

## Intent
Define durable AUQ behavior for blocked execution slices while keeping `SKILL.md` concise.

## Minimal Contract
1. Submit AUQ prompt when route/strategy ambiguity is material.
2. Persist blocked slices with resumable metadata.
3. Continue independent slices while waiting.
4. Re-check pending/timeout sessions on execution triggers.
5. Resume blocked slices when an answer is available.

## Suggested Registry Shape

```json
{
  "entries": [
    {
      "question_id": "auq-001",
      "session_id": "sess-abc123",
      "blocked_slices": [
        { "plan_file": "docs/superpowers/plans/foo.md", "section": "## Step 3" }
      ],
      "status": "pending",
      "submitted_at": "2026-04-10T10:00:00Z",
      "last_checked_at": null,
      "consumed_at": null
    }
  ]
}
```

## Runtime States
- `RESUME_READY`: any answered entry not consumed
- `WAITING_AUQ`: any pending entry
- `PARTIAL_PROGRESS`: timeout entries with no resume-ready entries
- `RUNNING`: no active blocked states

## Timeout Guidance
- Mark timed-out sessions as `timeout`.
- Continue independent slices.
- Re-check timed-out sessions on normal execution triggers.

## Source of Truth
When AUQ MCP responses conflict with stale local assumptions, trust current MCP response semantics.
