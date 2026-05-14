import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';

const WATCHER_AGGREGATE_MS = 250;

export async function notifyWatcherAfterRename(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await delay(WATCHER_AGGREGATE_MS);
  for (const p of paths) {
    try {
      const content = readFileSync(p);
      writeFileSync(p, content);
    } catch {
      /* file may have been moved/deleted by another flush — skip */
    }
  }
}
