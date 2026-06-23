import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Reference } from '../reference-entity';
import { hashReferenceUrl } from '../resolvers/reference-folder';

function workspace(): string {
  const dir = mkdtempSync(join(tmpdir(), 'db-ref-'));
  const url = 'https://leando.de/';
  const hash = hashReferenceUrl(url);
  const refDir = join(dir, 'references', hash);
  mkdirSync(refDir, { recursive: true });
  writeFileSync(
    join(refDir, 'meta.yml'),
    [
      'source:',
      `  url: ${url}`,
      'elements:',
      '  - id: full',
      '    selector: app-signage',
      '    breakpoints: [xl]',
      '    states:',
      '      - { name: rest, steps: [] }',
      'extract: extract.json',
      'assets_dir: assets/',
    ].join('\n'),
  );
  return dir;
}

describe('Reference', () => {
  it('loads a reference by hash and exposes elements', () => {
    const data = workspace();
    const hash = hashReferenceUrl('https://leando.de/');
    const ref = Reference.load({ data, technology: 'html' }, hash);
    expect(ref).not.toBeNull();
    const json = ref!.toJSON();
    expect(json.source.url).toBe('https://leando.de/');
    expect(json.dir).toBe(`references/${hash}`);
    expect(json.elements).toEqual([
      { id: 'full', selector: 'app-signage', breakpoints: ['xl'], states: [{ name: 'rest', steps: [] }] },
    ]);
  });

  it('returns null for an unknown hash', () => {
    const data = workspace();
    expect(Reference.load({ data, technology: 'html' }, 'deadbeef0000')).toBeNull();
  });
});
