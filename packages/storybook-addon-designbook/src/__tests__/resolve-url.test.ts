import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolveScene } from '../resolve-url.js';
import { dump as dumpYaml } from 'js-yaml';

const tmpDir = resolve(import.meta.dirname, '__fixtures_resolve_url__');

function setupFixtures() {
  rmSync(tmpDir, { recursive: true, force: true });

  // design-system scenes
  const dsDir = resolve(tmpDir, 'design-system');
  mkdirSync(dsDir, { recursive: true });
  writeFileSync(
    resolve(dsDir, 'design-system.scenes.yml'),
    dumpYaml({
      id: 'design-system',
      title: 'Design System',
      scenes: [
        { name: 'shell', items: [] },
        { name: 'typography', items: [] },
      ],
    }),
  );

  // section scenes
  const sectionDir = resolve(tmpDir, 'sections', 'galerie');
  mkdirSync(sectionDir, { recursive: true });
  writeFileSync(
    resolve(sectionDir, 'galerie.section.scenes.yml'),
    dumpYaml({
      id: 'galerie',
      title: 'Galerie',
      scenes: [
        { name: 'product-detail', items: [] },
        { name: 'overview', items: [] },
      ],
    }),
  );
}

describe('resolveScene', () => {
  beforeAll(() => setupFixtures());
  afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

  it('resolves design-system:shell to the correct scene', () => {
    const result = resolveScene(tmpDir, 'design-system:shell');
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0]!.name).toBe('shell');
    expect(result.filePath).toContain('design-system.scenes.yml');
  });

  it('resolves design-system without scene name to all scenes', () => {
    const result = resolveScene(tmpDir, 'design-system');
    expect(result.scenes).toHaveLength(2);
  });

  it('resolves section scene ref', () => {
    const result = resolveScene(tmpDir, 'galerie:product-detail');
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0]!.name).toBe('product-detail');
  });

  it('throws for unknown scene group', () => {
    expect(() => resolveScene(tmpDir, 'nonexistent:foo')).toThrow('No scenes file found');
  });

  it('throws for unknown scene name in valid group', () => {
    expect(() => resolveScene(tmpDir, 'design-system:nonexistent')).toThrow('Scene "nonexistent" not found');
  });
});
