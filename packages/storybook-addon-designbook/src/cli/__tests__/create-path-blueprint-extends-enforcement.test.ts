/**
 * Regression (DESIGNBOOK-30): a blueprint `extends:` that injects a config type by
 * `$ref` must reach validation. The blueprint-extends merge is computed by
 * `resolveAllStages` into `step_resolved[step].schema`, but the create-path
 * (`runWorkflowCreate`) rebuilt the persisted `task.result[key].schema` from the
 * task's OWN frontmatter `$ref` and passed only `firstSchemas` — dropping the
 * extends merge and the extends-collected `$ref` definitions. At `workflow done`
 * the result validated against an un-extended schema with an empty `data.schemas`,
 * so `extends:` enforced nothing (affected every extends blueprint).
 *
 * This drives the real runWorkflowCreate against a minimal fixture skill whose
 * blueprint `extends:` the task result with a `$ref`'d, transitively-referencing
 * type, then compiles the persisted result schema exactly as validateResultEntry
 * does and checks it actually enforces.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import Ajv from 'ajv';
import { loadConfig } from '../../config.js';
import { runWorkflowCreate } from '../workflow.js';

function writeMd(filePath: string, fm: Record<string, unknown>, body = ''): void {
  mkdirSync(resolve(filePath, '..'), { recursive: true });
  writeFileSync(filePath, `---\n${dumpYaml(fm).trim()}\n---\n${body}`);
}

describe('DESIGNBOOK-30: create-path wires a blueprint extends: $ref into the validated result schema', () => {
  let tmpRoot: string;
  let dataDir: string;
  let agentsDir: string;
  let previousCwd: string;
  const skill = 'dm-ext';

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'db30-ext-'));
    dataDir = join(tmpRoot, 'designbook');
    mkdirSync(dataDir, { recursive: true });
    agentsDir = join(tmpRoot, '.agents');
    writeFileSync(
      join(tmpRoot, 'designbook.config.yml'),
      dumpYaml({ designbook: { data: 'designbook' }, backend: 'drupal' }),
    );

    // schemas.yml: Thing discriminated by `kind`, settings via transitive #/AChild → #/Base.
    mkdirSync(resolve(agentsDir, 'skills', skill), { recursive: true });
    writeFileSync(
      resolve(agentsDir, 'skills', skill, 'schemas.yml'),
      dumpYaml({
        Thing: {
          type: 'object',
          required: ['kind', 'settings'],
          properties: { kind: { type: 'string' }, settings: { type: 'object' } },
          oneOf: [{ required: ['settings'], properties: { kind: { const: 'a' }, settings: { $ref: '#/AChild' } } }],
        },
        AChild: { allOf: [{ $ref: '#/Base' }, { type: 'object', properties: { extra: { type: 'string' } } }] },
        Base: { type: 'object', properties: { base: { type: 'string' } } },
      }),
    );

    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'wf.md'),
      { title: 'WF', stages: { execute: { steps: ['mk'] } }, engine: 'direct' },
      '# wf',
    );
    // Task result 'dm' inline; config open (additionalProperties: true) — the blueprint adds the named prop.
    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'mk.md'),
      {
        trigger: { steps: ['mk'] },
        domain: ['data-model'],
        result: {
          type: 'object',
          required: ['dm'],
          properties: {
            dm: { type: 'object', properties: { config: { type: 'object', additionalProperties: true } } },
          },
        },
      },
      '# mk',
    );
    // Blueprint extends the 'dm' result with a $ref'd config type (mirrors block_plugin.md).
    writeMd(
      resolve(agentsDir, 'skills', skill, 'blueprints', 'inject.md'),
      {
        type: 'entity-type',
        name: 'inject',
        trigger: { domain: 'data-model' },
        filter: { backend: 'drupal' },
        extends: {
          dm: {
            properties: {
              config: {
                properties: { thing: { type: 'object', additionalProperties: { $ref: '../schemas.yml#/Thing' } } },
              },
            },
          },
        },
      },
      '# inject',
    );

    previousCwd = process.cwd();
    process.chdir(tmpRoot);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('persists the extended schema + collected $ref defs so the result enforces the injected type', async () => {
    const config = loadConfig();
    const created = await runWorkflowCreate({ workflow: 'wf' }, config);

    const tasksPath = resolve(dataDir, 'workflows', 'changes', created.name, 'tasks.yml');
    const wf = parseYaml(readFileSync(tasksPath, 'utf-8')) as {
      schemas?: Record<string, object>;
      tasks: Array<{ result?: Record<string, { schema?: object }> }>;
    };

    // 1. The blueprint extends must have reached the persisted result schema.
    const dmSchema = wf.tasks.find((t) => t.result?.dm)?.result?.dm?.schema as
      | { properties?: { config?: { properties?: Record<string, unknown> } } }
      | undefined;
    expect(dmSchema?.properties?.config?.properties?.thing).toBeDefined();

    // 2. The extends-collected transitive $ref defs must be persisted for AJV.
    const schemas = wf.schemas ?? {};
    expect(Object.keys(schemas)).toEqual(expect.arrayContaining(['Thing', 'AChild', 'Base']));

    // 3. Compile exactly like validateResultEntry and check it ENFORCES.
    const ajv = new Ajv({ allErrors: true });
    for (const [name, def] of Object.entries(schemas)) {
      try {
        ajv.addSchema(def, `#/${name}`);
      } catch {
        /* dup */
      }
    }
    const validate = ajv.compile(dmSchema as object);

    // Valid: a well-formed `thing` entry passes.
    expect(validate({ config: { thing: { good: { kind: 'a', settings: { base: 'x', extra: 'y' } } } } })).toBe(true);
    // Enforced: missing required `settings` is rejected (proves the injected type is live).
    expect(validate({ config: { thing: { bad: { kind: 'a' } } } })).toBe(false);
  });
});
