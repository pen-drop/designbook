/**
 * Runner for `reference capture-file` — download one source asset into the
 * revision directory as served (font, SVG, JPEG, PNG). Screenshots stay on
 * `reference capture-image`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DesignbookConfig } from '../config.js';
import { ANONYMOUS_SESSION, resolveSessionStorage } from './capture-session.js';

export interface CaptureFileOptions {
  url: string;
  outPath: string;
  /** Named session whose storage state is sent with the download. */
  session?: string;
}

export interface CaptureFileResult {
  outPath: string;
  bytes: number;
}

export function assertHttpUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('url: expected an absolute http(s) URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
    throw new Error('url: expected an absolute http(s) URL');
  return parsed;
}

async function download(url: string, storageState: string | undefined): Promise<Buffer> {
  if (storageState) {
    const { request } = await import('playwright');
    const api = await request.newContext({ storageState });
    try {
      const response = await api.get(url);
      if (!response.ok()) throw new Error(`url: HTTP ${response.status()} for ${url}`);
      return Buffer.from(await response.body());
    } finally {
      await api.dispose();
    }
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`url: HTTP ${response.status} for ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

/** Download one asset into `outPath`, preserving the served bytes. */
export async function runCaptureFile(opts: CaptureFileOptions, config: DesignbookConfig): Promise<CaptureFileResult> {
  assertHttpUrl(opts.url);
  const session = opts.session ?? ANONYMOUS_SESSION;
  const body = await download(opts.url, resolveSessionStorage(config, session));
  if (!body.length) throw new Error(`url: empty file at ${opts.url}`);
  mkdirSync(dirname(opts.outPath), { recursive: true });
  writeFileSync(opts.outPath, body);
  return { outPath: opts.outPath, bytes: body.length };
}
