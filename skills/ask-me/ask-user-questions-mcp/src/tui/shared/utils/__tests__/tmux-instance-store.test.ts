import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

import {
  listReachableTmuxInstances,
  upsertTmuxInstance,
} from "../tmux-instance-store.js";

const testHome = path.join(process.cwd(), ".tmp-test-home");

const registryPath = path.join(
  testHome,
  ".config",
  "auq",
  "tmux-instances.json",
);

describe("tmux instance store", () => {
  beforeEach(async () => {
    process.env.AUQ_TMUX_INSTANCES_PATH = registryPath;
    await fs.rm(testHome, { recursive: true, force: true });
  });

  afterEach(async () => {
    delete process.env.AUQ_TMUX_INSTANCES_PATH;
    await fs.rm(testHome, { recursive: true, force: true });
  });

  it("upserts instance and returns reachable records", async () => {
    const now = Date.now();
    await upsertTmuxInstance({
      instanceId: "inst-1",
      location: "main:1.0",
      lastActiveAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      nextDueAt: new Date(now + 60000).toISOString(),
      heartbeatHSec: 60,
      ttlExpiresAt: new Date(now + 120000).toISOString(),
      state: "questioning",
      pid: process.pid,
    });

    const records = await listReachableTmuxInstances(now);
    expect(records).toHaveLength(1);
    expect(records[0].location).toBe("main:1.0");
    const persisted = JSON.parse(await fs.readFile(registryPath, "utf8")) as {
      instances: Record<string, { location: string }>;
    };
    expect(persisted.instances["inst-1"].location).toBe("main:1.0");
  });

  it("filters out expired records", async () => {
    const now = Date.now();
    await upsertTmuxInstance({
      instanceId: "expired",
      location: "old:2.0",
      lastActiveAt: new Date(now - 600000).toISOString(),
      updatedAt: new Date(now - 600000).toISOString(),
      nextDueAt: new Date(now - 500000).toISOString(),
      heartbeatHSec: 60,
      ttlExpiresAt: new Date(now - 1000).toISOString(),
      state: "idle",
      pid: process.pid,
    });
    await upsertTmuxInstance({
      instanceId: "alive",
      location: "new:3.0",
      lastActiveAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
      nextDueAt: new Date(now + 60000).toISOString(),
      heartbeatHSec: 60,
      ttlExpiresAt: new Date(now + 100000).toISOString(),
      state: "waiting",
      pid: process.pid,
    });

    const records = await listReachableTmuxInstances(now);
    expect(records.map((x) => x.instanceId)).toEqual(["alive"]);
  });
});
