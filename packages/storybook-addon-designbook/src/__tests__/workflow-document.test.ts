import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dump, load } from 'js-yaml';
import { createHash } from 'node:crypto';
import {
  createDocument,
  definitionSchemaFor,
  validateDefinition,
  validateDocument,
  workflowDefinitionSchema,
  type WorkflowDefinition,
  type WorkflowDocument,
} from '../workflow-document.js';
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
    context: {
      instruction: { source: 'task.md', content: 'Write vision.' },
      rules: { source: 'rules.md', content: 'Use the agreed audience.' },
    },
    schemas: {},
    tasks: [
      {
        step: 'write',
        id: 'write',
        title: 'Write vision',
        target: 'vision',
        type: 'data',
        depends_on: [],
        params: {},
        params_schema: { type: 'object' },
        inputs: {},
        instructions: 'instruction',
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
  it('requires PNG outputs to use direct submission, an empty schema and image validation', () => {
    const def = definition();
    const output = def.tasks[0]!.outputs.vision!;
    Object.assign(output, { path: '/tmp/capture.png', submission: 'direct', schema: {}, validators: ['image'] });
    expect(() => validateDefinition(def)).not.toThrow();
    output.schema = { type: 'string' };
    expect(() => validateDefinition(def)).toThrow('PNG output');
    output.schema = {};
    output.submission = 'data';
    expect(() => validateDefinition(def)).toThrow('PNG output');
    output.submission = 'direct';
    output.validators = [];
    expect(() => validateDefinition(def)).toThrow('PNG output');
  });

  it('stores PNG file identity without embedding binary contents into workflow state', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'workflow-png-'));
    dirs.push(dir);
    const file = join(dir, 'capture.png');
    const bytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
      'base64',
    );
    await writeFile(file, bytes);
    const def = definition();
    def.tasks[0]!.outputs = {
      image: { required: true, path: file, submission: 'direct', schema: {}, validators: ['image'] },
    };
    const path = await setup(def);
    await startTask(path, 'write');
    const doc = await completeTask(path, 'write', {});
    expect(doc.state.tasks.write!.results.image!.valid).toBe(true);
    expect(doc.state.tasks.write!.results.image!.value).toBeNull();
    expect(doc.state.tasks.write!.results.image!.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(await readFile(path, 'utf8')).not.toContain('PNG');
  });

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
  it('requires a capture block when tasks include capture steps', () => {
    const def = definition();
    def.tasks[0]!.step = 'publish-capture';
    expect(() => validateDefinition(def)).toThrow('Capture workflow requires a capture block');
    def.tasks[0]!.step = 'observe-website';
    expect(() => validateDefinition(def)).toThrow('Capture workflow requires a capture block');
    def.tasks[0]!.step = 'capture-file';
    expect(() => validateDefinition(def)).toThrow('Capture workflow requires a capture block');
  });
  it('keeps capture optional on non-capture workflows', () => {
    expect(() => validateDefinition(definition())).not.toThrow();
  });
  it('marks capture required in the discover schema only for capture steps', () => {
    expect(definitionSchemaFor(['create-tokens']).required).toEqual(workflowDefinitionSchema.required);
    expect(definitionSchemaFor(['publish-capture']).required).toContain('capture');
    expect(definitionSchemaFor(['observe-website', 'capture-image']).required).toContain('capture');
  });
});

