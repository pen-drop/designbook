import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { resolveIntakeContext } from '../workflow/intake-resolve.js';
import { interpolate } from '../shared/template/interpolate.js';
import type { DesignbookConfig } from '../shared/config.js';

const agents = resolve(process.cwd(), '../../.agents');
const config = {
  data: '/tmp/sync-to-contract',
  backend: 'wordpress',
  'frameworks.component': 'twig',
  extensions: [],
} as unknown as DesignbookConfig;

describe('sync-to transform contract', () => {
  it('takes one unit and renders its output path from it', async () => {
    const ctx = await resolveIntakeContext('sync-to', { agentsDir: agents, config });
    const transform = ctx.steps.find((s) => s.name === 'transform')!.tasks[0]!;
    expect((transform.params_schema as { required: string[] }).required).toContain('unit');
    const path = await interpolate(
      transform.outputs['output-file']!.path!,
      { sync_target_dir: '/w', unit: { name: 'post_type.recipe', path: 'plugins/x/post-types/recipe.php' } },
      { lenient: true },
    );
    expect(path).toBe('/w/plugins/x/post-types/recipe.php');
  });
});
