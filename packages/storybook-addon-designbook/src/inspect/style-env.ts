export interface StyleEnv {
  root_vars: Record<string, string>;
  fonts: { family: string; loaded: boolean }[];
}

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Open `url` in headless chromium and read the document-global style env:
 * every `--custom-property` resolved on :root, and the load state of each
 * requested font family. Throws if playwright is unavailable or the page is
 * unreachable — callers degrade gracefully.
 */
export async function captureStyleEnv(url: string, opts: { fonts: string[] }): Promise<StyleEnv> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
      await page.goto(url);
      await page.waitForLoadState('load').catch(() => {});
      const result = await page.evaluate(
        async ({ fonts }: { fonts: string[] }) => {
          const cs = getComputedStyle(document.documentElement);
          const root_vars: Record<string, string> = {};
          for (let i = 0; i < cs.length; i++) {
            const name = cs.item(i);
            if (name.startsWith('--')) root_vars[name] = cs.getPropertyValue(name).trim();
          }
          const fontResults: { family: string; loaded: boolean }[] = [];
          for (const family of fonts) {
            try {
              await (document as Document).fonts.load(`16px "${family}"`);
            } catch {
              /* ignore — the FontFaceSet status below reports the outcome */
            }
            // NOTE: do NOT use document.fonts.check() — it returns true for a
            // family with NO @font-face rule (system fallback is always
            // "available"), so a totally-missing font stylesheet would pass.
            // Require an actual FontFace ENTRY whose status is 'loaded'. This
            // fails for both "declared but failed" and "not declared at all".
            const unquote = (s: string) => s.replace(/^["']|["']$/g, '');
            let loaded = false;
            (document as Document).fonts.forEach((face) => {
              if (face.status === 'loaded' && unquote(face.family) === family) loaded = true;
            });
            fontResults.push({ family, loaded });
          }
          return { root_vars, fonts: fontResults };
        },
        { fonts: opts.fonts },
      );
      return result;
    } finally {
      await context.close().catch(() => {});
    }
  } finally {
    void DEFAULT_TIMEOUT_MS;
    await browser.close().catch(() => {});
  }
}
