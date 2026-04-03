import { resolve } from 'node:path';
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  existsSync,
  openSync,
  closeSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
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

// ── Helpers (module-level utilities) ─────────────────────────────────────────

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

/**
 * Find all storybook-related PIDs whose cwd matches the given directory.
 * Uses /proc to reliably identify processes belonging to this workspace,
 * regardless of whether they were started by this daemon manager.
 */
export function findStorybookPids(workspaceCwd: string): number[] {
  const self = process.pid;
  try {
    return readdirSync('/proc')
      .filter((e) => /^\d+$/.test(e))
      .map(Number)
      .filter((pid) => {
        if (pid === self) return false;
        try {
          const cmdline = readFileSync(`/proc/${pid}/cmdline`, 'utf-8');
          if (!cmdline.includes('storybook')) return false;
          const cwd = readlinkSync(`/proc/${pid}/cwd`);
          return cwd === workspaceCwd;
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function killProcess(pid: number): Promise<void> {
  const targets = [-pid, pid];
  for (const target of targets) {
    try {
      process.kill(target, 'SIGTERM');
    } catch {
      // PID/group not found — try next
    }
  }
  await new Promise<void>((r) => setTimeout(r, 5000));
  for (const target of targets) {
    try {
      process.kill(target, 0); // throws if gone
      process.kill(target, 'SIGKILL');
    } catch {
      // Already gone — good
    }
  }
}

// ── StorybookDaemon ─────────────────────────────────────────────────────────

export class StorybookDaemon {
  private _info: StorybookInfo | null | undefined = undefined; // undefined = not loaded yet

  constructor(
    private readonly dataDir: string,
    private readonly baseUrl: string = 'http://localhost',
  ) {}

  // ── Private file I/O ────────────────────────────────────────────────────

  private get filePath(): string {
    return resolve(this.dataDir, 'storybook.json');
  }

  get logPath(): string {
    return resolve(this.dataDir, 'storybook.log');
  }

  private loadFile(): StorybookInfo | null {
    try {
      if (!existsSync(this.filePath)) return null;
      return JSON.parse(readFileSync(this.filePath, 'utf-8')) as StorybookInfo;
    } catch {
      return null;
    }
  }

  private saveFile(info: StorybookInfo): void {
    mkdirSync(this.dataDir, { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(info, null, 2));
  }

  private removeFile(): void {
    try {
      unlinkSync(this.filePath);
    } catch {
      /* already gone */
    }
  }

  // ── Lazy state access ───────────────────────────────────────────────────

  private get info(): StorybookInfo | null {
    if (this._info === undefined) {
      this._info = this.loadFile();
    }
    return this._info;
  }

  /** Invalidate cache — next property access will re-read from disk. */
  reload(): this {
    this._info = undefined;
    return this;
  }

  get exists(): boolean {
    return this.info !== null;
  }

  get pid(): number | undefined {
    return this.info?.pid;
  }

  get port(): number | undefined {
    return this.info?.port;
  }

  get log(): string | undefined {
    return this.info?.log;
  }

  get cwd(): string | undefined {
    return this.info?.cwd;
  }

  get startedAt(): string | undefined {
    return this.info?.started_at;
  }

  // ── Computed properties ─────────────────────────────────────────────────

  /** Full origin URL with active port (e.g. http://localhost:39943). */
  get url(): string | undefined {
    const port = this.port;
    if (!port) return undefined;
    const parsed = new URL(this.baseUrl);
    parsed.port = String(port);
    return parsed.origin;
  }

  /** Full Storybook iframe URL for a given storyId. */
  iframeUrl(storyId: string): string | undefined {
    const base = this.url;
    if (!base) return undefined;
    return `${base}/iframe.html?id=${storyId}&viewMode=story`;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  /** Check if Storybook is running via /proc scan. Cleans up stale PID files. */
  status(): { running: boolean; stale?: boolean } & Partial<StorybookInfo> {
    // Always use /proc to determine running state
    const workspaceCwd = this.cwd ?? this.dataDir;
    const pids = findStorybookPids(workspaceCwd);

    if (pids.length > 0) {
      // Process found via /proc — merge with file info if available
      const info = this.info;
      if (info && pids.includes(info.pid)) {
        return { running: true, ...info };
      }
      // Running process doesn't match file — return first found pid with file info
      return { running: true, pid: pids[0], ...info };
    }

    // No process found — check if file is stale
    if (this.exists) {
      this.removeFile();
      this.reload();
      return { running: false, stale: true };
    }

    return { running: false };
  }

  /** Start the Storybook daemon. */
  async start(opts: { cmd: string; port?: number; cwd?: string; force?: boolean }): Promise<StartResult> {
    const { cmd, cwd, force } = opts;
    let port = opts.port;

    if (force) {
      // Read existing port before stopping so we can reuse it
      if (port === undefined && this.info) {
        port = this.info.port;
      }
      await this.stop();
    } else {
      const st = this.status();
      if (st.running) {
        throw new Error(`Storybook is already running (pid ${st.pid}, port ${st.port}). Use --force to replace it.`);
      }
    }

    // Fallback: if no port was determined (no --port flag, no existing instance), pick a free one
    if (port === undefined) {
      port = await findFreePort();
    }

    const fullCmd = `${cmd} --port ${port}`;
    const startupErrors: string[] = [];
    const errorPattern = /ERROR|ModuleNotFoundError|Cannot find|Failed to/;

    const logPath = this.logPath;
    mkdirSync(this.dataDir, { recursive: true });
    const logFd = openSync(logPath, 'w');
    const child = spawn(fullCmd, [], {
      shell: true,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      ...(cwd ? { cwd } : {}),
    });
    closeSync(logFd);

    const timeoutMs = 120_000;
    const startTime = Date.now();
    let ready = false;
    let logOffset = 0;

    while (!ready && Date.now() - startTime < timeoutMs) {
      await new Promise<void>((r) => setTimeout(r, 2000));

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
      const info: StorybookInfo = {
        pid: child.pid!,
        port,
        log: logPath,
        cwd: cwd ?? process.cwd(),
        started_at: new Date().toISOString(),
      };
      this.saveFile(info);
      this.reload();
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

  /** Stop Storybook. Always uses /proc scanning — never relies on PID file for process discovery. */
  async stop(): Promise<void> {
    const workspaceCwd = this.cwd ?? this.dataDir;
    const pids = findStorybookPids(workspaceCwd);
    for (const pid of pids) {
      await killProcess(pid);
    }
    this.removeFile();
    this.reload();
  }

  /** Restart: stop then start. Reuses existing port when none is specified. */
  async restart(opts: { cmd: string; port?: number; cwd?: string }): Promise<StartResult> {
    const port = opts.port ?? this.info?.port;
    await this.stop();
    return this.start({ ...opts, port, force: false });
  }

  // ── Logs ────────────────────────────────────────────────────────────────

  /** Read full log content. */
  logs(): string | undefined {
    const logPath = this.logPath;
    if (!existsSync(logPath)) return undefined;
    return readFileSync(logPath, 'utf-8');
  }

  /** Async generator that yields new log lines as they appear. */
  async *tailLogs(): AsyncGenerator<string> {
    const logPath = this.logPath;
    let offset = 0;

    // Yield existing content first
    if (existsSync(logPath)) {
      const content = readFileSync(logPath, 'utf-8');
      if (content.length > 0) {
        yield content;
        offset = content.length;
      }
    }

    // Poll for new content
    while (true) {
      await new Promise<void>((r) => setTimeout(r, 1000));
      try {
        const content = readFileSync(logPath, 'utf-8');
        if (content.length > offset) {
          yield content.slice(offset);
          offset = content.length;
        }
      } catch {
        /* file may have been removed */
      }
    }
  }
}
