import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PAGE_SCRIPT } from './element-walker.js';
import { mergeBreakpointTrees, type BreakpointCapture } from './merge-breakpoints.js';
import type { CapturedSource } from './element-walker.js';

export interface CaptureBreakpoint {
  name: string;
  width: number;
}

const DEFAULT_WALKER_TIMEOUT_MS = 60_000;

function parseTimeoutMs(): number {
  const raw = process.env.DESIGNBOOK_WALKER_TOTAL_TIMEOUT_MS;
  if (!raw) return DEFAULT_WALKER_TIMEOUT_MS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WALKER_TIMEOUT_MS;
}

// Wait until URL is stable AND networkidle has fired — handles SPA hydration,
// HTTP redirects, JS redirects, OAuth round-trips, and SPA route guards.
async function waitForReady(page: import('playwright').Page, totalBudgetMs: number): Promise<void> {
  const deadline = Date.now() + totalBudgetMs;
  let lastUrl = '';
  let lastUrlChangeAt = Date.now();
  while (Date.now() < deadline) {
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    const currentUrl = page.url();
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      lastUrlChangeAt = Date.now();
      continue;
    }
    if (Date.now() - lastUrlChangeAt > 1500) {
      await page.waitForTimeout(500);
      return;
    }
    await page.waitForTimeout(300);
  }
  console.warn(`[inspect] URL never stabilized within ${totalBudgetMs}ms; walking current DOM`);
}

/**
 * Launch headless chromium, walk the page at each breakpoint width, and write a
 * mobile-first merged CapturedSource to `outPath`. With no breakpoints, captures
 * once at the default viewport (legacy single-shot behavior).
 */
export async function capture(url: string, outPath: string, breakpoints: CaptureBreakpoint[] = []): Promise<void> {
  const totalTimeoutMs = parseTimeoutMs();
  await mkdir(dirname(outPath), { recursive: true });

  const widths = breakpoints.length > 0 ? breakpoints : [{ name: '', width: 1440 }];

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const captures = await new Promise<BreakpointCapture[]>((resolveOuter, rejectOuter) => {
      timeoutHandle = setTimeout(() => {
        rejectOuter(new Error(`capture timed out after ${totalTimeoutMs}ms`));
        browser.close().catch(() => {});
      }, totalTimeoutMs);

      (async () => {
        const context = await browser.newContext({ viewport: { width: widths[0]!.width, height: 1600 } });
        const page = await context.newPage();
        try {
          await page.goto(url);
          await waitForReady(page, totalTimeoutMs);
          const out: BreakpointCapture[] = [];
          for (const bp of widths) {
            await page.setViewportSize({ width: bp.width, height: 1600 });
            await page.waitForTimeout(300); // let responsive layout settle
            const source = (await page.evaluate(
              ({ ref, script, width }: { ref: string; script: string; width: number }) => {
                eval(script);
                const walk = (
                  globalThis as unknown as {
                    __designbookWalkDocument: (
                      doc: Document,
                      opts: { sourceRef: string; viewport: { width: number; height: number } },
                    ) => unknown;
                  }
                ).__designbookWalkDocument;
                return walk(document, { sourceRef: ref, viewport: { width, height: 1600 } });
              },
              { ref: url, script: PAGE_SCRIPT, width: bp.width },
            )) as CapturedSource;
            out.push({ name: bp.name, source });
          }
          resolveOuter(out);
        } finally {
          await context.close().catch(() => {});
        }
      })().catch(rejectOuter);
    });

    const merged = breakpoints.length > 0 ? mergeBreakpointTrees(captures) : captures[0]!.source;
    await writeFile(outPath, JSON.stringify(merged, null, 2));
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    await browser.close().catch(() => {});
  }
}
