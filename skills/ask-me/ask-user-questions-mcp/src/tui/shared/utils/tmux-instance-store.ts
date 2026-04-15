import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import type {
  TmuxInstanceRecord,
  TmuxInstanceRegistry,
} from "../types/tmux-instances.js";

function getRegistryPath(): string {
  return (
    process.env.AUQ_TMUX_INSTANCES_PATH ||
    path.join(os.homedir(), ".config", "auq", "tmux-instances.json")
  );
}

function getLockPath(): string {
  return `${getRegistryPath()}.lock`;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function ensureRegistryDir(): Promise<void> {
  await fs.mkdir(path.dirname(getRegistryPath()), { recursive: true });
}

async function acquireLock(): Promise<void> {
  await ensureRegistryDir();
  // Wait-until-acquired semantics; caller runs in background.
  for (;;) {
    try {
      const handle = await fs.open(getLockPath(), "wx");
      await handle.close();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function releaseLock(): Promise<void> {
  await fs.rm(getLockPath(), { force: true });
}

async function readRegistryUnsafe(): Promise<TmuxInstanceRegistry> {
  try {
    const raw = await fs.readFile(getRegistryPath(), "utf8");
    const parsed = JSON.parse(raw) as TmuxInstanceRegistry;
    if (parsed && parsed.version === 1 && parsed.instances) return parsed;
  } catch {
    // Fall through to fresh registry.
  }
  return { version: 1, instances: {} };
}

async function writeRegistryUnsafe(registry: TmuxInstanceRegistry): Promise<void> {
  await fs.writeFile(
    getRegistryPath(),
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8",
  );
}

export async function listReachableTmuxInstances(
  now = Date.now(),
): Promise<TmuxInstanceRecord[]> {
  const registry = await readRegistryUnsafe();
  return Object.values(registry.instances).filter(
    (entry) => Date.parse(entry.ttlExpiresAt) > now,
  );
}

export async function upsertTmuxInstance(
  record: TmuxInstanceRecord,
): Promise<TmuxInstanceRecord[]> {
  await acquireLock();
  try {
    const registry = await readRegistryUnsafe();
    const nowMs = Date.now();
    for (const [key, value] of Object.entries(registry.instances)) {
      if (Date.parse(value.ttlExpiresAt) <= nowMs) {
        delete registry.instances[key];
      }
    }
    registry.instances[record.instanceId] = record;
    await writeRegistryUnsafe(registry);
    return Object.values(registry.instances);
  } finally {
    await releaseLock();
  }
}

export async function markTmuxInstanceInactive(instanceId: string): Promise<void> {
  await acquireLock();
  try {
    const registry = await readRegistryUnsafe();
    if (registry.instances[instanceId]) {
      registry.instances[instanceId] = {
        ...registry.instances[instanceId],
        state: "idle",
        updatedAt: nowIso(),
      };
      await writeRegistryUnsafe(registry);
    }
  } finally {
    await releaseLock();
  }
}
