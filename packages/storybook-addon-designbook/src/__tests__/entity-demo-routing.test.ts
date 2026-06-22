import { describe, it, expect } from 'vitest';
import { isEntityMappingFile } from '../vite-plugin';

describe('isEntityMappingFile', () => {
  it('matches .jsonata mappings under entity-mapping/', () => {
    expect(isEntityMappingFile('/x/designbook/entity-mapping/node.article.full.jsonata')).toBe(true);
  });
  it('rejects scenes, demo.yml, and pool data files', () => {
    expect(isEntityMappingFile('/x/designbook/sections/blog/blog.section.scenes.yml')).toBe(false);
    expect(isEntityMappingFile('/x/designbook/entity-mapping/node.article.demo.yml')).toBe(false);
    expect(isEntityMappingFile('/x/designbook/data/node.article.yml')).toBe(false);
  });
});
