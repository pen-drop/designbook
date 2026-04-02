import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';
import { StorybookDaemon, isAlive, killProcess, type StorybookInfo } from '../storybook.js';

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'storybook-test-'));
}

const sampleInfo: StorybookInfo = {
  pid: 12345,
  port: 6006,
  log: '/tmp/storybook.log',
  cwd: '/tmp/project',
  started_at: '2026-01-01T00:00:00.000Z',
};

function writePidFile(dataDir: string, info: StorybookInfo): void {
  writeFileSync(join(dataDir, 'storybook.json'), JSON.stringify(info, null, 2));
}

describe('StorybookDaemon — state access', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = makeTmpDir();
  });

  it('logPath returns storybook.log path', () => {
    const sb = new StorybookDaemon(dataDir);
    expect(sb.logPath).toBe(join(dataDir, 'storybook.log'));
  });

  it('returns properties from storybook.json', () => {
    writePidFile(dataDir, sampleInfo);
    const sb = new StorybookDaemon(dataDir);
    expect(sb.pid).toBe(sampleInfo.pid);
    expect(sb.port).toBe(sampleInfo.port);
    expect(sb.log).toBe(sampleInfo.log);
    expect(sb.cwd).toBe(sampleInfo.cwd);
    expect(sb.startedAt).toBe(sampleInfo.started_at);
    expect(sb.exists).toBe(true);
  });

  it('returns undefined when no storybook.json', () => {
    const sb = new StorybookDaemon(dataDir);
    expect(sb.pid).toBeUndefined();
    expect(sb.port).toBeUndefined();
    expect(sb.exists).toBe(false);
  });

  it('reload() forces re-read from disk', () => {
    const sb = new StorybookDaemon(dataDir);
    expect(sb.exists).toBe(false);

    writePidFile(dataDir, sampleInfo);
    expect(sb.exists).toBe(false); // still cached

    sb.reload();
    expect(sb.exists).toBe(true);
    expect(sb.port).toBe(6006);
  });
});

describe('StorybookDaemon — URL resolution', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = makeTmpDir();
  });

  it('url returns origin with port', () => {
    writePidFile(dataDir, sampleInfo);
    const sb = new StorybookDaemon(dataDir, 'http://localhost');
    expect(sb.url).toBe('http://localhost:6006');
  });

  it('iframeUrl returns full story URL', () => {
    writePidFile(dataDir, sampleInfo);
    const sb = new StorybookDaemon(dataDir, 'http://localhost');
    expect(sb.iframeUrl('my-story--default')).toBe(
      'http://localhost:6006/iframe.html?id=my-story--default&viewMode=story',
    );
  });

  it('url returns undefined when no port', () => {
    const sb = new StorybookDaemon(dataDir);
    expect(sb.url).toBeUndefined();
    expect(sb.iframeUrl('test')).toBeUndefined();
  });
});

describe('StorybookDaemon — status', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = makeTmpDir();
  });

  it('returns { running: false } when no file and no process', () => {
    const sb = new StorybookDaemon(dataDir);
    const status = sb.status();
    expect(status.running).toBe(false);
  });

  it('returns { running: false, stale: true } and cleans up stale file', () => {
    writePidFile(dataDir, sampleInfo);
    const sb = new StorybookDaemon(dataDir);
    // No actual storybook process running → /proc scan will find nothing
    const status = sb.status();
    expect(status.running).toBe(false);
    expect(status.stale).toBe(true);
    expect(existsSync(join(dataDir, 'storybook.json'))).toBe(false);
  });
});

describe('StorybookDaemon — stop', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = makeTmpDir();
  });

  it('removes stale PID file even when no process running', async () => {
    writePidFile(dataDir, sampleInfo);
    const sb = new StorybookDaemon(dataDir);
    await sb.stop();
    expect(existsSync(join(dataDir, 'storybook.json'))).toBe(false);
  });

  it('does not throw when no file and no process', async () => {
    const sb = new StorybookDaemon(dataDir);
    await expect(sb.stop()).resolves.toBeUndefined();
  });
});

describe('StorybookDaemon — logs', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = makeTmpDir();
  });

  it('returns undefined when no log file', () => {
    const sb = new StorybookDaemon(dataDir);
    expect(sb.logs()).toBeUndefined();
  });

  it('returns log content when file exists', () => {
    writeFileSync(join(dataDir, 'storybook.log'), 'line1\nline2\n');
    const sb = new StorybookDaemon(dataDir);
    expect(sb.logs()).toBe('line1\nline2\n');
  });
});

