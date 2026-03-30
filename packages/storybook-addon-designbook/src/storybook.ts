import { resolve } from 'node:path';
import { mkdirSync, readFileSync, existsSync, openSync, closeSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import * as http from 'node:http';

// ── Types ────────────────────────────────────────────────────────────────────

export interface StorybookInfo {
  pid: number;
  port: number;
  log: string;
  cwd: string;
  started_at: string;
}

export interface StartResult {
  ready: boolean;
  pid?: number;
  port: number;
  log: string;
  startup_errors: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Bind to port 0, let the OS pick a free port, return it. */
export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : null;
      server.close((err) => {
        if (err || port === null) reject(err ?? new Error('Could not determine port'));
        else resolve(port);
      });
    });
    server.on('error', reject);
  });
}

export function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error('Invalid JSON'));
          }
        });
      })
      .on('error', reject);
  });
}

// ── PID file management ──────────────────────────────────────────────────────

export function pidFilePath(dataDir: string): string {
  return resolve(dataDir, 'storybook.json');
}

export function logFilePath(dataDir: string): string {
  return resolve(dataDir, 'storybook.log');
}

export function readPidFile(dataDir: string): StorybookInfo | null {
  const p = pidFilePath(dataDir);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8')) as StorybookInfo;
}

export function writePidFile(dataDir: string, info: StorybookInfo): void {
  writeFileSync(pidFilePath(dataDir), JSON.stringify(info, null, 2));
}

export function removePidFile(dataDir: string): void {
  try {
    unlinkSync(pidFilePath(dataDir));
  } catch {
    /* already gone */
  }
}

// ── Process management ───────────────────────────────────────────────────────

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function killProcess(pid: number): Promise<void> {
  try {
    process.kill(-pid, 'SIGTERM'); // negative PID kills process group
    await new Promise<void>((r) => setTimeout(r, 5000));
    try {
      process.kill(-pid, 0); // throws if process group is gone
      process.kill(-pid, 'SIGKILL');
    } catch {
      // Already gone — good
    }
  } catch {
    // PID not found — exit silently
  }
}

// ── Status check ─────────────────────────────────────────────────────────────

export function getStatus(dataDir: string): { running: boolean; stale?: boolean } & Partial<StorybookInfo> {
  const info = readPidFile(dataDir);
  if (!info) return { running: false };

  if (isAlive(info.pid)) {
    return { running: true, ...info };
  }

  // PID is dead — stale file
  removePidFile(dataDir);
  return { running: false, stale: true };
}

// ── Storybook daemon start ───────────────────────────────────────────────────

export async function startDaemon(opts: {
  cmd: string;
  port: number;
  dataDir: string;
  cwd?: string;
}): Promise<StartResult> {
  const { cmd, port, dataDir, cwd } = opts;

  // Guard: refuse to start if a Storybook is already running
  const status = getStatus(dataDir);
  if (status.running) {
    throw new Error(
      `Storybook is already running (pid ${status.pid}, port ${status.port}). Use 'storybook restart' to replace it.`,
    );
  }

  const fullCmd = `${cmd} --port ${port}`;
  const startupErrors: string[] = [];
  const errorPattern = /ERROR|ModuleNotFoundError|Cannot find|Failed to/;

  const logPath = logFilePath(dataDir);
  mkdirSync(dataDir, { recursive: true });
  const logFd = openSync(logPath, 'w');
  const child = spawn(fullCmd, [], {
    shell: true,
    detached: true,
    stdio: ['ignore', logFd, logFd],
    ...(cwd ? { cwd } : {}),
  });
  closeSync(logFd); // parent closes its copy; child retains its own fd

  const timeoutMs = 120_000;
  const startTime = Date.now();
  let ready = false;
  let logOffset = 0;

  while (!ready && Date.now() - startTime < timeoutMs) {
    await new Promise<void>((r) => setTimeout(r, 2000));

    // Scan new log content, forward to stderr, collect errors
    try {
      const content = readFileSync(logPath, 'utf-8');
      const newContent = content.slice(logOffset);
      logOffset = content.length;
      for (const line of newContent.split('\n')) {
        if (line.trim()) {
          process.stderr.write(line + '\n');
          if (errorPattern.test(line)) startupErrors.push(line.trim());
        }
      }
    } catch {
      /* log not yet written */
    }

    try {
      const result = await fetchJson(`http://localhost:${port}/index.json`);
      if (result !== null && typeof result === 'object' && 'entries' in result) {
        ready = true;
      }
    } catch {
      // Not ready yet
    }
  }

  if (ready) {
    child.unref();
    writePidFile(dataDir, {
      pid: child.pid!,
      port,
      log: logPath,
      cwd: cwd ?? process.cwd(),
      started_at: new Date().toISOString(),
    });
    return {
      ready: true,
      pid: child.pid,
      port,
      log: logPath,
      startup_errors: startupErrors.filter(Boolean),
    };
  } else {
    try {
      child.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    return {
      ready: false,
      port,
      log: logPath,
      startup_errors: startupErrors.filter(Boolean),
    };
  }
}

// ── Stop ─────────────────────────────────────────────────────────────────────

export async function stopDaemon(dataDir: string, pidOverride?: number): Promise<void> {
  let pid: number | undefined = pidOverride;

  if (pid === undefined) {
    const info = readPidFile(dataDir);
    if (!info) {
      throw new Error('no PID file found and no pidOverride provided');
    }
    pid = info.pid;
  }

  await killProcess(pid);
  removePidFile(dataDir);
}
