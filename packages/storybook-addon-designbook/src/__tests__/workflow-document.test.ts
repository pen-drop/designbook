import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDocument, validateDefinition, validateDocument, type WorkflowDefinition } from '../workflow-document.js';
import { saveDefinition, readDocument, startTask, completeTask, taskContext, blockTask } from '../workflow-store.js';

function definition(): WorkflowDefinition {
  return {
    id: 'vision',
    title: 'Define vision',
    template: { source: 'vision.md', content: 'Write the agreed vision.' },
    workspace_root: '/tmp',
    config: {},
    inputs: { audience: 'Owners' },
    inputs_schema: { type: 'object', required: ['audience'] },
    context: { rules: { source: 'rules.md', content: 'Use the agreed audience.' } },
    schemas: {},
    tasks: [
      {
        id: 'write',
        title: 'Write vision',
        target: 'vision',
        type: 'data',
        depends_on: [],
        params: {},
        params_schema: { type: 'object' },
        inputs: {},
        instructions: { source: 'task.md', content: 'Write vision.' },
        context: ['rules'],
        outputs: {
          vision: { required: true, schema: { type: 'string', minLength: 3 }, submission: 'data', validators: [] },
        },
      },
    ],
  };
}
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
async function setup(def = definition()) {
  const dir = await mkdtemp(join(tmpdir(), 'static-workflow-'));
  dirs.push(dir);
  const path = join(dir, 'workflow.yml');
  await saveDefinition(path, def);
  return path;
}

describe('static definition contract', () => {
  it('rejects incomplete structure before creating any tasks', () => {
    const def = definition();
    delete (def.tasks[0] as Partial<(typeof def.tasks)[0]>)!.target;
    expect(() => createDocument(def)).toThrow('Invalid workflow definition');
  });
  it('rejects duplicate IDs, unknown dependencies and cycles', () => {
    const def = definition();
    def.tasks.push(structuredClone(def.tasks[0]!));
    expect(() => validateDefinition(def)).toThrow('Duplicate');
    def.tasks.pop();
    def.tasks[0]!.depends_on = ['missing'];
    expect(() => validateDefinition(def)).toThrow('Unknown dependency');
    def.tasks[0]!.depends_on = ['write'];
    expect(() => validateDefinition(def)).toThrow('cycle');
  });
  it('rejects missing embedded context, unresolved targets and invalid params', () => {
    const def = definition();
    def.context = {};
    expect(() => validateDefinition(def)).toThrow('Unknown context');
    def.context = definition().context;
    def.tasks[0]!.target = '{{ component }}';
    expect(() => validateDefinition(def)).toThrow('unresolved');
    def.tasks[0]!.target = 'vision';
    def.tasks[0]!.params_schema = { required: ['audience'] };
    expect(() => validateDefinition(def)).toThrow('Invalid params');
  });
  it('rejects runtime expansion fields', () => {
    const def = { ...definition(), after: ['repair'] };
    expect(() => validateDefinition(def)).toThrow('Invalid workflow definition');
  });
  it('requires concrete absolute output paths before saving', () => {
    const def = definition();
    for (const path of ['designbook/vision.yml', '$DESIGNBOOK_DATA/vision.yml', '{{ data }}/vision.yml']) {
      def.tasks[0]!.outputs.vision!.path = path;
      expect(() => validateDefinition(def)).toThrow();
    }
    def.tasks[0]!.outputs.vision!.path = '/tmp/designbook/vision.yml';
    expect(() => validateDefinition(def)).not.toThrow();
  });
});

