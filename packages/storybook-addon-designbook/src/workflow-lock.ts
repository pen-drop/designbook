/**
 * Simple file-based locking for concurrent tasks.yml access.
 *
 * Uses a .lock file next to the target with retry/backoff.
 * Lock is advisory — prevents concurrent CLI processes from
 * corrupting tasks.yml during parallel subagent execution.
 */

import { existsSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';

const MAX_RETRIES = 10;
const BASE_DELAY_MS = 50;
const STALE_LOCK_MS = 30_000; // 30 seconds

/**
 * Acquire a lock file. Retries with exponential backoff.
 * Returns the lock file path (for release).
 */
export function acquireLock(filePath: string): string {
  const lockPath = `${filePath}.lock`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Check for stale lock
    if (existsSync(lockPath)) {
      try {
        const content = readFileSync(lockPath, 'utf-8');
        const lockTime = parseInt(content, 10);
        if (Date.now() - lockTime > STALE_LOCK_MS) {
          // Stale lock — remove it
          try {
            unlinkSync(lockPath);
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore read errors */
      }
    }

    try {
      // Try to create lock file exclusively (O_CREAT | O_EXCL via 'wx')
      writeFileSync(lockPath, String(Date.now()), { flag: 'wx' });
      return lockPath;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err; // unexpected error
      }
      // Lock exists — wait and retry with exponential backoff
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      const end = Date.now() + delay;
      while (Date.now() < end) {
        /* busy wait — short durations only */
      }
    }
  }

  throw new Error(
    `Failed to acquire lock on ${filePath} after ${MAX_RETRIES} attempts. ` +
      `Another process may be writing to this file.`,
  );
}

/**
 * Release a previously acquired lock.
 */
export function releaseLock(lockPath: string): void {
  try {
    unlinkSync(lockPath);
  } catch {
    // Lock already removed — OK
  }
}

/**
 * Execute a function while holding a file lock.
 * Ensures lock is released on both success and error.
 */
export function withLock<T>(filePath: string, fn: () => T): T {
  const lockPath = acquireLock(filePath);
  try {
    return fn();
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Execute an async function while holding a file lock.
 */
export async function withLockAsync<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const lockPath = acquireLock(filePath);
  try {
    return await fn();
  } finally {
    releaseLock(lockPath);
  }
}
