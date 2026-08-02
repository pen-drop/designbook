import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { indexEntity } from '../preset';

// The fixture designbook dir carries a data-model.yml where `view` lives under
// config: and `node` under content: — the indexer derives Config vs Entities
// grouping from that section, so it reads the model from dirname(dirname(file)).
const FIXTURES = resolve(__dirname, '../renderer/__tests__/fixtures');

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

  it('groups a config view under Config/view/recent_articles with a config story tag', () => {
    const entries = indexEntity(
      resolve(FIXTURES, 'entity-mapping', 'view.recent_articles.default.jsonata'),
    ) as IndexEntry[];
    const story = entries.find((e) => e.type === 'story')!;
    expect(story.title).toBe('Config/view/recent_articles');
    expect(story.tags).toContain('config');
    const docs = entries.find((e) => e.type === 'docs')!;
    expect(docs.title).toBe('Config/view/recent_articles');
    expect(docs.tags).toContain('config');
  });

  it('keeps a content node under Entities/node/Article without a config tag', () => {
    const entries = indexEntity(resolve(FIXTURES, 'entity-mapping', 'node.article.teaser.jsonata')) as IndexEntry[];
    const story = entries.find((e) => e.type === 'story')!;
    expect(story.title).toBe('Entities/node/Article');
    expect(story.tags).toEqual(['entity', 'autodocs']);
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
