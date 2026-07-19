/**
 * `_debo capture matrix <meta.yml>` — resolve the element × state × breakpoint
 * capture matrix from a real extract-reference `meta.yml` (widths from
 * `design-tokens.yml`), reuse frozen PNGs, and capture everything in ONE browser
 * session. The planning (which cells, which widths, what to skip) is pure and
 * unit-tested here; the browser session is a thin wrapper over the shared
 * isolate-and-capture primitives in `capture-browser.ts`.
 *
 * The meta shape is the one extract-reference actually writes: a top-level
 * `elements[]`, each element carrying `id` / `selector` / `states[]` (name +
 * steps) / `breakpoints[]`. Each cell isolates the element's `selector`, runs the
 * state's steps, and is named `<breakpoint>--<element>--<state>.png` per the
 * system-wide `playwright-capture` convention.
 */

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { BreakpointWidth } from '../inspect/breakpoint-widths.js';
import type { DesignbookConfig } from '../config.js';
import { CAPTURE_HEIGHT, isolateAndCapture, runStateSteps, settlePage, type CaptureStep } from './capture-browser.js';

export interface MatrixCell {
  element: string;
  selector: string;
  state: string;
  steps: CaptureStep[];
  breakpoint: string;
}

export interface CaptureJob extends MatrixCell {
  width: number;
  outPath: string;
  /** True when a frozen PNG already exists and this job is skipped. */
  frozen: boolean;
}

interface MetaState {
  name?: string;
  steps?: CaptureStep[];
}
interface MetaElement {
  id?: string;
  selector?: string;
  states?: MetaState[];
  breakpoints?: string[];
}
export interface MetaShape {
  elements?: MetaElement[];
  /** Parsed straight from YAML, so tolerate any extra top-level keys (`source`, etc.). */
  [key: string]: unknown;
}

const REST_STATE: MetaState = { name: 'rest', steps: [] };

/**
 * Flatten a real extract-reference meta.yml into the element × state × breakpoint
 * cells to capture. An element with no `states` defaults to the implicit `rest`
 * state; each cell carries the element's `selector` and the state's `steps` so the
 * runner can isolate and drive it. The OLD fabricated `reference.breakpoints`
 * shape has no `elements` → yields zero cells (the no-op is now visible, not silent).
 */
export function matrixCellsFromMeta(meta: MetaShape): MatrixCell[] {
  const cells: MatrixCell[] = [];
  for (const el of meta.elements ?? []) {
    const element = el.id ?? '';
    const selector = el.selector ?? '';
    const states = el.states && el.states.length > 0 ? el.states : [REST_STATE];
    const breakpoints = el.breakpoints ?? [];
    for (const st of states) {
      const state = st.name ?? 'rest';
      const steps = st.steps ?? [];
      for (const breakpoint of breakpoints) {
        cells.push({ element, selector, state, steps, breakpoint });
      }
    }
  }
  return cells;
}

/** Fail loudly when a meta.yml plans zero cells, rather than exiting 0 as a silent no-op. */
export function ensureCellsPlanned(cells: MatrixCell[], metaPath: string): void {
  if (cells.length === 0) {
    throw new Error(
      `capture matrix: 0 cells planned from ${metaPath} — expected a top-level elements[] with states × breakpoints. Is this a real extract-reference meta.yml?`,
    );
  }
}

/**
 * Plan the capture jobs: resolve each cell's width from the breakpoint widths,
 * name the PNG `<breakpoint>--<element>--<state>.png` under `outDir`, and mark a
 * job frozen (skipped) when its PNG already exists. Cells whose breakpoint has no
 * known width are dropped. Pure — `exists` is injected so it can be tested without
 * a disk.
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
    const outPath = resolve(outDir, `${cell.breakpoint}--${cell.element}--${cell.state}.png`);
    jobs.push({ ...cell, width, outPath, frozen: exists(outPath) });
  }
  return jobs;
}

export interface RunMatrixOptions {
  /** Base URL to capture (each cell re-navigates to reset state before its steps). */
  url: string;
  /** Optional selector clicked once per navigation to dismiss a consent banner before capturing. */
  consentSelector?: string;
}

export interface RunMatrixResult {
  jobs: CaptureJob[];
  /** Dimension-drift / fallback warnings collected across the run. */
  warnings: string[];
}

/**
 * Execute the planned jobs in ONE browser session. Each non-frozen job navigates
 * fresh (state steps mutate the DOM, so state must not leak between captures),
 * dismisses any consent banner, sets the breakpoint width, settles, runs the
 * state's steps, then isolates the element selector and captures it transparent.
 * Frozen PNGs are reused, never recaptured. Returns the jobs plus any drift warnings.
 */
export async function runCaptureMatrix(
  jobs: CaptureJob[],
  opts: RunMatrixOptions,
  config: DesignbookConfig,
): Promise<RunMatrixResult> {
  void config;
  const warnings: string[] = [];
  const todo = jobs.filter((j) => !j.frozen);
  if (todo.length === 0) return { jobs, warnings };

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: todo[0]!.width, height: CAPTURE_HEIGHT } });
    const page = await context.newPage();
    for (const job of todo) {
      await page.setViewportSize({ width: job.width, height: CAPTURE_HEIGHT });
      await page.goto(opts.url);
      if (opts.consentSelector) {
        await page.click(opts.consentSelector, { timeout: 3000 }).catch(() => {});
      }
      await settlePage(page, job.selector || undefined);
      await runStateSteps(page, job.steps);
      await mkdir(resolve(job.outPath, '..'), { recursive: true });
      const { warning } = await isolateAndCapture(page, {
        selector: job.selector,
        width: job.width,
        outPath: job.outPath,
      });
      if (warning) warnings.push(`${job.breakpoint}--${job.element}--${job.state}: ${warning}`);
    }
    await context.close().catch(() => {});
  } finally {
    await browser.close().catch(() => {});
  }
  return { jobs, warnings };
}