describe('fixed task lifecycle', () => {
  it('loads embedded instructions without reading provenance paths', async () => {
    const path = await setup();
    expect((await taskContext(path, 'write')).context[0]!.content).toBe('Use the agreed audience.');
  });
  it('leaves invalid results open and completes the same task after correction', async () => {
    const path = await setup();
    const before = (await readDocument(path)).definition;
    await startTask(path, 'write');
    await expect(completeTask(path, 'write', { vision: '' })).rejects.toThrow('validation failed');
    const failed = await readDocument(path);
    expect(failed.state.tasks.write!.status).toBe('in-progress');
    expect(failed.state.tasks.write!.errors).not.toEqual([]);
    await startTask(path, 'write', 'Expand vision to include the audience');
    const done = await completeTask(path, 'write', { vision: 'Vision for owners' });
    expect(done.state.status).toBe('completed');
    expect(done.state.tasks.write!.attempts).toBe(2);
    expect(done.definition).toEqual(before);
  });
  it('requires a corrective action to resume a recorded blockade', async () => {
    const path = await setup();
    await startTask(path, 'write');
    await blockTask(path, 'write', 'Missing reference', 'Checked the supplied reference path');
    await expect(startTask(path, 'write')).rejects.toThrow('corrective action');
    await startTask(path, 'write', 'Reference supplied at a new path');
    expect((await readDocument(path)).state.tasks.write!.corrections).toHaveLength(2);
  });
  it('preserves concurrent completions and exposes only declared predecessor results', async () => {
    const def = definition();
    def.tasks.push({ ...structuredClone(def.tasks[0]!), id: 'second' });
    def.tasks.push({
      ...structuredClone(def.tasks[0]!),
      id: 'third',
      depends_on: ['write', 'second'],
      inputs: { previous: { task: 'write', result: 'vision' } },
    });
    const path = await setup(def);
    await expect(startTask(path, 'third')).rejects.toThrow('Unfinished dependencies');
    await Promise.all(['write', 'second'].map((id) => startTask(path, id)));
    await Promise.all(['write', 'second'].map((id) => completeTask(path, id, { vision: id })));
    const doc = await readDocument(path);
    expect(doc.state.tasks.write!.status).toBe('done');
    expect(doc.state.tasks.second!.status).toBe('done');
    expect(doc.definition).toEqual(def);
    expect((await taskContext(path, 'third')).inputs.previous!.state!.value).toBe('write');
  });
  it('flushes file output only after all task results validate', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'workflow-output-'));
    dirs.push(dir);
    const def = definition();
    const file = join(dir, 'vision.yml');
    def.tasks[0]!.outputs.vision!.path = file;
    const path = await setup(def);
    await startTask(path, 'write');
    await expect(completeTask(path, 'write', { vision: '' })).rejects.toThrow();
    await expect(readFile(file)).rejects.toThrow();
    await completeTask(path, 'write', { vision: 'Owners' });
    expect(await readFile(file, 'utf8')).toContain('Owners');
  });
});

describe('completion and reference boundaries', () => {
  it('rejects a forged completed run without validated results', () => {
    const doc = createDocument(definition());
    doc.state.status = 'completed';
    expect(() => validateDocument(doc)).toThrow('completion state');
  });
  it('rejects predecessor references to an unknown output', () => {
    const def = definition();
    def.tasks.push({
      ...structuredClone(def.tasks[0]!),
      id: 'read',
      depends_on: ['write'],
      inputs: { source: { task: 'write', result: 'missing' } },
    });
    expect(() => validateDefinition(def)).toThrow('Unknown result');
  });
  it('rejects unresolved schema references before starting', () => {
    const def = definition();
    def.tasks[0]!.outputs.vision!.schema = { $ref: '#/definitions/Missing' };
    expect(() => validateDefinition(def)).toThrow();
  });
  it('validates a shared embedded schema without any schema source file', async () => {
    const def = definition();
    def.schemas.Word = { type: 'string', minLength: 3 };
    def.tasks[0]!.outputs.vision!.schema = { $ref: '#/definitions/Word' };
    const path = await setup(def);
    await startTask(path, 'write');
    await expect(completeTask(path, 'write', { vision: 'x' })).rejects.toThrow('validation failed');
    expect((await completeTask(path, 'write', { vision: 'Owners' })).state.status).toBe('completed');
  });
  it('does not replace an existing run during definition persistence', async () => {
    const path = await setup();
    await startTask(path, 'write');
    await expect(saveDefinition(path, definition())).rejects.toThrow();
    expect((await readDocument(path)).state.tasks.write!.status).toBe('in-progress');
  });
});

