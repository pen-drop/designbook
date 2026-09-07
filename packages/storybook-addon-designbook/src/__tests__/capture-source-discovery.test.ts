import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { resolveAllStages } from '../workflow-resolve.js';

const agents = resolve(process.cwd(), '../../.agents');
const template = resolve(agents, 'skills/designbook/skills/capture-reference/workflows/capture-reference.md');
describe('source integration capture discovery', () => {
  it.each(['website', 'figma', 'storybook'])(
    'assembles only the selected %s source and common outputs',
    async (source) => {
      const catalogue = await resolveAllStages(
        template,
        {
          data: '/tmp/source-discovery',
          technology: 'html',
          extensions: [source],
        },
        {},
        agents,
      );
      const blocks = Object.values(catalogue.step_resolved).flatMap((block) =>
        Array.isArray(block) ? block : [block],
      );
      expect(blocks.filter((block) => block.task_file.includes('/observe-')).map((block) => block.task_file)).toEqual([
        resolve(agents, `skills/designbook-${source}/tasks/observe-${source}.md`),
      ]);
      const publish = blocks.find((block) => block.task_file.endsWith('/publish-capture.md'))!;
      expect(Object.keys(publish.schema!.result).sort()).toEqual(['reference', 'reference_extract']);
      const screenshot = blocks.find((block) => block.task_file.endsWith('/capture-screenshot.md'))!;
      expect(screenshot.schema!.result.file!.validators).toEqual(['image']);
      expect(screenshot.schema!.result.file!.submission).toBe('direct');
    },
  );
});

it.each(['design-verify', 'sync-verify'])(
  '%s compares two published revisions without source or actual capture writers',
  async (workflow) => {
    const catalogue = await resolveAllStages(
      resolve(agents, `skills/designbook/skills/${workflow}/workflows/${workflow}.md`),
      { data: '/tmp/observation-verify', technology: 'html', extensions: ['storybook'] },
      {},
      agents,
    );
    expect(catalogue.step_resolved).toHaveProperty('compare-observations');
    for (const removed of ['setup-compare', 'ensure-baseline', 'ensure-baseline-live', 'capture', 'capture-backend'])
      expect(catalogue.step_resolved).not.toHaveProperty(removed);
    const blocks = Object.values(catalogue.step_resolved).flatMap((block) => (Array.isArray(block) ? block : [block]));
    for (const block of blocks) {
      expect(block.schema?.result).not.toHaveProperty('reference');
      expect(block.schema?.result).not.toHaveProperty('reference_extract');
      for (const [key, output] of Object.entries(block.schema?.result ?? {}))
        if (key !== 'diff') expect(output.path).toBeUndefined();
    }
  },
);

it.each(['repair', 'repair-config'])(
  '%s rechecks use frozen native source queries and explicit actual paths',
  async (workflow) => {
    const catalogue = await resolveAllStages(
      resolve(agents, `skills/designbook/skills/repair/workflows/${workflow}.md`),
      { data: '/tmp/repair-observations', technology: 'html', extensions: ['website', 'storybook'] },
      {},
      agents,
    );
    const entries = catalogue.step_resolved.compare!;
    const blocks = Array.isArray(entries) ? entries : [entries];
    const comparison = blocks.find((block) => block.task_file.endsWith('/compare-screenshots.md'))!;
    expect(comparison.schema!.params).toHaveProperty('reference_query');
    expect(comparison.schema!.params).toHaveProperty('actual_path');
    expect(comparison.schema!.params).not.toHaveProperty('reference_dir');
  },
);
