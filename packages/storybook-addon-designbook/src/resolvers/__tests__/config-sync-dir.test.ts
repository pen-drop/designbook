import { describe, it, expect } from 'vitest';
import type { ResolverContext } from '../types.js';
import {
  resolveConfigSyncDir,
  configSyncDirResolver,
  deriveDocrootFromConfig,
} from '../config-sync-dir.js';
import type { DesignbookConfig } from '../../config.js';

function makeContext(config: Partial<DesignbookConfig> = {}, params: Record<string, unknown> = {}): ResolverContext {
  return { config: config as DesignbookConfig, params };
}

describe('resolveConfigSyncDir', () => {
  it('returns settings syncRelative resolved against docroot', () => {
    const dir = resolveConfigSyncDir({ docroot: '/srv/app/web', syncRelative: '../config/sync' });
    expect(dir).toBe('/srv/app/config/sync');
  });

  it('falls back to <docroot>/sites/default/files/sync when unset', () => {
    const dir = resolveConfigSyncDir({ docroot: '/srv/app/web', syncRelative: null });
    expect(dir).toBe('/srv/app/web/sites/default/files/sync');
  });
});

describe('deriveDocrootFromConfig', () => {
  it('uses workspace/web when workspace is set', () => {
    // resolve() is absolute; we only assert the path shape ends with /web
    const docroot = deriveDocrootFromConfig({
      workspace: '/tmp/ws-example',
      data: '/tmp/ws-example/web/themes/custom/t/designbook',
    } as DesignbookConfig);
    expect(docroot).toMatch(/\/web$/);
  });

  it('extracts …/web from designbook.home theme path', () => {
    const docroot = deriveDocrootFromConfig({
      'designbook.home': '/proj/web/themes/custom/test_integration_drupal',
      data: '/proj/web/themes/custom/test_integration_drupal/designbook',
    } as DesignbookConfig);
    expect(docroot).toBe('/proj/web');
  });
});

describe('configSyncDirResolver.resolve', () => {
  it('is idempotent: resolving an already-absolute path twice yields the same value', async () => {
    const absolutePath = '/abs/x/sites/default/files/sync';

    const first = await configSyncDirResolver.resolve(absolutePath, {}, makeContext());
    expect(first.resolved).toBe(true);
    expect(first.value).toBe(absolutePath);

    const second = await configSyncDirResolver.resolve(String(first.value), {}, makeContext());
    expect(second.resolved).toBe(true);
    expect(second.value).toBe(absolutePath);
  });

  it('returns an absolute input unchanged, even with no config at all', async () => {
    const absolutePath = '/srv/app/web/sites/default/files/sync';
    const result = await configSyncDirResolver.resolve(absolutePath, {}, makeContext());
    expect(result).toEqual({ resolved: true, value: absolutePath, input: absolutePath });
  });

  it('still computes from declaration docroot when input is not absolute', async () => {
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

  it('produces path from designbook.home without declaration docroot', async () => {
    const result = await configSyncDirResolver.resolve(
      '',
      {},
      makeContext({
        'designbook.home': '/proj/web/themes/custom/test_integration_drupal',
        data: '/proj/web/themes/custom/test_integration_drupal/designbook',
      }),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('/proj/web/sites/default/files/sync');
  });

  it('fails clearly when docroot cannot be derived', async () => {
    const result = await configSyncDirResolver.resolve('', {}, makeContext({}));
    expect(result.resolved).toBe(false);
    expect(result.error).toMatch(/could not derive Drupal docroot/);
  });
});
