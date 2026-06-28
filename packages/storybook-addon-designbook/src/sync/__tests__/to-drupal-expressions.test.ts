import { describe, it, expect } from 'vitest';
import { runJsonata, loadJsonata } from './helpers.js';

// Path to the field-types blueprint relative to .agents/skills/
const BLUEPRINT_REL = 'designbook-drupal/data-model/blueprints/field-types.md';

// Wrap expression in a call that dispatches based on the input shape
// The blueprint exports $fieldToStorage and $fieldToInstance; we call both and concat results.
async function fieldToDrupal(opts: {
  et: string;
  bundle: string;
  name: string;
  field: Record<string, unknown>;
}): Promise<unknown[]> {
  const expr = loadJsonata(BLUEPRINT_REL, 'to_drupal');
  const out = await runJsonata(expr, opts);
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
