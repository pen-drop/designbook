import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ResolverContext } from '../types.js';
import { storyIdResolver } from '../story-id.js';

const fixtureDir = join(import.meta.dirname, '__fixtures_story_id_resolver__');
const storiesDir = join(fixtureDir, 'stories');

const STORY_IDS = [
  'designbook-design-system-scenes--shell',
  'designbook-design-system-scenes--navigation',
  'designbook-galerie-scenes--landing',
  'designbook-galerie-scenes--product-detail',
  'designbook-homepage-scenes--landing',
  'designbook-homepage-scenes--hero',
  'components--card',
];

function makeContext(tmpDir: string = fixtureDir): ResolverContext {
  return { config: { data: tmpDir, technology: 'html' }, params: {} };
}

describe('storyIdResolver', () => {
  beforeAll(() => {
    mkdirSync(storiesDir, { recursive: true });
    for (const id of STORY_IDS) {
      mkdirSync(join(storiesDir, id), { recursive: true });
    }
  });

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('has name "story_id"', () => {
    expect(storyIdResolver.name).toBe('story_id');
  });

  it('resolves an exact match', () => {
    const result = storyIdResolver.resolve(
      'designbook-design-system-scenes--shell',
      {},
      makeContext(),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('designbook-design-system-scenes--shell');
  });

  it('resolves unique substring "shell"', () => {
    const result = storyIdResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('designbook-design-system-scenes--shell');
  });

  it('resolves unique substring "product-detail"', () => {
    const result = storyIdResolver.resolve('product-detail', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('designbook-galerie-scenes--product-detail');
  });

  it('resolves unique substring "navigation"', () => {
    const result = storyIdResolver.resolve('navigation', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('designbook-design-system-scenes--navigation');
  });

  it('resolves unique substring "card"', () => {
    const result = storyIdResolver.resolve('card', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('components--card');
  });

  it('returns unresolved with 2 candidates for ambiguous "landing"', () => {
    const result = storyIdResolver.resolve('landing', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.candidates).toHaveLength(2);
    const values = result.candidates!.map((c) => c.value);
    expect(values).toContain('designbook-galerie-scenes--landing');
    expect(values).toContain('designbook-homepage-scenes--landing');
  });

  it('returns unresolved with 2 candidates for ambiguous "galerie"', () => {
    const result = storyIdResolver.resolve('galerie', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.candidates).toHaveLength(2);
    const values = result.candidates!.map((c) => c.value);
    expect(values).toContain('designbook-galerie-scenes--landing');
    expect(values).toContain('designbook-galerie-scenes--product-detail');
  });

  it('returns unresolved with empty candidates for "nonexistent"', () => {
    const result = storyIdResolver.resolve('nonexistent', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.candidates).toEqual([]);
  });

  it('returns unresolved for empty input', () => {
    const result = storyIdResolver.resolve('', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns unresolved with empty candidates when stories directory is missing', () => {
    const noStoriesDir = join(fixtureDir, 'no-stories');
    mkdirSync(noStoriesDir, { recursive: true });
    const result = storyIdResolver.resolve('shell', {}, makeContext(noStoriesDir));
    expect(result.resolved).toBe(false);
    expect(result.candidates).toEqual([]);
    rmSync(noStoriesDir, { recursive: true, force: true });
  });
});
