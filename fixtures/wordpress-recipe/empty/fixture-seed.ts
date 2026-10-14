import { rmSync } from 'node:fs';
import { join } from 'node:path';

// Start the recipe recording without the integration scaffold's demo content.
rmSync(join(process.argv[2], 'sections/demo'), { recursive: true, force: true });
for (const name of ['card', 'disclosure', 'plain']) {
  rmSync(join(process.argv[2], '../components', name), { recursive: true, force: true });
}
