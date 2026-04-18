import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';
import {
  StorybookDaemon,
  isAlive,
  killProcess,
  registerDaemon,
  unregisterDaemon,
  reapZombies,
  findDaemonsByCwd,
  registryPath,
  type StorybookInfo,
} from '../storybook.js';

function makeTmpDir(): string {
  return mkdtempSync(join(tmpdir(), 'storybook-test-'));
}

function readRegistryFile(): { entries: StorybookInfo[] } {
  const path = registryPath();
  if (!existsSync(path)) return { entries: [] };
  return JSON.parse(readFileSync(path, 'utf-8')) as { entries: StorybookInfo[] };
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

// ── Registry fixture helpers ────────────────────────────────────────────────

let registryDir: string;

beforeEach(() => {
  registryDir = makeTmpDir();
  process.env['DESIGNBOOK_REGISTRY'] = join(registryDir, 'storybooks.json');
});

afterEach(() => {
  delete process.env['DESIGNBOOK_REGISTRY'];
  try {
    rmSync(registryDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

// ── Basic state access ──────────────────────────────────────────────────────

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

// ── Status ──────────────────────────────────────────────────────────────────

describe('StorybookDaemon — status', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = makeTmpDir();
  });

  it('returns { running: false } when no file and no registry entry', () => {
    const sb = new StorybookDaemon(dataDir);
    const status = sb.status();
    expect(status.running).toBe(false);
  });

  it('returns { running: false, stale: true } and cleans up stale file', () => {
    // PID file exists but no matching live entry in registry
    writePidFile(dataDir, sampleInfo);
    const sb = new StorybookDaemon(dataDir);
    const status = sb.status();
    expect(status.running).toBe(false);
    expect(status.stale).toBe(true);
    expect(existsSync(join(dataDir, 'storybook.json'))).toBe(false);
  });

  it('returns { running: true } when live registry entry matches cwd', () => {
    const liveInfo: StorybookInfo = { ...sampleInfo, pid: process.pid, cwd: dataDir };
    registerDaemon(liveInfo);
    writePidFile(dataDir, liveInfo);
    const sb = new StorybookDaemon(dataDir);
    const status = sb.status();
    expect(status.running).toBe(true);
    expect(status.pid).toBe(process.pid);
    expect(status.port).toBe(liveInfo.port);
  });
});

// ── Stop ────────────────────────────────────────────────────────────────────

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

// ── Logs ────────────────────────────────────────────────────────────────────

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

// ── Process helpers ─────────────────────────────────────────────────────────

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

// ── Registry ────────────────────────────────────────────────────────────────

describe('global registry', () => {
  it('registerDaemon creates registry file and appends entry', () => {
    registerDaemon(sampleInfo);
    const contents = readRegistryFile();
    expect(contents.entries).toHaveLength(1);
    expect(contents.entries[0]).toEqual(sampleInfo);
  });

  it('registerDaemon replaces existing entry with same pid', () => {
    registerDaemon(sampleInfo);
    registerDaemon({ ...sampleInfo, port: 9999 });
    const contents = readRegistryFile();
    expect(contents.entries).toHaveLength(1);
    expect(contents.entries[0]?.port).toBe(9999);
  });

  it('unregisterDaemon removes the matching entry', () => {
    registerDaemon(sampleInfo);
    registerDaemon({ ...sampleInfo, pid: 22222 });
    unregisterDaemon(sampleInfo.pid);
    const contents = readRegistryFile();
    expect(contents.entries).toHaveLength(1);
    expect(contents.entries[0]?.pid).toBe(22222);
  });

  it('reapZombies drops entries whose PID is dead', () => {
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => {
      throw new Error('ESRCH');
    });
    registerDaemon(sampleInfo);
    const alive = reapZombies();
    expect(alive).toHaveLength(0);
    expect(readRegistryFile().entries).toHaveLength(0);
    spy.mockRestore();
  });

  it('reapZombies drops entries whose cwd no longer exists and tries to kill them', () => {
    // Stub process.kill so the fake pid registers as alive, but SIGTERM calls
    // are captured instead of actually killing the vitest worker.
    const killed: Array<[number, string | number]> = [];
    const spy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      killed.push([pid as number, signal as string | number]);
      return true;
    });

    const ghostCwd = join(registryDir, 'deleted-workspace');
    registerDaemon({ ...sampleInfo, pid: 11111, cwd: ghostCwd });
    const alive = reapZombies();

    expect(alive).toHaveLength(0);
    expect(readRegistryFile().entries).toHaveLength(0);
    // Should attempt to kill the orphaned daemon
    expect(killed.some(([pid, sig]) => pid === -11111 && sig === 'SIGTERM')).toBe(true);
    spy.mockRestore();
  });

  it('reapZombies keeps entries where pid is alive and cwd exists', () => {
    const liveCwd = makeTmpDir();
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    registerDaemon({ ...sampleInfo, pid: 22222, cwd: liveCwd });
    const alive = reapZombies();
    expect(alive).toHaveLength(1);
    expect(alive[0]?.pid).toBe(22222);
    spy.mockRestore();
  });

  it('findDaemonsByCwd filters entries by workspace cwd', () => {
    const cwdA = makeTmpDir();
    const cwdB = makeTmpDir();
    registerDaemon({ ...sampleInfo, pid: process.pid, cwd: cwdA });
    registerDaemon({ ...sampleInfo, pid: process.pid + 1, cwd: cwdB });

    // Stub kill so the fake cwdB-pid appears alive
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const entries = findDaemonsByCwd(cwdA);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.cwd).toBe(cwdA);
    spy.mockRestore();
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

    // Verify entry registered in global registry
    const registry = readRegistryFile();
    expect(registry.entries).toHaveLength(1);
    expect(registry.entries[0]?.pid).toBe(77777);
  });
});
