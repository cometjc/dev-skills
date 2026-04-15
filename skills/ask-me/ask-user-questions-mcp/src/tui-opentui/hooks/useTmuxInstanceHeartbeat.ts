import { useEffect, useMemo, useRef } from "react";

import type { TmuxInstanceState } from "../../tui/shared/types/tmux-instances.js";
import {
  computeFirstRenewDelayMs,
  computeHeartbeatSec,
  computeJitterMs,
  computeRenewDelayMs,
  computeTtlSec,
} from "../../tui/shared/utils/tmux-instance-constants.js";
import { upsertTmuxInstance } from "../../tui/shared/utils/tmux-instance-store.js";

interface UseTmuxInstanceHeartbeatArgs {
  enabled: boolean;
  instanceId: string;
  state: TmuxInstanceState;
  getLocation: () => string | null;
}

export function useTmuxInstanceHeartbeat({
  enabled,
  instanceId,
  state,
  getLocation,
}: UseTmuxInstanceHeartbeatArgs): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRunRef = useRef(true);

  const pid = useMemo(() => process.pid, []);

  useEffect(() => {
    let cancelled = false;

    const schedule = (delayMs: number) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        void tick();
      }, delayMs);
    };

    const tick = async () => {
      if (cancelled || !enabled) return;
      const location = getLocation();
      if (!location) {
        schedule(5000);
        return;
      }

      const now = Date.now();
      // First estimate uses 1; upsert response provides true active count.
      const estimatedH = computeHeartbeatSec(1);
      const estimatedTtl = computeTtlSec(estimatedH);
      const baseRecord = {
        instanceId,
        location,
        lastActiveAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        nextDueAt: new Date(now + computeFirstRenewDelayMs(estimatedH)).toISOString(),
        heartbeatHSec: estimatedH,
        ttlExpiresAt: new Date(now + estimatedTtl * 1000).toISOString(),
        state,
        pid,
      };

      const instances = await upsertTmuxInstance(baseRecord);
      const activeCount = Math.max(1, instances.length);
      const h = computeHeartbeatSec(activeCount);
      const ttlSec = computeTtlSec(h);
      const isFirst = firstRunRef.current;
      firstRunRef.current = false;
      const nextDelay =
        (isFirst ? computeFirstRenewDelayMs(h) : computeRenewDelayMs(h)) +
        computeJitterMs();

      await upsertTmuxInstance({
        ...baseRecord,
        updatedAt: new Date().toISOString(),
        nextDueAt: new Date(Date.now() + nextDelay).toISOString(),
        heartbeatHSec: h,
        ttlExpiresAt: new Date(Date.now() + ttlSec * 1000).toISOString(),
      });

      schedule(nextDelay);
    };

    if (enabled) {
      void tick();
    }

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    };
  }, [enabled, getLocation, instanceId, pid, state]);
}
