import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The skill package bundled into this addon: `<pkg>/dist`, which holds
 * `skills/<name>/` after `build`. `null` when not built. Own module so tests can mock it.
 */
export function bundledSkillsRoot(): string | null {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  const root = join(dir, 'dist');
  return existsSync(join(root, 'skills')) ? root : null;
}
