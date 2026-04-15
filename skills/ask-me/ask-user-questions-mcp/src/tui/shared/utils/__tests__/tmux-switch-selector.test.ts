import { describe, expect, it } from "vitest";

import {
  resolveAuqSwitchTarget,
  selectLatestReachableLocation,
} from "../tmux-switch-selector.js";

describe("tmux switch selector", () => {
  it("uses last used location when still reachable", () => {
    const target = resolveAuqSwitchTarget({
      currentLocation: "main:1.0",
      lastUsedLocation: "dev:3.1",
      reachableLocations: ["dev:3.1", "ops:2.0"],
    });
    expect(target).toBe("dev:3.1");
  });

  it("falls back to latest reachable location", () => {
    const target = resolveAuqSwitchTarget({
      currentLocation: "main:1.0",
      lastUsedLocation: "stale:9.0",
      reachableLocations: ["ops:2.0"],
    });
    expect(target).toBe("ops:2.0");
  });

  it("returns null when fallback equals current location", () => {
    const target = resolveAuqSwitchTarget({
      currentLocation: "main:1.0",
      lastUsedLocation: null,
      reachableLocations: ["main:1.0"],
    });
    expect(target).toBeNull();
  });

  it("selects newest updated instance location", () => {
    const target = selectLatestReachableLocation([
      {
        instanceId: "a",
        location: "s1:1.0",
        lastActiveAt: "2026-04-15T10:00:00.000Z",
        updatedAt: "2026-04-15T10:00:00.000Z",
        nextDueAt: "2026-04-15T10:01:00.000Z",
        heartbeatHSec: 60,
        ttlExpiresAt: "2026-04-15T10:02:00.000Z",
        state: "idle",
        pid: 1,
      },
      {
        instanceId: "b",
        location: "s2:2.0",
        lastActiveAt: "2026-04-15T10:00:05.000Z",
        updatedAt: "2026-04-15T10:00:05.000Z",
        nextDueAt: "2026-04-15T10:01:05.000Z",
        heartbeatHSec: 60,
        ttlExpiresAt: "2026-04-15T10:02:05.000Z",
        state: "questioning",
        pid: 2,
      },
    ]);
    expect(target).toBe("s2:2.0");
  });
});
