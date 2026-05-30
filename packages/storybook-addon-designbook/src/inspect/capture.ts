import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PAGE_SCRIPT } from './element-walker.js';

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
 * Launch headless chromium, navigate to `url`, wait for the page to settle,
 * evaluate the walker in-page, and write the CapturedSource JSON to `outPath`.
 * Throws if playwright is not installed or the page is unreachable — callers
 * are expected to catch and degrade gracefully.
 */
export async function capture(url: string, outPath: string): Promise<void> {
  const totalTimeoutMs = parseTimeoutMs();
  await mkdir(dirname(outPath), { recursive: true });

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolveOuter, rejectOuter) => {
      timeoutHandle = setTimeout(() => {
        rejectOuter(new Error(`capture timed out after ${totalTimeoutMs}ms`));
        browser.close().catch(() => {});
      }, totalTimeoutMs);

      (async () => {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1600 } });
        const page = await context.newPage();
        try {
          await page.goto(url);
          await waitForReady(page, totalTimeoutMs);
          const vp = page.viewportSize() ?? { width: 1440, height: 1600 };
          const result = await page.evaluate(
            ({
              ref,
              script,
              viewport,
            }: {
              ref: string;
              script: string;
              viewport: { width: number; height: number };
            }) => {
              eval(script);
              // PAGE_SCRIPT assigns the walker to a fixed global. We must NOT
              // reference a bare `walkDocument` identifier here: the bundler
              // renames the real function (collision avoidance) and the eval'd
              // definition would no longer match a hardcoded call-site name.
              // Going through globalThis under a stable key is rename-proof.
              const walk = (
                globalThis as unknown as {
                  __designbookWalkDocument: (
                    doc: Document,
                    opts: { sourceRef: string; viewport: { width: number; height: number } },
                  ) => unknown;
                }
              ).__designbookWalkDocument;
              return walk(document, { sourceRef: ref, viewport });
            },
            { ref: url, script: PAGE_SCRIPT, viewport: vp },
          );
          await writeFile(outPath, JSON.stringify(result, null, 2));
          resolveOuter();
        } finally {
          await context.close().catch(() => {});
        }
      })().catch(rejectOuter);
    });
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    await browser.close().catch(() => {});
  }
}
