import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { indexEntityDemo } from '../preset';

let demoPath: string;

beforeAll(() => {
  const root = mkdtempSync(join(tmpdir(), 'debo-idx-'));
  const em = resolve(root, 'entity-mapping');
  mkdirSync(em, { recursive: true });
  writeFileSync(join(em, 'node.article.full.jsonata'), '$');
  writeFileSync(join(em, 'node.article.teaser.jsonata'), '$');
  writeFileSync(join(em, 'node.article.demo.yml'), 'content: {}');
  demoPath = join(em, 'node.article.demo.yml');
});

describe('indexEntityDemo', () => {
  it('emits one story per sibling jsonata view-mode under Entities/node/Article', () => {
    const entries = indexEntityDemo(demoPath);
    const stories = entries.filter((e) => e.type === 'story');
    expect(stories.map((s) => s.name).sort()).toEqual(['full', 'teaser']);
    expect(stories.every((s) => s.title === 'Entities/node/Article')).toBe(true);
  });

  it('emits a docs entry tagged autodocs', () => {
    const entries = indexEntityDemo(demoPath);
    const docs = entries.find((e) => e.type === 'docs');
    expect(docs).toBeTruthy();
    expect(docs.tags).toContain('autodocs');
  });
});
