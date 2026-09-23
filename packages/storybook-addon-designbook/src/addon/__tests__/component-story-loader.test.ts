import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { designbookLoadPlugin, isComponentStoryFile } from '../vite-plugin';

describe('isComponentStoryFile', () => {
  it('matches <name>.<variant>.story.yml under components/<name>/', () => {
    expect(isComponentStoryFile('/ws/components/book-card/book-card.default.story.yml')).toBe(true);
    expect(isComponentStoryFile('./components/book-card/book-card.sale.story.yml')).toBe(true);
  });

  it('rejects scene files and mapping files', () => {
    expect(isComponentStoryFile('/ws/sections/foo/foo.section.scenes.yml')).toBe(false);
    expect(isComponentStoryFile('/ws/entity-mapping/node.article.full.jsonata')).toBe(false);
  });

  it('rejects a story.yml with no variant segment', () => {
    expect(isComponentStoryFile('/ws/components/book-card/book-card.story.yml')).toBe(false);
  });
});

describe('designbookLoadPlugin — component story loading', () => {
  let baseDir: string;
  let storyFile: string;

  beforeAll(() => {
    const root = mkdtempSync(join(tmpdir(), 'debo-component-load-'));
    baseDir = root;
    mkdirSync(resolve(root, 'designbook'), { recursive: true });
    const componentsDir = resolve(root, 'components', 'book-card');
    mkdirSync(componentsDir, { recursive: true });
    writeFileSync(join(componentsDir, 'book-card.vue'), '<template><div /></template>');
    storyFile = join(componentsDir, 'book-card.default.story.yml');
    writeFileSync(storyFile, 'component: "test:book-card"\nname: Default\nprops:\n  title: "Dune"\n');
  });

  it('builds a CSF module with the Components/<Name> title and Default export', async () => {
    const plugin = designbookLoadPlugin(baseDir, {
      fsRoot: 'designbook',
      // Passthrough resolver/wrapper — no real component runtime needed for this assertion.
      resolveImportPath: (componentId) => `./components/${componentId.split(':')[1]}.js`,
      wrapImport: (alias) => `{ render: (p, s) => ({ component: '${alias}', props: p, slots: s }) }`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const code: string | null = await plugin.load(storyFile);
    expect(code).toBeTruthy();
    expect(code).toContain('title: "Components/Book Card"');
    expect(code).toContain('export const Default');
  });
});
