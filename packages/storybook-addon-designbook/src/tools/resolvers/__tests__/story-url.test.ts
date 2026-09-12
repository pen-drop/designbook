import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import type { ResolverContext } from '../types.js';

const tmpDir = join(import.meta.dirname, '__fixtures_story_url_resolver__');

// story-url only ADDS the URL transformation on top of story-id's resolveRunningIndexedStory.
// Full coverage of running/indexed/ambiguous error paths lives in story-id.test.ts and
// story-match.test.ts — here we only verify URL building + that story_id failures propagate.
//
// Mock invariant: `daemon.url` returns undefined when port is missing, just like the real
// daemon's `url` getter does. If you change the real daemon's port detection, sync this mock.
let mockStatus: { running: boolean; port?: number } = { running: false };
let mockIndex: { entries?: Record<string, unknown> } | null = null;

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
    iframeUrl(storyId: string): string | undefined {
      if (!mockStatus.port) return undefined;
      return `http://localhost:${mockStatus.port}/iframe.html?id=${storyId}&viewMode=story`;
    }
  }
  function fetchJson(): Promise<unknown> {
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

  it('builds iframe URL when story_id resolves (happy path)', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: true, port: 40327 };
    mockIndex = { entries: { 'designbook-design-system-scenes--shell': { id: 'shell' } } };

    const result = await storyUrlResolver.resolve('shell', {}, makeContext());

    expect(result.resolved).toBe(true);
    expect(result.value).toBe(
      'http://localhost:40327/iframe.html?id=designbook-design-system-scenes--shell&viewMode=story',
    );
    expect(result.input).toBe('shell');
  });

  it('propagates story_id failure (e.g. Storybook not running)', async () => {
    seedStory('designbook-design-system-scenes--shell');
    mockStatus = { running: false };

    const result = await storyUrlResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/not running/);
  });
});
