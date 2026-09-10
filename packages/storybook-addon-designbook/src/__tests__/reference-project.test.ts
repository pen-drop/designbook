import { mkdirSync, mkdtempSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dump as toYaml } from 'js-yaml';
import { afterEach, expect, it } from 'vitest';
import { png } from './capture-fixture.js';
import { projectObservations } from '../tools/reference-project.js';
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