describe('isAlive', () => {
  it('returns true when process.kill(pid, 0) does not throw', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    expect(isAlive(999)).toBe(true);
    expect(spy).toHaveBeenCalledWith(999, 0);
    spy.mockRestore();
  });

  it('returns false when process.kill throws', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => {
      throw new Error('ESRCH');
    });
    expect(isAlive(999)).toBe(false);
    spy.mockRestore();
  });
});

describe('killProcess', () => {
  let killSpy: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    killSpy?.mockRestore();
    vi.useRealTimers();
  });

  it('sends SIGTERM with negative PID (process group)', async () => {
    vi.useFakeTimers();
    const calls: Array<[number, string | number]> = [];
    killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      calls.push([pid as number, signal as string | number]);
      if (signal === 0) throw new Error('ESRCH');
      return true;
    });

    const promise = killProcess(42);
    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(calls[0]).toEqual([-42, 'SIGTERM']);
    vi.useRealTimers();
  });

  it('escalates to SIGKILL if still alive after wait', async () => {
    vi.useFakeTimers();
    const calls: Array<[number, string | number]> = [];
    killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      calls.push([pid as number, signal as string | number]);
      return true;
    });

    const promise = killProcess(42);
    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    const signals = calls.map((c) => c[1]);
    expect(signals).toContain('SIGTERM');
    expect(signals).toContain('SIGKILL');
    vi.useRealTimers();
  });

  it('does not throw if PID not found', async () => {
    vi.useFakeTimers();
    killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
      throw new Error('ESRCH');
    });

    const promise = killProcess(99999);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

// ── startDaemon ─────────────────────────────────────────────────────────────

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('node:http', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, get: vi.fn() };
});

import * as http from 'node:http';

function makeFakeChild(pid = 55555) {
  const child = Object.assign(new EventEmitter(), {
    pid,
    unref: vi.fn(),
    kill: vi.fn(),
  });
  return child;
}

function mockHttpGet(behaviour: 'reject' | { json: unknown }) {
  const mockedGet = vi.mocked(http.get);
  mockedGet.mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1] as ((res: EventEmitter & { statusCode: number }) => void) | undefined;
    const req = Object.assign(new EventEmitter(), { end: vi.fn() }) as EventEmitter & { end: ReturnType<typeof vi.fn> };
    if (behaviour === 'reject') {
      queueMicrotask(() => req.emit('error', new Error('ECONNREFUSED')));
    } else if (cb && typeof cb === 'function') {
      queueMicrotask(() => {
        const body = JSON.stringify(behaviour.json);
        const res = Object.assign(new EventEmitter(), {
          statusCode: 200,
          resume: vi.fn(),
        });
        cb(res);
        res.emit('data', Buffer.from(body));
        res.emit('end');
      });
    }
    return req as unknown as http.ClientRequest;
  });
}

describe('StorybookDaemon.start', () => {
  let dataDir: string;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dataDir = makeTmpDir();
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy?.mockRestore();
    vi.mocked(http.get).mockReset();
    vi.useRealTimers();
  });

  it('returns { ready: false } on timeout', async () => {
    vi.useFakeTimers();

    const { spawn } = await import('node:child_process');
    const fakeChild = makeFakeChild();
    vi.mocked(spawn).mockReturnValue(fakeChild as never);

    mockHttpGet('reject');

    const sb = new StorybookDaemon(dataDir);
    const promise = sb.start({ cmd: 'npx storybook dev', port: 6006 });

    for (let i = 0; i < 61; i++) {
      await vi.advanceTimersByTimeAsync(2000);
    }

    const result = await promise;
    expect(result.ready).toBe(false);
    expect(result.port).toBe(6006);
    expect(fakeChild.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('returns { ready: true } with pid/port/log when Storybook starts successfully', async () => {
    vi.useFakeTimers();

    const { spawn } = await import('node:child_process');
    const fakeChild = makeFakeChild(77777);
    vi.mocked(spawn).mockReturnValue(fakeChild as never);

    mockHttpGet({ json: { entries: {} } });

    const sb = new StorybookDaemon(dataDir);
    const promise = sb.start({ cmd: 'npx storybook dev', port: 9009 });

    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result.ready).toBe(true);
    expect(result.pid).toBe(77777);
    expect(result.port).toBe(9009);
    expect(result.log).toBe(sb.logPath);
    expect(fakeChild.unref).toHaveBeenCalled();

    // Verify state is accessible after start
    sb.reload();
    expect(sb.pid).toBe(77777);
    expect(sb.port).toBe(9009);
  });
});
