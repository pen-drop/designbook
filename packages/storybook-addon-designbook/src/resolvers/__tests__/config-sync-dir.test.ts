import { describe, it, expect } from 'vitest';
import type { ResolverContext } from '../types.js';
import { resolveConfigSyncDir, configSyncDirResolver } from '../config-sync-dir.js';

function makeContext(): ResolverContext {
  return { config: {} as ResolverContext['config'], params: {} };
}

describe('resolveConfigSyncDir', () => {
  it('returns settings $config_directories[sync] resolved against docroot', () => {
    const dir = resolveConfigSyncDir({ docroot: '/srv/app/web', syncRelative: '../config/sync' });
    expect(dir).toBe('/srv/app/config/sync');
  });

  it('falls back to <docroot>/sites/default/files/config_*/sync when unset', () => {
    const dir = resolveConfigSyncDir({ docroot: '/srv/app/web', syncRelative: null });
    expect(dir).toMatch(/\/sites\/default\/.*\/sync$/);
  });
});

describe('configSyncDirResolver.resolve', () => {
  it('is idempotent: resolving an already-absolute path twice yields the same value', async () => {
    const absolutePath = '/abs/x/sites/default/files/sync';

    const first = await configSyncDirResolver.resolve(absolutePath, {}, makeContext());
    expect(first.resolved).toBe(true);
    expect(first.value).toBe(absolutePath);

    // The engine re-runs the resolver on every stage transition, seeding
    // `input` from the param's current value — which, on reruns, is this
    // resolver's own previous output. A second (or Nth) run must not append
    // the sync-dir suffix again.
    const second = await configSyncDirResolver.resolve(String(first.value), {}, makeContext());
    expect(second.resolved).toBe(true);
    expect(second.value).toBe(absolutePath);
  });

  it('returns an absolute input unchanged, even with no config at all', async () => {
    const absolutePath = '/srv/app/web/sites/default/files/config_default/sync';
    const result = await configSyncDirResolver.resolve(absolutePath, {}, makeContext());
    expect(result).toEqual({ resolved: true, value: absolutePath, input: absolutePath });
  });

  it('still computes from docroot when input is not already absolute', async () => {
    const result = await configSyncDirResolver.resolve(
      'some-non-absolute-input',
      {
        docroot: '/srv/app/web',
        syncRelative: '../config/sync',
      },
      makeContext(),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('/srv/app/config/sync');
  });
});
