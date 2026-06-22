import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { indexEntity } from '../preset';

let em: string;

beforeAll(() => {
  const root = mkdtempSync(join(tmpdir(), 'debo-idx-'));
  em = resolve(root, 'entity-mapping');
  mkdirSync(em, { recursive: true });
  writeFileSync(join(em, 'node.article.full.jsonata'), '$');
  writeFileSync(join(em, 'node.article.teaser.jsonata'), '$');
});

interface IndexEntry {
  type: string;
  importPath: string;
  exportName: string;
  title: string;
  name?: string;
  tags?: string[];
}

describe('indexEntity', () => {
  it('emits one story for the mapping view-mode under Entities/node/Article', () => {
    const entries = indexEntity(join(em, 'node.article.teaser.jsonata')) as IndexEntry[];
    const stories = entries.filter((e) => e.type === 'story');
    expect(stories.map((s) => s.name)).toEqual(['teaser']);
    expect(stories[0]!.title).toBe('Entities/node/Article');
  });

  it('canonical mapping (first sorted) emits the docs entry; others do not', () => {
    const fromFull = indexEntity(join(em, 'node.article.full.jsonata')) as IndexEntry[];
    const fromTeaser = indexEntity(join(em, 'node.article.teaser.jsonata')) as IndexEntry[];
    expect(fromFull.some((e) => e.type === 'docs')).toBe(true);
    expect(fromTeaser.some((e) => e.type === 'docs')).toBe(false);
    // every view-mode story imports the same canonical module → one module per bundle
    const s1 = fromFull.find((e) => e.type === 'story')!;
    const s2 = fromTeaser.find((e) => e.type === 'story')!;
    expect(s1.importPath).toBe(s2.importPath);
    expect(s1.importPath).toContain('node.article.full.jsonata');
  });
});
