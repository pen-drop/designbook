import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { listMappingFiles } from '../../vite-plugin';

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'debo-list-'));
  const em = resolve(root, 'entity-mapping');
  mkdirSync(em, { recursive: true });
  writeFileSync(join(em, 'node.article.full.jsonata'), '$');
  writeFileSync(join(em, 'node.article.teaser.jsonata'), '$');
  writeFileSync(join(em, 'README.md'), 'x');
});

describe('listMappingFiles', () => {
  it('returns only .jsonata basenames in the directory', () => {
    expect(listMappingFiles(root, 'entity-mapping').sort()).toEqual([
      'node.article.full.jsonata',
      'node.article.teaser.jsonata',
    ]);
  });

  it('returns [] for a missing directory', () => {
    expect(listMappingFiles(root, 'form-mapping')).toEqual([]);
  });

  it('throws when dir escapes the designbook root', () => {
    expect(() => listMappingFiles(root, '../../etc')).toThrow();
  });
});
