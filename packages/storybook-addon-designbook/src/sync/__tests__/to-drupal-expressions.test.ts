import { describe, it, expect } from 'vitest';
import { runJsonata, loadJsonata, composeJsonata, runComposed } from './helpers.js';

// Path to the field-types blueprint relative to .agents/skills/
const FIELD_TYPES_REL = 'designbook-drupal/data-model/blueprints/field-types.md';

// Call $fieldToStorage + $fieldToInstance via the prelude composed with a tiny caller expression.
// The prelude block exposes the functions; the caller body invokes them and returns [storage, instance].
async function fieldToDrupal(opts: {
  et: string;
  bundle: string;
  name: string;
  field: Record<string, unknown>;
}): Promise<unknown[]> {
  const prelude = loadJsonata(FIELD_TYPES_REL, 'prelude');
  const callerBody = `
    [
      $fieldToStorage(et, name, field),
      $fieldToInstance(et, bundle, name, field)
    ]
  `;
  const out = await runJsonata(composeJsonata(prelude, callerBody), opts);
  return out as unknown[];
}

describe('field-types to_drupal', () => {
  it('string field → field.storage + field.field', async () => {
    const out = await fieldToDrupal({
      et: 'node',
      bundle: 'article',
      name: 'field_subtitle',
      field: { type: 'string', required: false },
    });
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.storage.node.field_subtitle',
        data: expect.objectContaining({
          type: 'string',
          dependencies: expect.any(Object),
        }),
      }),
    );
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.field.node.article.field_subtitle',
      }),
    );
  });

  it('image field requires image_style and emits image type', async () => {
    const out = await fieldToDrupal({
      et: 'node',
      bundle: 'article',
      name: 'field_hero',
      field: { type: 'image', settings: { image_style: 'hero' } },
    });
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.storage.node.field_hero',
        data: expect.objectContaining({ type: 'image' }),
      }),
    );
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.field.node.article.field_hero',
        data: expect.objectContaining({
          settings: { image_style: 'hero' },
        }),
      }),
    );
  });

  it('text_with_summary field → field.storage + field.field with text_with_summary type', async () => {
    const out = await fieldToDrupal({
      et: 'node',
      bundle: 'page',
      name: 'field_body',
      field: { type: 'text_with_summary', required: false },
    });
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.storage.node.field_body',
        data: expect.objectContaining({ type: 'text_with_summary' }),
      }),
    );
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.field.node.page.field_body',
      }),
    );
  });

  it('integer field → field.storage with integer type', async () => {
    const out = await fieldToDrupal({
      et: 'node',
      bundle: 'article',
      name: 'field_count',
      field: { type: 'integer', required: false },
    });
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.storage.node.field_count',
        data: expect.objectContaining({ type: 'integer' }),
      }),
    );
  });

  it('boolean field → field.storage with boolean type', async () => {
    const out = await fieldToDrupal({
      et: 'node',
      bundle: 'article',
      name: 'field_featured',
      field: { type: 'boolean', required: false },
    });
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.storage.node.field_featured',
        data: expect.objectContaining({ type: 'boolean' }),
      }),
    );
  });

  it('link field → field.storage with link type', async () => {
    const out = await fieldToDrupal({
      et: 'node',
      bundle: 'article',
      name: 'field_cta',
      field: { type: 'link', required: false },
    });
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.storage.node.field_cta',
        data: expect.objectContaining({ type: 'link' }),
      }),
    );
  });

  it('reference field → entity_reference type with target_type in storage', async () => {
    const out = await fieldToDrupal({
      et: 'node',
      bundle: 'article',
      name: 'field_author',
      field: { type: 'reference', settings: { target_type: 'user' } },
    });
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.storage.node.field_author',
        data: expect.objectContaining({
          type: 'entity_reference',
          settings: expect.objectContaining({ target_type: 'user' }),
        }),
      }),
    );
    expect(out).toContainEqual(
      expect.objectContaining({
        config_name: 'field.field.node.article.field_author',
        data: expect.objectContaining({
          settings: expect.objectContaining({ handler: 'default' }),
        }),
      }),
    );
  });

  it('all emitted entities have langcode and status', async () => {
    const out = await fieldToDrupal({
      et: 'node',
      bundle: 'article',
      name: 'field_title',
      field: { type: 'string', required: true },
    });
    for (const item of out as Array<{ data: Record<string, unknown> }>) {
      expect(item.data).toHaveProperty('langcode', 'en');
      expect(item.data).toHaveProperty('status', true);
    }
  });
});

describe('node entity-type to_drupal', () => {
  it('node bundle → node.type + field config', async () => {
    const out = await runComposed('designbook-drupal/data-model/blueprints/node.md', 'to_drupal', {
      bundle: 'article',
      def: { fields: { field_body: { type: 'text_with_summary' } } },
    });
    expect(out).toContainEqual(expect.objectContaining({ config_name: 'node.type.article' }));
    expect(out).toContainEqual(expect.objectContaining({ config_name: 'field.field.node.article.field_body' }));
  });
});

