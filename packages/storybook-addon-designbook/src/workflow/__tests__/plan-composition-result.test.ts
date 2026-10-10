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
});

describe('compilePlannedMapping — component_tree passthrough', () => {
  it('emits $record.<field> for a component_tree mapping and plan done accepts that tree', async () => {
    const tree = [
      {
        component: 'test_integration_vue:section',
        props: { max_width: 'lg' },
        slots: { column_1: [{ component: 'test_integration_vue:hero' }] },
      },
    ];
    const { plan, errors } = await buildPlan(
      {
        workflow: 'design-entity',
        composition: {
          components: [],
          mappings: [],
          samples: [],
          scenes: [],
          data_model: {
            canvas_page: {
              landing_page: {
                fields: { components: { type: 'component_tree' } },
                view_modes: { full: { template: 'canvas' } },
              },
            },
          },
        },
        tasks: [
          {
            step: 'write-component',
            task: 'write-component',
            title: 'section',
            params: {
              component: {
                component: 'section',
                group: 'layout',
                props: {
                  type: 'object',
                  properties: { max_width: { type: 'string' } },
                  required: [],
                  additionalProperties: false,
                },
                slots: { column_1: { description: 'column', required: false } },
              },
            },
          },
          {
            step: 'write-component',
            task: 'write-component',
            title: 'hero',
            params: {
              component: {
                component: 'hero',
                group: 'layout',
                props: {
                  type: 'object',
                  properties: {},
                  required: [],
                  additionalProperties: false,
                },
                slots: {},
              },
            },
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
              records: [{ id: 'home', summary: 'Home', values: { components: tree } }],
            },
          },
          {
            step: 'map-entity',
            task: 'map-entity--design-screen',
            title: 'landing_page',
            params: {
              mapping: {
                entity_type: 'canvas_page',
                bundle: 'landing_page',
                mode_kind: 'view',
                view_mode: 'full',
              },
              data_model: {},
            },
          },
        ],
      },
      vueOpts,
    );
    expect(errors).toEqual([]);
    const task = findTask(plan!, 'map-entity', 'landing_page');
    const expr = compilePlannedMapping(task, plan!);
    expect(expr).toContain('$record.components');
    expect(expr).not.toContain('bindings');
    expect((await validateCompositionResult(plan!, task, { 'entity-mapping': expr })).ok).toBe(true);

    const wrapped = `(
  $fields := $;
  [{ "component": "test_integration_vue:section" }]
)
`;
    expect((await validateCompositionResult(plan!, task, { 'entity-mapping': wrapped })).ok).toBe(false);

    const sample = findTask(plan!, 'create-sample-data', 'landing_page');
    const matching = {
      'sample-data': [{ id: 'home', components: tree, __designbook: { section: 'home' } }],
    };
    expect((await validateCompositionResult(plan!, sample, matching)).ok).toBe(true);
    const swapped = {
      'sample-data': [
        {
          id: 'home',
          components: [{ component: 'test_integration_vue:hero' }],
          __designbook: { section: 'home' },
        },
      ],
    };
    expect((await validateCompositionResult(plan!, sample, swapped)).ok).toBe(false);
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
