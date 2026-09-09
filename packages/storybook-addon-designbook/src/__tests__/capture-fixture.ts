/** Native capture fixture uses the production writer and authoritative shared schemas. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { load } from 'js-yaml';
import { captureLocation, type ObservationMeta, type ObservationExtract } from '../reference-capture.js';
import { sourceDumpName } from '../reference-project.js';
import type { CapturedSource } from '../inspect/element-walker.js';
import { saveDefinition, startTask, completeTask } from '../workflow-store.js';
import type { WorkflowDefinition, TaskDefinition } from '../workflow-document.js';
export const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4l8AAAAASUVORK5CYII=',
  'base64',
);
export function observationContract() {
  const schemas = load(
    readFileSync(resolve(process.cwd(), '../../.agents/skills/designbook/design/schemas.yml'), 'utf8'),
  );
  const definitions = JSON.parse(JSON.stringify(schemas).replaceAll('"$ref":"#/', '"$ref":"#/definitions/')) as Record<
    string,
    object
  >;
  return {
    referenceSchema: { $ref: '#/definitions/Reference' },
    extractSchema: { $ref: '#/definitions/DesignReference' },
    definitions,
  };
}
/**
 * Native identities a caller can fix up front. The revision digest covers the
 * selected scope, so a fixture's identities must be final before its location is
 * resolved — renaming a subject, state or view afterwards would move the
 * revision out from under the files already written.
 */
export interface FixtureIdentity {
  subject?: string;
  locator?: { kind: string; value: string };
  /** Rename map applied to the default `rest`/`open` states. */
  states?: Record<string, string>;
  /** Rename map applied to the default `mobile`/`desktop` views. */
  views?: Record<string, string>;
}

