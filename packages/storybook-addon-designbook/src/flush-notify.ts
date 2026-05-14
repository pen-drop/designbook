import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { loadConfig } from './config.js';

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
  triggerStorybookIndexRebuild();
}

// Storybook's StoryIndexGenerator runs its own Watchpack and only watches
// directories that existed at startup. Files dropped into freshly-created
// subdirectories of a story-spec root are missed by that watcher.
// Watch events on any file under the Storybook configDir whose basename
// starts with `preview` call `invalidateAll()`, which re-globbies all
// story specs from scratch. Rewriting `preview.js`'s own content with itself
// triggers that path without changing behaviour.
function triggerStorybookIndexRebuild(): void {
  try {
    const cfg = loadConfig();
    const home = (cfg['designbook.home'] as string | undefined) ?? cfg.data;
    if (!home) return;
    const previewPath = resolve(home, '.storybook', 'preview.js');
    if (!existsSync(previewPath)) return;
    writeFileSync(previewPath, readFileSync(previewPath));
  } catch {
    /* best-effort — never fail a flush because of this */
  }
}
