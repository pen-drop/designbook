import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { toId } from 'storybook/internal/csf';
import { indexComponentStory, frameworkOptionsFor, assertReactHost, reactPluginCheck } from '../addon/preset';
import { defaultReactWrapImport, defaultReactRenderExpression } from '../scene-model/scene-module-builder';

function reactComponentDir(): string {
  const root = mkdtempSync(join(tmpdir(), 'debo-react-idx-'));
  const dir = resolve(root, 'components', 'price-badge');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'price-badge.tsx'), 'export default function PriceBadge() { return null; }');
  writeFileSync(join(dir, 'price-badge.sale.story.yml'), 'component: "t:price-badge"\nname: Sale\n');
  return dir;
}

describe('React component story indexing', () => {
  it('indexes a story with a TSX sibling on the react route', () => {
    const dir = reactComponentDir();
    const [entry] = indexComponentStory(join(dir, 'price-badge.sale.story.yml'), 'react');
    expect(toId(entry.title, entry.name)).toBe('components-price-badge--sale');
  });

  it('does not index a TSX-only component on the vue route', () => {
    const dir = reactComponentDir();
    expect(indexComponentStory(join(dir, 'price-badge.sale.story.yml'), 'vue')).toEqual([]);
  });
});

describe('frameworkOptionsFor', () => {
  it('selects the React resolver, wrapper and render expression for react', () => {
    const dir = reactComponentDir();
    const designbookDir = resolve(dir, '..', '..', 'designbook');
    const opts = frameworkOptionsFor('react', designbookDir);
    expect(opts.wrapImport).toBe(defaultReactWrapImport);
    expect(opts.renderExpression).toBe(defaultReactRenderExpression);
    expect(opts.resolveImportPath!('t:price-badge')).toMatch(/price-badge\.tsx$/);
  });

  it('keeps SDC on the defaults', () => {
    expect(frameworkOptionsFor('sdc', '/x')).toEqual({});
  });
});

describe('React host checks', () => {
  it('accepts @storybook/html-vite (string or object, absolute path)', () => {
    expect(() => assertReactHost('@storybook/html-vite')).not.toThrow();
    expect(() => assertReactHost({ name: '/abs/node_modules/@storybook/html-vite' })).not.toThrow();
  });

  it('rejects another framework with a message naming html-vite', () => {
    expect(() => assertReactHost('@storybook/react-vite')).toThrow(/@storybook\/html-vite/);
  });

  it('fails when @vitejs/plugin-react is not registered', () => {
    const check = reactPluginCheck();
    const configResolved = check.configResolved as (c: { plugins: { name: string }[] }) => void;
    expect(() => configResolved({ plugins: [{ name: 'vite:esbuild' }] })).toThrow(/@vitejs\/plugin-react/);
    expect(() => configResolved({ plugins: [{ name: 'vite:react-babel' }] })).not.toThrow();
  });
});
