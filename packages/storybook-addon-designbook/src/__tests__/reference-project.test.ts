import { mkdirSync, mkdtempSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dump as toYaml } from 'js-yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { observationContract, png } from './capture-fixture.js';
import { observationFixture, sizedPng } from './observation-fixture.js';
import { projectObservations, projectPublishedObservations } from '../tools/reference-project.js';
import { mergeObservationDocuments, type ReferenceObservationDocument } from '../tools/reference-observations.js';
import type { CapturedSource } from '../tools/inspect/element-walker.js';
import {
  validateCaptureObservations,
  type CaptureDefinition,
  type ObservationMeta,
} from '../tools/reference-capture.js';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

it('projects dump nodes, fonts and PNG dimensions without a second observations JSON', () => {
  const directory = mkdtempSync(join(tmpdir(), 'project-dump-'));
  dirs.push(directory);
  mkdirSync(join(directory, 'assets'));
  writeFileSync(join(directory, 'mobile--header--rest.png'), png);
  writeFileSync(join(directory, 'assets/inter.woff2'), 'font');
  writeFileSync(join(directory, 'assets/logo.svg'), '<svg/>');
  const dump: CapturedSource = {
    source_kind: 'url-dom',
    source_ref: 'https://example.test/header',
    captured_at: '2026-01-01T00:00:00.000Z',
    adapter_version: 'test',
    nodes: [
      {
        id: 'node',
        child_ids: ['img'],
        label: 'Home',
        kind: 'header',
        bbox: { x: 0, y: 0, width: 390, height: 40 },
        text: 'Home',
        style: {
          layout: 'flex-row',
          gap: '8px',
          padding: '0',
          margin: '0',
          background: '#fff',
          foreground: '#fff',
          font_family: 'Inter',
          font_size: '16px',
          font_weight: '400',
        },
        source: { locator: 'header' },
      },
      {
        id: 'img',
        parent_id: 'node',
        child_ids: [],
        label: 'logo',
        kind: 'image',
        bbox: { x: 0, y: 0, width: 1, height: 1 },
        src: 'logo',
        alt: 'Logo',
        style: { padding: '0', margin: '0', background: '' },
        source: { locator: 'header img' },
      },
    ],
  };
  const meta: ObservationMeta = {
    source: { kind: 'website', identity: 'https://example.test/header', revision: 'version-1' },
    role: 'reference',
    assets_dir: 'assets',
    elements: [
      {
        id: 'header',
        locator: { kind: 'css', value: 'header' },
        states: [{ name: 'rest', session: 'anonymous' }],
        views: [{ id: 'mobile', width: 390, height: 844, breakpoint: 'sm' }],
      },
    ],
  };
  const extract = projectObservations(new Map([['rest', dump]]), meta, directory);
  expect(extract.subjects[0]!.samples[0]!.observations.layout).toEqual({
    display: 'flex',
    gap: '8px',
  });
  expect(extract.fonts.map((font) => font.family)).toContain('Inter');
  expect(extract.images[0]).toMatchObject({ url: 'logo', reference_path: 'assets/logo.svg' });
  expect(extract.captures[0]).toMatchObject({
    subject: 'header',
    view: 'mobile',
    state: 'rest',
    path: 'mobile--header--rest.png',
    width: 1,
    height: 1,
  });
});

/**
 * A real page's computed `font-family` names OS fallbacks the source never
 * ships. Only the `@font-face` families it declares owe the revision a binary —
 * otherwise a single `"Segoe UI"` in a fallback stack would make the site
 * unpublishable, and no download could ever satisfy it.
 */
