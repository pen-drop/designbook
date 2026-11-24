import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResolverContext } from '../types.js';

const execSyncMock = vi.fn();
vi.mock('node:child_process', () => ({
  execSync: (cmd: string, opts?: unknown) => execSyncMock(cmd, opts),
}));

// Imported after the mock is registered.
const { renderUrlResolver } = await import('../render-url.js');

function makeContext(config: Record<string, unknown> = {}, params: Record<string, unknown> = {}): ResolverContext {
  return { config: config as ResolverContext['config'], params };
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

    expect(execSyncMock).toHaveBeenCalledWith('drush db:url node.article.default', expect.anything());
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

  it('rejects a config id with shell-unsafe characters instead of interpolating it', async () => {
    const ctx = makeContext({ renderUrlCommand: 'drush db:url {config_id}' });

    const res = await renderUrlResolver.resolve('node.article.default; rm -rf /', {}, ctx);

    expect(res.resolved).toBe(false);
    expect(res.error).toMatch(/config id/i);
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('substitutes {story_id} from the resolved params into the command template', async () => {
    execSyncMock.mockReturnValue(
      'http://localhost:6009/iframe.html?id=entities-paragraph-signage--full&viewMode=story',
    );
    const ctx = makeContext(
      { renderUrlCommand: 'echo http://localhost:6009/iframe.html?id={story_id}\\&viewMode=story' },
      { story_id: 'entities-paragraph-signage--full' },
    );

    await renderUrlResolver.resolve('paragraph.signage.full', {}, ctx);

    expect(execSyncMock).toHaveBeenCalledWith(
      'echo http://localhost:6009/iframe.html?id=entities-paragraph-signage--full\\&viewMode=story',
      expect.anything(),
    );
  });

  it('fails cleanly when the command references {story_id} but none is resolved', async () => {
    const ctx = makeContext({ renderUrlCommand: 'echo {config_id} {story_id}' }, {});

    const res = await renderUrlResolver.resolve('paragraph.signage.full', {}, ctx);

    expect(res.resolved).toBe(false);
    expect(res.error).toMatch(/story_id/i);
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('rejects a shell-unsafe {story_id} value instead of interpolating it', async () => {
    const ctx = makeContext({ renderUrlCommand: 'echo {story_id}' }, { story_id: 'foo; rm -rf /' });

    const res = await renderUrlResolver.resolve('paragraph.signage.full', {}, ctx);

    expect(res.resolved).toBe(false);
    expect(res.error).toMatch(/story_id/i);
    expect(execSyncMock).not.toHaveBeenCalled();
  });

  it('is idempotent: an already-resolved http URL passes through unchanged', async () => {
    const url = 'https://host/node/1';
    const ctx = makeContext({ renderUrlCommand: 'drush db:url {config_id}' });

    const res = await renderUrlResolver.resolve(url, {}, ctx);

    expect(res).toEqual({ resolved: true, value: url, input: url });
    expect(execSyncMock).not.toHaveBeenCalled();
  });
});
