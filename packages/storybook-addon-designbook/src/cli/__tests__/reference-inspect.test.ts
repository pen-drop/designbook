import { describe, expect, it, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectReference } from '../reference-inspect.js';
import { sourceDumpName } from '../../tools/reference-project.js';
import type { CapturedSource } from '../../tools/inspect/element-walker.js';
import { importObservations } from '../../tools/reference-observations.js';
import { observationContract } from '../../__tests__/capture-fixture.js';
import { observationFixture } from '../../__tests__/observation-fixture.js';

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

describe('reference inspect on imported observations', () => {
  const contract = observationContract();
  const twoViews = [
    { id: 'desktop', width: 1200, height: 6605 },
    { id: 'mobile', width: 390, height: 3200 },
  ];
  function imported(views?: typeof twoViews): string {
    const dir = mkdtempSync(join(tmpdir(), 'reference-inspect-native-'));
    dirs.push(dir);
    importObservations(dir, observationFixture(views ? { views } : {}).document('rest'), contract);
    return dir;
  }
  const native = { state: 'rest', locatorKind: 'figma-node', contract };

  it('reports source identity and node totals without a locator', () => {
    expect(inspectReference({ reference: imported(), state: 'rest', contract })).toMatchObject({
      state: 'rest',
      nodes: 2,
      source_ref: 'synthetic-file-key',
      source_kind: 'figma',
    });
  });

  it('resolves an instance-qualified native id exactly in its sample context', () => {
    const result = inspectReference({ reference: imported(), ...native, locator: 'I12:34;56:78' });
    expect(result.locator_kind).toBe('figma-node');
    expect(result.subject).toMatchObject({
      locator: 'I12:34;56:78',
      found: true,
      kind: 'INSTANCE',
      context: { subject: 'hero', view: 'desktop', state: 'rest' },
      descendants: 1,
      images: ['figma-image:hero-logo'],
      fonts: ['Inter'],
      unavailable: [{ property: 'interactions', required: false }],
    });
    // Optional source geometry is absent, not invented.
    expect(result.subject!.bbox).toBeUndefined();
  });

  it('never matches a native id by suffix and offers no CSS diagnostics', () => {
    const miss = inspectReference({ reference: imported(), ...native, locator: '56:78' });
    expect(miss.subject).toEqual({ locator: '56:78', found: false });
    const wrongKind = inspectReference({ reference: imported(), ...native, locator: '12:34', locatorKind: 'css' });
    expect(wrongKind.subject).toEqual({ locator: '12:34', found: false });
  });

  it('bounds the native subtree by depth and limit', () => {
    const reference = imported();
    const shallow = inspectReference({ reference, ...native, locator: '12:34', depth: 0 });
    expect(shallow.subject!.tree!.map((n) => n.locator)).toEqual(['12:34']);
    expect(shallow.subject!.descendants).toBe(2);
    const capped = inspectReference({ reference, ...native, locator: '12:34', limit: 1 });
    expect(capped.subject!.tree).toHaveLength(1);
    expect(capped.subject!.truncated).toBe(true);
  });

  it('requires an explicit view when the locator lives in several sample contexts', () => {
    const reference = imported(twoViews);
    expect(() => inspectReference({ reference, ...native, locator: '12:34' })).toThrow(/ambiguous.*--view/i);
    const mobile = inspectReference({ reference, ...native, locator: '12:34', view: 'mobile' });
    expect(mobile.subject).toMatchObject({ found: true, context: { view: 'mobile' } });
  });

  it('requires the effective contract and the locator kind', () => {
    const reference = imported();
    expect(() => inspectReference({ reference, state: 'rest' })).toThrow(/--contract/);
    expect(() => inspectReference({ reference, state: 'rest', contract, locator: '12:34' })).toThrow(/--locator-kind/);
  });

  it('names both producers when the state has no stored extract', () => {
    expect(() => inspectReference({ reference: imported(), state: 'hover', contract })).toThrow(
      /reference save.*reference import/,
    );
  });
});
