import { rmSync } from 'node:fs';
import { join } from 'node:path';

// The integration template's generic demo is not part of the Figma screen.
rmSync(join(process.argv[2], 'sections/demo'), { recursive: true, force: true });

for (const name of ['card', 'disclosure', 'plain']) {
  rmSync(join(process.argv[2], '../components', name), { recursive: true, force: true });
}
