/**
 * Shared browser primitives for the capture commands (`capture matrix`,
 * `capture screenshot`). One home for the settle protocol, state-step execution,
 * and the isolate-and-capture pattern mandated by
 * `.agents/skills/designbook/design/rules/playwright-capture.md`, so both commands
 * stay in lock-step with the rule instead of each re-deriving it.
 */

import type { Page } from 'playwright';

export interface CaptureStep {
  action: 'click' | 'hover' | 'focus' | 'wait';
  selector?: string;
  timeout?: number;
}

/** Viewport height is pinned across every capture for consistent diffs. */
export const CAPTURE_HEIGHT = 1600;

/**
 * The CSR-robust settle the rule mandates: networkidle + (for element captures)
 * wait-for-selector-visible + `document.fonts.ready` + a double rAF. A fixed
 * `waitForTimeout` MUST NOT be used as the render settle — it is slow and
 * unreliable when the DOM is client-rendered.
 */
export async function settlePage(page: Page, selector?: string): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  if (selector) {
    await page.waitForSelector(selector, { state: 'visible', timeout: 8000 }).catch(() => {});
  }
  await page.evaluate(() => (document as Document).fonts.ready).catch(() => {});
  await page
    .evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
    .catch(() => {});
}

/**
 * Drive the page into a non-rest state by running each step in order, settling
 * `step.timeout` ms after each action. This post-action settle is the ONE place a
 * fixed wait is correct (waiting for an interaction to animate), distinct from the
 * forbidden render settle above. `rest` states have no steps and are a no-op.
 */
export async function runStateSteps(page: Page, steps: CaptureStep[]): Promise<void> {
  for (const step of steps) {
    const settleMs = typeof step.timeout === 'number' ? step.timeout : 500;
    if (step.selector && step.action === 'click') {
      await page.click(step.selector, { timeout: 5000 }).catch(() => {});
    } else if (step.selector && step.action === 'hover') {
      await page.hover(step.selector, { timeout: 5000 }).catch(() => {});
    } else if (step.selector && step.action === 'focus') {
      await page.focus(step.selector, { timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(settleMs);
  }
}

export interface IsolateResult {
  /** Non-empty when the capture had to fall back or drifted from the ideal shape. */
  warning?: string;
}

/**
 * Isolate the first element matching `selector` (hoist it to the body root inside a
 * transparent capture surface pinned to `width`) and screenshot it full-page, so
 * reference and story sides share identical dimensions. When the selector matches
 * nothing, fall back to a full-page shot and return a dimension-drift warning
 * rather than failing. An empty selector captures the full page directly.
 */
export async function isolateAndCapture(
  page: Page,
  opts: { selector: string; width: number; outPath: string; transparent?: boolean; fullPage?: boolean },
): Promise<IsolateResult> {
  const transparent = opts.transparent ?? true;
  if (!opts.selector) {
    await page.screenshot({ path: opts.outPath, fullPage: opts.fullPage ?? true });
    return {};
  }

  const count = await page
    .locator(opts.selector)
    .count()
    .catch(() => 0);
  if (count === 0) {
    await page.screenshot({ path: opts.outPath, fullPage: true });
    return { warning: `selector '${opts.selector}' matched nothing — captured full page (dimension drift likely)` };
  }

  await page.evaluate(
    ({ sel, viewportWidth }: { sel: string; viewportWidth: number }) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return;
      const surface = document.createElement('div');
      surface.setAttribute('data-designbook-capture-surface', '');
      surface.style.boxSizing = 'border-box';
      surface.style.width = viewportWidth + 'px';
      surface.style.minWidth = viewportWidth + 'px';
      surface.style.margin = '0';
      surface.style.padding = '0';
      surface.style.background = 'transparent';
      surface.appendChild(el);
      document.body.replaceChildren(surface);
      el.style.margin = '0';
      el.style.inset = 'auto';
      document.documentElement.style.background = 'transparent';
      document.documentElement.style.width = viewportWidth + 'px';
      document.documentElement.style.minWidth = viewportWidth + 'px';
      document.body.style.background = 'transparent';
      document.body.style.margin = '0';
      document.body.style.width = viewportWidth + 'px';
      document.body.style.minWidth = viewportWidth + 'px';
      document.body.style.overflowX = 'hidden';
    },
    { sel: opts.selector, viewportWidth: opts.width },
  );
  await page
    .evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))))
    .catch(() => {});
  await page.screenshot({ path: opts.outPath, fullPage: true, omitBackground: transparent });
  return {};
}
