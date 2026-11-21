// Copies the shipped skills into dist/skills so the CLI loads them from its own package.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS = [
  'designbook',
  'designbook-drupal',
  'designbook-vue',
  'designbook-css-tailwind',
  'designbook-stitch',
  'designbook-wordpress',
  'designbook-figma',
];

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(pkg, '..', '..', '.agents', 'skills');
const dest = join(pkg, 'dist', 'skills');

rmSync(dest, { recursive: true, force: true });
for (const skill of SKILLS) {
  if (!existsSync(join(src, skill))) {
    console.error(`copy-skills: missing ${join(src, skill)}`);
    process.exit(1);
  }
  cpSync(join(src, skill), join(dest, skill), { recursive: true, dereference: true });
}
