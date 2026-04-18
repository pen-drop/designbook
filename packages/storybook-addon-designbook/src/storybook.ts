import { resolve } from 'node:path';
import {
  mkdirSync,
  readFileSync,
  existsSync,
  openSync,
  closeSync,
  writeFileSync,
  unlinkSync,
  renameSync,
} from 'node:fs';
import { homedir } from 'node:os';
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

// ── Global registry ─────────────────────────────────────────────────────────

/**
 * Path to the global storybook registry. Cross-platform: uses $HOME/.designbook.
 * Can be overridden via DESIGNBOOK_REGISTRY env var (used in tests).
 */
export function registryPath(): string {
  const override = process.env['DESIGNBOOK_REGISTRY'];
  if (override) return override;
  return resolve(homedir(), '.designbook', 'storybooks.json');
}

interface Registry {
  entries: StorybookInfo[];
}

function readRegistry(): Registry {
  const path = registryPath();
  try {
    if (!existsSync(path)) return { entries: [] };
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as unknown;
    if (raw && typeof raw === 'object' && Array.isArray((raw as Registry).entries)) {
      return raw as Registry;
    }
    return { entries: [] };
  } catch {
    return { entries: [] };
  }
}

function writeRegistry(registry: Registry): void {
  const path = registryPath();
  const dir = resolve(path, '..');
  mkdirSync(dir, { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(registry, null, 2));
  renameSync(tmp, path);
}

/** Add or replace an entry (keyed by pid) in the global registry. */
export function registerDaemon(info: StorybookInfo): void {
  const registry = readRegistry();
  registry.entries = registry.entries.filter((e) => e.pid !== info.pid);
  registry.entries.push(info);
  writeRegistry(registry);
}

/** Remove the entry with the given pid from the global registry. */
export function unregisterDaemon(pid: number): void {
  const registry = readRegistry();
  const next = registry.entries.filter((e) => e.pid !== pid);
  if (next.length !== registry.entries.length) {
    writeRegistry({ entries: next });
  }
}

/**
 * Remove registry entries for processes that are no longer alive OR whose
 * original cwd has been deleted. Returns the cleaned list of still-live entries.
 */
export function reapZombies(): StorybookInfo[] {
  const registry = readRegistry();
  const alive: StorybookInfo[] = [];
  const dead: StorybookInfo[] = [];
  for (const entry of registry.entries) {
    if (isAlive(entry.pid) && existsSync(entry.cwd)) {
      alive.push(entry);
    } else {
      dead.push(entry);
    }
  }
  // Kill any process whose cwd is missing (orphaned daemon) before dropping it
  for (const entry of dead) {
    if (isAlive(entry.pid)) {
      try {
        process.kill(-entry.pid, 'SIGTERM');
      } catch {
        /* ignore */
      }
      try {
        process.kill(entry.pid, 'SIGTERM');
      } catch {
        /* ignore */
      }
    }
  }
  if (dead.length > 0) {
    writeRegistry({ entries: alive });
  }
  return alive;
}

/** Return all live registry entries for the given workspace cwd. */
export function findDaemonsByCwd(workspaceCwd: string): StorybookInfo[] {
  return reapZombies().filter((e) => e.cwd === workspaceCwd);
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

  /** Workspace cwd as known to this daemon (from file or dataDir fallback). */
  private get workspaceCwd(): string {
    return this.info?.cwd ?? this.dataDir;
  }

  /** Check if Storybook is running via registry cross-check. Cleans up stale PID files. */
  status(): { running: boolean; stale?: boolean } & Partial<StorybookInfo> {
    const entries = findDaemonsByCwd(this.workspaceCwd);

    if (entries.length > 0) {
      const info = this.info;
      const match = info ? entries.find((e) => e.pid === info.pid) : undefined;
      const chosen = match ?? entries[0]!;
      return { running: true, ...chosen };
    }

    // No live process found — clean up stale file if present
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

    // Read existing port before stopping so we can reuse it
    if (port === undefined && this.info) {
      port = this.info.port;
    }

    const st = this.status();
    if (st.running) {
      if (force) {
        await this.stop();
      } else {
        throw new Error(`Storybook is already running (pid ${st.pid}, port ${st.port}). Use --force to replace it.`);
      }
    } else {
      // Not running — clean up stale file if present
      this.removeFile();
      this.reload();
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
      registerDaemon(info);
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

  /** Stop Storybook. Uses the global registry to find daemons for this workspace. */
  async stop(): Promise<void> {
    const entries = findDaemonsByCwd(this.workspaceCwd);
    for (const entry of entries) {
      await killProcess(entry.pid);
      unregisterDaemon(entry.pid);
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
