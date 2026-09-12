/**
 * Runner for `reference capture-image` — capture ONE element (or story root,
 * or full page) in a single browser session, using the same isolate-and-capture
 * core as `capture matrix`.
 */

import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { DesignbookConfig } from '../shared/config.js';
import {
  CAPTURE_HEIGHT,
  isolateAndCapture,
  runStateSteps,
  settlePage,
  type CaptureStep,
} from '../tools/capture-browser.js';
import { ANONYMOUS_SESSION, prepareCapturePass, runPrelude, sessionContextOptions } from '../tools/capture-session.js';

/** Parse the `--steps` JSON argument into a CaptureStep array (empty when absent). */
export function parseStepsArg(raw: string | undefined): CaptureStep[] {
  if (!raw || raw.trim() === '') return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`--steps is not valid JSON: ${(err as Error).message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('--steps must be a JSON array of capture steps');
  }
  return parsed as CaptureStep[];
}

export interface ScreenshotOptions {
  url: string;
  /** Element selector to isolate; empty string captures the full page / story root. */
  selector: string;
  width: number;
  outPath: string;
  steps?: CaptureStep[];
  transparent?: boolean;
  fullPage?: boolean;
  /** Named session to observe as; defaults to the reserved anonymous session. */
  session?: string;
  /** Observed state this shot belongs to; passed to the prelude as context. */
  state?: string;
  /** View identity this shot belongs to; passed to the prelude as context. */
  view?: string;
  /** Path to the capture workflow's prelude module. */
  prelude?: string;
}

export interface ScreenshotResult {
  outPath: string;
  warning?: string;
}

/** Capture a single screenshot in one browser session. */
export async function runCaptureScreenshot(
  opts: ScreenshotOptions,
  config: DesignbookConfig,
): Promise<ScreenshotResult> {
  const session = opts.session ?? ANONYMOUS_SESSION;
  const { storageState, prelude } = await prepareCapturePass(config, {
    session,
    ...(opts.prelude ? { prelude: opts.prelude } : {}),
  });
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: opts.width, height: CAPTURE_HEIGHT },
      ...sessionContextOptions(storageState),
    });
    const page = await context.newPage();
    await page.goto(opts.url);
    await runPrelude(page, prelude, {
      session,
      url: opts.url,
      ...(opts.state ? { state: opts.state } : {}),
      ...(opts.view ? { view: opts.view } : {}),
    });
    await settlePage(page, opts.selector || undefined);
    await runStateSteps(page, opts.steps ?? []);
    await mkdir(resolve(opts.outPath, '..'), { recursive: true });
    const { warning } = await isolateAndCapture(page, {
      selector: opts.selector,
      width: opts.width,
      outPath: opts.outPath,
      ...(opts.transparent !== undefined ? { transparent: opts.transparent } : {}),
      ...(opts.fullPage !== undefined ? { fullPage: opts.fullPage } : {}),
    });
    await context.close().catch(() => {});
    return { outPath: opts.outPath, ...(warning ? { warning } : {}) };
  } finally {
    await browser.close().catch(() => {});
  }
}
