import { describe, expect, it, vi } from "vitest";

import {
  computeFirstRenewDelayMs,
  computeGlobalGapSec,
  computeHeartbeatSec,
  computeJitterMs,
  computeRenewDelayMs,
  computeTtlSec,
} from "../tmux-instance-constants.js";

describe("tmux instance timing constants", () => {
  it("computes expected global gap and heartbeat", () => {
    expect(computeGlobalGapSec(1)).toBe(60);
    expect(computeHeartbeatSec(1)).toBe(60);

    expect(computeGlobalGapSec(10)).toBe(6);
    expect(computeHeartbeatSec(10)).toBe(60);

    expect(computeGlobalGapSec(60)).toBe(3);
    expect(computeHeartbeatSec(60)).toBe(180);
  });

  it("computes ttl and delay windows", () => {
    expect(computeTtlSec(60)).toBe(120);
    expect(computeFirstRenewDelayMs(60)).toBe(61500);
    expect(computeRenewDelayMs(60)).toBe(60000);
  });

  it("returns jitter between 0 and 300ms", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(computeJitterMs()).toBe(0);
    vi.spyOn(Math, "random").mockReturnValue(0.9999);
    expect(computeJitterMs()).toBe(300);
    vi.restoreAllMocks();
  });
});
