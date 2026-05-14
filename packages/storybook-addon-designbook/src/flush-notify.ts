import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { loadConfig } from './config.js';

const WATCHER_AGGREGATE_MS = 250;

// Addon-owned file inside the Storybook config directory. Storybook's
// `watchConfig` callback invalidates the entire story index whenever a file
// under configDir whose basename starts with `preview` changes. The filename
// deliberately does NOT match Storybook's preview-module auto-load pattern
// (`preview.{js,ts,jsx,tsx,mjs,cjs}`), so this file is never imported by
// Storybook — it only exists as a watcher trigger.
const INDEX_TRIGGER_BASENAME = 'preview.designbook-trigger';

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
// subdirectories of a story-spec root are missed by that watcher. Forcing
// `invalidateAll()` re-globbies every story spec from scratch and picks up
// the new directories.
function triggerStorybookIndexRebuild(): void {
  try {
    const cfg = loadConfig();
    const home = (cfg['designbook.home'] as string | undefined) ?? cfg.data;
    if (!home) return;
    const configDir = resolve(home, '.storybook');
    if (!existsSync(configDir)) return;
    const triggerPath = resolve(configDir, INDEX_TRIGGER_BASENAME);
    writeFileSync(triggerPath, String(Date.now()));
  } catch {
    /* best-effort — never fail a flush because of this */
  }
}
