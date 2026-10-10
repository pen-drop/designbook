/**
 * Result enforcement compares submitted map-entity / write-scene / sample
 * artifacts to the sealed composition contract before plan done completes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { buildPlan, type TaskList } from '../plan-build.js';
import { planDigest, type Plan, type PlanTask } from '../plan-document.js';
import { compilePlannedMapping, validateCompositionResult } from '../plan-composition-result.js';
import type { DesignbookConfig } from '../../shared/config.js';
import jsonata from 'jsonata';

const agents = resolve(process.cwd(), '../../.agents');
const vueOpts = {
  agentsDir: agents,
  config: {
    data: '/tmp/plan-composition-result',
    technology: 'html',
    backend: 'none',
    'frameworks.component': 'vue',
    'frameworks.css': 'tailwind',
    extensions: [],
    'component.namespace': 'test_integration_vue',
  } as unknown as DesignbookConfig,
};

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/__tests__/fixtures/plans/signage-tasks.json'), 'utf8'),
) as TaskList;

function findTask(plan: Plan, namePart: string, title: string): PlanTask {
  for (const step of plan.steps) {
    const found = step.tasks.find((t) => t.name.includes(namePart) && t.title === title);
    if (found) return found;
  }
  throw new Error(`task ${namePart} [${title}] not found`);
}

async function buildSignage(list: TaskList = fixture): Promise<Plan> {
  const { plan, errors } = await buildPlan(list, vueOpts);
  expect(errors).toEqual([]);
  expect(plan).not.toBeNull();
  return plan!;
}

describe('compilePlannedMapping', () => {
  it('emits field paths and a lookup by stable record id, not numeric id minus one', async () => {
    const list = structuredClone(fixture);
    const sample = list.tasks.find((t) => t.step === 'create-sample-data' && t.title === 'signage_item')!;
    sample.params = {
      ...sample.params,
      records: [
        { id: 'item-c', summary: 'c', values: { field_title: 'c' } },
        { id: 'item-a', summary: 'a', values: { field_title: 'a' } },
        { id: 'item-b', summary: 'b', values: { field_title: 'b' } },
      ],
    };
    const parent = list.tasks.find((t) => t.step === 'create-sample-data' && t.title === 'signage')!;
    const parentRecords = parent.params?.records as Array<{ values: { field_signage_item: string[] } }>;
    parentRecords[0]!.values.field_signage_item = ['item-a', 'item-c', 'item-b'];
    const plan = await buildSignage(list);
    const expr = compilePlannedMapping(findTask(plan, 'map-entity', 'signage'), plan);
    expect(expr).toContain('$fields.field_paragraph_style');
    expect(expr).toContain('$fields.field_overlapping_top');
    expect(expr).toContain('$fields.field_signage_item');
    expect(expr).toContain('test_integration_vue:signage');
    expect(expr).toContain('$lookup');
    expect(expr).toContain('item-a');
    expect(expr).not.toMatch(/\$number\(\$id\)\s*-\s*1/);
  });

  it('compiles a string-field slot as a direct field expression inside the wrapper', async () => {
    const list = structuredClone(fixture);
    const write = list.tasks.find((t) => t.step === 'write-component' && t.title === 'signage')!;
    (write.params!.component as { slots: Record<string, unknown> }).slots.kicker = {
      description: 'Style as slot content',
      required: false,
    };
    const map = list.tasks.find((t) => t.step === 'map-entity' && t.title === 'signage')!;
    (map.params!.bindings as unknown[]).push({ field: 'field_paragraph_style', slot: 'kicker' });
    const plan = await buildSignage(list);
    const expr = compilePlannedMapping(findTask(plan, 'map-entity', 'signage'), plan);
    expect(expr).toContain('$fields := $');
    expect(expr).toContain('"kicker": $fields.field_paragraph_style');
    expect(expr).toContain('$map($fields.field_signage_item');
  });
});

type TreeRecord = { id: string; summary: string; values: Record<string, unknown> };

function treeContract(name: string, props: string[] = [], slots: string[] = []): Record<string, unknown> {
  return {
    component: name,
    group: 'layout',
    props: {
      type: 'object',
      properties: Object.fromEntries(props.map((p) => [p, { type: 'string' }])),
      required: [],
      additionalProperties: false,
    },
    slots: Object.fromEntries(slots.map((slot) => [slot, { description: slot, required: false }])),
  };
}

const sectionTree = [
  {
    component: 'test_integration_vue:section',
    props: { max_width: 'lg' },
    slots: {
      column_1: [
        { component: 'test_integration_vue:hero', props: { title: 'One' } },
        { component: 'test_integration_vue:hero', props: { title: 'Two' } },
      ],
    },
  },
];

function treeTaskList(field: string, records: TreeRecord[], fields?: Record<string, unknown>): TaskList {
  return {
    workflow: 'design-entity',
    composition: {
      components: [],
      mappings: [],
      samples: [],
      scenes: [],
      data_model: {
        content: {
          canvas_page: {
            landing_page: {
              fields: fields ?? { [field]: { type: 'component_tree' } },
              view_modes: { full: { template: 'canvas' } },
            },
          },
        },
      },
    },
    tasks: [
      {
        step: 'write-component',
        task: 'write-component',
        title: 'section',
        params: { component: treeContract('section', ['max_width'], ['column_1']) },
      },
      {
        step: 'write-component',
        task: 'write-component',
        title: 'hero',
        params: { component: treeContract('hero', ['title']) },
      },
      {
        step: 'create-sample-data',
        task: 'create-sample-data',
        title: 'landing_page',
        params: {
          section_id: 'home',
          bundle: { entity_type: 'canvas_page', bundle: 'landing_page' },
          data_model: {},
          components_dir: '/tmp/components',
          records,
        },
      },
      {
        step: 'map-entity',
        task: 'map-entity--design-screen',
        title: 'landing_page',
        params: {
          mapping: { entity_type: 'canvas_page', bundle: 'landing_page', mode_kind: 'view', view_mode: 'full' },
          data_model: {},
        },
      },
    ],
  };
}

const treeRecords = (field: string): TreeRecord[] => [
  { id: 'home', summary: 'Home', values: { [field]: sectionTree } },
  { id: 'about', summary: 'About', values: { [field]: [] } },
];

async function buildTreePlan(field: string, records = treeRecords(field)): Promise<Plan> {
  const { plan, errors } = await buildPlan(treeTaskList(field, records), vueOpts);
  expect(errors).toEqual([]);
  return plan!;
}

describe('compilePlannedMapping — component_tree passthrough', () => {
  it.each(['components', 'layout'])('compiles the %s field as a record passthrough', async (field) => {
    const plan = await buildTreePlan(field);
    expect(compilePlannedMapping(findTask(plan, 'map-entity', 'landing_page'), plan)).toBe(
      `(\n  $record := $;\n  $record.${field}\n)\n`,
    );
  });

  it.each([
    ['empty', []],
    ['one root', sectionTree],
    ['multiple roots', [...sectionTree, { component: 'test_integration_vue:hero', props: { title: 'Last' } }]],
  ])('evaluates to the exact %s sample tree', async (_label, tree) => {
    const plan = await buildTreePlan('layout', [{ id: 'home', summary: 'Home', values: { layout: tree } }]);
    const expr = compilePlannedMapping(findTask(plan, 'map-entity', 'landing_page'), plan);
    const out = await jsonata(expr).evaluate({ id: 'home', layout: tree });
    expect(JSON.parse(JSON.stringify(out ?? []))).toEqual(tree);
  });

  it('names the tree-field count instead of a missing component for two tree fields', async () => {
    const { plan, errors } = await buildPlan(
      treeTaskList('layout', treeRecords('layout'), {
        layout: { type: 'component_tree' },
        aside: { type: 'component_tree' },
      }),
      { ...vueOpts },
    );
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/at most one component_tree field/);
    const draft = await buildTreePlan('layout');
    draft.composition!.data_model = treeTaskList('layout', [], {
      layout: { type: 'component_tree' },
      aside: { type: 'component_tree' },
    }).composition!.data_model;
    const task = findTask(draft, 'map-entity', 'landing_page');
    expect(() => compilePlannedMapping(task, draft)).toThrow(/at most one component_tree field/);
    const result = await validateCompositionResult(draft, task, { 'entity-mapping': '$record.layout' });
    expect(result.errors.join('\n')).toMatch(/at most one component_tree field/);
    expect(result.errors.join('\n')).not.toMatch(/missing component/);
  });
});

describe('validateCompositionResult — component_tree mapping', () => {
  it('accepts the exact passthrough for every record', async () => {
    const plan = await buildTreePlan('layout');
    const task = findTask(plan, 'map-entity', 'landing_page');
    const result = await validateCompositionResult(plan, task, {
      'entity-mapping': compilePlannedMapping(task, plan),
    });
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it.each([
    [
      'a wrapper',
      '(\n  $record := $;\n  [{ "component": "test_integration_vue:section", "slots": { "column_1": $record.layout } }]\n)',
    ],
    ['another field', '(\n  $record := $;\n  $record.components\n)'],
    ['an equal literal', `(\n  $record := $;\n  ${JSON.stringify(sectionTree)}\n)`],
    ['malformed JSONata', '(\n  $record := $;\n  $record.layout\n'],
  ])('rejects %s', async (_label, source) => {
    const plan = await buildTreePlan('layout');
    const task = findTask(plan, 'map-entity', 'landing_page');
    const result = await validateCompositionResult(plan, task, { 'entity-mapping': source });
    expect(result.ok).toBe(false);
  });
});

describe('validateCompositionResult — component_tree samples', () => {
  const rows = (records: TreeRecord[]) =>
    records.map((r) => ({ id: r.id, ...r.values, __designbook: { section: 'home' } }));

  it('accepts the exact sealed trees', async () => {
    const plan = await buildTreePlan('layout');
    const task = findTask(plan, 'create-sample-data', 'landing_page');
    expect((await validateCompositionResult(plan, task, { 'sample-data': rows(treeRecords('layout')) })).ok).toBe(true);
  });

  it.each([
    ['a changed nested prop', (t: typeof sectionTree) => (t[0]!.slots.column_1[1]!.props.title = 'Changed')],
    ['a removed child', (t: typeof sectionTree) => t[0]!.slots.column_1.pop()],
    ['reordered children', (t: typeof sectionTree) => t[0]!.slots.column_1.reverse()],
  ])('rejects %s', async (_label, mutate) => {
    const plan = await buildTreePlan('layout');
    const task = findTask(plan, 'create-sample-data', 'landing_page');
    const written = treeRecords('layout').map((r) => structuredClone(r));
    mutate(written[0]!.values.layout as typeof sectionTree);
    const result = await validateCompositionResult(plan, task, { 'sample-data': rows(written) });
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/home field layout/);
  });

  it('rejects a second-record mismatch', async () => {
    const plan = await buildTreePlan('layout');
    const task = findTask(plan, 'create-sample-data', 'landing_page');
    const written = treeRecords('layout');
    written[1]!.values.layout = sectionTree;
    const result = await validateCompositionResult(plan, task, { 'sample-data': rows(written) });
    expect(result.errors.join('\n')).toMatch(/about field layout/);
  });
});

describe('validateCompositionResult — mapping', () => {
  it('accepts the compiled expression and rejects swapped fields, extra targets, missing bindings, and coincidental constants', async () => {
    const plan = await buildSignage();
    const task = findTask(plan, 'map-entity', 'signage');
    const compiled = compilePlannedMapping(task, plan);
    const ok = await validateCompositionResult(plan, task, { 'entity-mapping': compiled });
    expect(ok.ok).toBe(true);

    const swapped = compiled
      .replace('$fields.field_paragraph_style', '$TMP_STYLE')
      .replace('$fields.field_overlapping_top', '$fields.field_paragraph_style')
      .replace('$TMP_STYLE', '$fields.field_overlapping_top');
    expect((await validateCompositionResult(plan, task, { 'entity-mapping': swapped })).ok).toBe(false);

    const wrongComponent = compiled.replace('test_integration_vue:signage', 'test_integration_vue:other');
    expect(
      (await validateCompositionResult(plan, task, { 'entity-mapping': wrongComponent })).errors.join('\n'),
    ).toMatch(/component|AST|bindings/i);

    const extra = compiled.replace(
      '"overlapping": $fields.field_overlapping_top',
      '"overlapping": $fields.field_overlapping_top,\n        "extra": $fields.field_paragraph_style',
    );
    expect((await validateCompositionResult(plan, task, { 'entity-mapping': extra })).ok).toBe(false);

    const missing = compiled.replace(/\s*"style": \$fields\.field_paragraph_style,\n/, '\n');
    expect((await validateCompositionResult(plan, task, { 'entity-mapping': missing })).ok).toBe(false);

    const constant = compiled.replace('$fields.field_paragraph_style', '"default"');
    const constantResult = await validateCompositionResult(plan, task, { 'entity-mapping': constant });
    expect(constantResult.ok).toBe(false);
    expect(constantResult.errors.join('\n')).toMatch(/AST|binding|field_paragraph_style|constant/i);
  });

  it('validates a map-entity result even when its params carry no bindings', async () => {
    const plan = await buildSignage();
    const task = findTask(plan, 'map-entity', 'signage');
    delete task.params.bindings;
    expect((await validateCompositionResult(plan, task, { 'entity-mapping': '"garbage"' })).ok).toBe(false);
  });

  it('rejects a wrong child view mode and invalid JSONata', async () => {
    const plan = await buildSignage();
    const task = findTask(plan, 'map-entity', 'signage');
    const compiled = compilePlannedMapping(task, plan);
    const wrongMode = compiled.replace('"view_mode": "full"', '"view_mode": "card"');
    expect((await validateCompositionResult(plan, task, { 'entity-mapping': wrongMode })).ok).toBe(false);

    const invalid = await validateCompositionResult(plan, task, { 'entity-mapping': 'this is not jsonata {' });
    expect(invalid.ok).toBe(false);
    expect(invalid.errors.join('\n')).toMatch(/jsonata|parse|invalid/i);
  });
});

describe('validateCompositionResult — scene', () => {
  it('accepts matching items and rejects record, mode, and nested slot-order changes', async () => {
    const plan = await buildSignage();
    const task = findTask(plan, 'write-scene', 'Signage');
    const matchingItems = structuredClone(task.params.items) as Array<Record<string, unknown>>;
    const matching = {
      'scene-file': {
        id: 'signage',
        title: 'Signage',
        scenes: [{ name: 'Signage', items: matchingItems }],
      },
    };
    expect((await validateCompositionResult(plan, task, matching)).ok).toBe(true);

    const recordChanged = structuredClone(matching);
    (recordChanged['scene-file'].scenes[0]!.items[0] as { record: number }).record = 1;
    expect((await validateCompositionResult(plan, task, recordChanged)).ok).toBe(false);

    const modeChanged = structuredClone(matching);
    (modeChanged['scene-file'].scenes[0]!.items[0] as { view_mode: string }).view_mode = 'teaser';
    expect((await validateCompositionResult(plan, task, modeChanged)).ok).toBe(false);

    const nested = structuredClone(plan);
    const nestedTask = findTask(nested, 'write-scene', 'Signage');
    nestedTask.params.items = [
      {
        component: 'test_integration_vue:signage',
        slots: {
          items: [
            { entity: 'paragraph.signage_item', view_mode: 'full', record: 0 },
            { entity: 'paragraph.signage_item', view_mode: 'full', record: 1 },
          ],
        },
      },
    ];
    nested.digest = planDigest(nested);
    const nestedItems = structuredClone(nestedTask.params.items) as Array<Record<string, unknown>>;
    const nestedOk = {
      'scene-file': {
        id: 'signage',
        title: 'Signage',
        scenes: [{ name: 'Signage', items: nestedItems }],
      },
    };
    expect((await validateCompositionResult(nested, nestedTask, nestedOk)).ok).toBe(true);
    const reordered = structuredClone(nestedOk);
    const slotItems = (
      reordered['scene-file'].scenes[0]!.items[0] as {
        slots: { items: unknown[] };
      }
    ).slots.items;
    [slotItems[0], slotItems[1]] = [slotItems[1], slotItems[0]];
    expect((await validateCompositionResult(nested, nestedTask, reordered)).ok).toBe(false);
  });

  it('keeps unchanged sibling scenes valid and rejects rewritten siblings', async () => {
    const plan = await buildSignage();
    const task = findTask(plan, 'write-scene', 'Signage');
    const sibling = { name: 'Hero', items: [{ component: 'test_integration_vue:hero' }] };
    plan.composition = {
      ...(plan.composition ?? { components: [], mappings: [], samples: [], scenes: [], data_model: {} }),
      scenes: [
        {
          path: String(task.params.scene_path),
          file: {
            id: 'signage',
            title: 'Signage',
            scenes: [sibling, { name: 'Signage', items: [] }],
          },
        },
      ],
    };
    plan.digest = planDigest(plan);
    const withSibling = {
      'scene-file': {
        id: 'signage',
        title: 'Signage',
        scenes: [structuredClone(sibling), { name: 'Signage', items: structuredClone(task.params.items) }],
      },
    };
    expect((await validateCompositionResult(plan, task, withSibling)).ok).toBe(true);
    const rewritten = structuredClone(withSibling);
    (rewritten['scene-file'].scenes[0] as { name: string }).name = 'Rewritten';
    expect((await validateCompositionResult(plan, task, rewritten)).ok).toBe(false);
  });
});

describe('validateCompositionResult — sample data', () => {
  it('checks declared ids, values, order and preserved records', async () => {
    const plan = await buildSignage();
    const task = findTask(plan, 'create-sample-data', 'signage_item');
    const declared = task.params.records as Array<{ id: string; values?: Record<string, unknown> }>;
    const matching = {
      'sample-data': declared.map((r) => ({ id: r.id, ...r.values, __designbook: { section: 'signage' } })),
    };
    expect((await validateCompositionResult(plan, task, matching)).ok).toBe(true);

    const wrongOrder = {
      'sample-data': [...matching['sample-data']].reverse(),
    };
    expect((await validateCompositionResult(plan, task, wrongOrder)).ok).toBe(false);

    const missingId = {
      'sample-data': matching['sample-data'].slice(1),
    };
    expect((await validateCompositionResult(plan, task, missingId)).ok).toBe(false);
  });

  it('expects overlay order: update matching ids in place, then append new ones', async () => {
    const plan = await buildSignage();
    const task = findTask(plan, 'create-sample-data', 'signage_item');
    plan.composition = {
      ...(plan.composition ?? { components: [], mappings: [], samples: [], scenes: [], data_model: {} }),
      samples: [
        {
          entity_type: 'paragraph',
          bundle: 'signage_item',
          records: [
            { id: 'a', summary: 'a', values: { field_title: 'a' } },
            { id: 'b', summary: 'old-b', values: { field_title: 'old-b' } },
            { id: 'c', summary: 'c', values: { field_title: 'c' } },
          ],
        },
      ],
    };
    task.params.records = [
      { id: 'b', summary: 'new-b', values: { field_title: 'new-b' } },
      { id: 'd', summary: 'd', values: { field_title: 'd' } },
    ];
    const overlay = {
      'sample-data': [
        { id: 'a', field_title: 'a' },
        { id: 'b', field_title: 'new-b' },
        { id: 'c', field_title: 'c' },
        { id: 'd', field_title: 'd' },
      ],
    };
    expect((await validateCompositionResult(plan, task, overlay)).ok).toBe(true);
    const replaced = {
      'sample-data': [
        { id: 'a', field_title: 'a' },
        { id: 'c', field_title: 'c' },
        { id: 'b', field_title: 'new-b' },
        { id: 'd', field_title: 'd' },
      ],
    };
    expect((await validateCompositionResult(plan, task, replaced)).ok).toBe(false);
  });
});

describe('validateCompositionResult — direct missing file', () => {
  it('fails a direct output whose declared path is absent', async () => {
    const plan = await buildSignage();
    const task = findTask(plan, 'map-entity', 'signage');
    const output = Object.values(task.contract.outputs)[0]!;
    output.submission = 'direct';
    output.path = join(tmpdir(), 'missing-composition-mapping.jsonata');
    const result = await validateCompositionResult(plan, task, { 'entity-mapping': true });
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/not found|missing/i);
  });
});
