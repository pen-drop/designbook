import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { StoryMeta, resolveScene } from '../story-entity.js';
import type { DesignbookConfig } from '../config.js';

const tmpDir = resolve(import.meta.dirname, '__fixtures_story_entity__');

function makeConfig(dataDir: string): DesignbookConfig {
  return { data: dataDir, technology: 'html' };
}

function writeMeta(storyId: string, meta: unknown) {
  const dir = resolve(tmpDir, 'stories', storyId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'meta.yml'), dumpYaml(meta, { lineWidth: -1 }));
}

function setupFixtures() {
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(resolve(tmpDir, 'stories'), { recursive: true });

  writeMeta('design-system--shell', {
    reference: {
      source: { url: 'https://example.com/shell', origin: 'stitch', hasMarkup: true },
      breakpoints: {
        sm: {
          threshold: 3,
          regions: {
            header: { selector: 'header' },
            footer: { selector: 'footer' },
          },
        },
        xl: {
          threshold: 3,
          regions: {
            header: { selector: 'header' },
            footer: { selector: 'footer' },
          },
        },
      },
    },
  });

  writeMeta('galerie--product-detail', {
    reference: {
      source: { url: 'https://example.com/product', origin: 'stitch' },
      breakpoints: {
        sm: { threshold: 3, regions: { full: { selector: '' } } },
        xl: { threshold: 3, regions: { full: { selector: '' } } },
      },
    },
  });

  writeMeta('galerie--overview', {
    reference: {
      source: { url: 'https://example.com/overview', origin: 'manual' },
      breakpoints: {
        sm: { threshold: 5, regions: { full: { selector: '' } } },
      },
    },
  });

  mkdirSync(resolve(tmpDir, 'stories', 'galerie--empty'), { recursive: true });

  // Design tokens for loadOrCreate derivation
  const dsDir = resolve(tmpDir, 'design-system');
  mkdirSync(dsDir, { recursive: true });
  writeFileSync(
    resolve(dsDir, 'design-tokens.yml'),
    dumpYaml({ breakpoints: { sm: { width: 640 }, xl: { width: 1280 } } }),
  );
}

describe('StoryMeta', () => {
  const config = makeConfig(tmpDir);

  beforeAll(() => setupFixtures());
  afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

  describe('load', () => {
    it('loads existing story with meta.yml', () => {
      const story = StoryMeta.load(config, 'design-system--shell');
      expect(story).not.toBeNull();
      expect(story!.storyId).toBe('design-system--shell');
      expect(story!.section).toBe('design-system');
      expect(story!.reference.url).toBe('https://example.com/shell');
      expect(story!.reference.origin).toBe('stitch');
      expect(story!.reference.hasMarkup).toBe(true);
    });

    it('loads story without meta.yml', () => {
      const story = StoryMeta.load(config, 'galerie--empty');
      expect(story).not.toBeNull();
      expect(story!.storyId).toBe('galerie--empty');
      expect(story!.reference.url).toBeUndefined();
    });

    it('returns null for non-existent story', () => {
      const story = StoryMeta.load(config, 'does-not-exist');
      expect(story).toBeNull();
    });
  });

  describe('loadOrCreate', () => {
    it('returns existing story without mutation', () => {
      const story = StoryMeta.loadOrCreate(config, 'design-system--shell');
      expect(story.reference.url).toBe('https://example.com/shell');
    });

    it('creates story directory and meta.yml when missing', () => {
      const storyId = 'new-section--new-story';
      const storyDir = resolve(tmpDir, 'stories', storyId);
      rmSync(storyDir, { recursive: true, force: true });

      const story = StoryMeta.loadOrCreate(config, storyId);
      expect(existsSync(storyDir)).toBe(true);
      expect(existsSync(resolve(storyDir, 'meta.yml'))).toBe(true);
      expect(story.storyId).toBe(storyId);

      const meta = parseYaml(readFileSync(resolve(storyDir, 'meta.yml'), 'utf-8')) as {
        reference?: { breakpoints?: Record<string, unknown> };
      };
      expect(Object.keys(meta.reference?.breakpoints ?? {})).toContain('sm');
      expect(Object.keys(meta.reference?.breakpoints ?? {})).toContain('xl');

      rmSync(storyDir, { recursive: true, force: true });
    });
  });

  describe('list', () => {
    it('lists all stories', () => {
      const stories = StoryMeta.list(config);
      expect(stories.length).toBeGreaterThanOrEqual(3);
    });

    it('filters by section', () => {
      const galerie = StoryMeta.list(config, { section: 'galerie' });
      expect(galerie.every((s) => s.section === 'galerie')).toBe(true);
      expect(galerie.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('toJSON', () => {
    it('returns a minimal entity snapshot', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      const json = story.toJSON();
      expect(json.storyId).toBe('design-system--shell');
      expect(json.section).toBe('design-system');
      expect(json.reference.url).toBe('https://example.com/shell');
    });
  });
});

const resolveSceneTmpDir = resolve(import.meta.dirname, '__fixtures_resolve_scene__');

function setupResolveSceneFixtures() {
  rmSync(resolveSceneTmpDir, { recursive: true, force: true });

  const dsDir = resolve(resolveSceneTmpDir, 'design-system');
  mkdirSync(dsDir, { recursive: true });
  writeFileSync(
    resolve(dsDir, 'design-system.scenes.yml'),
    dumpYaml({
      id: 'design-system',
      title: 'Design System',
      scenes: [
        { name: 'shell', items: [] },
        { name: 'typography', items: [] },
      ],
    }),
  );

  const sectionDir = resolve(resolveSceneTmpDir, 'sections', 'galerie');
  mkdirSync(sectionDir, { recursive: true });
  writeFileSync(
    resolve(sectionDir, 'galerie.section.scenes.yml'),
    dumpYaml({
      id: 'galerie',
      title: 'Galerie',
      scenes: [
        { name: 'product-detail', items: [] },
        { name: 'overview', items: [] },
      ],
    }),
  );
}

describe('resolveScene', () => {
  beforeAll(() => setupResolveSceneFixtures());
  afterAll(() => rmSync(resolveSceneTmpDir, { recursive: true, force: true }));

  it('resolves design-system:shell to the correct scene', () => {
    const result = resolveScene(resolveSceneTmpDir, 'design-system:shell');
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0]!.name).toBe('shell');
    expect(result.filePath).toContain('design-system.scenes.yml');
  });

  it('resolves design-system without scene name to all scenes', () => {
    const result = resolveScene(resolveSceneTmpDir, 'design-system');
    expect(result.scenes).toHaveLength(2);
  });

  it('resolves section scene ref', () => {
    const result = resolveScene(resolveSceneTmpDir, 'galerie:product-detail');
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0]!.name).toBe('product-detail');
  });

  it('throws for unknown scene group', () => {
    expect(() => resolveScene(resolveSceneTmpDir, 'nonexistent:foo')).toThrow('No scenes file found');
  });

  it('throws for unknown scene name in valid group', () => {
    expect(() => resolveScene(resolveSceneTmpDir, 'design-system:nonexistent')).toThrow(
      'Scene "nonexistent" not found',
    );
  });
});
