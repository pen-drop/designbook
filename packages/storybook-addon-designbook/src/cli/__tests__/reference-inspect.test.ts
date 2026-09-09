import { describe, expect, it, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectReference } from '../reference-inspect.js';
import { sourceDumpName } from '../../reference-project.js';
import type { CapturedSource } from '../../inspect/element-walker.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function node(id: string, locator: string, extra: Partial<CapturedSource['nodes'][number]> = {}) {
  return {
    id,
    child_ids: [],
    label: id,
    kind: 'container',
    bbox: { x: 0, y: 0, width: 10, height: 10 },
    style: { padding: '0', margin: '0', background: '' },
    source: { locator },
    ...extra,
  } as CapturedSource['nodes'][number];
}

function revision(nodes: CapturedSource['nodes'], state = 'rest'): string {
  const dir = mkdtempSync(join(tmpdir(), 'reference-inspect-'));
  dirs.push(dir);
  const dump: CapturedSource = {
    source_kind: 'url-dom',
    source_ref: 'https://example.test/',
    captured_at: '2026-01-01T00:00:00.000Z',
    adapter_version: 'test',
    nodes,
  };
  writeFileSync(join(dir, sourceDumpName(state)), JSON.stringify(dump));
  return dir;
}

describe('reference inspect', () => {
  const tree = [
    node('root', 'body > header', {
      child_ids: ['logo', 'nav'],
      kind: 'header',
      style: { padding: '0', margin: '0', background: '', font_family: '"Reef", sans-serif' },
    }),
    node('logo', 'body > header > img', { kind: 'image', src: '/logo.svg', alt: 'Logo' }),
    node('nav', 'body > header > nav', { child_ids: ['deep'], kind: 'nav' }),
    node('deep', 'body > header > nav > a', { kind: 'link', text: 'Über uns' }),
    node('other', 'body > footer', { kind: 'footer', src: '/unrelated.png' }),
  ];

  it('reports dump totals without a locator', () => {
    const result = inspectReference({ reference: revision(tree), state: 'rest' });
    expect(result).toEqual({ state: 'rest', nodes: 5, source_ref: 'https://example.test/' });
  });

  it('resolves a locator and projects only its subtree', () => {
    const result = inspectReference({ reference: revision(tree), state: 'rest', locator: 'body > header' });
    expect(result.subject).toMatchObject({ found: true, kind: 'header', descendants: 4 });
    // `/unrelated.png` hangs outside the subject and must not leak in.
    expect(result.subject!.images).toEqual(['/logo.svg']);
    expect(result.subject!.fonts).toEqual(['Reef', 'sans-serif']);
  });

  it('answers an unresolved locator instead of failing', () => {
    const result = inspectReference({ reference: revision(tree), state: 'rest', locator: 'body > main' });
    expect(result.subject).toEqual({ locator: 'body > main', found: false });
  });

  it('names the recorded locator when the request was written shorter', () => {
    const result = inspectReference({ reference: revision(tree), state: 'rest', locator: 'header' });
    expect(result.subject).toMatchObject({
      found: false,
      miss: { suffix_matches: ['body > header'] },
    });
  });

  it('names the deepest resolved ancestor and the children that exist there', () => {
    const result = inspectReference({
      reference: revision([node('body', 'body', { child_ids: ['root'] }), ...tree]),
      state: 'rest',
      locator: 'body > header > nav:nth-of-type(2)',
    });
    expect(result.subject!.miss).toEqual({
      resolved_prefix: 'body > header',
      failed_segment: 'nav:nth-of-type(2)',
      children: ['body > header > img', 'body > header > nav'],
    });
  });

  it('bounds the reported subtree by depth and marks truncation', () => {
    const shallow = inspectReference({
      reference: revision(tree),
      state: 'rest',
      locator: 'body > header',
      depth: 1,
    });
    expect(shallow.subject!.tree!.map((n) => n.locator)).toEqual([
      'body > header',
      'body > header > img',
      'body > header > nav',
    ]);
    expect(shallow.subject!.truncated).toBeUndefined();
    const capped = inspectReference({
      reference: revision(tree),
      state: 'rest',
      locator: 'body > header',
      depth: 2,
      limit: 2,
    });
    expect(capped.subject!.tree).toHaveLength(2);
    expect(capped.subject!.truncated).toBe(true);
  });

  it('names the missing dump when the state was never captured', () => {
    expect(() => inspectReference({ reference: revision(tree), state: 'menu-open' })).toThrow(
      /No dump for state "menu-open"/,
    );
    expect(() => inspectReference({ reference: 'relative/path', state: 'rest' })).toThrow(/absolute/);
  });
});
