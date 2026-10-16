// Copies the Designbook-generated TSX components byte-for-byte (default: the committed
// react-storybook fixture; COMPONENTS_DIR overrides, e.g. a debo-test workspace) and
// fails when any copied source differs from its origin.
import { cpSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const src = resolve(process.env.COMPONENTS_DIR ?? '../../../../fixtures/react-storybook/design-component/components');
const dest = resolve('components');
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true, filter: (p) => statSync(p).isDirectory() || p.endsWith('.tsx') });
for (const dir of readdirSync(dest)) {
  for (const file of readdirSync(join(dest, dir))) {
    if (!readFileSync(join(src, dir, file)).equals(readFileSync(join(dest, dir, file)))) {
      throw new Error(`changed source: ${dir}/${file}`);
    }
  }
}
console.log(`synced unchanged TSX from ${src}`);
