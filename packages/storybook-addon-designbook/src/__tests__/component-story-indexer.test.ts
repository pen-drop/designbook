import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { indexComponentStory } from '../addon/preset';

let componentsDir: string;

beforeAll(() => {
  const root = mkdtempSync(join(tmpdir(), 'debo-component-idx-'));
  componentsDir = resolve(root, 'components', 'book-card');
  mkdirSync(componentsDir, { recursive: true });
  writeFileSync(join(componentsDir, 'book-card.vue'), '<template><div /></template>');
  writeFileSync(join(componentsDir, 'book-card.default.story.yml'), 'component: "test:book-card"\nname: Default\n');
  writeFileSync(
    join(componentsDir, 'book-card.sale.story.yml'),
    'component: "test:book-card"\nname: Sale\nprops:\n  onSale: true\n',
  );
  // Orphan story file with no sibling .vue — must be skipped
  mkdirSync(resolve(root, 'components', 'orphan'), { recursive: true });
  writeFileSync(resolve(root, 'components', 'orphan', 'orphan.default.story.yml'), 'component: "test:orphan"\n');
});

interface IndexEntry {
  type: string;
  importPath: string;
  exportName: string;
  title: string;
  name?: string;
  tags?: string[];
}

describe('indexComponentStory', () => {
  it('emits one story entry titled Components/<Human Name>', () => {
    const entries = indexComponentStory(join(componentsDir, 'book-card.default.story.yml')) as IndexEntry[];
    expect(entries).toHaveLength(1);
    expect(entries[0]!.title).toBe('Components/Book Card');
    expect(entries[0]!.name).toBe('Default');
    expect(entries[0]!.type).toBe('story');
    expect(entries[0]!.tags).toContain('component');
  });

  it('derives a distinct name/exportName per variant, sharing the same title', () => {
    const defaultEntry = indexComponentStory(join(componentsDir, 'book-card.default.story.yml'))[0] as IndexEntry;
    const saleEntry = indexComponentStory(join(componentsDir, 'book-card.sale.story.yml'))[0] as IndexEntry;
    expect(defaultEntry.title).toBe(saleEntry.title);
    expect(defaultEntry.name).not.toBe(saleEntry.name);
    expect(defaultEntry.exportName).not.toBe(saleEntry.exportName);
  });

  it('skips a story file with no sibling <name>.vue component', () => {
    const root = resolve(componentsDir, '..', 'orphan');
    const entries = indexComponentStory(resolve(root, 'orphan.default.story.yml'));
    expect(entries).toEqual([]);
  });

  it('skips a file name that does not match <name>.<variant>.story.yml', () => {
    const entries = indexComponentStory(join(componentsDir, 'book-card.story.yml'));
    expect(entries).toEqual([]);
  });
});
