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
              data_model: {},
              component: 'test_integration_vue:signage',
              bindings: [],
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

  it('accepts a string field bound to a slot', async () => {
    const list = structuredClone(fixture);
    const write = list.tasks.find((t) => t.step === 'write-component' && t.title === 'signage')!;
    (write.params!.component as { slots: Record<string, unknown> }).slots.kicker = {
      description: 'Style as slot content',
      required: false,
    };
    const map = list.tasks.find((t) => t.step === 'map-entity' && t.title === 'signage')!;
    (map.params!.bindings as unknown[]).push({ field: 'field_paragraph_style', slot: 'kicker' });
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(errors).toEqual([]);
    expect(plan).not.toBeNull();
    const text = renderCompositionTree(deriveComposition(plan!).tree);
    expect(text).toContain('slot kicker ← field_paragraph_style');
  });

  it('rejects a reference-field slot binding without an entity descriptor', async () => {
    const list = structuredClone(fixture);
    const map = list.tasks.find((t) => t.step === 'map-entity' && t.title === 'signage')!;
    const bindings = map.params!.bindings as Array<{ field: string; slot?: string; entity?: unknown }>;
    const items = bindings.find((b) => b.slot === 'items')!;
    delete items.entity;
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/bindings\[\d+\]\.entity/);
    expect(errors.join('\n')).toMatch(/field_signage_item/);
  });

  it('rejects an image-field prop binding', async () => {
    const list = structuredClone(fixture);
    const model = list.composition!.data_model as {
      content: { paragraph: { signage: { fields: Record<string, unknown> } } };
    };
    model.content.paragraph.signage.fields.field_image = { type: 'image', title: 'Bild' };
    const write = list.tasks.find((t) => t.step === 'write-component' && t.title === 'signage')!;
    const component = write.params!.component as {
      props: { properties: Record<string, unknown> };
    };
    component.props.properties.hero = { type: 'string' };
    const map = list.tasks.find((t) => t.step === 'map-entity' && t.title === 'signage')!;
    (map.params!.bindings as unknown[]).push({ field: 'field_image', prop: 'hero' });
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

function vueContract(
  name: string,
  props: Record<string, { type: string }> = {},
  slots: string[] = [],
): Record<string, unknown> {
  return {
    component: name,
    group: 'layout',
    props: {
      type: 'object',
      properties: props,
      required: [],
      additionalProperties: false,
    },
    slots: Object.fromEntries(slots.map((slot) => [slot, { description: slot, required: false }])),
  };
}

const pageTree = [
  {
    component: 'test_integration_vue:section',
    props: { max_width: 'lg' },
    slots: {
      column_1: [
        {
          component: 'test_integration_vue:hero',
          slots: {
            content: [
              {
                component: 'test_integration_vue:rich_snippet',
                props: { headline: 'Welcome' },
              },
            ],
          },
        },
      ],
    },
  },
];

function canvasTaskList(): TaskList {
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
              fields: { components: { type: 'component_tree' } },
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
        params: { component: vueContract('section', { max_width: { type: 'string' } }, ['column_1']) },
      },
      {
        step: 'write-component',
        task: 'write-component',
        title: 'hero',
        params: { component: vueContract('hero', {}, ['content']) },
      },
      {
        step: 'write-component',
        task: 'write-component',
        title: 'rich_snippet',
        params: { component: vueContract('rich_snippet', { headline: { type: 'string' } }) },
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
          records: [{ id: 'home', summary: 'Home', values: { components: pageTree } }],
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

describe('deriveComposition — component_tree sample fields', () => {
  it('renders the sample ComponentNode tree on the mapped entity', async () => {
    const { plan, errors } = await buildPlan(canvasTaskList(), vueOpts);
    expect(errors).toEqual([]);
    const text = renderCompositionTree(deriveComposition(plan!).tree);
    expect(text).toContain('canvas_page.landing_page [full]');
    expect(text).toContain('test_integration_vue:section (neu)');
    expect(text).toContain('slot column_1');
    expect(text).toContain('test_integration_vue:hero (neu)');
    expect(text).toContain('test_integration_vue:rich_snippet (neu)');
    expect(text).not.toMatch(/^test_integration_vue:section/m);
  });

  it('rejects an unknown component id in the sample tree', async () => {
    const list = canvasTaskList();
    const sample = list.tasks.find((t) => t.step === 'create-sample-data')!;
    sample.params = {
      ...sample.params,
      records: [
        {
          id: 'home',
          summary: 'Home',
          values: { components: [{ component: 'test_integration_vue:missing' }] },
        },
      ],
    };
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/missing/);
  });

  it('rejects a component_tree field that is not a ComponentNode array', async () => {
    const list = canvasTaskList();
    const sample = list.tasks.find((t) => t.step === 'create-sample-data')!;
    sample.params = {
      ...sample.params,
      records: [{ id: 'home', summary: 'Home', values: { components: 'plain' } }],
    };
    const { plan, errors } = await buildPlan(list, vueOpts);
    expect(plan).toBeNull();
    expect(errors.join('\n')).toMatch(/ComponentNode/);
  });
});

const aboutTree = [
  {
    component: 'test_integration_vue:section',
    props: { max_width: 'md' },
    slots: {
      column_1: [{ component: 'test_integration_vue:rich_snippet', props: { headline: 'About' } }],
    },
  },
];

type SampleRecords = Array<{ id: string; summary?: string; values?: Record<string, unknown> }>;

function taskOf(list: TaskList, step: string): { params: Record<string, unknown> } {
  const task = list.tasks.find((t) => t.step === step)!;
  task.params ??= {};
  return task as { params: Record<string, unknown> };
}

function withRecords(list: TaskList, records: SampleRecords): TaskList {
  const sample = taskOf(list, 'create-sample-data');
  sample.params = { ...sample.params, records: records.map((r) => ({ summary: r.id, ...r })) };
  return list;
}

function twoRecordList(): TaskList {
  return withRecords(canvasTaskList(), [
    { id: 'home', summary: 'Home', values: { components: pageTree } },
    { id: 'about', summary: 'About', values: { components: aboutTree } },
  ]);
}

function landingModel(list: TaskList): Record<string, unknown> {
  const model = list.composition!.data_model as {
    content: { canvas_page: { landing_page: Record<string, unknown> } };
  };
  return model.content.canvas_page.landing_page;
}

function addScene(list: TaskList, item: Record<string, unknown>): TaskList {
  list.tasks.push({
    step: 'write-scene',
    task: 'write-scene',
    title: 'Landing',
    params: {
      scene_name: 'Landing',
      scene_scope: 'standalone',
      scene_path: 'sections/landing/landing.section.scenes.yml',
      components_dir: 'components',
      items: [{ entity: 'canvas_page.landing_page', view_mode: 'full', ...item }],
    },
  });
  return list;
}

async function treeText(list: TaskList): Promise<string> {
  const { plan, errors } = await buildPlan(list, vueOpts);
  expect(errors).toEqual([]);
  return renderCompositionTree(deriveComposition(plan!).tree);
}

async function buildErrors(list: TaskList): Promise<string> {
  const { plan, errors } = await buildPlan(list, vueOpts);
  expect(plan).toBeNull();
  return errors.join('\n');
}

describe('deriveComposition — component_tree mapping contract', () => {
  it('rejects a wrapper even when bindings are omitted', async () => {
    const list = canvasTaskList();
    taskOf(list, 'map-entity').params.component = 'test_integration_vue:section';
    expect(await buildErrors(list)).toMatch(/component.*component_tree/);
  });

  it('accepts omitted and empty bindings', async () => {
    const list = canvasTaskList();
    taskOf(list, 'map-entity').params.bindings = [];
    expect(await treeText(list)).toContain('test_integration_vue:section (neu)');
  });

  it('rejects nonempty bindings on a tree bundle', async () => {
    const list = canvasTaskList();
    taskOf(list, 'map-entity').params.bindings = [{ field: 'components', slot: 'column_1' }];
    expect(await buildErrors(list)).toMatch(/bindings.*component_tree/);
  });

  it('rejects a second component_tree field on mapped and sample-only bundles', async () => {
    const mapped = canvasTaskList();
    landingModel(mapped).fields = { components: { type: 'component_tree' }, aside: { type: 'component_tree' } };
    expect(await buildErrors(mapped)).toMatch(/at most one component_tree field on canvas_page\.landing_page/);

    const sampleOnly = canvasTaskList();
    sampleOnly.tasks = sampleOnly.tasks.filter((t) => t.step !== 'map-entity');
    landingModel(sampleOnly).fields = { components: { type: 'component_tree' }, aside: { type: 'component_tree' } };
    const errors = await buildErrors(sampleOnly);
    expect(errors).toMatch(/create-sample-data \[landing_page\].*at most one component_tree field/);
    expect(errors).not.toMatch(/aside.*ComponentNode/);
  });

  it('activates on the field type alone, whatever the field and template are called', async () => {
    const list = withRecords(canvasTaskList(), [{ id: 'home', values: { layout: pageTree } }]);
    Object.assign(landingModel(list), {
      fields: { layout: { type: 'component_tree' } },
      view_modes: { full: { template: 'field-map' } },
    });
    const text = await treeText(list);
    expect(text).toContain('canvas_page.landing_page [full]');
    expect(text).toContain('test_integration_vue:rich_snippet (neu)');
  });

  it('does not walk a canvas template without a component_tree field', async () => {
    const list = canvasTaskList();
    landingModel(list).fields = { components: { type: 'json' } };
    expect(await buildErrors(list)).toMatch(/landing_page:full uses unsupported structure canvas/);
  });
});

describe('deriveComposition — component_tree sample validation', () => {
  it.each([
    ['missing', {}],
    ['null', { components: null }],
    ['object', { components: pageTree[0] }],
    ['string', { components: 'plain' }],
  ])('rejects a %s tree field at its record path', async (_label, values) => {
    const errors = await buildErrors(withRecords(canvasTaskList(), [{ id: 'home', values }]));
    expect(errors).toMatch(
      /create-sample-data \[landing_page\] records\[0\]\.values\.components: expected ComponentNode\[\]/,
    );
  });

  it('accepts an empty tree', async () => {
    const text = await treeText(withRecords(canvasTaskList(), [{ id: 'home', values: { components: [] } }]));
    expect(text).toContain('canvas_page.landing_page [full]');
  });

  it('rejects an unknown nested component at its exact path', async () => {
    const tree = structuredClone(pageTree);
    tree[0]!.slots.column_1[0]!.slots.content[0]!.component = 'test_integration_vue:missing';
    const errors = await buildErrors(withRecords(canvasTaskList(), [{ id: 'home', values: { components: tree } }]));
    expect(errors).toContain(
      'records[0].values.components[0].slots.column_1[0].slots.content[0].component: no contract for test_integration_vue:missing',
    );
  });

  it('validates every record, not only the first', async () => {
    const list = twoRecordList();
    const records = taskOf(list, 'create-sample-data').params.records as SampleRecords;
    records[1]!.values = { components: [{ component: 'test_integration_vue:missing' }] };
    const errors = await buildErrors(list);
    expect(errors).toMatch(
      /records\[1\]\.values\.components\[0\]\.component: no contract for test_integration_vue:missing/,
    );
  });

  it('validates an unselected record even when a scene selects another', async () => {
    const list = addScene(twoRecordList(), { record: 0 });
    const records = taskOf(list, 'create-sample-data').params.records as SampleRecords;
    records[1]!.values = { components: 'plain' };
    expect(await buildErrors(list)).toMatch(/records\[1\]\.values\.components: expected ComponentNode\[\]/);
  });

  it('accepts text and component-array slots', async () => {
    const tree = [
      {
        component: 'test_integration_vue:hero',
        slots: { content: 'Plain text' },
      },
      {
        component: 'test_integration_vue:hero',
        slots: { content: [] },
      },
    ];
    const text = await treeText(withRecords(canvasTaskList(), [{ id: 'home', values: { components: tree } }]));
    expect(text).toContain('slot content');
  });

  it.each([
    [
      'bare object',
      { component: 'test_integration_vue:rich_snippet' },
      'slots.content: expected string or ComponentNode[]',
    ],
    ['string member', ['text'], 'slots.content[0]: expected ComponentNode'],
    [
      'entity member',
      [{ entity: 'canvas_page.landing_page', view_mode: 'full' }],
      'slots.content[0]: expected ComponentNode',
    ],
    ['scene member', [{ scene: 'landing:Landing' }], 'slots.content[0]: expected ComponentNode'],
  ])('rejects a %s in a slot', async (_label, content, message) => {
    const tree = [{ component: 'test_integration_vue:hero', slots: { content } }];
    const errors = await buildErrors(withRecords(canvasTaskList(), [{ id: 'home', values: { components: tree } }]));
    expect(errors).toContain(`records[0].values.components[0].${message}`);
  });

  it('rejects an unknown prop inside the tree', async () => {
    const tree = [{ component: 'test_integration_vue:rich_snippet', props: { nope: 'x' } }];
    const errors = await buildErrors(withRecords(canvasTaskList(), [{ id: 'home', values: { components: tree } }]));
    expect(errors).toContain('records[0].values.components[0].props.nope: unknown prop nope');
  });

  it('validates frozen baseline sample trees against contracts', async () => {
    const list = canvasTaskList();
    list.tasks = list.tasks.filter((t) => t.step !== 'create-sample-data');
    list.composition!.samples = [
      {
        entity_type: 'canvas_page',
        bundle: 'landing_page',
        records: [
          { id: 'home', summary: 'Home', values: { components: [{ component: 'test_integration_vue:missing' }] } },
        ],
      },
    ];
    expect(await buildErrors(list)).toMatch(
      /composition\.samples\[0\]\.records\[0\]\.values\.components\[0\]\.component: no contract/,
    );

    list.composition!.samples[0]!.records[0]!.values = { components: pageTree };
    expect(await treeText(list)).toContain('test_integration_vue:rich_snippet (neu)');
  });
});

describe('deriveComposition — component_tree display', () => {
  it('shows every record of a mapped tree bundle without a scene, in record order', async () => {
    const text = await treeText(twoRecordList());
    const first = text.indexOf('canvas_page.landing_page [full] record 0');
    const second = text.indexOf('canvas_page.landing_page [full] record 1');
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
    expect(text.slice(second)).toContain('test_integration_vue:rich_snippet (neu)');
    expect(text.slice(second)).not.toContain('test_integration_vue:hero');
    expect(text).not.toMatch(/^test_integration_vue:/m);
  });

  it('shows every record of a sample-only tree bundle without inventing a mode', async () => {
    const list = twoRecordList();
    list.tasks = list.tasks.filter((t) => t.step !== 'map-entity');
    const text = await treeText(list);
    expect(text).toContain('canvas_page.landing_page record 0');
    expect(text).toContain('canvas_page.landing_page record 1');
    expect(text).not.toContain('[full]');
  });

  it('renders the full nesting entity → component → slot → child component', async () => {
    const text = await treeText(canvasTaskList());
    expect(text).toBe(
      [
        'canvas_page.landing_page [full] record 0',
        '└─ test_integration_vue:section (neu)',
        '   └─ slot column_1',
        '      └─ test_integration_vue:hero (neu)',
        '         └─ slot content',
        '            └─ test_integration_vue:rich_snippet (neu)',
      ].join('\n'),
    );
  });

  it('shows the scene-selected record', async () => {
    const text = await treeText(addScene(twoRecordList(), { record: 1 }));
    expect(text).toContain('canvas_page.landing_page [full] record 1');
    expect(text).not.toContain('record 0');
    expect(text).not.toContain('test_integration_vue:hero');
  });

  it('shows each record of a multi-record scene item in selection order', async () => {
    const text = await treeText(addScene(twoRecordList(), { records: [1, 0] }));
    const one = text.indexOf('canvas_page.landing_page [full] record 1');
    const zero = text.indexOf('canvas_page.landing_page [full] record 0');
    expect(one).toBeGreaterThan(-1);
    expect(zero).toBeGreaterThan(one);
    expect(text.slice(zero)).toContain('test_integration_vue:hero (neu)');
  });

  it('expands the selected tree records behind an entity reference binding', async () => {
    const list = twoRecordList();
    Object.assign((list.composition!.data_model as { content: object }).content, {
      paragraph: {
        teaser: {
          fields: {
            field_page: {
              type: 'reference',
              settings: { target_type: 'canvas_page', target_bundle: 'landing_page' },
            },
          },
          view_modes: { full: { template: 'field-map' } },
        },
      },
    });
    list.tasks.push(
      {
        step: 'write-component',
        task: 'write-component',
        title: 'teaser',
        params: { component: vueContract('teaser', {}, ['page']) },
      },
      {
        step: 'create-sample-data',
        task: 'create-sample-data',
        title: 'teaser',
        params: {
          section_id: 'home',
          bundle: { entity_type: 'paragraph', bundle: 'teaser' },
          data_model: {},
          components_dir: '/tmp/components',
          records: [{ id: 't1', summary: 'Teaser', values: { field_page: ['about'] } }],
        },
      },
      {
        step: 'map-entity',
        task: 'map-entity--design-screen',
        title: 'teaser',
        params: {
          mapping: { entity_type: 'paragraph', bundle: 'teaser', mode_kind: 'view', view_mode: 'full' },
          data_model: {},
          component: 'test_integration_vue:teaser',
          bindings: [
            {
              field: 'field_page',
              slot: 'page',
              entity: { entity_type: 'canvas_page', bundle: 'landing_page', view_mode: 'full' },
            },
          ],
        },
      },
    );
    addScene(list, {});
    const scene = taskOf(list, 'write-scene');
    scene.params.items = [{ entity: 'paragraph.teaser', view_mode: 'full', record: 0 }];
    const text = await treeText(list);
    expect(text).toContain('slot page ← field_page (reference, 1 selected records)');
    const nested = text.indexOf('canvas_page.landing_page [full] record 1');
    expect(nested).toBeGreaterThan(text.indexOf('slot page'));
    expect(text.slice(nested)).toContain('test_integration_vue:rich_snippet (neu)');
    expect(text).not.toContain('canvas_page.landing_page [full] record 0');
  });

  it('derives statuses from planned writes and baseline contracts and keeps root order', async () => {
    const list = withRecords(canvasTaskList(), [
      {
        id: 'home',
        values: {
          components: [
            { component: 'test_integration_vue:rich_snippet', props: { headline: 'First' } },
            { component: 'test_integration_vue:hero', slots: { content: 'Second' } },
            { component: 'test_integration_vue:section', slots: { column_1: [] } },
          ],
        },
      },
    ]);
    list.tasks = list.tasks.filter((t) => t.title !== 'hero');
    list.composition!.components = [
      { id: 'test_integration_vue:hero', contract: vueContract('hero', {}, ['content']), source: '', hash: '' },
      {
        id: 'test_integration_vue:section',
        contract: vueContract('section', { max_width: { type: 'string' } }, ['column_1']),
        source: '',
        hash: '',
      },
    ];
    const text = await treeText(list);
    const a = text.indexOf('test_integration_vue:rich_snippet (neu)');
    const b = text.indexOf('test_integration_vue:hero (wiederverwendet)');
    const c = text.indexOf('test_integration_vue:section (geändert)');
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

describe('deriveComposition — component_tree identity and node shape', () => {
  it.each([
    ['a foreign namespace', 'bogus_ns:section'],
    ['a bare id', 'section'],
  ])('rejects %s in the tree instead of qualifying writes from it', async (_label, id) => {
    const tree = [{ component: id, slots: { column_1: [] } }];
    const errors = await buildErrors(withRecords(canvasTaskList(), [{ id: 'home', values: { components: tree } }]));
    expect(errors).toContain(`records[0].values.components[0].component: no contract for ${id}`);
  });

  it('qualifies planned writes from the configured namespace, not from sample values', async () => {
    const list = withRecords(canvasTaskList(), [
      { id: 'home', values: { components: [{ component: 'a:section' }, { component: 'b:hero' }] } },
    ]);
    const errors = await buildErrors(list);
    expect(errors).toMatch(/no contract for a:section/);
    expect(errors).toMatch(/no contract for b:hero/);
    const { plan } = await buildPlan(canvasTaskList(), vueOpts);
    expect(plan!.composition!.namespace).toBe('test_integration_vue');
  });

  it.each([
    ['slots', { component: 'test_integration_vue:hero', slots: 'oops' }, 'slots: expected object'],
    ['props', { component: 'test_integration_vue:rich_snippet', props: 'oops' }, 'props: expected object'],
  ])('rejects non-object %s on a tree node', async (_label, node, message) => {
    const errors = await buildErrors(withRecords(canvasTaskList(), [{ id: 'home', values: { components: [node] } }]));
    expect(errors).toContain(`records[0].values.components[0].${message}`);
  });
});
