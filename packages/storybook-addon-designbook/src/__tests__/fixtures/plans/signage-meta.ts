/**
 * Signage fixture extended with a `meta` slot that holds several bindings,
 * two of them wrapped in a `list_cell` component with a fixed caption.
 */
import type { TaskList } from '../../../workflow/plan-build.js';

export const LIST_CELL = 'test_integration_vue:list_cell';

export function signageMeta(base: TaskList): TaskList {
  const list = structuredClone(base);
  const model = list.composition!.data_model as {
    content: { paragraph: { signage: { fields: Record<string, unknown> } } };
  };
  model.content.paragraph.signage.fields.field_version = { type: 'string', title: 'Version' };
  model.content.paragraph.signage.fields.field_license = { type: 'string', title: 'License' };
  const write = list.tasks.find((t) => t.step === 'write-component' && t.title === 'signage')!;
  (write.params!.component as { slots: Record<string, unknown> }).slots.meta = {
    description: 'Meta items',
    required: false,
  };
  list.tasks.splice(1, 0, {
    step: 'write-component',
    task: 'write-component',
    title: 'list_cell',
    params: {
      component: {
        component: 'list_cell',
        group: 'content',
        props: {
          type: 'object',
          properties: { caption: { type: 'string' }, value: { type: 'string' } },
          required: ['caption'],
          additionalProperties: false,
        },
        slots: { content: { description: 'Cell content', required: false } },
      },
    },
  });
  const sample = list.tasks.find((t) => t.step === 'create-sample-data' && t.title === 'signage')!;
  const values = (sample.params!.records as Array<{ values: Record<string, unknown> }>)[0]!.values;
  values.field_version = '1.2';
  values.field_license = 'MIT';
  const map = list.tasks.find((t) => t.step === 'map-entity' && t.title === 'signage')!;
  const [style, overlapping, items] = map.params!.bindings as unknown[];
  map.params!.bindings = [
    style,
    overlapping,
    { field: 'field_paragraph_style', slot: 'meta' },
    {
      field: 'field_version',
      slot: 'meta',
      wrap: { component: LIST_CELL, props: { caption: 'Version' }, prop: 'value' },
    },
    items,
    {
      field: 'field_signage_item',
      slot: 'meta',
      entity: { entity_type: 'paragraph', bundle: 'signage_item', view_mode: 'full' },
    },
    {
      field: 'field_license',
      slot: 'meta',
      wrap: { component: LIST_CELL, props: { caption: 'License' }, prop: 'value' },
    },
  ];
  return list;
}
