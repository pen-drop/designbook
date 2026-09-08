import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { png } from './capture-fixture.js';
import { projectObservations } from '../reference-project.js';
import type { CapturedSource } from '../inspect/element-walker.js';
import type { ObservationMeta } from '../reference-capture.js';

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
    extract: 'extract.json',
    assets_dir: 'assets',
    elements: [
      {
        id: 'header',
        locator: { kind: 'css', value: 'header' },
        states: [{ name: 'rest' }],
        views: [{ id: 'mobile', width: 390, height: 844, breakpoint: 'sm' }],
      },
    ],
  };
  const extract = projectObservations(dump, meta, directory);
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
