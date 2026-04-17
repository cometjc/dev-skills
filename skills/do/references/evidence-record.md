# Evidence Record Format

Normalized fields captured in execution notes for each `/do` run.

## Base checklist (all routes)

- first-hit route and why it matched
- preflight result (`already_applied` or `action_required`) with command evidence
- executor used (`systematic-debugging`, `pld`, or `executing-plans`)
- AUQ usage and transitions (if any)
- verification commands and outcomes
- feedback stage result (`findings` or `no_findings`) and output path when applicable
- post-plan integration evidence (if cleanup requested): base branch detection, commit reachability from base branch, verification on base branch
- defer-integration evidence (if used): explicit marker, pending-integration note, skipped-cleanup rationale

## PLD additions (when route is `pld`)

| Field | Values |
|---|---|
| `pld_route_hit` | `fix-errors` \| `plan-independent` |
| `auq_mode` | `blocking` \| `non_blocking` |
| `auq_session_id` | `<id>` when AUQ used |
| `blocked_slices` | `[slice_id...]` (empty when none) |
| `lane_escalation_event` | `{ "execution": "<id>", "lane": "<lane>", "reason": "<reason>" }` \| `none` |
| `resume_event` | `answered` \| `pending` \| `timeout` \| `none` |
| `dispatch_mode` | `auto` \| `streaming` \| `wave` |
| `scheduler_barrier` | `none` \| `wave_waiting` \| `mixed` |
| `user_interrupt_reason` | `auq_gate` \| `escalation` \| `all_blocked` \| `irreversible_action` \| `none` |
| `process_improvement_requested` | `yes` \| `no` |
| `process_improvement_option_selected` | `<option_id>` \| `none` |

## PLD validation scenarios

1. **fix-errors → PLD route**
   - Input: `/do fix-errors` with non-empty todo queue
   - Expected: first-hit `fix-errors`, executor = `pld`
   - Evidence: route match note + `audit --json` snapshot before first dispatch

2. **independent plan intent → PLD route**
   - Input: explicit continue-plan intent with independent tasks
   - Expected: first-hit `plan-independent`, executor = `pld`
   - Evidence: independence rationale + coordinator `go --json` output

3. **sequential plan intent → executing-plans**
   - Input: continue-plan intent with tightly coupled sequence
   - Expected: executor = `executing-plans`
   - Evidence: dependency rationale captured in route decision note

4. **non-blocking AUQ in PLD loop**
   - Trigger: high-cost decision during active PLD cycle
   - Expected: AUQ opened in non-blocking mode; only impacted slices blocked
   - Evidence: AUQ session id, blocked slice ids, proof ≥1 independent lane progressed

5. **AUQ answered → blocked slice restore**
   - Input: prior pending AUQ becomes answered
   - Expected: `get_answered_questions` consumed before next route action; blocked slices reattached
   - Evidence: answered payload summary + resumed lane ids + next `audit --json` delta

6. **lane escalation event handling**
   - Trigger: PLD emits lane escalation event per canonical contract
   - Expected: AUQ decision gate raised; affected slices blocked until resolution
   - Evidence: escalation event payload, escalation AUQ session id, post-decision action note
