import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import type { ResolverContext } from '../types.js';

const tmpDir = join(import.meta.dirname, '__fixtures_story_url_resolver__');

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
  function fetchJson(_url: string): Promise<unknown> {
    if (mockIndex === 'throw') return Promise.reject(new Error('ECONNREFUSED'));
    return Promise.resolve(mockIndex);
  }
  return { StorybookDaemon, fetchJson };
});

const { storyUrlResolver } = await import('../story-url.js');

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

describe('storyUrlResolver', () => {
  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
    mockStatus = { running: false };
    mockIndex = null;
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('has name "story_url"', () => {
    expect(storyUrlResolver.name).toBe('story_url');
  });

  it('resolves exact story id to iframe URL when Storybook is running and story is indexed', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: true, port: 40327 };
    mockIndex = indexed('designbook-design-system-scenes--shell');

    const result = await storyUrlResolver.resolve(
      'designbook-design-system-scenes--shell',
      {},
      makeContext(),
    );

    expect(result.resolved).toBe(true);
    expect(result.value).toBe(
      'http://localhost:40327/iframe.html?id=designbook-design-system-scenes--shell&viewMode=story',
    );
    expect(result.input).toBe('designbook-design-system-scenes--shell');
  });

  it('resolves via substring match', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: true, port: 6006 };
    mockIndex = indexed('designbook-design-system-scenes--shell');

    const result = await storyUrlResolver.resolve('shell', {}, makeContext());

    expect(result.resolved).toBe(true);
    expect(result.value).toBe(
      'http://localhost:6006/iframe.html?id=designbook-design-system-scenes--shell&viewMode=story',
    );
  });

  it('returns unresolved when no match', async () => {
    seedStory('foo--bar');
    mockStatus = { running: true, port: 6006 };

    const result = await storyUrlResolver.resolve('nonexistent', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/No story found/);
  });

  it('returns candidates when ambiguous', async () => {
    seedStory('alpha--shell');
    seedStory('beta--shell');
    mockStatus = { running: true, port: 6006 };

    const result = await storyUrlResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.candidates).toHaveLength(2);
  });

  it('returns unresolved when Storybook is not running', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: false };

    const result = await storyUrlResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/not running/);
  });

  it('returns unresolved when running but no port', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: true };

    const result = await storyUrlResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/no port/);
  });

  it('returns unresolved when input is empty', async () => {
    mockStatus = { running: true, port: 6006 };
    const result = await storyUrlResolver.resolve('', {}, makeContext());
    expect(result.resolved).toBe(false);
  });

  it('returns unresolved when story is not in Storybook index', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: true, port: 6006 };
    mockIndex = indexed('other--story');

    const result = await storyUrlResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/not in Storybook's \/index\.json/);
    expect(result.error).toMatch(/--force/);
  });

  it('returns unresolved when /index.json is empty', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: true, port: 6006 };
    mockIndex = { entries: {} };

    const result = await storyUrlResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/not in Storybook's \/index\.json/);
  });

  it('returns unresolved when /index.json is unreachable', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: true, port: 6006 };
    mockIndex = 'throw';

    const result = await storyUrlResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/Could not reach Storybook/);
    expect(result.error).toMatch(/ECONNREFUSED/);
  });
});
