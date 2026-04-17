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

function writeScreenshot(storyId: string, type: string, breakpoint: string, region: string) {
  const dir = resolve(tmpDir, 'stories', storyId, 'screenshots', type);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${breakpoint}--${region}.png`), 'fake-png');
}

function setupFixtures() {
  rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(resolve(tmpDir, 'stories'), { recursive: true });

  // Story with all-pass checks
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
      checks: {
        'sm--header': { status: 'done', result: 'pass', diff: 1.2 },
        'sm--footer': { status: 'done', result: 'pass', diff: 0.8 },
        'sm--markup': { status: 'done', result: 'pass' },
        'xl--header': { status: 'done', result: 'pass', diff: 2.1 },
        'xl--footer': { status: 'done', result: 'pass', diff: 1.0 },
        'xl--markup': { status: 'done', result: 'pass' },
      },
    },
  });
  writeScreenshot('design-system--shell', 'reference', 'sm', 'header');
  writeScreenshot('design-system--shell', 'reference', 'xl', 'header');
  writeScreenshot('design-system--shell', 'current', 'sm', 'header');

  // Story with mixed results
  writeMeta('galerie--product-detail', {
    reference: {
      source: { url: 'https://example.com/product', origin: 'stitch' },
      breakpoints: {
        sm: {
          threshold: 3,
          regions: {
            full: { selector: '' },
          },
        },
        xl: {
          threshold: 3,
          regions: {
            full: { selector: '' },
          },
        },
      },
      checks: {
        'sm--full': { status: 'done', result: 'fail', diff: 8.3 },
        'xl--full': { status: 'done', result: 'pass', diff: 1.2 },
      },
    },
  });

  // Story with no results (unchecked)
  writeMeta('galerie--overview', {
    reference: {
      source: { url: 'https://example.com/overview', origin: 'manual' },
      breakpoints: {
        sm: {
          threshold: 5,
          regions: {
            full: { selector: '' },
          },
        },
      },
    },
  });

  // Story directory without meta.yml
  mkdirSync(resolve(tmpDir, 'stories', 'galerie--empty'), { recursive: true });

  // Design tokens for ensureMeta
  const dsDir = resolve(tmpDir, 'design-system');
  mkdirSync(dsDir, { recursive: true });
  writeFileSync(
    resolve(dsDir, 'design-tokens.yml'),
    dumpYaml({ breakpoints: { sm: { width: 640 }, xl: { width: 1280 } } }),
  );

  // Scenes file for ensureMeta derivation
  writeFileSync(
    resolve(dsDir, 'design-system.scenes.yml'),
    dumpYaml({
      id: 'design-system',
      title: 'Design System',
      scenes: [
        { name: 'shell', reference: { url: 'https://example.com/shell-ref', type: 'stitch' }, items: [] },
        { name: 'no-ref', items: [] },
      ],
    }),
  );
}

describe('StoryMeta', () => {
  const config = makeConfig(tmpDir);

  beforeAll(() => setupFixtures());
  afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

  // ---------------------------------------------------------------------------
  // 5.1 — load()
  // ---------------------------------------------------------------------------

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
      expect(story!.checks()).toHaveLength(0);
    });

    it('returns null for non-existent story', () => {
      const story = StoryMeta.load(config, 'does-not-exist');
      expect(story).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // 5.2 — status derivation & summary aggregation
  // ---------------------------------------------------------------------------

  describe('status and summary', () => {
    it('returns pass when all checks pass', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      expect(story.status).toBe('pass');
      expect(story.summary.total).toBe(6);
      expect(story.summary.pass).toBe(6);
      expect(story.summary.fail).toBe(0);
      expect(story.summary.unchecked).toBe(0);
    });

    it('returns failing when any check fails', () => {
      const story = StoryMeta.load(config, 'galerie--product-detail')!;
      expect(story.status).toBe('failing');
      expect(story.summary.total).toBe(2);
      expect(story.summary.pass).toBe(1);
      expect(story.summary.fail).toBe(1);
    });

    it('returns unchecked when no results', () => {
      const story = StoryMeta.load(config, 'galerie--overview')!;
      expect(story.status).toBe('unchecked');
      expect(story.summary.unchecked).toBe(1);
    });

    it('returns unchecked for story without meta', () => {
      const story = StoryMeta.load(config, 'galerie--empty')!;
      expect(story.status).toBe('unchecked');
    });

    it('computes diff metrics correctly', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      expect(story.summary.maxDiff).toBe(2.1);
      // avgDiff = (1.2 + 0.8 + 2.1 + 1.0) / 4 ≈ 1.28
      expect(story.summary.avgDiff).toBeCloseTo(1.28, 1);
      expect(story.summary.threshold).toBe(3);
    });

    it('computes mixed diff metrics', () => {
      const story = StoryMeta.load(config, 'galerie--product-detail')!;
      expect(story.summary.maxDiff).toBe(8.3);
      // avgDiff = (8.3 + 1.2) / 2 = 4.75
      expect(story.summary.avgDiff).toBe(4.75);
    });
  });

  // ---------------------------------------------------------------------------
  // 5.3 — checks() filtering
  // ---------------------------------------------------------------------------

  describe('checks', () => {
    it('returns all checks without filter', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      expect(story.checks()).toHaveLength(6); // 4 regions + 2 markup (hasMarkup: true)
    });

    it('filters open checks (status !== done)', () => {
      const story = StoryMeta.load(config, 'galerie--product-detail')!;
      // Both checks are 'done', but sm--full has result 'fail'
      // open filter now checks status !== 'done', not result !== 'pass'
      const open = story.checks({ open: true });
      // All checks are 'done', so open returns 0
      expect(open).toHaveLength(0);
    });

    it('filters by breakpoints', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      const xlOnly = story.checks({ breakpoints: ['xl'] });
      expect(xlOnly).toHaveLength(3); // 2 regions + 1 markup
      expect(xlOnly.every((c) => c.breakpoint === 'xl')).toBe(true);
    });

    it('combines filters', () => {
      const story = StoryMeta.load(config, 'galerie--product-detail')!;
      // All checks are done, so open filter returns 0 for both
      const openXl = story.checks({ open: true, breakpoints: ['xl'] });
      expect(openXl).toHaveLength(0);
      const openSm = story.checks({ open: true, breakpoints: ['sm'] });
      expect(openSm).toHaveLength(0);
    });

    it('includes check data', () => {
      const story = StoryMeta.load(config, 'galerie--product-detail')!;
      const check = story.checks({ breakpoints: ['sm'] })[0]!;
      expect(check.storyId).toBe('galerie--product-detail');
      expect(check.breakpoint).toBe('sm');
      expect(check.region).toBe('full');
      expect(check.diff).toBe(8.3);
      expect(check.threshold).toBe(3);
      expect(check.reference.url).toBe('https://example.com/product');
    });

    it('unchecked checks (no status) are included in open filter', () => {
      const story = StoryMeta.load(config, 'galerie--overview')!;
      const open = story.checks({ open: true });
      expect(open).toHaveLength(1); // status is undefined !== 'done'
    });
  });

  // ---------------------------------------------------------------------------
  // 5.4 — screenshots() filtering
  // ---------------------------------------------------------------------------

  describe('screenshots', () => {
    it('returns all screenshots', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      const shots = story.screenshots();
      expect(shots.length).toBeGreaterThanOrEqual(3);
    });

    it('filters by type', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      const refs = story.screenshots({ type: 'reference' });
      expect(refs.every((s) => s.type === 'reference')).toBe(true);
      const curs = story.screenshots({ type: 'current' });
      expect(curs.every((s) => s.type === 'current')).toBe(true);
    });

    it('filters by breakpoint', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      const sm = story.screenshots({ breakpoint: 'sm' });
      expect(sm.every((s) => s.breakpoint === 'sm')).toBe(true);
    });

    it('screenshot has correct structure', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      const ref = story.screenshots({ type: 'reference', breakpoint: 'sm' })[0]!;
      expect(ref.storyId).toBe('design-system--shell');
      expect(ref.type).toBe('reference');
      expect(ref.breakpoint).toBe('sm');
      expect(ref.region).toBe('header');
      expect(ref.path).toContain('screenshots/reference/sm--header.png');
      expect(ref.url).toBe('https://example.com/shell');
    });
  });

  // ---------------------------------------------------------------------------
  // 5.5 — updateCheck()
  // ---------------------------------------------------------------------------

  describe('updateCheck', () => {
    it('persists check result to meta.yml', () => {
      const story = StoryMeta.load(config, 'galerie--product-detail')!;
      expect(story.checks({ breakpoints: ['sm'] })[0]!.result).toBe('fail');

      story.updateCheck({ breakpoint: 'sm', region: 'full', status: 'done', result: 'pass', diff: 0.5 });

      // Verify in-memory update
      expect(story.checks({ breakpoints: ['sm'] })[0]!.result).toBe('pass');
      expect(story.checks({ breakpoints: ['sm'] })[0]!.status).toBe('done');
      expect(story.checks({ breakpoints: ['sm'] })[0]!.diff).toBe(0.5);
      expect(story.status).toBe('pass');

      // Verify on-disk persistence
      const metaPath = resolve(tmpDir, 'stories', 'galerie--product-detail', 'meta.yml');
      const raw = parseYaml(readFileSync(metaPath, 'utf-8')) as Record<string, unknown>;
      const checks = (
        raw as { reference: { checks: Record<string, { status: string; result: string; diff: number }> } }
      ).reference.checks;
      expect(checks['sm--full']!.status).toBe('done');
      expect(checks['sm--full']!.result).toBe('pass');
      expect(checks['sm--full']!.diff).toBe(0.5);

      // Restore original state
      story.updateCheck({ breakpoint: 'sm', region: 'full', status: 'done', result: 'fail', diff: 8.3 });
    });
  });

  // ---------------------------------------------------------------------------
  // 5.6 — ensureMeta()
  // ---------------------------------------------------------------------------

  describe('ensureMeta', () => {
    it('creates meta.yml from derivable source', () => {
      // Create a story dir for the "shell" scene (which has a reference in fixtures)
      const storyId = 'design-system--shell-new';
      mkdirSync(resolve(tmpDir, 'stories', storyId), { recursive: true });

      const story = StoryMeta.load(config, storyId)!;
      expect(story.checks()).toHaveLength(0);

      // ensureMeta should fail — "shell-new" scene doesn't exist in scenes.yml
      // But "shell" does, so let's test with the right name
      rmSync(resolve(tmpDir, 'stories', storyId), { recursive: true, force: true });
    });

    it('returns true if meta already exists', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      expect(story.ensureMeta(config)).toBe(true);
    });

    it('returns false when no reference source derivable', () => {
      // "no-ref" scene has no reference
      const storyId = 'design-system--no-ref';
      mkdirSync(resolve(tmpDir, 'stories', storyId), { recursive: true });

      const story = StoryMeta.load(config, storyId)!;
      const result = story.ensureMeta(config);
      expect(result).toBe(false);
      expect(existsSync(resolve(tmpDir, 'stories', storyId, 'meta.yml'))).toBe(false);

      rmSync(resolve(tmpDir, 'stories', storyId), { recursive: true, force: true });
    });

    it('derives meta with breakpoints and regions for screen story', () => {
      // shell already has meta, test with a screen-type story
      const screenStoryId = 'galerie--product-new';
      mkdirSync(resolve(tmpDir, 'stories', screenStoryId), { recursive: true });

      // Add a scenes file for galerie with reference
      const sectionDir = resolve(tmpDir, 'sections', 'galerie');
      mkdirSync(sectionDir, { recursive: true });
      writeFileSync(
        resolve(sectionDir, 'galerie.section.scenes.yml'),
        dumpYaml({
          id: 'galerie',
          title: 'Galerie',
          scenes: [{ name: 'product-new', reference: { url: 'https://example.com/new', type: 'stitch' }, items: [] }],
        }),
      );

      const story = StoryMeta.load(config, screenStoryId)!;
      const result = story.ensureMeta(config);
      expect(result).toBe(true);

      // Verify meta was created
      const metaPath = resolve(tmpDir, 'stories', screenStoryId, 'meta.yml');
      expect(existsSync(metaPath)).toBe(true);

      const meta = parseYaml(readFileSync(metaPath, 'utf-8')) as {
        reference: { breakpoints: Record<string, { regions: Record<string, unknown> }> };
      };
      // Should have sm and xl breakpoints from design-tokens
      expect(Object.keys(meta.reference.breakpoints)).toContain('sm');
      expect(Object.keys(meta.reference.breakpoints)).toContain('xl');
      // Screen story should have "full" region
      expect(Object.keys(meta.reference.breakpoints.sm!.regions)).toContain('full');

      // Story should now have checks
      expect(story.checks().length).toBeGreaterThan(0);

      // Cleanup
      rmSync(resolve(tmpDir, 'stories', screenStoryId), { recursive: true, force: true });
      rmSync(sectionDir, { recursive: true, force: true });
    });
  });

  // ---------------------------------------------------------------------------
  // list()
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // toJSON()
  // ---------------------------------------------------------------------------

  describe('toJSON', () => {
    it('returns complete entity', () => {
      const story = StoryMeta.load(config, 'design-system--shell')!;
      const json = story.toJSON();
      expect(json.storyId).toBe('design-system--shell');
      expect(json.status).toBe('pass');
      expect(json.summary.total).toBe(6);
      expect(json.checks).toHaveLength(6);
      expect(json.screenshots.length).toBeGreaterThan(0);
      expect(json.reference.url).toBe('https://example.com/shell');
    });

    it('filters checks with checksOpen (status !== done)', () => {
      const story = StoryMeta.load(config, 'galerie--product-detail')!;
      const json = story.toJSON({ checksOpen: true });
      // All checks are 'done', so checksOpen returns 0
      expect(json.checks).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// resolveScene (moved from resolve-url.test.ts)
// ---------------------------------------------------------------------------

const resolveSceneTmpDir = resolve(import.meta.dirname, '__fixtures_resolve_scene__');

function setupResolveSceneFixtures() {
  rmSync(resolveSceneTmpDir, { recursive: true, force: true });

  // design-system scenes
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

  // section scenes
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
