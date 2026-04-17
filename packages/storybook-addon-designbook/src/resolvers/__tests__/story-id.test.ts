import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import type { ResolverContext } from '../types.js';

const tmpDir = join(import.meta.dirname, '__fixtures_story_id_resolver__');

// Mock invariant: `daemon.url` must return undefined when port is missing, matching the
// real daemon's `url` getter (storybook.ts). If resolver code switches from `daemon.url`
// to reading `status.port` directly, update the mock's status() to also expose `port`.
let mockStatus: { running: boolean; port?: number } = { running: false };
let mockIndex: { entries?: Record<string, unknown> } | null | 'throw' = null;

vi.mock('../../storybook.js', () => {
  class StorybookDaemon {
    constructor(
      private readonly dataDir: string,
      private readonly baseUrl: string = 'http://localhost',
    ) {}
    status() {
      return mockStatus;
    }
    get url(): string | undefined {
      if (!mockStatus.port) return undefined;
      return `http://localhost:${mockStatus.port}`;
    }
    iframeUrl(storyId: string): string | undefined {
      if (!mockStatus.port) return undefined;
      return `http://localhost:${mockStatus.port}/iframe.html?id=${storyId}&viewMode=story`;
    }
  }
  function fetchJson(): Promise<unknown> {
    if (mockIndex === 'throw') return Promise.reject(new Error('ECONNREFUSED'));
    return Promise.resolve(mockIndex);
  }
  return { StorybookDaemon, fetchJson };
});

const { storyIdResolver } = await import('../story-id.js');

function makeContext(): ResolverContext {
  return { config: { data: tmpDir, technology: 'html' }, params: {} };
}

function seedStory(id: string): void {
  mkdirSync(join(tmpDir, 'stories', id), { recursive: true });
}

function indexed(...ids: string[]): { entries: Record<string, unknown> } {
  const entries: Record<string, unknown> = {};
  for (const id of ids) entries[id] = { id };
  return { entries };
}

describe('storyIdResolver', () => {
  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
    mockStatus = { running: false };
    mockIndex = null;
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('has name "story_id"', () => {
    expect(storyIdResolver.name).toBe('story_id');
  });

  it('resolves matched id when Storybook is running and story is indexed', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: true, port: 6006 };
    mockIndex = indexed('designbook-design-system-scenes--shell');

    const result = await storyIdResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('designbook-design-system-scenes--shell');
  });

  it('returns unresolved when input does not match any story directory', async () => {
    seedStory('foo--bar');
    mockStatus = { running: true, port: 6006 };

    const result = await storyIdResolver.resolve('nonexistent', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/No story found/);
  });

  it('returns unresolved when Storybook is not running', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: false };

    const result = await storyIdResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/not running/);
  });

  it('returns unresolved when story is not in Storybook index', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: true, port: 6006 };
    mockIndex = indexed('other--story');

    const result = await storyIdResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/not in Storybook's \/index\.json/);
    expect(result.error).toMatch(/--force/);
  });

  it('returns unresolved when /index.json is unreachable', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: true, port: 6006 };
    mockIndex = 'throw';

    const result = await storyIdResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/Could not reach Storybook/);
  });

  it('returns candidates when ambiguous', async () => {
    seedStory('alpha--shell');
    seedStory('beta--shell');
    mockStatus = { running: true, port: 6006 };

    const result = await storyIdResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.candidates).toHaveLength(2);
  });

  it('returns unresolved for empty input', async () => {
    const result = await storyIdResolver.resolve('', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toBeDefined();
  });
});
