export type TmuxInstanceState = "idle" | "questioning" | "waiting";

export interface TmuxInstanceRecord {
  instanceId: string;
  location: string;
  lastActiveAt: string;
  updatedAt: string;
  nextDueAt: string;
  heartbeatHSec: number;
  ttlExpiresAt: string;
  state: TmuxInstanceState;
  pid: number;
}

export interface TmuxInstanceRegistry {
  version: 1;
  instances: Record<string, TmuxInstanceRecord>;
}
