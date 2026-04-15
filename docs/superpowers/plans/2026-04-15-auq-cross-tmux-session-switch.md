# AUQ Cross-Tmux Session Switching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TUI-client-native cross-tmux-session switching so AUQ can toggle between current attached location and the most recent reachable AUQ instance location using shared instance metadata.

**Architecture:** Implement a TUI-side shared instance registry at `~/.config/auq/tmux-instances.json` with background lock-safe writes, adaptive heartbeats, and TTL eviction. Build a selector that chooses the latest reachable AUQ location when the last-used location disappears, then apply deterministic toggle behavior between current attached and target AUQ locations. Keep all switching logic in AUQ TUI runtime (not MCP server).

**Tech Stack:** TypeScript, Node.js fs/path APIs, OpenTUI renderer, tmux CLI integration, Vitest.

---

### Task 1: Add shared tmux-instance registry types and config constants

**Files:**
- Create: `skills/ask-me/ask-user-questions-mcp/src/tui/shared/types/tmux-instances.ts`
- Create: `skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/tmux-instance-constants.ts`
- Modify: `skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/index.ts`
- Test: `skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/__tests__/tmux-instance-constants.test.ts`

- [ ] **Step 1: Define registry record interfaces**

Add strongly typed interfaces for:
- `TmuxInstanceRecord` (`instanceId`, `location`, `lastActiveAt`, `updatedAt`, `nextDueAt`, `heartbeatHSec`, `ttlExpiresAt`, `state`, `pid`)
- `TmuxInstanceRegistry` (version + record map/list)
- helpers for `session:window.pane` parsing and normalization.

- [ ] **Step 2: Define heartbeat math constants/functions**

Implement pure functions:
- `computeGlobalGapSec(n): clamp(60/n, 3, 60)`
- `computeHeartbeatSec(n): n * globalGapSec`
- `computeTtlSec(h): 2 * h`
- `computeFirstRenewDelayMs(h): (h + 1.5)s`
- `computeRenewDelayMs(h): h s`
- `computeJitterMs(): [0,300]`.

- [ ] **Step 3: Add unit tests for formulas**

Cover samples:
- `n=1 -> g=60, h=60`
- `n=10 -> g=6, h=60`
- `n=60 -> g=3, h=180`
- TTL and delay calculations exactness.

- [ ] **Step 4: Run focused tests**

Run: `bun run test -- src/tui/shared/utils/__tests__/tmux-instance-constants.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add skills/ask-me/ask-user-questions-mcp/src/tui/shared/types/tmux-instances.ts skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/tmux-instance-constants.ts skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/index.ts skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/__tests__/tmux-instance-constants.test.ts
git commit -m "feat(auq): add tmux instance registry types and heartbeat math"
```

### Task 2: Implement lock-safe background registry store

**Files:**
- Create: `skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/tmux-instance-store.ts`
- Create: `skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/file-lock.ts`
- Modify: `skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/tmux.ts`
- Test: `skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/__tests__/tmux-instance-store.test.ts`

- [ ] **Step 1: Implement shared file path helpers**

Create helpers for:
- registry path `~/.config/auq/tmux-instances.json`
- lock path sibling (for example `.lock`)
- directory ensure logic.

- [ ] **Step 2: Implement non-blocking background write queue**

Add async writer queue:
- UI thread only enqueues updates.
- worker attempts lock acquisition and waits (strategy C) without blocking rendering path.
- serialize write operations and release lock safely in `finally`.

- [ ] **Step 3: Implement read/merge/prune operations**

Store API should include:
- `upsertInstance(recordPatch)`
- `removeExpired(now)`
- `listReachable(now)`
- stale cleanup based on `ttlExpiresAt`.

- [ ] **Step 4: Extend tmux utility coverage**

In `tmux.ts`, add helpers for:
- current attached location from `TMUX_PANE` command (`#S:#I.#P`)
- probing a `session:window.pane` reachability.

