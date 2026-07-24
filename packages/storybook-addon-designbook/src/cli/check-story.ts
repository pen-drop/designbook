/**
 * `_debo storybook check <story-url>` — validate a story before trusting it:
 *   1. staleness preflight (component files newer than the daemon → restart);
 *   2. goto story, scan for console errors;
 *   3. `document.fonts` check for expected families (reuses inspect/style-env);
 *   4. behavior smoke (click a trigger, assert aria-expanded / panel visibility).
 *
 * The staleness rule previously lived as prose in the `playwright-validate` rule;
 * here it is code (pure + unit-tested), so the driver stops re-deriving it.
 */

import { statSync } from 'node:fs';
import type { DesignbookConfig } from '../config.js';

/**
 * True when any component file is newer than the running daemon — the story the
 * daemon serves is stale and Storybook must be restarted before validating.
 * Pure: mtimes and the daemon start time are passed in.
 */
export function isStorybookStale(componentMtimesMs: number[], daemonStartedAtIso: string | undefined): boolean {
  if (!daemonStartedAtIso) return false;
  const startedAt = Date.parse(daemonStartedAtIso);
  if (!Number.isFinite(startedAt)) return false;
  return componentMtimesMs.some((m) => m > startedAt);
}

/** Read mtimes (ms) for a set of files; missing files are ignored. */
export function componentMtimes(files: string[]): number[] {
  const out: number[] = [];
  for (const f of files) {
    try {
      out.push(statSync(f).mtimeMs);
    } catch {
      /* missing file — ignore */
    }
  }
  return out;
}

export interface StoryBehaviorProbe {
  /** Selector clicked to trigger the behavior. */
  trigger: string;
  /** Selector expected to become visible, or attribute assertion `sel@aria-expanded=true`. */
  expect: string;
}

export interface CheckStoryResult {
  ok: boolean;
  stale: boolean;
  console_errors: string[];
  missing_fonts: string[];
  behavior?: { ok: boolean; detail: string };
}

/**
 * Run the story checks in one browser session. Staleness is decided by the
 * caller (it owns the file list + daemon info) and passed in as `stale`.
 */
export async function runCheckStory(
  storyUrl: string,
  opts: { fonts: string[]; behavior?: StoryBehaviorProbe; stale: boolean },
  config: DesignbookConfig,
): Promise<CheckStoryResult> {
  void config;
  // Short-circuit a stale daemon: the served story is known-wrong, so launching a
  // browser to check it wastes a session — the caller must restart Storybook first.
  if (opts.stale) {
    return { ok: false, stale: true, console_errors: [], missing_fonts: [] };
  }
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(storyUrl);
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const missingFonts: string[] = [];
    if (opts.fonts.length > 0) {
      const { captureStyleEnv } = await import('../inspect/style-env.js');
      const env = await captureStyleEnv(storyUrl, { fonts: opts.fonts });
      for (const f of env.fonts) if (!f.loaded) missingFonts.push(f.family);
    }

    let behavior: { ok: boolean; detail: string } | undefined;
    if (opts.behavior) {
      behavior = await runBehaviorProbe(page, opts.behavior);
    }

    const ok = !opts.stale && consoleErrors.length === 0 && missingFonts.length === 0 && (behavior?.ok ?? true);
    return {
      ok,
      stale: opts.stale,
      console_errors: consoleErrors,
      missing_fonts: missingFonts,
      ...(behavior ? { behavior } : {}),
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runBehaviorProbe(
  page: import('playwright').Page,
  probe: StoryBehaviorProbe,
): Promise<{ ok: boolean; detail: string }> {
  try {
    await page.click(probe.trigger, { timeout: 5000 });
    const attrMatch = probe.expect.match(/^(.+)@([\w-]+)=(.+)$/);
    if (attrMatch) {
      const [, sel, attr, expected] = attrMatch;
      const actual = await page.getAttribute(sel!, attr!);
      const ok = actual === expected;
      return { ok, detail: `${sel}@${attr}=${actual ?? 'null'} (expected ${expected})` };
    }
    const visible = await page.isVisible(probe.expect);
    return { ok: visible, detail: `${probe.expect} visible=${visible}` };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}