describe('artifact and verification contracts', () => {
  it('validates direct CSS as source text instead of interpreting it as YAML', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'workflow-css-'));
    dirs.push(dir);
    const file = join(dir, 'tokens.css');
    await writeFile(file, '@theme static { --color-primary: #4F46E5; }');
    const def = definition();
    def.tasks[0]!.outputs = {
      css: {
        required: true,
        schema: { type: 'string', minLength: 1 },
        path: file,
        submission: 'direct',
        validators: [],
      },
    };
    const path = await setup(def);
    await startTask(path, 'write');
    const done = await completeTask(path, 'write', {});
    expect(done.state.tasks.write!.results.css!.value).toContain('@theme static');
    expect(done.state.status).toBe('completed');
  });

  it.each([{ issues: [] }, { issues: [{ id: 'wrong-color', target: 'hero' }] }])(
    'finishes a check with issues %j without creating repair tasks',
    async ({ issues }) => {
      const def = definition();
      def.tasks[0]!.outputs = {
        issues: {
          required: true,
          schema: { type: 'array', items: { type: 'object', required: ['id', 'target'] } },
          submission: 'data',
          validators: [],
        },
      };
      const path = await setup(def);
      await startTask(path, 'write');
      const done = await completeTask(path, 'write', { issues });
      expect(done.definition).toEqual(def);
      expect(Object.keys(done.state.tasks)).toEqual(['write']);
      expect(done.state.status).toBe('completed');
      expect(done.state.tasks.write!.results.issues!.value).toEqual(issues);
    },
  );

  it('keeps an uncorrectable task blocked and its consumer pending', async () => {
    const def = definition();
    def.tasks.push({ ...structuredClone(def.tasks[0]!), id: 'consumer', depends_on: ['write'] });
    const path = await setup(def);
    await startTask(path, 'write');
    await expect(completeTask(path, 'write', { vision: '' })).rejects.toThrow();
    await blockTask(path, 'write', 'Source is unavailable', 'Checked the declared source and its access permissions');
    await expect(startTask(path, 'consumer')).rejects.toThrow('Unfinished dependencies');
    const blocked = await readDocument(path);
    expect(blocked.definition).toEqual(def);
    expect(blocked.state.status).toBe('blocked');
    expect(blocked.state.tasks.consumer!.status).toBe('pending');
    expect(blocked.state.tasks.write!.errors).not.toHaveLength(0);
  });
});

it('accepts ordered shared writers regardless of array order, but rejects sibling writers', () => {
  const def = definition();
  def.tasks[0]!.outputs.vision!.path = '/tmp/shared-output.yml';
  const parent = structuredClone(def.tasks[0]!);
  def.tasks = [{ ...structuredClone(parent), id: 'child-a', depends_on: ['write'] }, parent];
  expect(() => validateDefinition(def)).not.toThrow();
  def.tasks.push({ ...structuredClone(parent), id: 'child-b', depends_on: ['write'] });
  expect(() => validateDefinition(def)).toThrow('Unordered writers');
});

it('allows an absent optional direct output and discards prior optional submission on retry', async () => {
  const def = definition();
  def.tasks[0]!.outputs.optional = { required: false, schema: { type: 'string' }, submission: 'data', validators: [] };
  def.tasks[0]!.outputs.file = {
    required: false,
    schema: {},
    path: '/missing/static-workflow-optional.txt',
    submission: 'direct',
    validators: [],
  };
  const path = await setup(def);
  await startTask(path, 'write');
  await expect(completeTask(path, 'write', { vision: '', optional: 'previous' })).rejects.toThrow();
  const done = await completeTask(path, 'write', { vision: 'Owners' });
  expect(done.state.status).toBe('completed');
  expect(Object.keys(done.state.tasks.write!.results)).toEqual(['vision']);
});
