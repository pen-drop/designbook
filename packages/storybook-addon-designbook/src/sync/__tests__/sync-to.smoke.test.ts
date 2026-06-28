/**
 * End-to-end smoke test: to_drupal transforms → YAML files on disk.
 *
 * Uses a small in-test fixture (one node bundle, one image_style) to verify
 * that the to_drupal blueprints emit the expected set of DrupalConfigEntity
 * objects, and that each can be serialised to a valid YAML file matching the
 * DrupalConfigEntity contract.
 *
 * This test does NOT import into a live Drupal site — that is covered by Part B
 * of the integration check (see task-10-report.md).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import yaml from 'js-yaml';
import { runComposed } from './helpers.js';

// ── fixture data ──────────────────────────────────────────────────────────────

/** One node bundle: article, with two fields. */
const NODE_ARTICLE_INPUT = {
  bundle: 'article',
  def: {
    fields: {
      field_body: { type: 'text_with_summary', required: false },
      field_subtitle: { type: 'string', required: false },
    },
  },
};

/** One image style: hero with a 16:9 aspect ratio. */
const IMAGE_STYLE_HERO_INPUT = {
  key: 'hero',
  def: { aspect_ratio: '16:9' },
};

// ── types ─────────────────────────────────────────────────────────────────────

interface DrupalConfigEntity {
  config_name: string;
  data: {
    langcode: string;
    status: boolean;
    dependencies: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// ── temp dir management ───────────────────────────────────────────────────────

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'designbook-smoke-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── helpers ───────────────────────────────────────────────────────────────────

/** Serialise a DrupalConfigEntity to <tmpDir>/<config_name>.yml */
function writeConfigYml(entity: DrupalConfigEntity): string {
  const filePath = path.join(tmpDir, `${entity.config_name}.yml`);
  fs.writeFileSync(filePath, yaml.dump(entity.data, { noRefs: true, lineWidth: 120 }), 'utf-8');
  return filePath;
}

/** Parse a YAML file and return the parsed object. */
function readConfigYml(configName: string): Record<string, unknown> {
  const filePath = path.join(tmpDir, `${configName}.yml`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content) as Record<string, unknown>;
}

/** Assert that an entity satisfies the DrupalConfigEntity contract. */
function assertValidConfigEntity(entity: DrupalConfigEntity, expectedConfigName: string): void {
  expect(entity.config_name).toBe(expectedConfigName);
  expect(entity.data).toBeDefined();
  expect(entity.data.langcode).toBe('en');
  expect(entity.data.status).toBe(true);
  expect(entity.data.dependencies).toBeDefined();
  expect(typeof entity.data.dependencies).toBe('object');
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('sync-to smoke: node bundle article → DrupalConfigEntity[]', () => {
  let entities: DrupalConfigEntity[];

  beforeAll(async () => {
    entities = (await runComposed(
      'designbook-drupal/data-model/blueprints/node.md',
      'to_drupal',
      NODE_ARTICLE_INPUT,
    )) as DrupalConfigEntity[];
  });

  it('produces an array of DrupalConfigEntity objects', () => {
    expect(Array.isArray(entities)).toBe(true);
    expect(entities.length).toBeGreaterThanOrEqual(5);
  });

  it('includes node.type.article', () => {
    const entity = entities.find((e) => e.config_name === 'node.type.article');
    expect(entity).toBeDefined();
    assertValidConfigEntity(entity!, 'node.type.article');
  });

  it('includes field.storage.node.field_body', () => {
    const entity = entities.find((e) => e.config_name === 'field.storage.node.field_body');
    expect(entity).toBeDefined();
    assertValidConfigEntity(entity!, 'field.storage.node.field_body');
    expect(entity!.data['type']).toBe('text_with_summary');
  });

  it('includes field.field.node.article.field_body', () => {
    const entity = entities.find((e) => e.config_name === 'field.field.node.article.field_body');
    expect(entity).toBeDefined();
    assertValidConfigEntity(entity!, 'field.field.node.article.field_body');
    expect(entity!.data['field_type']).toBe('text_with_summary');
  });

  it('includes field.storage.node.field_subtitle', () => {
    const entity = entities.find((e) => e.config_name === 'field.storage.node.field_subtitle');
    expect(entity).toBeDefined();
    assertValidConfigEntity(entity!, 'field.storage.node.field_subtitle');
    expect(entity!.data['type']).toBe('string');
  });

  it('includes field.field.node.article.field_subtitle', () => {
    const entity = entities.find((e) => e.config_name === 'field.field.node.article.field_subtitle');
    expect(entity).toBeDefined();
    assertValidConfigEntity(entity!, 'field.field.node.article.field_subtitle');
  });

  it('all entities have langcode, status, dependencies', () => {
    for (const entity of entities) {
      expect(entity.data.langcode).toBe('en');
      expect(entity.data.status).toBe(true);
      expect(entity.data.dependencies).toBeDefined();
    }
  });
});

describe('sync-to smoke: image_style hero → DrupalConfigEntity[]', () => {
  let entities: DrupalConfigEntity[];

  beforeAll(async () => {
    entities = (await runComposed(
      'designbook/data-model/blueprints/image_style.md',
      'to_drupal',
      IMAGE_STYLE_HERO_INPUT,
    )) as DrupalConfigEntity[];
  });

  it('produces an array containing image.style.hero', () => {
    expect(Array.isArray(entities)).toBe(true);
    const entity = entities.find((e) => e.config_name === 'image.style.hero');
    expect(entity).toBeDefined();
    assertValidConfigEntity(entity!, 'image.style.hero');
  });

  it('image.style.hero has module dependency on image', () => {
    const entity = entities.find((e) => e.config_name === 'image.style.hero')!;
    const deps = entity.data.dependencies as Record<string, unknown>;
    expect(Array.isArray(deps['module'])).toBe(true);
    expect(deps['module']).toContain('image');
  });
});

describe('sync-to smoke: YAML serialisation round-trip', () => {
  let nodeEntities: DrupalConfigEntity[];
  let imageEntities: DrupalConfigEntity[];

  beforeAll(async () => {
    [nodeEntities, imageEntities] = await Promise.all([
      runComposed('designbook-drupal/data-model/blueprints/node.md', 'to_drupal', NODE_ARTICLE_INPUT).then(
        (r) => r as DrupalConfigEntity[],
      ),
      runComposed('designbook/data-model/blueprints/image_style.md', 'to_drupal', IMAGE_STYLE_HERO_INPUT).then(
        (r) => r as DrupalConfigEntity[],
      ),
    ]);
    // Write all YAML files here so every `it` block can read them regardless of order.
    for (const entity of [...nodeEntities, ...imageEntities]) {
      writeConfigYml(entity);
    }
  });

  it('writes expected YAML files to disk', () => {
    // Pure existence check — files are written in beforeAll above.
    const expectedNames = [
      'node.type.article',
      'field.storage.node.field_body',
      'field.field.node.article.field_body',
      'field.storage.node.field_subtitle',
      'field.field.node.article.field_subtitle',
      'image.style.hero',
    ];
    for (const name of expectedNames) {
      const filePath = path.join(tmpDir, `${name}.yml`);
      expect(fs.existsSync(filePath), `Expected ${name}.yml to exist`).toBe(true);
    }
  });

  it('each YAML file parses back to valid object with langcode/status/dependencies', () => {
    const expectedNames = [
      'node.type.article',
      'field.storage.node.field_body',
      'field.field.node.article.field_body',
      'field.storage.node.field_subtitle',
      'field.field.node.article.field_subtitle',
      'image.style.hero',
    ];
    for (const name of expectedNames) {
      const parsed = readConfigYml(name);
      expect(parsed, `${name}.yml should parse to object`).toBeDefined();
      expect(typeof parsed).toBe('object');
      expect(parsed['langcode']).toBe('en');
      expect(parsed['status']).toBe(true);
      expect(typeof parsed['dependencies']).toBe('object');
    }
  });

  it('field.storage.node.field_body YAML has text_with_summary type', () => {
    const parsed = readConfigYml('field.storage.node.field_body');
    expect(parsed['type']).toBe('text_with_summary');
  });

  it('field.field.node.article.field_body YAML has field_type text_with_summary', () => {
    const parsed = readConfigYml('field.field.node.article.field_body');
    expect(parsed['field_type']).toBe('text_with_summary');
  });

  it('field.storage.node.field_subtitle YAML has string type', () => {
    const parsed = readConfigYml('field.storage.node.field_subtitle');
    expect(parsed['type']).toBe('string');
  });

  it('image.style.hero YAML has scale_and_crop_hero effect', () => {
    const parsed = readConfigYml('image.style.hero');
    const effects = parsed['effects'] as Record<string, unknown>;
    expect(effects).toBeDefined();
    expect(effects['scale_and_crop_hero']).toBeDefined();
    const effect = effects['scale_and_crop_hero'] as Record<string, unknown>;
    expect(effect['id']).toBe('image_scale_and_crop');
    const effectData = effect['data'] as Record<string, unknown>;
    expect(effectData['width']).toBe(1600);
    expect(effectData['height']).toBe(900);
  });
});