it('requires binaries for declared @font-face families only, not for fallback stack tokens', () => {
  const directory = mkdtempSync(join(tmpdir(), 'project-fallback-fonts-'));
  dirs.push(directory);
  mkdirSync(join(directory, 'assets'));
  writeFileSync(join(directory, 'mobile--header--rest.png'), png);
  writeFileSync(join(directory, 'assets/reef.woff2'), 'font');
  const dump: CapturedSource = {
    source_kind: 'url-dom',
    source_ref: 'https://example.test/header',
    captured_at: '2026-01-01T00:00:00.000Z',
    adapter_version: 'test',
    font_faces: [{ family: 'Reef', weight: '700', urls: ['https://example.test/reef.woff2'] }],
    nodes: [
      {
        id: 'node',
        child_ids: [],
        label: 'Home',
        kind: 'header',
        bbox: { x: 0, y: 0, width: 390, height: 40 },
        text: 'Home',
        style: {
          layout: 'stack',
          padding: '0',
          margin: '0',
          background: '#fff',
          font_family: 'Reef, "Segoe UI", Arial, sans-serif',
          font_size: '16px',
        },
        source: { locator: 'header' },
      },
    ],
  };
  const source = { kind: 'website', identity: 'https://example.test/header', revision: null };
  const locator = { kind: 'css', value: 'header' };
  const meta: ObservationMeta = {
    source,
    role: 'reference',
    assets_dir: 'assets',
    elements: [
      {
        id: 'header',
        locator,
        states: [{ name: 'rest', session: 'anonymous' }],
        views: [{ id: 'mobile', width: 390, height: 844 }],
      },
    ],
  };
  writeFileSync(join(directory, 'meta.yml'), toYaml(meta));
  writeFileSync(join(directory, 'extract--rest.json'), JSON.stringify(dump));
  const capture: CaptureDefinition = {
    role: 'reference',
    source,
    scope: [{ subject: 'header', view: 'mobile', state: 'rest', session: 'anonymous', locator }],
  };

  const extract = projectObservations(new Map([['rest', dump]]), meta, directory);
  const byFamily = new Map(extract.fonts.map((font) => [font.family, font]));
  expect(byFamily.get('Reef')).toMatchObject({
    source: 'self-hosted',
    files: [{ local_path: 'assets/reef.woff2', format: 'woff2' }],
  });
  expect(byFamily.get('Segoe UI')).toMatchObject({ source: 'other', files: [] });
  expect(byFamily.get('Arial')).toMatchObject({ source: 'other', files: [] });
  expect(byFamily.get('sans-serif')).toMatchObject({ source: 'system' });

  expect(validateCaptureObservations(directory, capture, meta, extract)).toContain('assets/reef.woff2');

  // The declared face still owes its binary: dropping it must fail publication.
  unlinkSync(join(directory, 'assets/reef.woff2'));
  const without = projectObservations(new Map([['rest', dump]]), meta, directory);
  expect(() => validateCaptureObservations(directory, capture, meta, without)).toThrow('Missing local font files Reef');
});