- [ ] **Step 5: Add store tests with lock contention**

Validate:
- concurrent enqueue order
- lock wait behavior (background)
- TTL pruning
- malformed JSON recovery path.

- [ ] **Step 6: Run focused tests**

Run: `bun run test -- src/tui/shared/utils/__tests__/tmux-instance-store.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/tmux-instance-store.ts skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/file-lock.ts skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/tmux.ts skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/__tests__/tmux-instance-store.test.ts
git commit -m "feat(auq): add lock-safe shared tmux instance store"
```

### Task 3: Add heartbeat scheduler to TUI runtime

**Files:**
- Modify: `skills/ask-me/ask-user-questions-mcp/src/tui-opentui/app.tsx`
- Create: `skills/ask-me/ask-user-questions-mcp/src/tui-opentui/hooks/useTmuxInstanceHeartbeat.ts`
- Test: `skills/ask-me/ask-user-questions-mcp/src/tui-opentui/hooks/__tests__/useTmuxInstanceHeartbeat.test.ts`

- [ ] **Step 1: Create heartbeat hook skeleton**

Hook inputs:
- current TUI state (`idle|questioning|waiting`)
- instance identity
- current location getter.

Outputs:
- `lastComputedHeartbeatSec`
- `lastRegistrySyncAt`
- optional diagnostics for toasts/logging.

- [ ] **Step 2: Implement first and recurring schedule semantics**

After each successful write:
- recompute `n`, `h`, `TTL`
- schedule next write at `h + 1.5 + jitter` if first
- then `h + jitter` for recurring updates.

- [ ] **Step 3: Ensure refresh-before-expiry**

Guard that each instance updates before its own `ttlExpiresAt`; if delayed by lock contention, re-enqueue immediate retry in background worker.

- [ ] **Step 4: Wire heartbeat hook into App lifecycle**

Invoke hook when TUI is in tmux; stop heartbeat cleanly on unmount; mark final heartbeat state where appropriate.

- [ ] **Step 5: Add scheduler tests**

Test:
- first delay formula
- recurring delay formula
- jitter bounds
- adaptive `h` updates as `n` changes.

- [ ] **Step 6: Run focused tests**

