import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { matchStoryId } from '../story-match.js';

const fixtureDir = join(import.meta.dirname, '__fixtures_story_match__');
const storiesDir = join(fixtureDir, 'stories');

const STORY_IDS = [
  'designbook-design-system-scenes--shell',
  'designbook-design-system-scenes--navigation',
  'designbook-galerie-scenes--landing',
  'designbook-galerie-scenes--product-detail',
  'designbook-homepage-scenes--landing',
  'designbook-homepage-scenes--hero',
  'components--card',
  'entities-paragraph-signage--full',
  'entities-paragraph-signage-item--full',
  'entities-node-article--default',
  'entities-node-article--teaser',
];

describe('matchStoryId', () => {
  beforeAll(() => {
    mkdirSync(storiesDir, { recursive: true });
    for (const id of STORY_IDS) {
      mkdirSync(join(storiesDir, id), { recursive: true });
    }
  });

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('matches exact', () => {
    const result = matchStoryId('designbook-design-system-scenes--shell', fixtureDir);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('designbook-design-system-scenes--shell');
  });

  it('matches unique substring "shell"', () => {
    const result = matchStoryId('shell', fixtureDir);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('designbook-design-system-scenes--shell');
  });

  it('matches unique substring "product-detail"', () => {
    const result = matchStoryId('product-detail', fixtureDir);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('designbook-galerie-scenes--product-detail');
  });

  it('matches unique substring "navigation"', () => {
    const result = matchStoryId('navigation', fixtureDir);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('designbook-design-system-scenes--navigation');
  });

  it('matches unique substring "card"', () => {
    const result = matchStoryId('card', fixtureDir);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('components--card');
  });

  it('resolves a dotted config id to its sanitised entity story id', () => {
    const result = matchStoryId('paragraph.signage.full', fixtureDir);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('entities-paragraph-signage--full');
  });

  it('does NOT collide with a sibling bundle whose name it is a prefix of', () => {
    // `signage` is a substring of `signage-item`; a per-term substring match would return BOTH
    // entities-paragraph-signage--full and entities-paragraph-signage-item--full (ambiguous).
    // Exact reconstruction must resolve each config id to exactly its own story.
    const parent = matchStoryId('paragraph.signage.full', fixtureDir);
    expect(parent.resolved).toBe(true);
    expect(parent.value).toBe('entities-paragraph-signage--full');

    const sibling = matchStoryId('paragraph.signage_item.full', fixtureDir);
    expect(sibling.resolved).toBe(true);
    expect(sibling.value).toBe('entities-paragraph-signage-item--full');
  });

  it('resolves a dotted config id with a shared view-mode term uniquely', () => {
    // "default"/"teaser" alone would collide across bundles; reconstruction pins the exact story.
    const result = matchStoryId('node.article.default', fixtureDir);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('entities-node-article--default');
  });

  it('returns candidates for ambiguous "landing"', () => {
    const result = matchStoryId('landing', fixtureDir);
    expect(result.resolved).toBe(false);
    expect(result.candidates).toHaveLength(2);
    const values = result.candidates!.map((c) => c.value);
    expect(values).toContain('designbook-galerie-scenes--landing');
    expect(values).toContain('designbook-homepage-scenes--landing');
  });

  it('returns candidates for ambiguous "galerie"', () => {
    const result = matchStoryId('galerie', fixtureDir);
    expect(result.resolved).toBe(false);
    expect(result.candidates).toHaveLength(2);
  });

  it('returns empty candidates for no match', () => {
    const result = matchStoryId('nonexistent', fixtureDir);
    expect(result.resolved).toBe(false);
    expect(result.candidates).toEqual([]);
  });

  it('returns error for empty input', () => {
    const result = matchStoryId('', fixtureDir);
    expect(result.resolved).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns empty candidates when stories directory is missing', () => {
    const noStoriesDir = join(fixtureDir, 'no-stories');
    mkdirSync(noStoriesDir, { recursive: true });
    const result = matchStoryId('shell', noStoriesDir);
    expect(result.resolved).toBe(false);
    expect(result.candidates).toEqual([]);
    rmSync(noStoriesDir, { recursive: true, force: true });
  });
});
