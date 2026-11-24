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
  it('wraps the default export with merged props and slots, joining multi-child slots', () => {
    const mod = { default: (ctx: Record<string, unknown>) => `${ctx.title}|${ctx.content}` };
    const wrapped = new Function('C0', `return ${defaultTwigWrapImport('C0')}`)(mod) as {
      render: (p: object, s: object) => string;
    };
    expect(wrapped.render({ title: 'T' }, { content: ['<b>1</b>', '<i>2</i>'] })).toBe('T|<b>1</b><i>2</i>');
    expect(wrapped.render({ title: 'T' }, { content: '<b>1</b>' })).toBe('T|<b>1</b>');
  });
});
