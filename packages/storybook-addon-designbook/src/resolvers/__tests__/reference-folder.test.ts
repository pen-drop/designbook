import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ResolverContext } from '../types.js';
import { referenceFolderResolver } from '../reference-folder.js';

const tmpDir = join(import.meta.dirname, '__fixtures_reference_folder_resolver__');

function makeContext(params: Record<string, unknown>): ResolverContext {
  return { config: { data: tmpDir, technology: 'html' }, params };
}

function expectedHash(url: string): string {
  const normalized = url.toLowerCase().replace(/\/+$/, '');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

describe('referenceFolderResolver', () => {
  beforeAll(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('has name "reference_folder"', () => {
    expect(referenceFolderResolver.name).toBe('reference_folder');
  });

  it('resolves URL to hash-based folder path', async () => {
    const url = 'https://example.com/design';
    const result = await referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: url }),
    );
    const hash = expectedHash(url);
    expect(result.resolved).toBe(true);
    expect(result.value).toBe(resolve(tmpDir, 'references', hash));
  });

  it('creates directory if not exists', async () => {
    const url = 'https://example.com/new-dir-test';
    const result = await referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: url }),
    );
    expect(result.resolved).toBe(true);
    expect(typeof result.value).toBe('string');
    expect(existsSync(result.value as string)).toBe(true);
  });

  it('normalizes trailing slash', async () => {
    const withSlash = 'https://example.com/page/';
    const withoutSlash = 'https://example.com/page';
    const resultWith = await referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: withSlash }),
    );
    const resultWithout = await referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: withoutSlash }),
    );
    expect(resultWith.value).toBe(resultWithout.value);
  });

  it('normalizes case', async () => {
    const mixed = 'https://Example.COM/Page';
    const lower = 'https://example.com/page';
    const resultMixed = await referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: mixed }),
    );
    const resultLower = await referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: lower }),
    );
    expect(resultMixed.value).toBe(resultLower.value);
  });

  it('preserves query strings', async () => {
    const url1 = 'https://example.com/page?v=1';
    const url2 = 'https://example.com/page?v=2';
    const result1 = await referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: url1 }),
    );
    const result2 = await referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: url2 }),
    );
    expect(result1.value).not.toBe(result2.value);
  });

  it('returns unresolved when from-param missing', async () => {
    const result = await referenceFolderResolver.resolve('', { from: 'reference_url' }, makeContext({}));
    expect(result.resolved).toBe(false);
    expect(result.error).toContain('reference_url');
  });

  it('returns unresolved when from-param is empty string', async () => {
    const result = await referenceFolderResolver.resolve(
      '',
      { from: 'reference_url' },
      makeContext({ reference_url: '' }),
    );
    expect(result.resolved).toBe(false);
  });

  it('returns unresolved when "from" config missing', async () => {
    const result = await referenceFolderResolver.resolve('', {}, makeContext({ reference_url: 'https://example.com' }));
    expect(result.resolved).toBe(false);
    expect(result.error).toContain('from');
  });
});