describe('view config-entity to_drupal', () => {
  it('view config entry → views.view.<key> with required Drupal keys', async () => {
    const out = await runComposed('designbook-drupal/data-model/blueprints/view.md', 'to_drupal', {
      key: 'listing',
      def: {
        items_per_page: 12,
        view_modes: ['teaser'],
      },
    });
    const items = out as Array<{ config_name: string; data: Record<string, unknown> }>;
    expect(items).toContainEqual(
      expect.objectContaining({
        config_name: 'views.view.listing',
        data: expect.objectContaining({
          langcode: 'en',
          status: true,
          dependencies: expect.any(Object),
          base_table: expect.any(String),
          display: expect.any(Object),
        }),
      }),
    );

    // items_per_page: 12 (≠ default 10) must propagate into the pager options
    const entity = items.find((i) => i.config_name === 'views.view.listing');
    expect(entity).toBeDefined();
    const display = entity!.data.display as Record<string, unknown>;
    const defaultDisplay = display['default'] as Record<string, unknown>;
    const displayOptions = defaultDisplay['display_options'] as Record<string, unknown>;
    const pager = displayOptions['pager'] as Record<string, unknown>;
    const pagerOptions = pager['options'] as Record<string, unknown>;
    expect(pagerOptions['items_per_page']).toBe(12);
  });

  it('view config entity has langcode en and status true', async () => {
    const out = await runComposed('designbook-drupal/data-model/blueprints/view.md', 'to_drupal', {
      key: 'news',
      def: {
        items_per_page: 6,
        view_modes: ['card'],
      },
    });
    const items = out as Array<{ config_name: string; data: Record<string, unknown> }>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (const item of items) {
      expect(item.data).toHaveProperty('langcode', 'en');
      expect(item.data).toHaveProperty('status', true);
      expect(item.data).toHaveProperty('dependencies');
    }
  });
});

describe('image_style config-entity to_drupal', () => {
  it('image_style config entry → image.style.<key> with computed effect width/height', async () => {
    // aspect_ratio 16:9 → width = 16*100 = 1600, height = 9*100 = 900
    const out = await runComposed('designbook/data-model/blueprints/image_style.md', 'to_drupal', {
      key: 'ratio_16_9',
      def: {
        aspect_ratio: '16:9',
      },
    });
    const items = out as Array<{ config_name: string; data: Record<string, unknown> }>;
    const entity = items.find((i) => i.config_name === 'image.style.ratio_16_9');
    expect(entity).toBeDefined();
    expect(entity!.data).toMatchObject({
      langcode: 'en',
      status: true,
      dependencies: expect.objectContaining({ module: expect.arrayContaining(['image']) }),
      label: 'ratio_16_9',
    });
    const effects = entity!.data['effects'] as Record<string, unknown>;
    const effectKey = 'scale_and_crop_ratio_16_9';
    expect(effects).toHaveProperty(effectKey);
    const effect = effects[effectKey] as Record<string, unknown>;
    expect(effect['id']).toBe('image_scale_and_crop');
    expect(effect['uuid']).toBe(effectKey);
    const effectData = effect['data'] as Record<string, unknown>;
    expect(effectData['width']).toBe(1600);
    expect(effectData['height']).toBe(900);
  });

  it('image_style with breakpoints → image.style.<key> with label and effects', async () => {
    const out = await runComposed('designbook/data-model/blueprints/image_style.md', 'to_drupal', {
      key: 'hero',
      def: {
        aspect_ratio: '21:9',
        breakpoints: {
          xl: { width: 1200 },
          md: { width: 768, aspect_ratio: '16:9' },
        },
      },
    });
    const items = out as Array<{ config_name: string; data: Record<string, unknown> }>;
    const entity = items.find((i) => i.config_name === 'image.style.hero');
    expect(entity).toBeDefined();
    expect(entity!.data).toMatchObject({
      langcode: 'en',
      status: true,
      dependencies: expect.objectContaining({ module: expect.arrayContaining(['image']) }),
      label: 'hero',
    });
    // Default ratio 21:9 → effect key scale_and_crop_hero, width = 21*100 = 2100, height = 9*100 = 900
    const effects = entity!.data['effects'] as Record<string, unknown>;
    const effectKey = 'scale_and_crop_hero';
    expect(effects).toHaveProperty(effectKey);
    const effect = effects[effectKey] as Record<string, unknown>;
    expect(effect['id']).toBe('image_scale_and_crop');
    expect(effect['uuid']).toBe(effectKey);
    const effectData = effect['data'] as Record<string, unknown>;
    expect(effectData['width']).toBe(2100);
    expect(effectData['height']).toBe(900);
  });

  it('image_style config entity has langcode en and status true', async () => {
    const out = await runComposed('designbook/data-model/blueprints/image_style.md', 'to_drupal', {
      key: 'ratio_4_3',
      def: {
        aspect_ratio: '4:3',
      },
    });
    const items = out as Array<{ config_name: string; data: Record<string, unknown> }>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (const item of items) {
      expect(item.data).toHaveProperty('langcode', 'en');
      expect(item.data).toHaveProperty('status', true);
      expect(item.data).toHaveProperty('dependencies');
    }
  });
});
