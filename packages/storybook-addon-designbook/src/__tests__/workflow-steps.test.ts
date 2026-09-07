import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareReferenceQuery } from '../reference-query.js';
import { Command } from 'commander';
import {
  createDocument,
  validateDefinition,
  validateCatalogueDefinition,
  type PlanningCatalogue,
  type WorkflowDefinition,
} from '../workflow-document.js';
import { saveDefinition, readDocument, startStep, completeStep, blockStep } from '../workflow-store.js';
import { stepContext, stepOverview } from '../workflow-steps.js';
import { workflowMarkdown, stepMarkdown } from '../workflow-markdown.js';
import { register } from '../cli/workflow.js';

function definition(): WorkflowDefinition {
  const task = {
    step: 'components',
    type: 'component',
    target: 'header',
    depends_on: [],
    params: {},
    params_schema: { type: 'object' },
    inputs: {},
    instructions: 'component-instructions',
    context: ['component'],
    outputs: {
      value: {
        required: true,
        schema: { $ref: '#/definitions/Component' },
        submission: 'data' as const,
        validators: [],
      },
    },
  };
  return {
    id: 'shell',
    title: 'Shell',
    template: { source: 'shell.md', content: 'FULL_TEMPLATE' },
    workspace_root: '/tmp',
    config: {},
    inputs: {},
    inputs_schema: {},
    context: {
      'component-instructions': { source: 'component.md', content: 'COMPONENT_INSTRUCTIONS' },
      'scene-instructions': { source: 'scene.md', content: 'SCENE_INSTRUCTIONS' },
      component: { source: 'component-rule.md', content: 'COMPONENT_RULE' },
      future: { source: 'future.md', content: 'FUTURE_SECRET' },
    },
    schemas: {
      Component: { $ref: '#/definitions/Text' },
      Text: { type: 'string', minLength: 2 },
      Future: { type: 'string' },
    },
    tasks: [
      { ...task, id: 'header', title: 'Header' },
      { ...task, id: 'footer', title: 'Footer', target: 'footer' },
      {
        ...task,
        id: 'scene',
        title: 'Scene',
        step: 'scene',
        depends_on: ['header', 'footer'],
        instructions: 'scene-instructions',
        context: ['future'],
        inputs: { header: { task: 'header', result: 'value' } },
      },
    ],
  };
}
const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'workflow-step-'));
  directories.push(dir);
  const path = join(dir, 'tasks.yml');
  await saveDefinition(path, definition());
  return path;
}
it('exposes only routing metadata, then every task and reachable schema of the selected step', () => {
  const doc = createDocument(definition());
  const overview = JSON.stringify(stepOverview(doc));
  for (const secret of ['COMPONENT_INSTRUCTIONS', 'FUTURE_SECRET', 'FULL_TEMPLATE', 'minLength'])
    expect(overview).not.toContain(secret);
  const slice = stepContext(doc, 'components');
  expect(slice.tasks.map((entry) => entry.task.id)).toEqual(['header', 'footer']);
  expect(Object.keys(slice.schemas).sort()).toEqual(['Component', 'Text']);
  expect(Object.keys(slice.context)).toEqual(['component-instructions', 'component']);
  expect(JSON.stringify(slice)).not.toContain('FUTURE_SECRET');
  expect(JSON.stringify(slice)).not.toContain('SCENE_INSTRUCTIONS');
  expect(() => stepContext(doc, 'missing')).toThrow('Unknown step');
});
it('rejects dependent tasks inside a batch and cycles between otherwise acyclic task groups', () => {
  const def = definition();
  def.tasks[1]!.depends_on = ['header'];
  expect(() => validateDefinition(def)).toThrow('separate steps');
  const cycle = definition();
  cycle.tasks.push({ ...cycle.tasks[0]!, id: 'later', depends_on: ['scene'] });
  expect(() => validateDefinition(cycle)).toThrow('Step dependency cycle');
});
it('validates the whole batch before publishing any done state and keeps correction evidence', async () => {
  const path = await fixture();
  await expect(startStep(path, 'scene')).rejects.toThrow('Unfinished dependencies');
  await startStep(path, 'components');
  await expect(completeStep(path, 'components', { header: { value: 'Header' } })).rejects.toThrow(
    'exactly all task IDs',
  );
  await expect(
    completeStep(path, 'components', { header: { value: 'Header' }, footer: { value: '' } }),
  ).rejects.toThrow('validation failed');
  const failed = await readDocument(path);
  expect(failed.state.tasks.header!.status).toBe('pending');
  expect(failed.state.tasks.footer!.status).toBe('pending');
  expect(failed.state.tasks.header!.results.value!.valid).toBe(true);
  await expect(startStep(path, 'scene')).rejects.toThrow('Unfinished dependencies');
  await expect(startStep(path, 'components')).rejects.toThrow('corrective action');
  await startStep(path, 'components', 'Filled missing footer');
  await completeStep(path, 'components', { header: { value: 'Header' }, footer: { value: 'Footer' } });
  const done = await readDocument(path);
  expect(done.state.tasks.header!.status).toBe('done');
  expect(done.state.tasks.footer!.status).toBe('done');
  expect(done.definition).toEqual(definition());
  expect(stepContext(done, 'scene').tasks[0]!.inputs.header!.state!.value).toBe('Header');
  expect(stepOverview(done).steps.find((step) => step.id === 'scene')!.ready).toBe(true);
});
it('blocks and resumes all tasks of the selected step together', async () => {
  const path = await fixture();
  await startStep(path, 'components');
  await blockStep(path, 'components', 'Reference unavailable', 'Checked reference');
  const doc = await readDocument(path);
  expect(doc.state.tasks.header!.status).toBe('blocked');
  expect(doc.state.tasks.footer!.status).toBe('blocked');
  await startStep(path, 'components', 'Reference restored');
  expect((await readDocument(path)).state.tasks.footer!.status).toBe('in-progress');
});
it('CLI exports full Markdown on request and keeps step start responses compact', async () => {
  const path = await fixture();
  const original = await readFile(path, 'utf8');
  const write = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const program = () => {
    const cli = new Command();
    register(cli);
    return cli;
  };
  await program().parseAsync(['node', 'cli', 'workflow', 'read', path, '--format', 'md']);
  const markdown = String(write.mock.calls[0]![0]);
  for (const text of ['FULL_TEMPLATE', 'COMPONENT_INSTRUCTIONS', 'FUTURE_SECRET', 'minLength: 2'])
    expect(markdown).toContain(text);
  expect(await readFile(path, 'utf8')).toBe(original);
  write.mockClear();
  await program().parseAsync([
    'node',
    'cli',
    'workflow',
    'instructions',
    path,
    '--step',
    'components',
    '--format',
    'md',
  ]);
  const slice = String(write.mock.calls[0]![0]);
  expect(slice).toContain('COMPONENT_INSTRUCTIONS');
  expect(slice).toContain('Task: header');
  expect(slice).toContain('Task: footer');
  for (const text of ['FULL_TEMPLATE', 'FUTURE_SECRET', 'SCENE_INSTRUCTIONS']) expect(slice).not.toContain(text);

  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  await program().parseAsync(['node', 'cli', 'workflow', 'start', path, '--step', 'components']);
  const response = JSON.parse(log.mock.calls[0]![0]);
  expect(response.steps[0].tasks).toHaveLength(2);
  expect(JSON.stringify(response)).not.toContain('COMPONENT_INSTRUCTIONS');
  expect(response.definition).toBeUndefined();
});

