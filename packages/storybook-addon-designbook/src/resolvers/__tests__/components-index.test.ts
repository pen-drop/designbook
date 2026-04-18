import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ResolverContext } from '../types.js';
import type { DesignbookConfig } from '../../config.js';

// Mock the storybook module to bypass the real daemon + HTTP layer.
// Pattern mirrors story-url.test.ts: mockStatus drives daemon.status() and the
// `url` getter, mockIndex drives what fetchJson resolves to.
let mockStatus: { running: boolean; port?: number } = { running: false };
let mockIndex: unknown = null;
let mockFetchError: Error | null = null;

vi.mock('../../storybook.js', () => {
  class StorybookDaemon {
    constructor(_dataDir: string) {}
    status() {
      return mockStatus;
    }
    get url(): string | undefined {
      if (!mockStatus.port) return undefined;
      return `http://localhost:${mockStatus.port}`;
    }
  }
  function fetchJson(): Promise<unknown> {
    if (mockFetchError) return Promise.reject(mockFetchError);
    return Promise.resolve(mockIndex);
  }
  return { StorybookDaemon, fetchJson };
});

const { componentsIndexResolver } = await import('../components-index.js');

function makeContext(overrides: Partial<Record<string, unknown>> = {}): ResolverContext {
  const config = {
    data: '/tmp/designbook-test-components-index',
    technology: 'html',
    'frameworks.component': 'sdc',
    'component.namespace': 'test_integration_drupal',
    ...overrides,
  } as unknown as DesignbookConfig;
  return { config, params: {} };
}

describe('componentsIndexResolver', () => {
  beforeEach(() => {
    mockStatus = { running: false };
    mockIndex = null;
    mockFetchError = null;
  });

  it('has name "components_index"', () => {
    expect(componentsIndexResolver.name).toBe('components_index');
  });

  it('returns SDC components with namespace prefix from /index.json', async () => {
    mockStatus = { running: true, port: 40327 };
    mockIndex = {
      entries: {
        'components-badge--default': {
          id: 'components-badge--default',
          importPath: './components/badge/badge.component.yml',
          type: 'story',
        },
        'components-card--default': {
          id: 'components-card--default',
          importPath: './components/card/card.component.yml',
          type: 'story',
        },
      },
    };

    const result = await componentsIndexResolver.resolve('', {}, makeContext());

    expect(result.resolved).toBe(true);
    expect(result.value).toEqual([
      {
        id: 'test_integration_drupal:badge',
        import_path: './components/badge/badge.component.yml',
        story_id: 'components-badge--default',
      },
      {
        id: 'test_integration_drupal:card',
        import_path: './components/card/card.component.yml',
        story_id: 'components-card--default',
      },
    ]);
  });

  it('dedupes multiple stories for the same component', async () => {
    mockStatus = { running: true, port: 40327 };
    mockIndex = {
      entries: {
        'components-badge--default': {
          importPath: './components/badge/badge.component.yml',
          type: 'story',
        },
        'components-badge--large': {
          importPath: './components/badge/badge.component.yml',
          type: 'story',
        },
      },
    };

    const result = await componentsIndexResolver.resolve('', {}, makeContext());

    expect(result.resolved).toBe(true);
    expect(Array.isArray(result.value)).toBe(true);
    const value = result.value as Array<{ id: string; story_id: string }>;
    expect(value).toHaveLength(1);
    expect(value[0]!.id).toBe('test_integration_drupal:badge');
    // First match wins for story_id (stable iteration order).
    expect(value[0]!.story_id).toBe('components-badge--default');
  });

  it('returns empty array when no entries match the pattern', async () => {
    mockStatus = { running: true, port: 40327 };
    mockIndex = {
      entries: {
        'docs-intro--page': {
          importPath: './docs/intro.mdx',
          type: 'docs',
        },
      },
    };

    const result = await componentsIndexResolver.resolve('', {}, makeContext());

    expect(result.resolved).toBe(true);
    expect(result.value).toEqual([]);
  });

  it('fails with an actionable error when Storybook is not running', async () => {
    mockStatus = { running: false };

    const result = await componentsIndexResolver.resolve('', {}, makeContext());

    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/not running/);
    expect(result.error).toMatch(/storybook start/);
  });

  it('fails when frameworks.component has no registered pattern', async () => {
    mockStatus = { running: true, port: 40327 };

    const result = await componentsIndexResolver.resolve(
      '',
      {},
      makeContext({ 'frameworks.component': 'unknown-framework' }),
    );

    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/unknown-framework/);
  });

  it('honors a user-provided override from config', async () => {
    mockStatus = { running: true, port: 40327 };
    mockIndex = {
      entries: {
        'atoms-badge--default': {
          importPath: 'src/atoms/badge.tsx',
          type: 'story',
        },
      },
    };

    const result = await componentsIndexResolver.resolve(
      '',
      {},
      makeContext({
        'frameworks.component': 'custom',
        'component.story_filter.import_path_pattern': '^src/atoms/([^.]+)\\.tsx$',
        'component.story_filter.component_name_group': 1,
      }),
    );

    expect(result.resolved).toBe(true);
    const value = result.value as Array<{ id: string }>;
    expect(value.map((v) => v.id)).toEqual(['test_integration_drupal:badge']);
  });
});
