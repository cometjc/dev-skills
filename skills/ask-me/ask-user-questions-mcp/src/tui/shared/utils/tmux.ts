import { spawnSync } from "node:child_process";

const TMUX_LOCATION_PATTERN = /^[^:]+:[^\.]+\.[^\.]+$/;
const TMUX_LOCATION_FORMAT = "#{session_name}:#{window_index}.#{pane_index}";

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
  const location = runTmux(["display-message", "-p", "-t", pane, TMUX_LOCATION_FORMAT]);
  if (!location || !TMUX_LOCATION_PATTERN.test(location)) return null;
  return location;
}

interface TmuxClientSnapshot {
  tty: string;
  activity: number;
  location: string;
}

function parseTmuxClients(raw: string): TmuxClientSnapshot[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split("\t"))
    .filter((parts) => parts.length >= 3)
    .map((parts) => ({
      tty: parts[0] ?? "",
      activity: Number.parseInt(parts[1] ?? "0", 10) || 0,
      location: parts[2] ?? "",
    }))
    .filter(
      (entry) =>
        entry.tty.length > 0 &&
        entry.location.length > 0 &&
        TMUX_LOCATION_PATTERN.test(entry.location),
    );
}

function getMostActiveTmuxClient(): TmuxClientSnapshot | null {
  const raw = runTmux([
    "list-clients",
    "-F",
    "#{client_tty}\t#{client_activity}\t#{session_name}:#{window_index}.#{pane_index}",
  ]);
  if (!raw) return null;
  const clients = parseTmuxClients(raw);
  if (clients.length === 0) return null;
  clients.sort((a, b) => b.activity - a.activity);
  return clients[0] ?? null;
}

export function getCurrentAttachedTmuxLocation(): string | null {
  return getMostActiveTmuxClient()?.location ?? null;
}

export function isTmuxLocationReachable(location: string): boolean {
  if (!TMUX_LOCATION_PATTERN.test(location)) return false;
  const result = runTmux(["display-message", "-p", "-t", location, TMUX_LOCATION_FORMAT]);
  return Boolean(result);
}

export function selectTmuxLocation(location: string): boolean {
  const match = /^([^:]+):([^\.]+)\.(.+)$/.exec(location);
  if (!match) return false;
  const [, session, window, pane] = match;
  const client = getMostActiveTmuxClient();
  const switchArgs = client?.tty
    ? ["switch-client", "-c", client.tty, "-t", session]
    : ["switch-client", "-t", session];
  const switchResult = spawnSync("tmux", switchArgs, { stdio: "ignore" });
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
