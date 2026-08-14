/**
 * Regression (DESIGNBOOK-29): the `workflow create` result-schema resolver must
 * bundle a top-level-$ref result type's OWN transitive same-file refs into the
 * persisted schemas map, so `workflow done` can AJV-compile the result schema.
 *
 * Before the fix, runWorkflowCreate resolved `scene-file -> schemas.yml#/SceneFile`
 * but never pulled the sibling `#/SceneDef` (SceneFile.scenes.items.$ref) into
 * `data.schemas`; at `workflow done` AJV threw
 *   "can't resolve reference #/SceneDef from id #/SceneFile"
 * for every SceneFile result (shape-section create-scene-file, design-screen
 * create-scene). Payload-independent — thrown at schema compile.
 *
 * This drives the real runWorkflowCreate against a minimal fixture skill, then
 * compiles the persisted result schema exactly as validateResultEntry does.
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

describe("DESIGNBOOK-29: create-path bundles a SceneFile result type's sibling #/SceneDef", () => {
  let tmpRoot: string;
  let dataDir: string;
  let agentsDir: string;
  let previousCwd: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'db29-create-'));
    dataDir = join(tmpRoot, 'designbook');
    mkdirSync(dataDir, { recursive: true });
    agentsDir = join(tmpRoot, '.agents');
    writeFileSync(join(tmpRoot, 'designbook.config.yml'), dumpYaml({ designbook: { data: 'designbook' } }));

    const skill = 'scene-test';

    // Schema file: SceneFile references its sibling #/SceneDef, which references
    // #/SceneNode — mirrors scenes/schemas.yml's flat top-level sibling layout.
    mkdirSync(resolve(agentsDir, 'skills', skill), { recursive: true });
    writeFileSync(
      resolve(agentsDir, 'skills', skill, 'schemas.yml'),
      dumpYaml({
        SceneFile: {
          type: 'object',
          required: ['id', 'title'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            scenes: { type: 'array', items: { $ref: '#/SceneDef' } },
          },
        },
        SceneDef: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            items: { type: 'array', items: { $ref: '#/SceneNode' } },
          },
        },
        SceneNode: {
          type: 'object',
          required: ['component'],
          properties: { component: { type: 'string' } },
        },
      }),
    );

    // Workflow (direct engine, one stage/step) producing a SceneFile result.
    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'build-scene.md'),
      {
        title: 'Build Scene',
        stages: { execute: { steps: ['make-scene'] } },
        engine: 'direct',
      },
      '# build-scene',
    );
    // Task whose result is a top-level cross-file $ref to SceneFile.
    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'make-scene.md'),
      {
        trigger: { steps: ['make-scene'] },
        result: {
          type: 'object',
          required: ['scene-file'],
          properties: {
            'scene-file': { type: 'object', $ref: '../schemas.yml#/SceneFile' },
          },
        },
      },
      '# make-scene',
    );

    previousCwd = process.cwd();
    process.chdir(tmpRoot);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('persists SceneDef in data.schemas so the SceneFile result schema compiles + validates', async () => {
    const config = loadConfig();
    const created = await runWorkflowCreate({ workflow: 'build-scene' }, config);

    // Read back the persisted workflow file (resolved result schema) + the single schema map.
    const changesDir = resolve(dataDir, 'workflows', 'changes', created.name);
    const wf = parseYaml(readFileSync(resolve(changesDir, 'tasks.yml'), 'utf-8')) as {
      tasks: Array<{ result?: Record<string, { schema?: object }> }>;
    };

    // DESIGNBOOK-51: the validation schema map is the single schema.yml, not inline in tasks.yml.
    const schemas = parseYaml(readFileSync(resolve(changesDir, 'schema.yml'), 'utf-8')) as Record<string, object>;
    // The regression: without the fix, SceneDef (and SceneNode) are absent here.
    expect(Object.keys(schemas)).toEqual(expect.arrayContaining(['SceneFile', 'SceneDef', 'SceneNode']));

    const entrySchema = wf.tasks.find((t) => t.result?.['scene-file'])?.result?.['scene-file']?.schema;
    expect(entrySchema).toBeDefined();

    // Compile exactly like validateResultEntry (register each schema under #/<name>).
    const ajv = new Ajv({ allErrors: true });
    for (const [name, def] of Object.entries(schemas)) {
      try {
        ajv.addSchema(def, `#/${name}`);
      } catch {
        /* dup */
      }
    }
    // Must NOT throw "can't resolve reference #/SceneDef from id #/SceneFile".
    const validate = ajv.compile(entrySchema as object);

    // AC-3: a SceneFile with a non-empty scenes[] carrying a SceneDef validates.
    expect(
      validate({
        id: 'x',
        title: 'X',
        scenes: [{ name: 'hero', items: [{ component: 'designbook:card' }] }],
      }),
    ).toBe(true);
    // Payload-independent: empty scenes[] also compiles/validates.
    expect(validate({ id: 'x', title: 'X', scenes: [] })).toBe(true);
  });
});
