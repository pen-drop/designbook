import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResolverContext } from '../types.js';

const execSyncMock = vi.fn();
vi.mock('node:child_process', () => ({
  execSync: (cmd: string, opts?: unknown) => execSyncMock(cmd, opts),
}));

// Imported after the mock is registered.
const { renderUrlResolver } = await import('../render-url.js');

function makeContext(config: Record<string, unknown> = {}): ResolverContext {
  return { config: config as ResolverContext['config'], params: {} };
}

describe('render_url resolver', () => {
  beforeEach(() => {
    execSyncMock.mockReset();
  });

  it('runs the configured backend command and returns its trimmed URL', async () => {
    execSyncMock.mockReturnValue('https://host/node/1\n');
    const ctx = makeContext({ renderUrlCommand: 'drush db:url {config_id}' });

    const res = await renderUrlResolver.resolve('node.article.default', {}, ctx);

    expect(res).toMatchObject({ resolved: true, value: 'https://host/node/1' });
    expect(execSyncMock).toHaveBeenCalledTimes(1);
  });

  it('substitutes {config_id} into the command template before running it', async () => {
    execSyncMock.mockReturnValue('https://host/node/1');
    const ctx = makeContext({ renderUrlCommand: 'drush db:url {config_id}' });

    await renderUrlResolver.resolve('node.article.default', {}, ctx);

    expect(execSyncMock).toHaveBeenCalledWith(
      'drush db:url node.article.default',
      expect.anything(),
    );
  });

  it('fails cleanly when no render command is configured', async () => {
    const res = await renderUrlResolver.resolve('node.article.default', {}, makeContext());

    expect(res.resolved).toBe(false);
    expect(res.error).toMatch(/render command/i);
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('fails cleanly when the command produces no URL', async () => {
    execSyncMock.mockReturnValue('   \n');
    const ctx = makeContext({ renderUrlCommand: 'drush db:url {config_id}' });

    const res = await renderUrlResolver.resolve('node.article.default', {}, ctx);

    expect(res.resolved).toBe(false);
    expect(res.error).toMatch(/no url/i);
  });

  it('fails cleanly when the command throws', async () => {
    execSyncMock.mockImplementation(() => {
      throw new Error('drush: command not found');
    });
    const ctx = makeContext({ renderUrlCommand: 'drush db:url {config_id}' });

    const res = await renderUrlResolver.resolve('node.article.default', {}, ctx);

    expect(res.resolved).toBe(false);
    expect(res.error).toMatch(/drush: command not found/);
  });

  it('is idempotent: an already-resolved http URL passes through unchanged', async () => {
    const url = 'https://host/node/1';
    const ctx = makeContext({ renderUrlCommand: 'drush db:url {config_id}' });

    const res = await renderUrlResolver.resolve(url, {}, ctx);

    expect(res).toEqual({ resolved: true, value: url, input: url });
    expect(execSyncMock).not.toHaveBeenCalled();
  });
});
