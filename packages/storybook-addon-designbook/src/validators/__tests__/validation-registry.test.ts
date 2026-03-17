import { describe, it, expect, vi, afterEach } from 'vitest';
import { ValidationRegistry, validateViaStorybookHttp } from '../../validation-registry.js';
import type { DesignbookConfig } from '../../config.js';

const mockConfig: DesignbookConfig = {
  dist: '/tmp/test-designbook',
  technology: 'html',
  tmp: 'tmp',
  extensions: [],
};

// ── ValidationRegistry ──────────────────────────────────────────────────────

describe('ValidationRegistry', () => {
  it('falls through to skipped when no validator matches', async () => {
    const registry = new ValidationRegistry();
    const result = await registry.validate('/some/unknown.xyz', mockConfig);
    expect(result.type).toBe('unknown');
    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it('calls matching validator', async () => {
    const registry = new ValidationRegistry();
    const validator = vi.fn().mockResolvedValue({
      file: '/a/b.component.yml',
      type: 'component',
      valid: true,
      last_validated: new Date().toISOString(),
    });
    registry.register('**/*.component.yml', validator);
    await registry.validate('/a/b.component.yml', mockConfig);
    expect(validator).toHaveBeenCalledWith('/a/b.component.yml', mockConfig);
  });

  it('last registration wins', async () => {
    const registry = new ValidationRegistry();
    const first = vi.fn().mockResolvedValue({ file: 'x', type: 't', valid: false, last_validated: '' });
    const second = vi.fn().mockResolvedValue({ file: 'x', type: 't', valid: true, last_validated: '' });
    registry.register('**/*.component.yml', first);
    registry.register('**/*.component.yml', second);
    const result = await registry.validate('/a/test.component.yml', mockConfig);
    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    expect(result.valid).toBe(true);
  });

  it('array patterns all match', async () => {
    const registry = new ValidationRegistry();
    const validator = vi.fn().mockResolvedValue({
      file: 'x',
      type: 'story',
      valid: true,
      last_validated: '',
    });
    registry.register(['**/*.story.yml', '**/*.scenes.yml'], validator);

    await registry.validate('/a/button.story.yml', mockConfig);
    await registry.validate('/a/listing.scenes.yml', mockConfig);
    expect(validator).toHaveBeenCalledTimes(2);
  });
});

// ── validateViaStorybookHttp ─────────────────────────────────────────────────

describe('validateViaStorybookHttp', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns skipped when Storybook is unreachable', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await validateViaStorybookHttp('/path/to/button.story.yml', mockConfig);
    expect(result.skipped).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.type).toBe('story');
  });

  it('returns valid when story is found in index', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        entries: {
          'button--default': {
            id: 'button--default',
            importPath: './path/to/button.story.yml',
            name: 'Default',
            exportName: 'Default',
          },
        },
      }),
    } as Response);
    const result = await validateViaStorybookHttp('/tmp/test-designbook/path/to/button.story.yml', mockConfig);
    expect(result.valid).toBe(true);
  });

  it('returns valid:false when only LoadError entries found and extracts error from module', async () => {
    const errorJs =
      "export default { title: 'Errors/button.story.yml' };\n" +
      "export const LoadError = { render: () => '<pre>Twig error: undefined variable</pre>' };";
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/index.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            entries: {
              'errors-button-story-yml--load-error': {
                id: 'errors-button-story-yml--load-error',
                importPath: './path/to/button.story.yml',
                name: 'Load Error',
                exportName: 'LoadError',
              },
            },
          }),
        });
      }
      // module fetch
      return Promise.resolve({ ok: true, text: async () => errorJs });
    });
    const result = await validateViaStorybookHttp('/tmp/test-designbook/path/to/button.story.yml', mockConfig);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Twig error');
  });

  it('returns valid:false when file is not in index', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entries: {} }),
    } as Response);
    const result = await validateViaStorybookHttp('/tmp/test-designbook/path/to/button.story.yml', mockConfig);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not found in Storybook index');
  });

  it('returns skipped when index.json is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);
    const result = await validateViaStorybookHttp('/path/to/button.story.yml', mockConfig);
    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it('uses storybook.port from config', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.reject(new Error('ECONNREFUSED'));
    });
    await validateViaStorybookHttp('/path/to/button.story.yml', {
      ...mockConfig,
      'storybook.port': 9009,
    });
    expect(capturedUrl).toContain(':9009/');
  });
});
