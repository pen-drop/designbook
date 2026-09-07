import { expect, it } from 'vitest';
import { dump } from 'js-yaml';
import { validateAuthoredContext, MAX_AUTHORED_TASK_BYTES } from '../workflow-context-boundary.js';
import type { WorkflowDefinition } from '../workflow-document.js';

function definition(): WorkflowDefinition {
  return {
    id: 'probe',
    title: 'Probe',
    workspace_root: '/tmp',
    template: { source: 'workflow.md', content: 'Workflow' },
    config: {},
    inputs: {},
    inputs_schema: {},
    schemas: {},
    context: {
      instructions: { source: 'task.md', content: 'Write concrete outputs.' },
      work: { source: 'chosen-name', content: 'Header uses a two-column grid with a 16px gap.' },
    },
    tasks: [
      {
        id: 'write',
        step: 'write',
        title: 'Write',
        type: 'component',
        target: 'header',
        depends_on: [],
        params: {},
        params_schema: {},
        inputs: {},
        instructions: 'instructions',
        context: ['work'],
        outputs: {},
      },
    ],
  };
}
const measurements = [
  { samples: [{ node: 'any-name', tag: 'header', rect: { width: 640 }, style: { color: '#000' } }] },
];
it.each([
  JSON.stringify(measurements),
  dump(measurements),
  `Evidence:\n\n\`\`\`json\n${JSON.stringify(measurements)}\n\`\`\``,
  JSON.stringify(JSON.stringify(measurements)),
])('rejects structurally raw measurements under arbitrary provenance and serialization', (content) => {
  const def = definition();
  def.context.work!.content = content;
  expect(() => validateAuthoredContext(def, [def.context.instructions!])).toThrow('observed DOM measurements');
});
it.each([
  { subjects: [], parents: [], images: [] },
  { scope: {}, subjects: [], dependencies: {}, provenance: {} },
  { images: [], fonts: [] },
  { observations: { layout: {} }, breakpoint: 'sm' },
  { child_ids: ['child'], bbox: { width: 100 }, source: { selector: 'header' } },
])('rejects copied reference payloads in nested params', (payload) => {
  const def = definition();
  def.tasks[0]!.params = { anyAlias: { anotherAlias: payload } };
  expect(() => validateAuthoredContext(def, [def.context.instructions!])).toThrow('scoped task.reference query');
});
it('bounds total authored bytes per task, deduplicates shared IDs and exempts exact catalogue bodies only', () => {
  const def = definition();
  def.context.instructions!.content = 'Complete immutable instruction '.repeat(10000);
  const catalogue = [structuredClone(def.context.instructions!)];
  def.context.work!.content = 'x'.repeat(MAX_AUTHORED_TASK_BYTES - 2);
  def.tasks[0]!.context.push('work');
  expect(() => validateAuthoredContext(def, catalogue)).not.toThrow();
  def.tasks[0]!.params = { too: 'much' };
  expect(() => validateAuthoredContext(def, catalogue)).toThrow('authored context and params total');
  def.tasks[0]!.params = {};
  def.context.instructions!.source = 'spoofed-origin';
  expect(() => validateAuthoredContext(def, catalogue)).toThrow('Authored context instructions exceeds');
});
it('preserves concrete code, asset copies and work-order prose without changing them', () => {
  const def = definition();
  def.tasks[0]!.params = {
    copies: { '/public/logo.svg': '/reference/logo.svg' },
    css_contents: { '/theme.css': '.header { display: grid; gap: 16px; }' },
    component: { tag: 'header', attributes: { class: 'header' }, styles: { display: 'grid' } },
  };
  const before = structuredClone(def);
  expect(() => validateAuthoredContext(def, [def.context.instructions!])).not.toThrow();
  expect(def).toEqual(before);
});

it('checks general workflow inputs and leaves exact catalogue examples intact', () => {
  const def = definition();
  def.context.instructions!.content = `Example only:\n\n\`\`\`json\n${JSON.stringify(measurements)}\n\`\`\``;
  const catalogue = [structuredClone(def.context.instructions!)];
  expect(() => validateAuthoredContext(def, catalogue)).not.toThrow();
  def.inputs = { disguised: JSON.stringify(measurements) };
  expect(() => validateAuthoredContext(def, catalogue)).toThrow('Workflow inputs embeds observed DOM');
});