describe('fixed task lifecycle', () => {
  it('loads embedded instructions without reading provenance paths', async () => {
    const path = await setup();
    expect((await taskContext(path, 'write')).context.rules!.content).toBe('Use the agreed audience.');
  });
  it('preserves literal source baselines in embedded context while keeping structural inputs concrete', async () => {
    const def = definition();
    const twig = '<div{{ attributes.addClass(["avatar"]) }}>{{ label }}</div>';
    def.context.baseline = { source: '/tmp/components/avatar/avatar.twig', content: twig };
    def.tasks[0]!.context.push('baseline');
    def.tasks[0]!.params = { component_id: 'theme:avatar', source_path: '/tmp/components/avatar/avatar.twig' };
    const path = await setup(def);
    expect(
      Object.values((await taskContext(path, 'write')).context).find((entry) => entry?.content === twig),
    ).toBeDefined();
    expect((await readDocument(path)).definition).toEqual(def);
    def.inputs.source = twig;
    expect(() => validateDefinition(def)).toThrow('unresolved');
  });
  it('leaves invalid results open and completes the same task after correction', async () => {
    const path = await setup();
    const before = (await readDocument(path)).definition;
    await startTask(path, 'write');
    await expect(completeTask(path, 'write', { vision: '' })).rejects.toThrow('validation failed');
    const failed = await readDocument(path);
    expect(failed.state.tasks.write!.status).toBe('pending');
    expect(failed.state.tasks.write!.errors).not.toEqual([]);
    await startTask(path, 'write', 'Expand vision to include the audience');
    const done = await completeTask(path, 'write', { vision: 'Vision for owners' });
    expect(done.state.status).toBe('completed');
    expect(done.state.tasks.write!.attempts).toBe(2);
    expect(done.definition).toEqual(before);
  });
  it('refuses an identical retry that records no corrective action', async () => {
    const path = await setup();
    await startTask(path, 'write');
    await expect(completeTask(path, 'write', { vision: '' })).rejects.toThrow('validation failed');
    await expect(completeTask(path, 'write', { vision: '' })).rejects.toThrow('Start task write');
    await expect(startTask(path, 'write')).rejects.toThrow('corrective action');
    await expect(startTask(path, 'write', '   ')).rejects.toThrow('corrective action');
    expect((await readDocument(path)).state.tasks.write!.attempts).toBe(1);
  });
  it('refuses a second agent claiming a task another one is running', async () => {
    const path = await setup();
    await startTask(path, 'write');
    await expect(startTask(path, 'write')).rejects.toThrow('corrective action');
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
      step: 'third',
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
    await startTask(path, 'write', 'Wrote a non-empty vision');
    await completeTask(path, 'write', { vision: 'Owners' });
    expect(await readFile(file, 'utf8')).toContain('Owners');
    await expect(readdir(join(dir, '.debo-stage'))).rejects.toThrow();
  });
});

describe('cross-process serialization', () => {
  it('releases its lock after every mutation and takes over an abandoned one', async () => {
    const path = await setup();
    await startTask(path, 'write');
    await expect(readFile(`${path}.lock`)).rejects.toThrow();
    const stale = new Date(Date.now() - 10 * 60_000);
    await writeFile(`${path}.lock`, '999999 abandoned');
    await utimes(`${path}.lock`, stale, stale);
    const done = await completeTask(path, 'write', { vision: 'Owners' });
    expect(done.state.status).toBe('completed');
    await expect(readFile(`${path}.lock`)).rejects.toThrow();
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
      step: 'read',
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
    await startTask(path, 'write', 'Submitted a vision that meets the shared minimum length');
    expect((await completeTask(path, 'write', { vision: 'Owners' })).state.status).toBe('completed');
  });
  it('does not replace an existing run during definition persistence', async () => {
    const path = await setup();
    await startTask(path, 'write');
    await expect(saveDefinition(path, definition())).rejects.toThrow();
    expect((await readDocument(path)).state.tasks.write!.status).toBe('in-progress');
  });
  it('rejects a saved definition edited between two CLI calls', async () => {
    const path = await setup();
    const doc = load(await readFile(path, 'utf8')) as WorkflowDocument;
    doc.definition.tasks[0]!.outputs.vision!.required = false;
    await writeFile(path, dump(doc));
    await expect(readDocument(path)).rejects.toThrow('edited after the run was created');
    await expect(startTask(path, 'write')).rejects.toThrow('edited after the run was created');
  });
});

