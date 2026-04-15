import type { TmuxInstanceRecord } from "../types/tmux-instances.js";

export function selectLatestReachableLocation(
  instances: TmuxInstanceRecord[],
): string | null {
  if (instances.length === 0) return null;
  const sorted = [...instances].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
  return sorted[0]?.location ?? null;
}

export function resolveAuqSwitchTarget(args: {
  currentLocation: string | null;
  lastUsedLocation: string | null;
  reachableLocations: string[];
}): string | null {
  const { currentLocation, lastUsedLocation, reachableLocations } = args;
  if (lastUsedLocation && reachableLocations.includes(lastUsedLocation)) {
    return lastUsedLocation;
  }
  const fallback = reachableLocations[0] ?? null;
  if (!fallback) return null;
  if (currentLocation && fallback === currentLocation) {
    return null;
  }
  return fallback;
}
