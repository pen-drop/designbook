import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { resolveAllStages } from '../workflow-resolve.js';
import { definitionSchemaFor } from '../workflow-document.js';

const agents = resolve(process.cwd(), '../../.agents');
const template = resolve(agents, 'skills/designbook/skills/extract-reference/workflows/extract-reference.md');

function observeTaskFile(source: string) {
  return source === 'figma'
    ? resolve(agents, `skills/designbook-${source}/tasks/observe-${source}.md`)
    : resolve(agents, `skills/designbook/design/tasks/observe-${source}.md`);
}

function observeRuleFile(source: string) {
  return source === 'figma'
    ? resolve(agents, `skills/designbook-${source}/rules/capture-observations.md`)
    : resolve(agents, `skills/designbook/design/rules/${source}-capture-observations.md`);
}
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
      const observed = [...new Set(['website', 'storybook', source])].sort();
      expect(
        blocks
          .filter((block) => block.task_file.includes('/observe-'))
          .map((block) => block.task_file)
          .sort(),
      ).toEqual(observed.map((name) => observeTaskFile(name)).sort());
      const website = blocks.find((block) => block.task_file.endsWith('/observe-website.md'))!;
      expect(website.rules).toContain(observeRuleFile('website'));
      expect(website.rules.some((rule) => rule.endsWith('/cli-surface.md'))).toBe(true);
      expect(website.rules.some((rule) => rule.endsWith('/playwright-capture.md'))).toBe(false);
      const storybook = blocks.find((block) => block.task_file.endsWith('/observe-storybook.md'))!;
      expect(storybook.rules).toContain(observeRuleFile('storybook'));
      expect(storybook.rules.some((rule) => rule.endsWith('/playwright-capture.md'))).toBe(false);
      const publish = blocks.find((block) => block.task_file.endsWith('/publish-capture.md'))!;
      expect(Object.keys(publish.schema!.result).sort()).toEqual(['reference']);
      const screenshot = blocks.find((block) => block.task_file.endsWith('/capture-image.md'))!;
      expect(screenshot.schema!.result.file!.validators).toEqual(['image']);
      expect(screenshot.schema!.result.file!.submission).toBe('direct');
      expect(definitionSchemaFor(Object.keys(catalogue.step_resolved)).required).toContain('capture');
    },
  );
});

describe('discover step subset', () => {
  it.each(['intake', 'not-a-step'])('rejects a step that is not in the workflow file: %s', async (step) => {
    await expect(
      resolveAllStages(
        template,
        { data: '/tmp/source-discovery', technology: 'html', extensions: [] },
        {},
        agents,
        undefined,
        { steps: [step] },
      ),
    ).rejects.toThrow(/not in the workflow file/);
  });
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

it.each([
  { label: 'two enabled integrations', extensions: ['website', 'storybook'], expected: ['website', 'storybook'] },
  {
    label: 'configured extension objects',
    extensions: [{ id: 'website' }, { id: 'storybook' }],
    expected: ['website', 'storybook'],
  },
  {
    label: 'all enabled integrations',
    extensions: ['website', 'figma', 'storybook'],
    expected: ['website', 'figma', 'storybook'],
  },
  { label: 'disabled source integrations', extensions: ['unrelated', 'other'], expected: ['website', 'storybook'] },
  { label: 'empty enabled list', extensions: [], expected: ['website', 'storybook'] },
])('capture filters intersect list-valued configuration: $label', async ({ extensions, expected }) => {
  const catalogue = await resolveAllStages(
    template,
    { data: '/tmp/source-multiple-discovery', technology: 'html', extensions },
    {},
    agents,
  );
  const blocks = Object.values(catalogue.step_resolved).flatMap((block) => (Array.isArray(block) ? block : [block]));
  expect(
    blocks
      .filter((block) => block.task_file.includes('/observe-'))
      .map((block) => block.task_file)
      .sort(),
  ).toEqual(expected.map((source) => observeTaskFile(source)).sort());
  for (const source of expected) {
    const block = blocks.find((block) => block.task_file.endsWith(`/observe-${source}.md`))!;
    expect(block.rules).toContain(observeRuleFile(source));
  }
});

it('tokens consumes the standalone extracted revision without an extraction task', async () => {
  const catalogue = await resolveAllStages(
    resolve(agents, 'skills/designbook/skills/tokens/workflows/tokens.md'),
    { data: '/tmp/token-extraction', technology: 'html', extensions: ['website'] },
    {},
    agents,
  );
  expect(catalogue.step_resolved).not.toHaveProperty('extract-reference');
});
