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
