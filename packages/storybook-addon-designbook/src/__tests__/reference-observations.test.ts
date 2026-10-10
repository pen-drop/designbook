import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { importObservations, parseObservationDocument } from '../tools/reference-observations.js';
import { sourceDumpName } from '../tools/reference-project.js';
import { observationContract } from './capture-fixture.js';
import { observationFixture } from './observation-fixture.js';

const contract = observationContract();
const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));
function folder() {
  const dir = mkdtempSync(join(tmpdir(), 'observations-'));
  dirs.push(dir);
  return dir;
}
type Doc = ReturnType<ReturnType<typeof observationFixture>['document']>;
const mutate = (change: (doc: Doc) => void) => {
  const doc = structuredClone(observationFixture().document('rest'));
  change(doc);
  return doc;
};

describe('parseObservationDocument', () => {
  it('keeps native locators and instance-qualified ids verbatim', () => {
    const stored = parseObservationDocument(observationFixture().document('rest'), contract);
    expect(stored.format).toBe('designbook-observations');
    expect(stored.extract.subjects[0]!.locator).toEqual({ kind: 'figma-node', value: '12:34' });
    expect(stored.extract.subjects[0]!.samples[0]!.structure.nodes.map((n) => n.id)).toEqual(['12:34', 'I12:34;56:78']);
  });

  it('accepts a second source kind through the same format', () => {
    const f = observationFixture({ kind: 'sketch', locatorKind: 'sketch-layer' });
    expect(parseObservationDocument(f.document('rest'), contract).capture.source.kind).toBe('sketch');
  });

  it('accepts several views as separate sample cells', () => {
    const f = observationFixture({
      views: [
        { id: 'desktop', width: 1200, height: 6605 },
        { id: 'mobile', width: 390, height: 3200 },
      ],
    });
    expect(parseObservationDocument(f.document('rest'), contract).extract.subjects[0]!.samples).toHaveLength(2);
  });

  it.each<[string, (doc: Doc) => void]>([
    ['wrong format', (doc) => ((doc as { format: string }).format = 'other')],
    ['invalid timestamp', (doc) => (doc.captured_at = 'yesterday')],
    ['unsafe state name', (doc) => (doc.state = '../rest')],
    ['schema violation', (doc) => delete (doc.extract as Partial<Doc['extract']>).captures],
    [
      'duplicate node',
      (doc) => {
        const s = doc.extract.subjects[0]!.samples[0]!.structure;
        s.nodes.push(s.nodes[1]!);
      },
    ],
    ['dangling child', (doc) => doc.extract.subjects[0]!.samples[0]!.structure.nodes[1]!.children.push('99:1')],
    ['cycle', (doc) => doc.extract.subjects[0]!.samples[0]!.structure.nodes[1]!.children.push('12:34')],
    [
      'repeated placement',
      (doc) => {
        const s = doc.extract.subjects[0]!.samples[0]!.structure;
        s.roots.push('I12:34;56:78');
      },
    ],
    [
      'duplicate sample',
      (doc) => doc.extract.subjects[0]!.samples.push(structuredClone(doc.extract.subjects[0]!.samples[0]!)),
    ],
    ['sample of another state', (doc) => (doc.extract.subjects[0]!.samples[0]!.state = 'hover')],
    ['sample outside the capture scope', (doc) => (doc.extract.subjects[0]!.samples[0]!.view = 'tablet')],
    ['locator kind mismatch', (doc) => (doc.extract.subjects[0]!.samples[0]!.structure.nodes[1]!.locator.kind = 'css')],
    [
      'subject locator differs from scope',
      (doc) => (doc.extract.subjects[0]!.locator = { kind: 'figma-node', value: '1:2' }),
    ],
    ['invalid image dimensions', (doc) => (doc.extract.captures[0]!.width = 0)],
    ['fractional image dimensions', (doc) => (doc.extract.captures[0]!.width = 18.5)],
    ['non-canonical screenshot path', (doc) => (doc.extract.captures[0]!.path = 'shot.png')],
    ['asset path escape', (doc) => (doc.extract.images[0]!.reference_path = 'assets/../../outside.svg')],
    ['asset outside assets/', (doc) => (doc.extract.images[0]!.reference_path = 'logo.svg')],
    ['undeclared asset dependency', (doc) => (doc.extract.images = [])],
    ['undeclared font dependency', (doc) => (doc.extract.fonts = [])],
    [
      'undeclared parent dependency',
      (doc) => doc.extract.subjects[0]!.samples[0]!.dependencies.parent_ids.push('page'),
    ],
  ])('rejects %s', (_label, change) => {
    expect(() => parseObservationDocument(mutate(change), contract)).toThrow();
  });

  it.each<[string, (doc: Doc) => void]>([
    ['missing scope cell', (doc) => doc.extract.subjects[0]!.samples.pop()],
    ['missing screenshot record', (doc) => doc.extract.captures.pop()],
  ])('rejects %s among several views', (_label, change) => {
    const doc = observationFixture({
      views: [
        { id: 'desktop', width: 1200, height: 6605 },
        { id: 'mobile', width: 390, height: 3200 },
      ],
    }).document('rest');
    change(doc);
    expect(() => parseObservationDocument(doc, contract)).toThrow(/missing sample|screenshot record/);
  });
});

describe('importObservations', () => {
  it('stores the document as the state extract and leaves binaries for later', () => {
    const dir = folder();
    const doc = observationFixture().document('rest');
    importObservations(dir, doc, contract);
    expect(JSON.parse(readFileSync(join(dir, sourceDumpName('rest')), 'utf8'))).toEqual(doc);
    expect(existsSync(join(dir, 'desktop--hero--rest.png'))).toBe(false);
  });

  it('rejects a capture definition differing from an already imported state without writing', () => {
    const dir = folder();
    const states = [
      { name: 'rest', session: 'anonymous' },
      { name: 'hover', session: 'anonymous' },
    ];
    importObservations(dir, observationFixture({ states }).document('rest'), contract);
    const other = observationFixture({ states }).document('hover');
    other.capture = { ...other.capture, source: { ...other.capture.source, revision: 'v2' } };
    expect(() => importObservations(dir, other, contract)).toThrow(/capture/i);
    expect(existsSync(join(dir, sourceDumpName('hover')))).toBe(false);
  });

  it('rejects an invalid document without touching the existing extract', () => {
    const dir = folder();
    writeFileSync(join(dir, sourceDumpName('rest')), 'sentinel');
    expect(() =>
      importObservations(
        dir,
        mutate((doc) => (doc.captured_at = 'x')),
        contract,
      ),
    ).toThrow();
    expect(readFileSync(join(dir, sourceDumpName('rest')), 'utf8')).toBe('sentinel');
  });

  it('refuses to write into a published revision', () => {
    const dir = folder();
    writeFileSync(join(dir, 'publication.json'), '{}');
    expect(() => importObservations(dir, observationFixture().document('rest'), contract)).toThrow(/read-only/);
  });

  it('refuses to mix with a browser dump of another state', () => {
    const dir = folder();
    writeFileSync(join(dir, sourceDumpName('hover')), JSON.stringify({ source_kind: 'url-dom', nodes: [] }));
    expect(() => importObservations(dir, observationFixture().document('rest'), contract)).toThrow(/mix/i);
  });
});
