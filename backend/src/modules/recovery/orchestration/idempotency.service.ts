/**
 * ============================================================
 * M7.4 — RECOVERY ACTION IDEMPOTENCY SERVICE
 * ============================================================
 *
 * Ensures every recovery action execution is strictly idempotent:
 * - Deterministic idempotency key derivation
 * - Concurrent execution lock acquisition & release
 * - Cached response lookup for duplicate job retry prevention
 * ============================================================
 */

import crypto from "crypto";

export interface IdempotencyKeyPayload {
  merchantId: string;
  recoveryCaseId: string;
  decisionId: string;
  actionType: string;
  attemptNumber?: number;
}

export class IdempotencyService {
  private activeLocks: Map<string, number> = new Map();
  private cachedResults: Map<string, { result: unknown; expiresAt: number }> = new Map();

  /**
   * Derive a collision-resistant deterministic idempotency key.
   */
  public generateKey(payload: IdempotencyKeyPayload): string {
    const raw = [
      payload.merchantId,
      payload.recoveryCaseId,
      payload.decisionId,
      payload.actionType,
    ].join(":");

    const hash = crypto.createHash("sha256").update(raw).digest("hex").substring(0, 32);
    return `rec_act_idemp_${hash}`;
  }

  /**
   * Try to acquire an exclusive execution lock for an idempotency key.
   * Returns true if lock was acquired, false if already in-flight.
   */
  public async acquireLock(key: string, ttlMs = 60000): Promise<boolean> {
    const now = Date.now();
    const existingLockTime = this.activeLocks.get(key);

    if (existingLockTime && now < existingLockTime) {
      return false; // Already locked
    }

    this.activeLocks.set(key, now + ttlMs);
    return true;
  }

  /**
   * Release an active lock once execution completes.
   */
  public async releaseLock(key: string): Promise<void> {
    this.activeLocks.delete(key);
  }

  /**
   * Cache the execution result of an idempotent action.
   */
  public async cacheResult(key: string, result: unknown, ttlMs = 86400000): Promise<void> {
    const now = Date.now();
    this.cachedResults.set(key, {
      result,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Retrieve cached result if an action was already executed.
   */
  public async getCachedResult<T>(key: string): Promise<T | null> {
    const now = Date.now();
    const entry = this.cachedResults.get(key);

    if (!entry) {
      return null;
    }

    if (now > entry.expiresAt) {
      this.cachedResults.delete(key);
      return null;
    }

    return entry.result as T;
  }

  /**
   * Clear all internal locks and cache (useful for testing).
   */
  public clear(): void {
    this.activeLocks.clear();
    this.cachedResults.clear();
  }
}

export const idempotencyService = new IdempotencyService();
