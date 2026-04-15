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
