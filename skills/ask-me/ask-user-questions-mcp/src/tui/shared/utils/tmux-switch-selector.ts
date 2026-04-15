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
  preferredLocation: string | null;
  lastUsedLocation: string | null;
  reachableLocations: string[];
}): string | null {
  const {
    currentLocation,
    preferredLocation,
    lastUsedLocation,
    reachableLocations,
  } = args;
  if (
    preferredLocation &&
    reachableLocations.includes(preferredLocation) &&
    (!currentLocation || preferredLocation !== currentLocation)
  ) {
    return preferredLocation;
  }
  if (
    lastUsedLocation &&
    reachableLocations.includes(lastUsedLocation) &&
    (!currentLocation || lastUsedLocation !== currentLocation)
  ) {
    return lastUsedLocation;
  }
  const fallback =
    reachableLocations.find((location) => !currentLocation || location !== currentLocation) ??
    null;
  if (!fallback) return null;
  return fallback;
}
