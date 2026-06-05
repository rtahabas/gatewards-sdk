import { ReplayStore } from "./types";

/** Prune expired entries once the store grows past this many jtis. */
const REPLAY_PRUNE_THRESHOLD = 1000;

/**
 * Default replay store: an in-process Map of jti → expiry (epoch ms).
 * Single-process — for multi-replica deployments inject a shared store.
 */
export function createInMemoryReplayStore(): ReplayStore {
  const seen = new Map<string, number>();
  return {
    claim(jti: string, expiresAtMs: number): boolean {
      const now = Date.now();
      const existing = seen.get(jti);
      if (existing !== undefined && existing > now) return false;
      seen.set(jti, expiresAtMs);
      if (seen.size > REPLAY_PRUNE_THRESHOLD) {
        for (const [key, exp] of seen) {
          if (exp <= now) seen.delete(key);
        }
      }
      return true;
    },
  };
}