describe('artifact and verification contracts', () => {
  it.each(['data', 'direct'] as const)('records the validated bytes for a %s artifact', async (submission) => {
    const dir = await mkdtemp(join(tmpdir(), 'workflow-hash-'));
    dirs.push(dir);
    const file = join(dir, 'artifact.yml');
    const def = definition();
    def.tasks[0]!.outputs = {
      artifact: { required: true, schema: {}, path: file, submission, validators: [] },
    };
    if (submission === 'direct') await writeFile(file, Buffer.from([0, 255, 10, 128]));
    const path = await setup(def);
    await startTask(path, 'write');
    const done = await completeTask(path, 'write', submission === 'data' ? { artifact: { title: 'Validated' } } : {});
    const expected = createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
    expect(done.state.tasks.write!.results.artifact).toHaveProperty('sha256', expected);
    await writeFile(file, 'changed after validation');
    expect((await readDocument(path)).state.tasks.write!.results.artifact).toHaveProperty('sha256', expected);
  });

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

  it('validates a staged file under the exact name it will carry on disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'workflow-stage-'));
    dirs.push(dir);
    const file = join(dir, 'node.article.full.jsonata');
    const def = definition();
    def.tasks[0]!.outputs.vision = {
      required: true,
      schema: { type: 'string', minLength: 1 },
      path: file,
      submission: 'data',
      // The validator only passes while the staged file still carries its real name.
      validators: [
        `cmd:node -e "process.exit(require('path').basename(process.argv[1]) === 'node.article.full.jsonata' ? 0 : 1)" {{ file }}`,
      ],
    };
    const path = await setup(def);
    await startTask(path, 'write');
    expect((await completeTask(path, 'write', { vision: '$' })).state.status).toBe('completed');
    expect(await readFile(file, 'utf8')).toContain('$');
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
    def.tasks.push({ ...structuredClone(def.tasks[0]!), id: 'consumer', step: 'consumer', depends_on: ['write'] });
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
  def.tasks = [{ ...structuredClone(parent), id: 'child-a', step: 'child-a', depends_on: ['write'] }, parent];
  expect(() => validateDefinition(def)).not.toThrow();
  def.tasks.push({ ...structuredClone(parent), id: 'child-b', step: 'child-b', depends_on: ['write'] });
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
  await startTask(path, 'write', 'Dropped the optional value and wrote a valid vision');
  const done = await completeTask(path, 'write', { vision: 'Owners' });
  expect(done.state.status).toBe('completed');
  expect(Object.keys(done.state.tasks.write!.results)).toEqual(['vision']);
});

describe('reference extract consumption boundary', () => {
  function referenceDefinition(): WorkflowDefinition {
    const def = definition();
    const producer = def.tasks[0]!;
    producer.outputs.reference_extract = {
      required: true,
      submission: 'data',
      validators: [],
      schema: { type: 'object', required: ['subjects'], properties: { subjects: { type: 'array', minItems: 1 } } },
    };
    def.tasks.push({
      ...structuredClone(producer),
      id: 'consume',
      step: 'consume',
      depends_on: ['write'],
      inputs: { selected: { task: 'write', result: 'vision' } },
      outputs: { value: { required: true, submission: 'data', validators: [], schema: { type: 'string' } } },
    });
    return def;
  }
  it.each(['extract', 'renamed_input'])(
    'rejects a full extract binding under input name %s, even with a scoped request',
    (name) => {
      const def = referenceDefinition();
      const consumer = def.tasks[1]!;
      consumer.inputs[name] = { task: 'write', result: 'reference_extract' };
      expect(() => validateDefinition(def)).toThrow('scoped task.reference query');
      consumer.reference = {
        query: {
          reference: '/tmp/reference',
          package: 'component',
          subjects: ['header'],
          states: ['rest'],
          breakpoints: ['sm'],
          fingerprint: 'a'.repeat(64),
        },
        reference_schema: {},
        extract_schema: {},
      };
      expect(() => validateDefinition(def)).toThrow('scoped task.reference query');
    },
  );
  it('validates the producer full extract while ordinary downstream inputs remain scoped', async () => {
    const path = await setup(referenceDefinition());
    await startTask(path, 'write');
    await expect(
      completeTask(path, 'write', { vision: 'Owners', reference_extract: { subjects: [] } }),
    ).rejects.toThrow('validation failed');
    await startTask(path, 'write', 'Completed the prepared reference subjects');
    const full = { subjects: [{ id: 'header' }], analysis: 'FULL_EXTRACT_ONLY_FOR_PRODUCER' };
    await completeTask(path, 'write', { vision: 'Owners', reference_extract: full });
    expect((await readDocument(path)).state.tasks.write!.results.reference_extract!.value).toEqual(full);
    const consumer = await taskContext(path, 'consume');
    expect(consumer.inputs.selected!.state!.value).toBe('Owners');
    expect(JSON.stringify(consumer)).not.toContain('FULL_EXTRACT_ONLY_FOR_PRODUCER');
  });
});