describe('imported source observations', () => {
  const contract = observationContract();
  const states = [
    { name: 'rest', session: 'anonymous' },
    { name: 'hover', session: 'anonymous' },
  ];
  const views = [
    { id: 'desktop', width: 1200, height: 6605 },
    { id: 'mobile', width: 390, height: 3200 },
  ];
  /** A complete unpublished imported revision: one document per state plus its files. */
  function revision(edit: (doc: ReferenceObservationDocument) => void = () => {}) {
    const directory = mkdtempSync(join(tmpdir(), 'project-imported-'));
    dirs.push(directory);
    const f = observationFixture({ states, views });
    for (const state of states) {
      const doc = f.document(state.name);
      edit(doc);
      writeFileSync(join(directory, `extract--${state.name}.json`), JSON.stringify(doc));
      for (const view of views) writeFileSync(join(directory, `${view.id}--hero--${state.name}.png`), f.screenshot);
    }
    mkdirSync(join(directory, 'assets'));
    writeFileSync(join(directory, 'assets/hero-logo.svg'), f.asset);
    writeFileSync(join(directory, 'meta.yml'), toYaml(f.meta));
    return { directory, f };
  }

  it('merges per-state documents into one extract and deduplicates shared records', () => {
    const f = observationFixture({ states, views });
    const merged = mergeObservationDocuments([f.document('rest'), f.document('hover')]);
    expect(merged.capture).toEqual(f.capture);
    expect(merged.extract.subjects).toHaveLength(1);
    expect(merged.extract.subjects[0]!.samples.map((s) => `${s.view}/${s.state}`)).toEqual([
      'desktop/rest',
      'mobile/rest',
      'desktop/hover',
      'mobile/hover',
    ]);
    expect(merged.extract.images).toHaveLength(1);
    expect(merged.extract.fonts).toHaveLength(1);
    expect(merged.extract.captures).toHaveLength(4);
  });

  it('merges parent samples by view and state', () => {
    const f = observationFixture({ states, views });
    const withParent = (state: string) => {
      const doc = f.document(state);
      doc.extract.parents = [
        {
          id: 'page',
          samples: views.map((view) => ({ view: view.id, state, layout: {}, asset_ids: [], font_families: [] })),
        },
      ];
      return doc;
    };
    const merged = mergeObservationDocuments([withParent('rest'), withParent('hover')]);
    expect(merged.extract.parents).toHaveLength(1);
    expect(merged.extract.parents[0]!.samples).toHaveLength(4);
  });

  it.each<[string, (docs: ReferenceObservationDocument[]) => void]>([
    ['a conflicting asset record', (docs) => (docs[1]!.extract.images[0]!.role = 'icon')],
    ['a conflicting font record', (docs) => (docs[1]!.extract.fonts[0]!.source = 'google')],
    [
      'a conflicting subject locator',
      (docs) => (docs[1]!.extract.subjects[0]!.locator = { kind: 'figma-node', value: '9:9' }),
    ],
    ['a differing capture definition', (docs) => (docs[1]!.capture = { ...docs[1]!.capture, role: 'actual' })],
    ['a duplicate state document', (docs) => (docs[1] = docs[0]!)],
  ])('rejects %s', (_label, change) => {
    const f = observationFixture({ states, views });
    const docs = [f.document('rest'), f.document('hover')];
    change(docs);
    expect(() => mergeObservationDocuments(docs)).toThrow();
  });

  it('projects a complete imported revision with downscaled screenshots and native ids', () => {
    const { directory } = revision();
    const { meta, extract } = projectPublishedObservations(directory, contract);
    expect(meta.source.kind).toBe('figma');
    expect(meta.elements[0]!.views[0]).toMatchObject({ width: 1200, height: 6605 });
    expect(extract.captures[0]).toMatchObject({ width: 187, height: 1024 });
    expect(extract.subjects[0]!.samples[0]!.structure.nodes[1]!.locator).toEqual({
      kind: 'figma-node',
      value: 'I12:34;56:78',
    });
  });

  it.each<[string, (r: ReturnType<typeof revision>) => void]>([
    ['a missing screenshot', (r) => unlinkSync(join(r.directory, 'mobile--hero--hover.png'))],
    ['a missing asset binary', (r) => unlinkSync(join(r.directory, 'assets/hero-logo.svg'))],
    ['a missing state document', (r) => unlinkSync(join(r.directory, 'extract--hover.json'))],
    [
      'metadata whose source differs from the stored capture',
      (r) =>
        writeFileSync(
          join(r.directory, 'meta.yml'),
          toYaml({ ...r.f.meta, source: { ...r.f.meta.source, revision: 'v9' } }),
        ),
    ],
    [
      'metadata whose locator differs from the stored capture',
      (r) =>
        writeFileSync(
          join(r.directory, 'meta.yml'),
          toYaml({
            ...r.f.meta,
            elements: [{ ...r.f.meta.elements[0]!, locator: { kind: 'figma-node', value: '1:2' } }],
          }),
        ),
    ],
    [
      'metadata outside the reference schema',
      (r) => writeFileSync(join(r.directory, 'meta.yml'), toYaml({ ...r.f.meta, assets_dir: 'elsewhere' })),
    ],
    [
      'a browser dump mixed into an imported revision',
      (r) =>
        writeFileSync(join(r.directory, 'extract--hover.json'), JSON.stringify({ source_kind: 'url-dom', nodes: [] })),
    ],
    [
      'a malformed stored structure',
      (r) => writeFileSync(join(r.directory, 'extract--hover.json'), '{"format":"designbook-observations"}'),
    ],
  ])('rejects %s', (_label, change) => {
    const r = revision();
    change(r);
    expect(() => projectPublishedObservations(r.directory, contract)).toThrow();
  });

  it('rejects required unavailable evidence at completion', () => {
    const { directory } = revision((doc) =>
      doc.extract.subjects[0]!.samples.forEach((sample) =>
        sample.unavailable.push({ property: 'structure', reason: 'Host returned no tree', required: true }),
      ),
    );
    expect(() => projectPublishedObservations(directory, contract)).toThrow(/Missing required evidence/);
  });

  it('rejects screenshots whose pixels differ from the declared capture record', () => {
    const { directory } = revision();
    writeFileSync(join(directory, 'desktop--hero--rest.png'), sizedPng(1200, 6605));
    expect(() => projectPublishedObservations(directory, contract)).toThrow(/dimensions differ/);
  });
});
