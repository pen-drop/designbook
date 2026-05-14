import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from './config.js';

// Trigger file under $DESIGNBOOK_DATA. The addon's vite-plugin watches it and
// restarts the Vite dev server when it changes, which re-runs every plugin's
// `configureServer` hook — including Storybook's — and rebuilds the story
// index from scratch. Keeping the trigger inside $DESIGNBOOK_DATA means the
// addon never touches the user's `.storybook/` directory.
const TRIGGER_BASENAME = '.workflow-trigger';

// Storybook's StoryIndexGenerator runs its own Watchpack and only watches
// directories that existed at startup. Files dropped into freshly-created
// subdirectories of a story-spec root are missed by that watcher. Call this
// after a stage flush has renamed stashed files to their final paths — it
// drops a timestamped trigger that makes the addon's vite-plugin restart Vite,
// which re-creates the StoryIndexGenerator and re-globbies all story specs.
export function signalStorybookRebuild(): void {
  try {
    const cfg = loadConfig();
    const dataDir = cfg.data;
    if (!dataDir || !existsSync(dataDir)) return;
    writeFileSync(resolve(dataDir, TRIGGER_BASENAME), String(Date.now()));
  } catch {
    /* best-effort — never fail a flush because of this */
  }
}
