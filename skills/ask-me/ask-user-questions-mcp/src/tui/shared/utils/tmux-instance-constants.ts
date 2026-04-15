export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeGlobalGapSec(instanceCount: number): number {
  if (instanceCount <= 0) return 60;
  return clamp(60 / instanceCount, 3, 60);
}

export function computeHeartbeatSec(instanceCount: number): number {
  const n = Math.max(1, instanceCount);
  return n * computeGlobalGapSec(n);
}

export function computeTtlSec(heartbeatSec: number): number {
  return 2 * heartbeatSec;
}

export function computeFirstRenewDelayMs(heartbeatSec: number): number {
  return Math.round((heartbeatSec + 1.5) * 1000);
}

export function computeRenewDelayMs(heartbeatSec: number): number {
  return Math.round(heartbeatSec * 1000);
}

export function computeJitterMs(): number {
  return Math.floor(Math.random() * 301);
}
