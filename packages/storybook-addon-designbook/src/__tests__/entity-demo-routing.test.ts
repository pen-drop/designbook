import { describe, it, expect } from 'vitest';
import { isEntityDemoFile } from '../vite-plugin';

describe('isEntityDemoFile', () => {
  it('matches demo files under entity-mapping/', () => {
    expect(isEntityDemoFile('/x/designbook/entity-mapping/node.article.demo.yml')).toBe(true);
  });
  it('rejects scenes and non-demo yml', () => {
    expect(isEntityDemoFile('/x/designbook/sections/blog/blog.section.scenes.yml')).toBe(false);
    expect(isEntityDemoFile('/x/designbook/entity-mapping/node.article.full.jsonata')).toBe(false);
    expect(isEntityDemoFile('/x/designbook/data.yml')).toBe(false);
  });
});
