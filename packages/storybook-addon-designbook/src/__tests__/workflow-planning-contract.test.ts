import { readFileSync } from 'node:fs';
import jsonata from 'jsonata';
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { resolveAllStages } from '../workflow-resolve.js';
import { schemaValidator } from '../workflow-document.js';
import { Command } from 'commander';
import { register } from '../cli/workflow.js';

// Exercise the actual shipping integration: a sparse extension must never erase
// the data-model field contract while its instructions are being frozen.
it('planning preserves base requirements through Drupal schema extensions', async () => {
  const agents = resolve(process.cwd(), '../../.agents');
  const workflow = resolve(agents, 'skills/designbook/skills/data-model/workflows/data-model.md');
  const catalogue = await resolveAllStages(
    workflow,
    { data: '/tmp/static-planning', technology: 'html', backend: 'drupal', extensions: [] },
    {},
    agents,
  );
  const raw = catalogue.step_resolved['create-data-model']!;
  const block = Array.isArray(raw) ? raw[0]! : raw;
  const ajv = schemaValidator(block.schema!.definitions);
  const validate = ajv.compile({ $ref: '#/definitions/DataModel' });
  expect(validate({ content: { node: { article: { fields: { body: { type: 'text' } } } } } })).toBe(true);
  expect(validate({ content: { node: { article: { fields: { body: { title: 'Missing type' } } } } } })).toBe(false);
  expect(validate({ content: [] })).toBe(false);
});

describe('static CLI surface', () => {
  it.each(['--plan', '--from-plan'])('rejects removed flag %s', async (flag) => {
    const program = new Command();
    program.exitOverride();
    program.configureOutput({ writeErr: () => {} });
    register(program);
    await expect(
      program.parseAsync([
        'node',
        'cli',
        'workflow',
        'create',
        'definition.yml',
        '--catalogue',
        'catalogue.json',
        '--output',
        'run.yml',
        flag,
      ]),
    ).rejects.toThrow('unknown option');
  });
  it('offers saved-path commands without task generators or lifecycle hooks', () => {
    const program = new Command();
    register(program);
    const names = program.commands[0]!.commands.map((command) => command.name());
    expect(names).toContain('instructions');
    expect(names).toContain('discover');
    expect(names).not.toContain('plan');
    expect(names).not.toContain('append');
    expect(names).not.toContain('after');
  });
});

it('shipping Tailwind normalizer produces executable JSONata for decimal CSS values', async () => {
  const source = readFileSync(
    resolve(process.cwd(), '../../.agents/skills/designbook-css-tailwind/blueprints/jsonata-template.md'),
    'utf8',
  );
  const normalizers = [...source.matchAll(/\$normalizeCssValue := function\(\$val\) \{[\s\S]*?\n\s*\};/g)];
  expect(normalizers).toHaveLength(3);
  for (const [normalizer] of normalizers) {
    const expression = jsonata('(' + normalizer + ' $normalizeCssValue(value))');
    expect(await expression.evaluate({ value: 'rgba(0, 0, 0, .5)' })).toBe('rgba(0, 0, 0, 0.5)');
    expect(await expression.evaluate({ value: '-.25' })).toBe('-0.25');
  }
});

it('component discovery includes domain rules and rejects story variants the renderer ignores', async () => {
  const agents = resolve(process.cwd(), '../../.agents');
  const workflow = resolve(agents, 'skills/designbook/skills/design-component/workflows/design-component.md');
  const catalogue = await resolveAllStages(
    workflow,
    {
      data: '/tmp/static-component',
      technology: 'html',
      backend: 'drupal',
      'frameworks.component': 'sdc',
      'frameworks.css': 'tailwind',
      extensions: [],
    },
    {},
    agents,
  );
  const raw = catalogue.step_resolved['write-component']!;
  const block = Array.isArray(raw) ? raw[0]! : raw;
  expect(block.rules.some((path) => path.endsWith('/component-styling.md'))).toBe(true);
  expect(block.blueprints.some((path) => path.endsWith('/component-template.md'))).toBe(true);
  const validate = schemaValidator(block.schema!.definitions).compile({ $ref: '#/definitions/SdcStory' });
  expect(validate({ component: 'test:avatar', props: { variant: 'small' } })).toBe(true);
  expect(validate({ component: 'test:avatar', variant: 'small' })).toBe(false);
});

it.each(['design-component', 'design-screen', 'design-shell', 'design-entity', 'import'])(
  '%s discovers complete scene writes with target-scoped constraints and shared validation',
  async (name) => {
    const agents = resolve(process.cwd(), '../../.agents');
    const catalogue = await resolveAllStages(
      resolve(agents, `skills/designbook/skills/${name}/workflows/${name}.md`),
      {
        data: '/tmp/static-write',
        technology: 'html',
        backend: 'drupal',
        'frameworks.component': 'sdc',
        'frameworks.css': 'tailwind',
        extensions: [],
      },
      {},
      agents,
    );
    expect(catalogue.step_resolved).not.toHaveProperty('create-component');
    expect(catalogue.step_resolved).not.toHaveProperty('create-scene');
    const refresh = catalogue.step_resolved['refresh-components'];
    expect(refresh).toBeDefined();
    for (const entry of Array.isArray(refresh) ? refresh : [refresh!]) {
      expect(entry.schema!.result.build!.$ref).toBe('#/definitions/StorybookBuild');
      expect(entry.schema!.result.index!.$ref).toBe('#/definitions/StorybookIndex');
    }
    if (name !== 'import') {
      const mapping = catalogue.step_resolved['map-entity'];
      expect(mapping).toBeDefined();
      for (const entry of Array.isArray(mapping) ? mapping : [mapping!]) {
        expect(entry.rules.filter((path) => path.endsWith('/entity-reference-rendering.md'))).toHaveLength(1);
      }
    }
    const raw = catalogue.step_resolved['write-scene'];
    expect(raw).toBeDefined();
    const block = Array.isArray(raw) ? raw[0]! : raw!;
    expect(block.task_file).toMatch(/\/write-scene\.md$/);
    expect(block.schema!.params.scene_name!.type).toBe('string');
    expect(block.schema!.params.scene_scope!.enum).toEqual(['screen', 'shell', 'standalone']);
    expect(block.schema!.result['scene-file']!.validators).toContain('scene');
    expect(block.schema!.result['scene-file']!.$ref).toBe('#/definitions/SceneFile');
    for (const rule of ['scenes-constraints', 'screen-scene-constraints', 'shell-scene-constraints']) {
      expect(block.rules.some((path) => path.endsWith(`/${rule}.md`))).toBe(true);
    }
    for (const scope of ['screen', 'shell']) {
      const path = block.rules.find((path) => path.endsWith(`/${scope}-scene-constraints.md`))!;
      expect(readFileSync(path, 'utf8')).toContain(`scene_scope = ${scope}`);
    }
  },
);
