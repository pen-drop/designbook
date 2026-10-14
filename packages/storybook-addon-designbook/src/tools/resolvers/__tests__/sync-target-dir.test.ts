import { describe, it, expect } from 'vitest';
import { syncTargetDirResolver } from '../sync-target-dir.js';

const ctx = (config: Record<string, unknown>, params: Record<string, unknown> = {}) => ({ config, params }) as never;

describe('sync_target_dir', () => {
  it('resolves the config value against workspace', () => {
    expect(
      syncTargetDirResolver.resolve('', {}, ctx({ workspace: '/w', sync_target_dir: 'wp-content' })),
    ).toMatchObject({
      resolved: true,
      value: '/w/wp-content',
    });
  });
  it('keeps an absolute explicit param', () => {
    expect(
      syncTargetDirResolver.resolve('', {}, ctx({ sync_target_dir: 'x' }, { sync_target_dir: '/abs' })),
    ).toMatchObject({ resolved: true, value: '/abs' });
  });
  it('fails clearly when unset', () => {
    const r = syncTargetDirResolver.resolve('', {}, ctx({})) as { resolved: boolean; error?: string };
    expect(r.resolved).toBe(false);
    expect(r.error).toContain('set sync_target_dir');
  });
});
