import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';
import {
  pidFilePath,
  logFilePath,
  readPidFile,
  writePidFile,
  removePidFile,
  isAlive,
  getStatus,
  killProcess,
  stopDaemon,
  startDaemon,
  type StorybookInfo,
} from '../storybook.js';

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

describe('PID file management', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = makeTmpDir();
  });

  it('pidFilePath returns storybook.json path', () => {
    expect(pidFilePath(dataDir)).toBe(join(dataDir, 'storybook.json'));
  });

  it('logFilePath returns storybook.log path', () => {
    expect(logFilePath(dataDir)).toBe(join(dataDir, 'storybook.log'));
  });

  it('writePidFile creates storybook.json with correct content', () => {
    writePidFile(dataDir, sampleInfo);
    const raw = readFileSync(pidFilePath(dataDir), 'utf-8');
    expect(JSON.parse(raw)).toEqual(sampleInfo);
  });

  it('readPidFile returns parsed content', () => {
    writePidFile(dataDir, sampleInfo);
    expect(readPidFile(dataDir)).toEqual(sampleInfo);
  });

  it('readPidFile returns null when file does not exist', () => {
    expect(readPidFile(dataDir)).toBeNull();
  });

  it('removePidFile deletes the file', () => {
    writePidFile(dataDir, sampleInfo);
    removePidFile(dataDir);
    expect(existsSync(pidFilePath(dataDir))).toBe(false);
  });

  it('removePidFile is silent when file does not exist', () => {
    expect(() => removePidFile(dataDir)).not.toThrow();
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

describe('getStatus', () => {
  let dataDir: string;

  beforeEach(() => {
    dataDir = makeTmpDir();
  });

  it('returns { running: false } when no PID file', () => {
    expect(getStatus(dataDir)).toEqual({ running: false });
  });

  it('returns running info when PID file exists and process alive', () => {
    writePidFile(dataDir, sampleInfo);
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => true);
    const status = getStatus(dataDir);
    expect(status.running).toBe(true);
    expect(status.pid).toBe(sampleInfo.pid);
    expect(status.port).toBe(sampleInfo.port);
    spy.mockRestore();
  });

  it('returns { running: false, stale: true } and cleans up when PID is dead', () => {
    writePidFile(dataDir, sampleInfo);
    const spy = vi.spyOn(process, 'kill').mockImplementation(() => {
      throw new Error('ESRCH');
    });
    const status = getStatus(dataDir);
    expect(status).toEqual({ running: false, stale: true });
    expect(existsSync(pidFilePath(dataDir))).toBe(false);
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
      // After SIGTERM, the check-alive (signal 0) should throw to indicate process is gone
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
      return true; // signal 0 doesn't throw — process is still alive
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

describe('stopDaemon', () => {
  let dataDir: string;
  let killSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dataDir = makeTmpDir();
    vi.useFakeTimers();
  });

  afterEach(() => {
    killSpy?.mockRestore();
    vi.useRealTimers();
  });

  it('kills process and removes PID file', async () => {
    writePidFile(dataDir, sampleInfo);
    killSpy = vi.spyOn(process, 'kill').mockImplementation((_, signal) => {
      if (signal === 0) throw new Error('ESRCH');
      return true;
    });

    const promise = stopDaemon(dataDir);
    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(existsSync(pidFilePath(dataDir))).toBe(false);
  });

  it('uses pidOverride when provided', async () => {
    const calls: Array<[number, string | number]> = [];
    killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      calls.push([pid as number, signal as string | number]);
      if (signal === 0) throw new Error('ESRCH');
      return true;
    });

    const promise = stopDaemon(dataDir, 777);
    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(calls[0]).toEqual([-777, 'SIGTERM']);
  });

  it('errors gracefully when no PID file and no override', async () => {
    await expect(stopDaemon(dataDir)).rejects.toThrow('no PID file found');
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

/** Configure the mocked http.get to either reject or resolve with JSON. */
function mockHttpGet(behaviour: 'reject' | { json: unknown }) {
  const mockedGet = vi.mocked(http.get);
  mockedGet.mockImplementation((...args: unknown[]) => {
    // http.get(url, cb) — cb is last argument
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

describe('startDaemon', () => {
  let dataDir: string;
  let killSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    dataDir = makeTmpDir();
    // Silence stderr output from log forwarding
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    killSpy?.mockRestore();
    stderrSpy?.mockRestore();
    vi.mocked(http.get).mockReset();
    vi.useRealTimers();
  });

  it('throws when Storybook is already running', async () => {
    writePidFile(dataDir, sampleInfo);
    killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true);

    await expect(
      startDaemon({ cmd: 'npx storybook dev', port: 6006, dataDir }),
    ).rejects.toThrow(/already running.*restart/i);
  });

  it('returns { ready: false } on timeout', async () => {
    vi.useFakeTimers();

    const { spawn } = await import('node:child_process');
    const fakeChild = makeFakeChild();
    vi.mocked(spawn).mockReturnValue(fakeChild as never);

    mockHttpGet('reject');

    const promise = startDaemon({ cmd: 'npx storybook dev', port: 6006, dataDir });

    // Fast-forward past the 120s timeout (60 polling intervals of 2s each)
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

    const promise = startDaemon({ cmd: 'npx storybook dev', port: 9009, dataDir });

    // Advance past the first polling interval
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result.ready).toBe(true);
    expect(result.pid).toBe(77777);
    expect(result.port).toBe(9009);
    expect(result.log).toBe(logFilePath(dataDir));
    expect(fakeChild.unref).toHaveBeenCalled();

    // Verify PID file was written
    const pidData = readPidFile(dataDir);
    expect(pidData).not.toBeNull();
    expect(pidData!.pid).toBe(77777);
    expect(pidData!.port).toBe(9009);
  });

  it('cleans up stale PID file before starting', async () => {
    vi.useFakeTimers();

    // Write a PID file for a dead process
    writePidFile(dataDir, { ...sampleInfo, pid: 99999 });
    killSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      // getStatus calls isAlive(99999) with signal 0 — should throw (dead)
      if (pid === 99999 && signal === 0) throw new Error('ESRCH');
      return true;
    });

    const { spawn } = await import('node:child_process');
    const fakeChild = makeFakeChild(88888);
    vi.mocked(spawn).mockReturnValue(fakeChild as never);

    mockHttpGet({ json: { entries: {} } });

    const promise = startDaemon({ cmd: 'npx storybook dev', port: 6006, dataDir });
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result.ready).toBe(true);
    expect(result.pid).toBe(88888);
  });
});
