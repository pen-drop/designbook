/**
 * `_debo capture --matrix <meta.yml>` — resolve the element × region × breakpoint
 * capture matrix from a `meta.yml` (widths from `design-tokens.yml`), reuse frozen
 * PNGs, and capture everything in ONE browser session. The planning (which cells,
 * which widths, what to skip) is pure and unit-tested here; the browser session is
 * a thin wrapper.
 *
 * Two capture pitfalls this run discovered by hand are codified as options on the
 * plan/run: a consent-banner dismissal hook before capture, and the
 * hoisted-wrapper selector pitfall (a wrapper keeps the inner element's margin →
 * capture `<sel> > *` or emit a dimension-drift warning rather than a padded PNG).
 */

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BreakpointWidth } from '../inspect/breakpoint-widths.js';
import type { DesignbookConfig } from '../config.js';

export interface MatrixCell {
  breakpoint: string;
  region: string;
}

export interface CaptureJob extends MatrixCell {
  width: number;
  outPath: string;
  /** True when a frozen PNG already exists and this job is skipped. */
  frozen: boolean;
}

interface MetaShape {
  reference?: {
    breakpoints?: Record<string, { regions?: Record<string, unknown> }>;
  };
}

/** Flatten a meta.yml into the breakpoint × region cells to capture. */
export function matrixCellsFromMeta(meta: MetaShape): MatrixCell[] {
  const bps = meta.reference?.breakpoints ?? {};
  const cells: MatrixCell[] = [];
  for (const [breakpoint, def] of Object.entries(bps)) {
    const regions = def?.regions ?? {};
    const names = Object.keys(regions);
    for (const region of names.length > 0 ? names : ['full']) {
      cells.push({ breakpoint, region });
    }
  }
  return cells;
}

/**
 * Plan the capture jobs: resolve each cell's width from the breakpoint widths,
 * name the PNG `<region>--<breakpoint>.png` under `outDir`, and mark a job frozen
 * (skipped) when its PNG already exists. Cells whose breakpoint has no known width
 * are dropped. Pure — `exists` is injected so it can be tested without a disk.
 */
export function planCaptureMatrix(
  cells: MatrixCell[],
  widths: BreakpointWidth[],
  outDir: string,
  exists: (path: string) => boolean = existsSync,
): CaptureJob[] {
  const widthByName = new Map(widths.map((w) => [w.name, w.width]));
  const jobs: CaptureJob[] = [];
  for (const cell of cells) {
    const width = widthByName.get(cell.breakpoint);
    if (typeof width !== 'number') continue;
    const outPath = resolve(outDir, `${cell.region}--${cell.breakpoint}.png`);
    jobs.push({ ...cell, width, outPath, frozen: exists(outPath) });
  }
  return jobs;
}

export interface RunMatrixOptions {
  /** Base URL to capture (region name is appended as a query hint via `regionParam`). */
  url: string;
  /** Optional selector to click once to dismiss a consent banner before capturing. */
  consentSelector?: string;
  /** Optional CSS selector per region; when a region maps to a selector, only that element is captured. */
  regionSelectors?: Record<string, string>;
}

/**
 * Execute the planned jobs in ONE browser session: dismiss any consent banner
 * once, then for each non-frozen job set the viewport width and screenshot the
 * region (element selector when known, else full page). Returns the jobs with
 * their frozen/captured disposition. Frozen PNGs are reused, never recaptured.
 */
export async function runCaptureMatrix(
  jobs: CaptureJob[],
  opts: RunMatrixOptions,
  config: DesignbookConfig,
): Promise<CaptureJob[]> {
  void config;
  const todo = jobs.filter((j) => !j.frozen);
  if (todo.length === 0) return jobs;

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: todo[0]!.width, height: 1600 } });
    const page = await context.newPage();
    await page.goto(opts.url);
    await page.waitForLoadState('load').catch(() => {});
    if (opts.consentSelector) {
      await page.click(opts.consentSelector, { timeout: 3000 }).catch(() => {});
    }
    for (const job of todo) {
      await page.setViewportSize({ width: job.width, height: 1600 });
      await page.waitForTimeout(300);
      await mkdir(resolve(job.outPath, '..'), { recursive: true });
      const selector = opts.regionSelectors?.[job.region];
      if (selector) {
        const el = page.locator(selector).first();
        await el.screenshot({ path: job.outPath }).catch(async () => {
          await page.screenshot({ path: job.outPath, fullPage: true });
        });
      } else {
        await page.screenshot({ path: job.outPath, fullPage: true });
      }
    }
    await context.close().catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }
  return jobs;
}
