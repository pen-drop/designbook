/**
 * Every shipping workflow template must plan into blocks an authoring agent can
 * lift straight into a workflow definition. The failure this guards is silent:
 * a `$ref` whose transitive definitions never reach the schemas map still
 * *resolves* at planning time and only explodes at `workflow done`, inside a run.
 */
import { describe, expect, it } from 'vitest';
import { globSync } from 'glob';
import { resolve } from 'node:path';
import { resolveAllStages, type ResolvedStep } from '../workflow-resolve.js';
import { schemaValidator, validateDefinition, type WorkflowDefinition } from '../workflow-document.js';
import type { DesignbookConfig } from '../config.js';

const agents = resolve(process.cwd(), '../../.agents');

/** A project that turns on every integration, so no step is filtered out unseen. */
const config = {
  data: '/tmp/planning-catalogue',
  technology: 'html',
  backend: 'drupal',
  'frameworks.component': 'sdc',
  'frameworks.css': 'tailwind',
  extensions: [],
} as unknown as DesignbookConfig;

const templates = globSync('skills/**/workflows/*.md', { cwd: agents, absolute: true }).sort();

/** Wrap one planned result schema in the smallest definition that carries it. */
function definitionFor(key: string, schema: object, definitions: Record<string, object>): WorkflowDefinition {
  return {
    id: 'contract',
    title: 'Planning contract',
    template: { source: 'contract.md', content: 'Contract probe.' },
    workspace_root: '/tmp',
    config: {},
    inputs: {},
    inputs_schema: { type: 'object' },
    context: {},
    schemas: definitions,
    tasks: [
      {
        step: 'write',
        id: 'probe',
        title: 'Probe',
        type: 'data',
        target: 'contract',
        depends_on: [],
        params: {},
        params_schema: { type: 'object' },
        inputs: {},
        instructions: { source: 'task.md', content: 'Probe.' },
        context: [],
        outputs: { [key]: { required: true, schema, submission: 'data', validators: [] } },
      },
    ],
  };
}

it('ships workflow templates', () => {
  expect(templates.length).toBeGreaterThan(15);
});

it('requires successful final build and browser evidence in the shared validation task', async () => {
  const catalogue = await resolveAllStages(
    resolve(agents, 'skills/designbook/skills/design-shell/workflows/design-shell.md'),
    config,
    {},
    agents,
  );
  const block = Object.values(catalogue.step_resolved)
    .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
    .find((entry) => entry.task_file.endsWith('/validate.md'))!;
  if (!block.schema) throw new Error('Validation task has no schema');
  expect(Object.keys(block.schema.result).sort()).toEqual(['build', 'checks']);
  const ajv = schemaValidator(block.schema.definitions);
  const build = ajv.compile({ $ref: block.schema.result.build!.$ref });
  expect(build({ command: 'pnpm build-storybook', cwd: '/app', exitCode: 1, stdout: 'build failed' })).toBe(false);
  const checks = ajv.compile({ $ref: block.schema.result.checks!.$ref });
  expect(checks([])).toBe(false);
  expect(checks([{ url: 'http://localhost/story', result: { ok: false }, observations: { header: 'missing' } }])).toBe(
    false,
  );
  expect(checks([{ url: 'http://localhost/story', result: { ok: true }, observations: {} }])).toBe(false);
  expect(checks([{ url: 'http://localhost/story', result: { ok: true }, observations: { header: 'visible' } }])).toBe(
    true,
  );
});

describe.each(templates.map((path) => [path.slice(agents.length + 1), path] as const))('%s', (_name, path) => {
  it('plans into definition-ready blocks', async () => {
    const catalogue = await resolveAllStages(path, config, {}, agents);
    const blocks = Object.values(catalogue.step_resolved).flatMap((entry) =>
      Array.isArray(entry) ? entry : [entry],
    ) as ResolvedStep[];
    // A template whose every step silently failed to resolve would pass vacuously.
    expect(blocks.length).toBeGreaterThan(0);

    for (const block of blocks) {
      if (!block.schema) continue;
      const definitions = block.schema.definitions;
      for (const [key, entry] of Object.entries(block.schema.result)) {
        const schema = entry.$ref ? { $ref: entry.$ref } : (entry as object);
        expect(
          () => validateDefinition(definitionFor(key, schema, definitions)),
          `${block.task_file} result "${key}"`,
        ).not.toThrow();
      }
    }
  });
});