it('interns exact bodies without losing origins and emits shared material once per export or step', () => {
  const def = definition();
  def.context.alias = { source: 'another-source.md', content: 'COMPONENT_INSTRUCTIONS' };
  def.context.different = { source: 'component.md', content: 'COMPONENT_INSTRUCTIONS changed' };
  def.tasks[1]!.instructions = 'alias';
  def.tasks[1]!.context.push('different');
  const doc = createDocument(def);
  expect(def.tasks[0]!.instructions).toBe('component-instructions');
  expect(doc.definition.tasks[0]!.instructions).toBe('alias');
  expect(doc.definition.context.alias!.sources).toEqual(['another-source.md', 'component.md']);
  expect(doc.definition.context['component-instructions']).toBeUndefined();
  doc.state.tasks.header!.results = {
    value: { value: 'MUTABLE_SECRET', valid: false, errors: [], validated_at: 'now' },
  };
  for (const rendered of [workflowMarkdown(doc), stepMarkdown(stepContext(doc, 'components'))]) {
    expect(rendered.split('COMPONENT_INSTRUCTIONS\n').length - 1).toBe(1);
    expect(rendered).toContain('COMPONENT_INSTRUCTIONS changed');
    const targets = [...rendered.matchAll(/\]\(#(context-[a-f0-9]+)\)/g)].map((match) => match[1]);
    expect(targets.length).toBeGreaterThan(1);
    for (const target of targets) expect(rendered).toContain(`<a id="${target}"></a>`);
  }
  expect(workflowMarkdown(doc)).not.toContain('MUTABLE_SECRET');
  expect(workflowMarkdown(doc)).not.toContain('validated_at');
  expect(JSON.stringify(stepContext(doc, 'components')).split('COMPONENT_INSTRUCTIONS"').length - 1).toBe(1);
});
it('rejects dangling instruction references and recursive registry entries', () => {
  const def = definition();
  def.tasks[0]!.instructions = 'absent';
  expect(() => validateDefinition(def)).toThrow('Unknown context absent');
  const recursive = definition();
  Object.assign(recursive.context.component!, { context: ['component'] });
  expect(() => validateDefinition(recursive)).toThrow('Invalid workflow definition');
});

function catalogue(def: WorkflowDefinition): PlanningCatalogue {
  return {
    template: def.template,
    config: def.config,
    blocks: Object.fromEntries(
      def.tasks.map((task) => [
        task.id,
        [
          {
            instructions: def.context[task.instructions]!,
            rules: task.context.map((key) => def.context[key]!),
            blueprints: [],
            config_rules: [],
            config_instructions: [],
            params_schema: task.params_schema,
            outputs: task.outputs,
            schemas: def.schemas,
          },
        ],
      ]),
    ),
  };
}
it('rejects shortened catalogue instructions, missing rules and weakened output contracts before persistence', () => {
  const source = definition();
  const expected = catalogue(source);
  expect(() => validateCatalogueDefinition(source, expected)).not.toThrow();
  const shortened = definition();
  shortened.context['component-instructions']!.content = 'Write component.';
  expect(() => validateCatalogueDefinition(shortened, expected)).toThrow('instructions differ');
  const weakened = definition();
  weakened.tasks[0]!.outputs.value!.schema = { type: 'object' };
  expect(() => validateCatalogueDefinition(weakened, expected)).toThrow('contracts or required context');
  const missing = definition();
  missing.tasks[0]!.context = [];
  expect(() => validateCatalogueDefinition(missing, expected)).toThrow('contracts or required context');
  const optional = definition();
  optional.tasks[0]!.outputs.value!.required = false;
  expect(() => validateCatalogueDefinition(optional, expected)).toThrow('contracts or required context');
  const renamed = definition();
  renamed.schemas.RenamedText = renamed.schemas.Text!;
  delete renamed.schemas.Text;
  renamed.schemas.Component = { $ref: '#/definitions/RenamedText' };
  expect(() => validateCatalogueDefinition(renamed, expected)).not.toThrow();
});

it('compares reference targets with siblings even for shared schema object identity', () => {
  const source = definition();
  const shared = { $ref: '#/definitions/Component', type: 'string' };
  for (const task of source.tasks) task.outputs.value!.schema = shared;
  const expected = catalogue(source);
  const def = definition();
  for (const task of def.tasks) task.outputs.value!.schema = shared;
  def.schemas.Text = { type: 'string' };
  expect(() => validateCatalogueDefinition(def, expected)).toThrow('contracts or required context');
  def.schemas.Text = { type: 'string', minLength: 2 };
  def.schemas.Renamed = def.schemas.Component!;
  delete def.schemas.Component;
  for (const task of def.tasks) task.outputs.value!.schema = { $ref: '#/definitions/Renamed', type: 'string' };
  expect(() => validateCatalogueDefinition(def, expected)).not.toThrow();
  def.tasks[0]!.outputs.value!.schema = { $ref: '#/definitions/Renamed' };
  expect(() => validateCatalogueDefinition(def, expected)).toThrow('contracts or required context');
});

it('resolves one frozen packet per step, excludes reference schemas and rejects changed reference files', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'step-reference-'));
  directories.push(folder);
  const subjects = ['header', 'footer'].map((id) => ({
    id,
    selector: id,
    samples: [
      {
        state: 'rest',
        breakpoint: 'sm',
        asset_ids: [],
        font_families: [],
        component: { markup: `EXACT_${id}_DECISION` },
        composition: { unused: 'COMPOSITION_SECRET' },
      },
    ],
  }));
  const extract = { subjects, parents: [], images: [], fonts: [], irrelevant: 'UNRELATED_EXTRACT_SECRET' };
  await writeFile(join(folder, 'extract.json'), JSON.stringify(extract));
  await writeFile(
    join(folder, 'meta.yml'),
    JSON.stringify({
      source: 'https://example.test',
      extract: 'extract.json',
      elements: subjects.map((subject) => ({
        id: subject.id,
        selector: subject.selector,
        states: [{ name: 'rest' }],
        breakpoints: ['sm'],
      })),
    }),
  );
  await writeFile(
    join(folder, 'sm--header--rest.png'),
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4l8AAAAASUVORK5CYII=',
      'base64',
    ),
  );
  const contract = {
    referenceSchema: { $ref: '#/definitions/Reference' },
    extractSchema: { $ref: '#/definitions/Extract' },
    definitions: { Reference: { type: 'object', description: 'REFERENCE_SCHEMA_SECRET' }, Extract: { type: 'object' } },
  };
  const query = prepareReferenceQuery(
    { reference: folder, package: 'component', subjects: ['header'], states: ['rest'], breakpoints: ['sm'] },
    contract,
  );
  const def = definition();
  Object.assign(def.schemas, contract.definitions);
  for (const task of def.tasks.slice(0, 2))
    task.reference = { query, reference_schema: contract.referenceSchema, extract_schema: contract.extractSchema };
  const source = catalogue(def);
  expect(() => validateCatalogueDefinition(def, source)).toThrow('reference schemas differ');
  source.blocks.reference = [
    {
      ...source.blocks.header![0]!,
      outputs: {
        reference: { required: false, submission: 'data', validators: [], schema: contract.referenceSchema },
        reference_extract: { required: false, submission: 'data', validators: [], schema: contract.extractSchema },
      },
    },
  ];
  expect(() => validateCatalogueDefinition(def, source)).not.toThrow();
  const weak = structuredClone(def);
  weak.tasks[0]!.reference!.extract_schema = {};
  expect(() => validateCatalogueDefinition(weak, source)).toThrow('reference schemas differ');
  const doc = createDocument(def);
  const step = stepContext(doc, 'components');
  expect(Object.keys(step.references)).toHaveLength(1);
  expect(step.tasks[0]!.task.reference).toBe(step.tasks[1]!.task.reference);
  const text = stepMarkdown(step);
  expect(text.split('EXACT_header_DECISION').length - 1).toBe(1);
  for (const excluded of [
    'EXACT_footer_DECISION',
    'COMPOSITION_SECRET',
    'UNRELATED_EXTRACT_SECRET',
    'REFERENCE_SCHEMA_SECRET',
    'reference_schema',
  ])
    expect(text).not.toContain(excluded);
  expect(stepContext(doc, 'scene').references).toEqual({});
  await writeFile(join(folder, 'extract.json'), JSON.stringify({ ...extract, irrelevant: 'changed' }));
  expect(() => stepContext(doc, 'components')).toThrow('fingerprint');
  expect(() => createDocument(def)).toThrow('fingerprint');
});