export function captureFixture(
  root: string,
  kind = 'website',
  workflowId = 'capture-one',
  role: 'reference' | 'actual' = 'reference',
  identity: FixtureIdentity = {},
) {
  const source = {
    kind,
    identity: kind === 'figma' ? 'file-key/selected-header-frames' : 'https://example.test/header',
    revision: 'version-1',
  };
  const subjectId = identity.subject ?? 'header';
  const locator = identity.locator ?? {
    kind: kind === 'figma' ? 'node' : 'css',
    value: kind === 'figma' ? '12:34' : 'header',
  };
  const viewName = (id: string) => identity.views?.[id] ?? id;
  const stateName = (name: string) => identity.states?.[name] ?? name;
  const views = [
    { id: viewName('mobile'), width: 390, height: 844, breakpoint: 'sm' },
    { id: viewName('desktop'), width: 1280, height: 900, breakpoint: 'xl' },
  ];
  // `open` is observed as a named session, so the fixture exercises the
  // one-dump-per-state rule and the per-state observer, not just the rest case.
  const states = [
    { name: stateName('rest'), session: 'anonymous' },
    { name: stateName('open'), session: 'member' },
  ];
  const scope = views.flatMap((view) =>
    states.map((state) => ({
      subject: subjectId,
      locator,
      view: view.id,
      state: state.name,
      session: state.session,
      breakpoint: view.breakpoint,
    })),
  );
  const location = captureLocation(root, { source, scope }, workflowId);
  mkdirSync(join(location.directory, 'assets'), { recursive: true });
  const meta: ObservationMeta = {
    source,
    role,
    elements: [{ id: subjectId, locator, states, views }],
    assets_dir: 'assets',
  };
  const extract: ObservationExtract = {
    subjects: [
      {
        id: subjectId,
        locator,
        samples: views.flatMap((view) =>
          states.map(({ name: state }) => ({
            view: view.id,
            state,
            breakpoint: view.breakpoint,
            structure: {
              roots: ['node'],
              nodes: [
                {
                  id: 'node',
                  kind: kind === 'figma' ? 'FRAME' : 'header',
                  locator:
                    kind === 'figma' ? { kind: 'node', value: view.id === 'mobile' ? '12:34' : '12:35' } : locator,
                  children: [],
                },
              ],
            },
            observations: {
              layout: { display: 'flex', gap: '8px' },
              typography: [{ family: 'Inter', size: '16px' }],
              content: [{ text: 'Home' }],
              interactions: [{ state }],
              properties: { color: '#fff' },
            },
            dependencies: { parent_ids: [], asset_ids: ['logo'], font_families: ['Inter'] },
            unavailable: [],
          })),
        ),
      },
    ],
    parents: [],
    images: [{ url: 'logo', role: 'logo', reference_path: 'assets/logo.svg', local_path: '/logo.svg' }],
    fonts: [{ family: 'Inter', source: 'self-hosted', files: [{ local_path: 'assets/inter.woff2' }] }],
    captures: views.flatMap((view) =>
      states.map(({ name: state }) => ({
        subject: subjectId,
        view: view.id,
        state,
        path: `${view.id}--${subjectId}--${state}.png`,
        width: 1,
        height: 1,
      })),
    ),
  };
  const dump: CapturedSource = {
    source_kind: kind === 'figma' ? 'figma' : 'url-dom',
    source_ref: source.identity,
    captured_at: '2026-01-01T00:00:00.000Z',
    adapter_version: 'test',
    nodes: [
      {
        id: 'node',
        child_ids: ['img'],
        label: 'Home',
        kind: kind === 'figma' ? 'FRAME' : 'header',
        bbox: { x: 0, y: 0, width: 390, height: 844 },
        text: 'Home',
        style: {
          layout: 'flex-row',
          gap: '8px',
          padding: '0',
          margin: '0',
          background: '#fff',
          foreground: '#fff',
          font_family: 'Inter',
          font_size: '16px',
          font_weight: '400',
        },
        source: { locator: locator.value },
      },
      {
        id: 'img',
        parent_id: 'node',
        child_ids: [],
        label: 'logo',
        kind: 'image',
        bbox: { x: 0, y: 0, width: 1, height: 1 },
        src: 'logo',
        alt: 'Logo',
        style: { padding: '0', margin: '0', background: '' },
        source: { locator: `${locator.value} img` },
      },
    ],
  };
  // One dump per state — the projection resolves each state against its own.
  const dumpFiles = states.map((state) => sourceDumpName(state.name));
  for (const file of dumpFiles) writeFileSync(join(location.directory, file), JSON.stringify(dump));
  writeFileSync(join(location.directory, 'assets/logo.svg'), '<svg/>');
  writeFileSync(join(location.directory, 'assets/inter.woff2'), 'font bytes');
  for (const capture of extract.captures) writeFileSync(join(location.directory, capture.path), png);
  const contract = observationContract();
  const task = (id: string, depends_on: string[] = []): TaskDefinition => ({
    id,
    step: id,
    title: id,
    type: 'reference',
    target: subjectId,
    depends_on,
    params: {},
    params_schema: { type: 'object' },
    inputs: {},
    instructions: 'capture',
    context: [],
    outputs: {},
  });
  const files = task('files');
  for (const name of [...dumpFiles, ...extract.captures.map((c) => c.path), 'assets/logo.svg', 'assets/inter.woff2'])
    files.outputs[name] = {
      required: true,
      schema: {},
      path: join(location.directory, name),
      submission: 'direct',
      validators: name.endsWith('.png') ? ['image'] : [],
    };
  const publish = task('publish', ['files']);
  publish.outputs = {
    reference: {
      required: true,
      schema: contract.referenceSchema,
      path: join(location.directory, 'meta.yml'),
      submission: 'data',
      validators: [],
    },
  };
  const definition: WorkflowDefinition = {
    id: workflowId,
    title: 'Capture selected source',
    workspace_root: root,
    config: { data: root },
    template: { source: 'capture.md', content: 'Capture selected observations.' },
    inputs: {},
    inputs_schema: { type: 'object' },
    context: { capture: { source: 'capture.md', content: 'Observe selected subject and view.' } },
    schemas: contract.definitions,
    tasks: [files, publish],
    capture: { role, source, scope },
  };
  const workflow = join(root, `${workflowId}.yml`);
  const prepare = async () => {
    await saveDefinition(workflow, definition);
    await startTask(workflow, 'files');
    await completeTask(workflow, 'files', {});
    await startTask(workflow, 'publish');
  };
  const finish = () => completeTask(workflow, 'publish', { reference: meta });
  const complete = async () => {
    await prepare();
    return finish();
  };
  return {
    root,
    folder: location.directory,
    location,
    workflow,
    definition,
    meta,
    extract,
    contract,
    prepare,
    finish,
    complete,
  };
}
