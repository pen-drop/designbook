/**
 * Shared pre-capture preparation for every browser pass — the dump written by
 * `reference save` and every screenshot written by `reference capture-image` or
 * `capture matrix`.
 *
 * Two orthogonal concepts live here, and they are deliberately separate from the
 * per-shot `--steps` vocabulary in `capture-browser.ts`:
 *
 * - A **session** names *who* observes. It resolves through `config.sessions` to
 *   a Playwright storage-state file, so a saved workflow records a name, never a
 *   machine-local path or a credential.
 * - A **prelude** is *how the page is made observable at all* — dismiss consent,
 *   close a chat widget, force lazy content. It is one script per capture
 *   workflow that branches on its context, not a matrix of scripts.
 *
 * `--steps` remains what it was: reaching the named non-rest state of one
 * subject. A prelude establishes the baseline the whole revision observes.
 */

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Page } from 'playwright';
import { digestBytes } from '../reference-capture.js';
import type { DesignbookConfig } from '../config.js';

/** Reserved session name for an observation taken without any stored session. */
export const ANONYMOUS_SESSION = 'anonymous';

/** What a prelude is told about the pass it is preparing. */
export interface CaptureContext {
  /** Session name this pass observes as; `anonymous` when no session is loaded. */
  session: string;
  /** Observed state being reached, when the pass belongs to one. */
  state?: string;
  /** View identity being captured, when the pass belongs to one. */
  view?: string;
  /** URL the pass navigated to. */
  url: string;
}

export type PreludeFn = (page: Page, ctx: CaptureContext) => Promise<void>;

/** Every configured session name plus the reserved anonymous one. */
export function knownSessions(config: DesignbookConfig): string[] {
  const names = Object.keys(config)
    .filter((key) => key.startsWith('sessions.'))
    .map((key) => key.slice('sessions.'.length));
  return [...new Set([ANONYMOUS_SESSION, ...names])].sort();
}

/**
 * Resolve a session name to its storage-state file. `anonymous` resolves to no
 * file. An unknown name is an error rather than a silent anonymous capture — a
 * typo must not produce an artifact that claims the wrong observer.
 */
export function resolveSessionStorage(config: DesignbookConfig, session: string): string | undefined {
  if (!session) throw new Error(`--session is required; use "${ANONYMOUS_SESSION}" for an unauthenticated capture`);
  if (session === ANONYMOUS_SESSION) return undefined;
  const file = config[`sessions.${session}`];
  if (typeof file !== 'string' || !file)
    throw new Error(`Unknown session "${session}"; configured sessions are: ${knownSessions(config).join(', ')}`);
  if (!existsSync(file))
    throw new Error(
      `Session "${session}" storage state is missing: ${file}\nCreate it with: playwright-cli state-save`,
    );
  return file;
}

/** Browser-context options that carry a session into a fresh Playwright context. */
export function sessionContextOptions(storageState: string | undefined): { storageState?: string } {
  return storageState ? { storageState } : {};
}

/**
 * Load a prelude module. The file is an ES module whose default export is
 * `async (page, ctx) => {}`. It stays a real script on purpose: consent banners
 * in shadow DOM, lazy-load scroll loops and locale cookies are not expressible
 * in a fixed action vocabulary, and growing one would only rebuild a script.
 */
export async function loadPrelude(file: string): Promise<PreludeFn> {
  const path = isAbsolute(file) ? file : resolve(file);
  if (!existsSync(path)) throw new Error(`Prelude not found: ${path}`);
  const module = (await import(pathToFileURL(path).href)) as { default?: unknown };
  if (typeof module.default !== 'function')
    throw new Error(`Prelude ${path}: expected a default export of async (page, ctx) => {}`);
  return module.default as PreludeFn;
}

/** Fingerprint a prelude file so a revision records which script produced it. */
export function preludeDigest(file: string): string {
  const path = isAbsolute(file) ? file : resolve(file);
  if (!existsSync(path)) throw new Error(`Prelude not found: ${path}`);
  return digestBytes(readFileSync(path));
}

/**
 * Run the prelude and fail loudly. A prelude that throws leaves the page in an
 * unknown state, so continuing would record an observation nobody declared.
 */
export async function runPrelude(page: Page, prelude: PreludeFn | undefined, ctx: CaptureContext): Promise<void> {
  if (!prelude) return;
  try {
    await prelude(page, ctx);
  } catch (error) {
    throw new Error(`Prelude failed for session "${ctx.session}"${ctx.state ? ` state "${ctx.state}"` : ''}`, {
      cause: error,
    });
  }
}

/** Resolve session + prelude once for a command, so every pass shares them. */
export async function prepareCapturePass(
  config: DesignbookConfig,
  opts: { session: string; prelude?: string },
): Promise<{ storageState: string | undefined; prelude: PreludeFn | undefined }> {
  return {
    storageState: resolveSessionStorage(config, opts.session),
    prelude: opts.prelude ? await loadPrelude(opts.prelude) : undefined,
  };
}
