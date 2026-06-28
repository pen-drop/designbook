import { describe, it, expect } from 'vitest';
import { resolveConfigSyncDir } from '../config-sync-dir.js';

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
