/**
 * Composition derivation joins writing-design task params with the frozen snapshot
 * and renders the scene → entity → component → prop/slot tree.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { load as parseYaml } from 'js-yaml';
import { buildPlan, type TaskList } from '../workflow/plan-build.js';
import { parsePlan, serializePlan, planDigest, type Plan, type PlanTask } from '../workflow/plan-document.js';
import { deriveComposition, renderCompositionTree } from '../workflow/plan-composition.js';
import { compilePlannedMapping } from '../workflow/plan-composition-result.js';
import type { DesignbookConfig } from '../shared/config.js';

const agents = resolve(process.cwd(), '../../.agents');
const vueOpts = {
  agentsDir: agents,
  config: {
    data: '/tmp/plan-composition',
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

function mappingTask(plan: Plan, title = 'signage'): PlanTask {
  for (const step of plan.steps) {
    const found = step.tasks.find((t) => t.name === 'map-entity--design-screen' && t.title === title);
    if (found) return found;
  }
  throw new Error(`mapping task "${title}" not found`);
}

function sceneTask(plan: Plan): PlanTask {
  for (const step of plan.steps) {
    const found = step.tasks.find((t) => t.name === 'write-scene');
    if (found) return found;
  }
  throw new Error('write-scene task not found');
}

async function buildSignage(list: TaskList = fixture): Promise<Plan> {
  const { plan, errors } = await buildPlan(list, vueOpts);
  expect(errors).toEqual([]);
  expect(plan).not.toBeNull();
  return plan!;
}

describe('deriveComposition — signage fixture', () => {
  it('renders selected child count and field sources for the signage tree', async () => {
    const signagePlan = await buildSignage();
    const result = deriveComposition(signagePlan);
    expect(result.errors).toEqual([]);
    const text = renderCompositionTree(result.tree);
    expect(text).toContain('field_signage_item');
    expect(text).toContain('3 selected records');
    expect(text).toContain('paragraph.signage [full]');
    expect(text).toContain('test_integration_vue:signage (neu)');
    expect(text).toContain('test_integration_vue:signage_item (neu)');
    expect(text).toContain('prop style ← field_paragraph_style');
  });

  it('reports a missing child view mode on the exact binding path', async () => {
    const signagePlan = await buildSignage();
    const invalid = structuredClone(signagePlan);
    const bindings = mappingTask(invalid).params.bindings as Array<{ entity?: { view_mode: string } }>;
    bindings[2]!.entity!.view_mode = 'missing';
    expect(deriveComposition(invalid).errors.join('\n')).toContain('bindings[2].entity.view_mode');
  });

  it('rejects an unknown field, unknown prop, and wrong reference target', async () => {
    const signagePlan = await buildSignage();

    const unknownField = structuredClone(signagePlan);
    (mappingTask(unknownField).params.bindings as Array<{ field: string }>)[0]!.field = 'field_nope';
    expect(deriveComposition(unknownField).errors.join('\n')).toMatch(/field_nope/);

    const unknownProp = structuredClone(signagePlan);
    (mappingTask(unknownProp).params.bindings as Array<{ prop?: string }>)[0]!.prop = 'missingProp';
    expect(deriveComposition(unknownProp).errors.join('\n')).toMatch(/missingProp/);

    const wrongTarget = structuredClone(signagePlan);
    (mappingTask(wrongTarget).params.bindings as Array<{ entity?: { bundle: string } }>)[2]!.entity!.bundle = 'article';
    expect(deriveComposition(wrongTarget).errors.join('\n')).toMatch(/article/);
  });

  it('rejects duplicate binding targets and duplicate producers', async () => {
    const signagePlan = await buildSignage();
    const dupTarget = structuredClone(signagePlan);
    const bindings = mappingTask(dupTarget).params.bindings as Array<{ prop?: string }>;
    bindings[1]!.prop = 'style';
    expect(deriveComposition(dupTarget).errors.join('\n')).toMatch(/style/);

    const dup = structuredClone(fixture);
    dup.tasks = [
      ...dup.tasks,
      {
        step: 'write-component',
        task: 'write-component',
        title: 'signage-again',
        params: structuredClone(dup.tasks[0]!.params),
      },
    ];
    const { plan, errors } = await buildPlan(dup, vueOpts);
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/signage/);
  });

  it('rejects a mapping whose component has no producer or baseline contract', async () => {
    const list = structuredClone(fixture);
    list.tasks = list.tasks.filter((t) => t.title !== 'signage' || t.step !== 'write-component');
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/test_integration_vue:signage/);
  });

  it('rejects a literal prop type mismatch on a scene component node', async () => {
    const signagePlan = await buildSignage();
    const invalid = structuredClone(signagePlan);
    sceneTask(invalid).params.items = [
      {
        component: 'test_integration_vue:signage',
        props: { style: 'default', overlapping: 'yes' },
        slots: { items: [] },
      },
    ];
    expect(deriveComposition(invalid).errors.join('\n')).toMatch(/overlapping/);
  });

  it('derives neu / geändert / wiederverwendet from baseline membership and planned writes', async () => {
    const signagePlan = await buildSignage();
    const mixed = structuredClone(signagePlan);
    mixed.composition = {
      ...mixed.composition!,
      components: [
        {
          id: 'test_integration_vue:signage_item',
          contract: mixed.steps
            .flatMap((s) => s.tasks)
            .find((t) => t.title === 'signage_item' && t.name === 'write-component')!.params.component as Record<
            string,
            unknown
          >,
          source: '/frozen/signage_item.vue',
          hash: 'abc',
        },
        {
          id: 'test_integration_vue:button',
          contract: {
            component: 'button',
            group: 'content',
            props: {
              type: 'object',
              properties: {},
              required: [],
              additionalProperties: false,
            },
            slots: {},
          },
          source: '/frozen/button.vue',
          hash: 'def',
        },
      ],
    };
    mixed.steps
      .flatMap((s) => s.tasks)
      .find((t) => t.title === 'signage_item' && t.name === 'write-component')!.params.component = {
      ...(mixed.steps.flatMap((s) => s.tasks).find((t) => t.title === 'signage_item' && t.name === 'write-component')!
        .params.component as object),
      description: 'changed copy',
    };
    const text = renderCompositionTree(deriveComposition(mixed).tree);
    expect(text).toContain('test_integration_vue:signage (neu)');
    expect(text).toContain('test_integration_vue:signage_item (geändert)');
  });

  it('keeps planned component-only roots when the workflow has no scene', async () => {
    const { plan, errors } = await buildPlan(
      {
        workflow: 'design-component',
        composition: {
          components: [],
          mappings: [],
          samples: [],
          scenes: [],
          data_model: {},
        },
        tasks: [
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
        ],
      },
      vueOpts,
    );
    expect(errors).toEqual([]);
    const text = renderCompositionTree(deriveComposition(plan!).tree);
    expect(text).toMatch(/hero/);
    expect(text).toContain('neu');
  });

  it('resolves scene references with substitutions and terminates cycles', async () => {
    const signagePlan = await buildSignage();
    const withRef = structuredClone(signagePlan);
    withRef.composition = {
      ...withRef.composition!,
      scenes: [
        {
          path: 'sections/inner/inner.section.scenes.yml',
          file: {
            id: 'inner',
            title: 'Inner',
            scenes: [
              {
                name: 'Inner',
                items: [{ entity: 'paragraph.signage', view_mode: 'full', record: 0 }],
              },
            ],
          },
        },
      ],
    };
    sceneTask(withRef).params.items = [
      { scene: 'inner:Inner', with: { extra: 'note' } },
      { image: 'ratio_16_9', alt: 'hero' },
    ];
    const ok = deriveComposition(withRef);
    expect(ok.errors).toEqual([]);
    const text = renderCompositionTree(ok.tree);
    expect(text).toContain('inner:Inner');
    expect(text).toContain('ratio_16_9');
    expect(text).toContain('paragraph.signage');

    const cyclic = structuredClone(signagePlan);
    cyclic.composition = {
      ...cyclic.composition!,
      scenes: [
        {
          path: 'sections/a/a.section.scenes.yml',
          file: {
            id: 'a',
            title: 'A',
            scenes: [{ name: 'A', items: [{ scene: 'b:B' }] }],
          },
        },
        {
          path: 'sections/b/b.section.scenes.yml',
          file: {
            id: 'b',
            title: 'B',
            scenes: [{ name: 'B', items: [{ scene: 'a:A' }] }],
          },
        },
      ],
    };
    sceneTask(cyclic).params.items = [{ scene: 'a:A' }];
    expect(deriveComposition(cyclic).errors.join('\n')).toMatch(/a:A/);
  });

  it('preserves declared binding order and non-numeric reordered record IDs', async () => {
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
    const text = renderCompositionTree(deriveComposition(plan).tree);
    expect(text).toContain('3 selected records');
    const styleAt = text.indexOf('prop style ← field_paragraph_style');
    const overlapAt = text.indexOf('prop overlapping ← field_overlapping_top');
    const itemsAt = text.indexOf('slot items ← field_signage_item');
    expect(styleAt).toBeGreaterThan(-1);
    expect(overlapAt).toBeGreaterThan(styleAt);
    expect(itemsAt).toBeGreaterThan(overlapAt);
  });

  it('rejects an empty required child sample pool', async () => {
    const list = structuredClone(fixture);
    const sample = list.tasks.find((t) => t.step === 'create-sample-data' && t.title === 'signage_item')!;
    sample.params = { ...sample.params, records: [] };
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/signage_item/);
  });

  it('extends the existing sample pool by updating matching ids in place and appending new ones', async () => {
    const list = structuredClone(fixture);
    list.composition = {
      ...list.composition!,
      samples: [
        {
          entity_type: 'paragraph',
          bundle: 'signage_item',
          records: [
            { id: '1', summary: 'old-1', values: { field_title: 'old-1' } },
            { id: 'keep', summary: 'keep-me', values: { field_title: 'keep' } },
          ],
        },
      ],
    };
    const parent = list.tasks.find((t) => t.step === 'create-sample-data' && t.title === 'signage')!;
    const parentRecords = parent.params?.records as Array<{ values: { field_signage_item: string[] } }>;
    parentRecords[0]!.values.field_signage_item = ['1', 'keep', '2'];
    const plan = await buildSignage(list);
    const result = deriveComposition(plan);
    expect(result.errors).toEqual([]);
    expect(renderCompositionTree(result.tree)).toContain('3 selected records');
  });

  it('terminates cyclic entity-mode graphs with a reference marker', async () => {
    const signagePlan = await buildSignage();
    const cyclic = structuredClone(signagePlan);
    const model = cyclic.composition!.data_model as {
      content: { paragraph: { signage_item: { fields: Record<string, unknown> } } };
    };
    model.content.paragraph.signage_item.fields.field_parent = {
      type: 'reference',
      settings: { target_type: 'paragraph', target_bundle: 'signage' },
    };
    const itemWrite = cyclic.steps
      .flatMap((s) => s.tasks)
      .find((t) => t.name === 'write-component' && t.title === 'signage_item')!;
    (itemWrite.params.component as { slots: Record<string, unknown> }).slots.parent = {
      description: 'parent signage',
    };
    const itemMap = mappingTask(cyclic, 'signage_item');
    (itemMap.params.bindings as Array<Record<string, unknown>>).push({
      field: 'field_parent',
      slot: 'parent',
      entity: { entity_type: 'paragraph', bundle: 'signage', view_mode: 'full' },
    });
    const result = deriveComposition(cyclic);
    expect(result.errors.join('\n')).toMatch(/cyclic/);
    const text = renderCompositionTree(result.tree);
    const hits = text.split('paragraph.signage [full]').length - 1;
    expect(hits).toBeGreaterThanOrEqual(2);
    expect(hits).toBeLessThan(5);
  });
});

describe('buildPlan composition sealing', () => {
  it('still builds unrelated workflows that omit composition', async () => {
    const { plan, errors } = await buildPlan(
      { workflow: 'vision', tasks: [{ step: 'create-vision', task: 'create-vision', title: 'v', params: {} }] },
      vueOpts,
    );
    expect(errors).toEqual([]);
    expect(plan).not.toBeNull();
    expect(plan!.composition).toBeUndefined();
  });

  it('rejects a composition snapshot that fails CompositionInputs', async () => {
    const { plan, errors } = await buildPlan(
      {
        workflow: 'design-entity',
        composition: { components: [] } as unknown as TaskList['composition'],
        tasks: [
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
        ],
      },
      vueOpts,
    );
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/composition/i);
  });

  it('does not run semantic traversal when AJV already failed', async () => {
    const { plan, errors } = await buildPlan(
      {
        workflow: 'design-entity',
        composition: fixture.composition,
        tasks: [
          {
            step: 'map-entity',
            task: 'map-entity--design-screen',
            title: 'signage',
            params: {
              mapping: { entity_type: 'paragraph', bundle: 'signage', mode_kind: 'view', view_mode: 'full' },
              data_model: {},
            },
          },
        ],
      },
      vueOpts,
    );
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/params/);
    expect(errors.join('\n')).not.toMatch(/bindings\[/);
  });

  it('refuses a baseline hash mismatch and a missing source file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'comp-hash-'));
    const source = join(dir, 'signage.vue');
    writeFileSync(source, '<template></template>\n');
    const list = structuredClone(fixture);
    list.composition = {
      ...list.composition!,
      components: [
        {
          id: 'test_integration_vue:hero',
          contract: {
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
          source,
          hash: 'deadbeef',
        },
      ],
    };
    try {
      const mismatch = await buildPlan(list, vueOpts);
      expect(mismatch.plan).toBeNull();
      expect(mismatch.errors.join('\n')).toMatch(/hash/);

      list.composition!.components[0]!.source = join(dir, 'missing.vue');
      list.composition!.components[0]!.hash = createHash('sha256').update('x').digest('hex');
      const missing = await buildPlan(list, vueOpts);
      expect(missing.plan).toBeNull();
      expect(missing.errors.join('\n')).toMatch(/missing\.vue/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('seals composition into the plan; checkboxes do not change digest or tree', async () => {
    const plan = await buildSignage();
    expect(plan.composition).toBeDefined();
    const d1 = plan.digest;
    const t1 = renderCompositionTree(deriveComposition(plan).tree);
    plan.steps[0]!.tasks[0]!.done = true;
    expect(planDigest(plan)).toBe(d1);
    expect(renderCompositionTree(deriveComposition(plan).tree)).toBe(t1);

    const mutated = structuredClone(plan);
    mutated.composition!.samples = [
      ...(mutated.composition!.samples ?? []),
      { entity_type: 'node', bundle: 'page', records: [{ id: 'x' }] },
    ];
    expect(planDigest(mutated)).not.toBe(d1);
  });

  it('round-trips the composition snapshot through parse/serialize', async () => {
    const plan = await buildSignage();
    const back = parsePlan(serializePlan(plan));
    expect(back.composition).toEqual(plan.composition);
    expect(planDigest(back)).toBe(plan.digest);
  });

  it('resolves bundles from data-model.yml content keys', async () => {
    const list = structuredClone(fixture);
    list.composition = {
      ...list.composition!,
      data_model: parseYaml(
        readFileSync(resolve(process.cwd(), '../../fixtures/vue-web/data-model/designbook/data-model.yml'), 'utf8'),
      ) as Record<string, unknown>,
    };
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(errors).toEqual([]);
    expect(plan).not.toBeNull();
    expect(renderCompositionTree(deriveComposition(plan!).tree)).toContain('paragraph.signage [full]');
  });

  it('rejects a reused mapping whose source AST does not match the declared bindings', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'comp-map-'));
    const source = join(dir, 'paragraph.signage_item.view.full.jsonata');
    writeFileSync(source, '[]\n');
    try {
      const list = structuredClone(fixture);
      const child = list.tasks.find((t) => t.step === 'map-entity' && t.title === 'signage_item')!;
      const childParams = child.params!;
      list.composition = {
        ...list.composition!,
        mappings: [
          {
            identity: childParams.mapping as Record<string, unknown>,
            component: childParams.component as string,
            bindings: childParams.bindings as unknown[],
            source,
            hash: createHash('sha256').update('[]\n').digest('hex'),
          },
        ],
      };
      list.tasks = list.tasks.filter((t) => t !== child);
      const { plan, errors } = await buildPlan(list, vueOpts);
      expect(plan).toBeNull();
      expect(errors.join('\n')).toMatch(/composition\.mappings\[0\]/);
      expect(errors.join('\n')).toMatch(/declared bindings/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('seeds child mappings from composition.mappings when the source AST matches', async () => {
    const full = await buildSignage();
    const expected = compilePlannedMapping(mappingTask(full, 'signage_item'), full);
    const dir = mkdtempSync(join(tmpdir(), 'comp-map-ok-'));
    const source = join(dir, 'paragraph.signage_item.view.full.jsonata');
    writeFileSync(source, expected);
    try {
      const list = structuredClone(fixture);
      const child = list.tasks.find((t) => t.step === 'map-entity' && t.title === 'signage_item')!;
      const childParams = child.params!;
      list.composition = {
        ...list.composition!,
        mappings: [
          {
            identity: childParams.mapping as Record<string, unknown>,
            component: childParams.component as string,
            bindings: childParams.bindings as unknown[],
            source,
            hash: createHash('sha256').update(expected).digest('hex'),
          },
        ],
      };
      list.tasks = list.tasks.filter((t) => t !== child);
      const { plan, errors } = await buildPlan(list, vueOpts);
      expect(errors).toEqual([]);
      expect(plan).not.toBeNull();
      const text = renderCompositionTree(deriveComposition(plan!).tree);
      expect(text).toContain('paragraph.signage_item [full]');
      expect(text).toContain('test_integration_vue:signage_item');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects an image-field slot binding without an entity descriptor', async () => {
    const list = structuredClone(fixture);
    const model = list.composition!.data_model as {
      content: { paragraph: { signage: { fields: Record<string, unknown> } } };
    };
    model.content.paragraph.signage.fields.field_image = { type: 'image', title: 'Bild' };
    const write = list.tasks.find((t) => t.step === 'write-component' && t.title === 'signage')!;
    (write.params!.component as { slots: Record<string, unknown> }).slots.image = {
      description: 'Hero image',
      required: false,
    };
    const map = list.tasks.find((t) => t.step === 'map-entity' && t.title === 'signage')!;
    (map.params!.bindings as unknown[]).push({ field: 'field_image', slot: 'image' });
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/bindings\[\d+\]/);
    expect(errors.join('\n')).toMatch(/field_image/);
    expect(errors.join('\n')).toMatch(/cannot be expressed/);
  });

  it('rejects a top-level data_model shape that is not content-keyed', async () => {
    const list = structuredClone(fixture);
    const nested = list.composition!.data_model as {
      content: Record<string, unknown>;
      config: Record<string, unknown>;
    };
    list.composition = {
      ...list.composition!,
      data_model: { ...nested.content, config: nested.config },
    };
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/unknown bundle paragraph\.signage/);
  });

  it('rejects a child bundle missing from target_bundles', async () => {
    const list = structuredClone(fixture);
    const model = list.composition!.data_model as {
      content: {
        paragraph: { signage: { fields: { field_signage_item: { settings: Record<string, unknown> } } } };
      };
    };
    model.content.paragraph.signage.fields.field_signage_item.settings = {
      target_type: 'paragraph',
      target_bundles: ['other'],
    };
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/signage_item/);
    expect(errors.join('\n')).toMatch(/declared target/);
  });

  it('rejects a canvas view-mode template as an unsupported mapping structure', async () => {
    const list = structuredClone(fixture);
    const model = list.composition!.data_model as {
      content: { paragraph: { signage: { view_modes: { full: { template: string } } } } };
    };
    model.content.paragraph.signage.view_modes.full.template = 'canvas';
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/paragraph\.signage/);
    expect(errors.join('\n')).toMatch(/unsupported structure/);
    expect(errors.join('\n')).toMatch(/canvas/);
  });
});
