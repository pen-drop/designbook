/**
 * DESIGNBOOK-51 (Ziel A) — the create path resolves the FULL workflow schema once and
 * persists it as `schema.yml` next to `tasks.yml`, and `workflow done` validates from that
 * single file.
 *
 * The consolidation witness is a definition-level enum-union (`widenDefinitionEnums`,
 * DESIGNBOOK-46) that lives on a shared definition referenced only through a NESTED `$ref`
 * from a NON-first step's task result — exactly the shape sync-to's `resolve-filter` has
 * (`units` items.$ref → ConfigNameUnit). Such a definition is never a top-level result key,
 * so result-key composition never reaches it; only the definition-level enum-union does.
 *
 * RED before the fix: the create path built only the FIRST task's schemas (`firstSchemas`)
 * and never persisted the full multi-step map — so no `schema.yml` exists, and the
 * non-first-step definition is never widened at create time.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
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

describe('DESIGNBOOK-51: create path persists a single schema.yml with the full, widened workflow schema', () => {
  let tmpRoot: string;
  let dataDir: string;
  let agentsDir: string;
  let previousCwd: string;
  const skill = 'sy-wf';

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'db51-schema-'));
    dataDir = join(tmpRoot, 'designbook');
    mkdirSync(dataDir, { recursive: true });
    agentsDir = join(tmpRoot, '.agents');
    writeFileSync(
      join(tmpRoot, 'designbook.config.yml'),
      dumpYaml({ designbook: { data: 'designbook' }, backend: 'drupal' }),
    );

    // Shared definition with a CLOSED enum, reached only through a nested items.$ref
    // from the SECOND step's result — the canonical widenDefinitionEnums target.
    mkdirSync(resolve(agentsDir, 'skills', skill), { recursive: true });
    writeFileSync(
      resolve(agentsDir, 'skills', skill, 'schemas.yml'),
      dumpYaml({
        Widget: {
          type: 'object',
          required: ['kind'],
          properties: { kind: { type: 'string', enum: ['a'] } },
        },
      }),
    );

    // Two-step single-stage workflow: `first` then `units`.
    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'wf.md'),
      { title: 'WF', stages: { execute: { steps: ['first', 'units'] } }, engine: 'direct' },
      '# wf',
    );

    // First step: a trivial data result (this is what the create path instantiates).
    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'first.md'),
      {
        trigger: { steps: ['first'] },
        result: { type: 'object', required: ['note'], properties: { note: { type: 'object' } } },
      },
      '# first',
    );

    // Second step: result `list` carries the Widget definition ONLY via a nested items.$ref.
    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'units.md'),
      {
        trigger: { steps: ['units'] },
        domain: ['units-domain'],
        result: {
          type: 'object',
          required: ['list'],
          properties: {
            list: {
              type: 'object',
              properties: {
                items: { type: 'array', items: { $ref: '../schemas.yml#/Widget' } },
              },
            },
          },
        },
      },
      '# units',
    );

    // Blueprint on the `units` step widens the shared Widget.kind enum via definition-level extends.
    writeMd(
      resolve(agentsDir, 'skills', skill, 'blueprints', 'widen-widget.md'),
      {
        type: 'widen',
        name: 'widen-widget',
        trigger: { domain: 'units-domain' },
        filter: { backend: 'drupal' },
        extends: { Widget: { properties: { kind: { enum: ['b'] } } } },
      },
      '# widen',
    );

    previousCwd = process.cwd();
    process.chdir(tmpRoot);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('writes schema.yml next to tasks.yml with the non-first step definition widened', async () => {
    const config = loadConfig();
    const created = await runWorkflowCreate({ workflow: 'wf' }, config);

    const changesDir = resolve(dataDir, 'workflows', 'changes', created.name);
    const schemaYmlPath = resolve(changesDir, 'schema.yml');

    // 1. The full workflow schema is persisted ONCE as schema.yml (not only in tasks.yml).
    expect(existsSync(schemaYmlPath)).toBe(true);

    const schemas = parseYaml(readFileSync(schemaYmlPath, 'utf-8')) as Record<
      string,
      { properties?: { kind?: { enum?: unknown[] } } }
    >;

    // 2. The definition reached only from the SECOND step is present and enum-widened
    //    (definition-level enum-union), even though the create path instantiates only the
    //    first task — the static full picture covers every step.
    expect(schemas.Widget).toBeDefined();
    expect(schemas.Widget?.properties?.kind?.enum).toEqual(['a', 'b']);

    // 3. Validation-from-there: registering schema.yml as the #/Type registry accepts the
    //    widened member and still rejects an unknown one — the widened enum is live.
    const ajv = new Ajv({ allErrors: true });
    for (const [name, def] of Object.entries(schemas)) {
      try {
        ajv.addSchema(def, `#/${name}`);
      } catch {
        /* dup */
      }
    }
    const validate = ajv.compile({ $ref: '#/Widget' });
    expect(validate({ kind: 'b' })).toBe(true);
    expect(validate({ kind: 'c' })).toBe(false);
  });
});
