import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from 'commander';
import { createDocument, validateDefinition, type WorkflowDefinition } from '../workflow-document.js';
import { saveDefinition, readDocument, startStep, completeStep, blockStep } from '../workflow-store.js';
import { stepContext, stepOverview } from '../workflow-steps.js';
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
    instructions: { source: 'component.md', content: 'COMPONENT_INSTRUCTIONS' },
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
        instructions: { source: 'scene.md', content: 'SCENE_INSTRUCTIONS' },
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
  expect(Object.keys(slice.context)).toEqual(['component']);
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
