import { spawnSync } from "node:child_process";

function runTmux(args: string[]): string | null {
  const result = spawnSync("tmux", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

export function isRunningInTmux(): boolean {
  return Boolean(process.env.TMUX);
}

export function getCurrentTmuxWindowId(): string | null {
  return runTmux(["display-message", "-p", "#{window_id}"]);
}

export function selectTmuxWindow(windowId: string): boolean {
  const result = spawnSync("tmux", ["select-window", "-t", windowId], {
    stdio: "ignore",
  });
  return result.status === 0;
}

export function getCurrentTmuxLocation(): string | null {
  const pane = process.env.TMUX_PANE;
  if (!pane) return null;
  return runTmux(["display-message", "-p", "-t", pane, "#{S}:#{I}.#{P}"]);
}

export function isTmuxLocationReachable(location: string): boolean {
  const result = runTmux(["display-message", "-p", "-t", location, "#{S}:#{I}.#{P}"]);
  return Boolean(result);
}

export function selectTmuxLocation(location: string): boolean {
  const match = /^([^:]+):([^\.]+)\.(.+)$/.exec(location);
  if (!match) return false;
  const [, session, window, pane] = match;
  const switchResult = spawnSync("tmux", ["switch-client", "-t", session], {
    stdio: "ignore",
  });
  if (switchResult.status !== 0) return false;
  const windowResult = spawnSync(
    "tmux",
    ["select-window", "-t", `${session}:${window}`],
    { stdio: "ignore" },
  );
  if (windowResult.status !== 0) return false;
  const paneResult = spawnSync(
    "tmux",
    ["select-pane", "-t", `${session}:${window}.${pane}`],
    {
      stdio: "ignore",
    },
  );
  return paneResult.status === 0;
}
