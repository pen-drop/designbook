import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { loadConfig } from './config.js';

const WATCHER_AGGREGATE_MS = 250;

// Trigger file under $DESIGNBOOK_DATA. The addon's vite-plugin watches it and
// restarts the Vite dev server when it changes, which re-runs every plugin's
// `configureServer` hook — including Storybook's — and rebuilds the story
// index from scratch. Keeping the trigger inside $DESIGNBOOK_DATA means
// workflow flushes never touch the user's `.storybook/` directory.
const TRIGGER_BASENAME = '.workflow-trigger';

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
// subdirectories of a story-spec root are missed by that watcher. Writing this
// trigger file under $DESIGNBOOK_DATA tells the addon's vite-plugin to restart
// the Vite dev server, which re-creates the StoryIndexGenerator and re-globbies
// all story specs from scratch — picking up the new directories without
// touching the user's `.storybook/` config.
function triggerStorybookIndexRebuild(): void {
  try {
    const cfg = loadConfig();
    const dataDir = cfg.data;
    if (!dataDir || !existsSync(dataDir)) return;
    writeFileSync(resolve(dataDir, TRIGGER_BASENAME), String(Date.now()));
  } catch {
    /* best-effort — never fail a flush because of this */
  }
}