Run: `bun run test -- src/tui-opentui/hooks/__tests__/useTmuxInstanceHeartbeat.test.ts`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add skills/ask-me/ask-user-questions-mcp/src/tui-opentui/app.tsx skills/ask-me/ask-user-questions-mcp/src/tui-opentui/hooks/useTmuxInstanceHeartbeat.ts skills/ask-me/ask-user-questions-mcp/src/tui-opentui/hooks/__tests__/useTmuxInstanceHeartbeat.test.ts
git commit -m "feat(auq): add adaptive tmux instance heartbeat scheduling"
```

### Task 4: Implement cross-session toggle target selection

**Files:**
- Modify: `skills/ask-me/ask-user-questions-mcp/src/tui-opentui/app.tsx`
- Create: `skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/tmux-switch-selector.ts`
- Test: `skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/__tests__/tmux-switch-selector.test.ts`

- [ ] **Step 1: Implement selector policy functions**

Encode policy:
1. Prefer last-used AUQ location if reachable.
2. If missing, pick latest reachable AUQ instance location from shared list.
3. If none reachable, return no-target + reason.

- [ ] **Step 2: Implement toggle pair behavior**

Toggle pair:
- `currentAttachedLocation`
- `resolvedAuqLocation`  
Switch between them deterministically on user trigger and auto-switch path.

- [ ] **Step 3: Integrate with existing auto-switch/return flow**

Replace single-window assumptions with `session:window.pane` aware selection and switch calls.

- [ ] **Step 4: Add selector unit tests**

Cases:
- last-used reachable
- last-used missing but backup reachable
- all missing
- stale instance excluded by TTL.

- [ ] **Step 5: Run focused tests**

Run: `bun run test -- src/tui/shared/utils/__tests__/tmux-switch-selector.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add skills/ask-me/ask-user-questions-mcp/src/tui-opentui/app.tsx skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/tmux-switch-selector.ts skills/ask-me/ask-user-questions-mcp/src/tui/shared/utils/__tests__/tmux-switch-selector.test.ts
git commit -m "feat(auq): support cross-session tmux toggle target selection"
```

### Task 5: Update configuration and user-facing controls

**Files:**
- Modify: `skills/ask-me/ask-user-questions-mcp/src/config/types.ts`
- Modify: `skills/ask-me/ask-user-questions-mcp/src/config/defaults.ts`
- Modify: `skills/ask-me/ask-user-questions-mcp/src/cli/commands/config.ts`
- Modify: `skills/ask-me/ask-user-questions-mcp/src/tui-opentui/components/WaitingScreen.tsx`
- Modify: `skills/ask-me/ask-user-questions-mcp/src/tui-opentui/components/StepperView.tsx`
- Test: `skills/ask-me/ask-user-questions-mcp/src/cli/commands/__tests__/config.test.ts`
- Test: `skills/ask-me/ask-user-questions-mcp/src/tui-opentui/components/__tests__/StepperView.test.ts`

- [ ] **Step 1: Add config keys for shared-instance behavior**

Add keys for:
- enable/disable cross-session switching
- shared registry path override (optional)
- selector strategy mode (if needed).

- [ ] **Step 2: Extend CLI get/set coverage**

Ensure deep key paths are readable/writable and validated with helpful errors.

- [ ] **Step 3: Expose TUI toggles and hints**

Keep `W` toggles in waiting/question screens; update hint text to mention cross-session behavior when tmux is detected.

- [ ] **Step 4: Add/adjust tests**

Validate new config keys and keyboard behavior remain stable.

- [ ] **Step 5: Run focused tests**

Run: `bun run test -- src/cli/commands/__tests__/config.test.ts src/tui-opentui/components/__tests__/StepperView.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add skills/ask-me/ask-user-questions-mcp/src/config/types.ts skills/ask-me/ask-user-questions-mcp/src/config/defaults.ts skills/ask-me/ask-user-questions-mcp/src/cli/commands/config.ts skills/ask-me/ask-user-questions-mcp/src/tui-opentui/components/WaitingScreen.tsx skills/ask-me/ask-user-questions-mcp/src/tui-opentui/components/StepperView.tsx skills/ask-me/ask-user-questions-mcp/src/cli/commands/__tests__/config.test.ts skills/ask-me/ask-user-questions-mcp/src/tui-opentui/components/__tests__/StepperView.test.ts
git commit -m "feat(auq): add cross-session switch controls and config coverage"
```

### Task 6: End-to-end verification and docs

**Files:**
- Modify: `skills/ask-me/ask-user-questions-mcp/README.md`
- Create: `skills/ask-me/ask-user-questions-mcp/docs/tmux-cross-session.md`
- Test: `skills/ask-me/ask-user-questions-mcp/src/tui-opentui/__tests__/cross-session-switch.integration.test.ts`

- [ ] **Step 1: Document behavior and operations**

Document:
- shared registry path
- heartbeat math
- TTL semantics
- lock contention behavior
- cross-session target selection/fallback logic.

- [ ] **Step 2: Add integration test**

Simulate multi-instance registry and verify:
- selector picks last-used reachable
- fallback to newest reachable AUQ location
- no-target behavior when all stale/unreachable.

- [ ] **Step 3: Run full verification**

Run:
- `bun run typecheck:all`
- `bun run test`

Expected:
- no type errors
- all tests pass.

- [ ] **Step 4: Commit**

```bash
git add skills/ask-me/ask-user-questions-mcp/README.md skills/ask-me/ask-user-questions-mcp/docs/tmux-cross-session.md skills/ask-me/ask-user-questions-mcp/src/tui-opentui/__tests__/cross-session-switch.integration.test.ts
git commit -m "docs(auq): document cross-session tmux switching and verification"
```
