# Tmux Cross-Session Switching

AUQ OpenTUI supports cross-session tmux switching by tracking active AUQ TUI instances in a shared registry file.

## Registry

- Path: `~/.config/auq/tmux-instances.json`
- Optional override: `AUQ_TMUX_INSTANCES_PATH`
- Lock file: `<registry>.lock`

Each record stores:

- `instanceId`
- `location` (`session:window.pane`)
- `lastActiveAt`
- `updatedAt`
- `nextDueAt`
- `heartbeatHSec`
- `ttlExpiresAt`
- `state`
- `pid`

## Heartbeat Timing

Let `n` be active instance count:

- `g = clamp(60 / n, 3, 60)` seconds
- `h = n * g` seconds
- `TTL = 2 * h`
- First refresh: `h + 1.5s + jitter`
- Next refreshes: `h + jitter`
- `jitter` in `[0ms, 300ms]`

## Target Selection

When switching:

1. Use last-used AUQ location if reachable.
2. Otherwise choose newest reachable AUQ instance location from registry.
3. If nothing reachable, do not switch and keep current location.

Return-to-source behavior restores the previously attached location after question flow ends (if enabled).
