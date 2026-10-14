import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { defaultTwigResolver, defaultTwigWrapImport } from '../scene-module-builder.js';

describe('defaultTwigResolver', () => {
  const root = mkdtempSync(join(tmpdir(), 'twig-'));
  mkdirSync(join(root, 'components', 'recipe-card'), { recursive: true });
  writeFileSync(join(root, 'components', 'recipe-card', 'recipe-card.twig'), '<div></div>');
  const designbookDir = join(root, 'designbook');

  it('resolves ns:name with hyphen fallback', () => {
    expect(defaultTwigResolver('ns:recipe_card', designbookDir)).toBe(
      join(root, 'components', 'recipe-card', 'recipe-card.twig'),
    );
  });
  it('returns null for unknown or malformed ids', () => {
    expect(defaultTwigResolver('ns:missing', designbookDir)).toBeNull();
    expect(defaultTwigResolver('nonamespace', designbookDir)).toBeNull();
  });
  it('wraps the default export with merged props and slots', () => {
    expect(defaultTwigWrapImport('C0')).toBe('{ render: (p, s) => C0.default({ ...p, ...s }) }');
  });
});
