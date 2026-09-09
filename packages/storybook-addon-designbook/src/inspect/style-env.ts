/** One `@font-face` rule's declared binaries, resolved to absolute URLs. */
export interface FontFaceSource {
  family: string;
  weight?: string;
  style?: string;
  /** Absolute `src` URLs in declaration order, first is the preferred format. */
  urls: string[];
}

export interface StyleEnv {
  root_vars: Record<string, string>;
  fonts: { family: string; loaded: boolean }[];
  /**
   * Every `@font-face` rule found in the document's own stylesheets. Capture
   * rules require the binaries of each non-system font, and this is the only
   * place those URLs exist — a computed `font-family` names a family, never a
   * file.
   */
  font_faces: FontFaceSource[];
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
          // Read the @font-face rules themselves: this is where the binaries
          // are named. Cross-origin sheets throw on cssRules and are skipped.
          const unquoteAll = (s: string) => s.replace(/^["']|["']$/g, '').trim();
          const font_faces: { family: string; weight?: string; style?: string; urls: string[] }[] = [];
          const seenFace = new Set<string>();
          for (const sheet of Array.from(document.styleSheets)) {
            let rules: CSSRuleList;
            try {
              rules = sheet.cssRules;
            } catch {
              continue; // cross-origin stylesheet — not readable, not our font
            }
            for (const rule of Array.from(rules)) {
              const face = rule as CSSStyleRule;
              if (rule.constructor.name !== 'CSSFontFaceRule' && !face.style?.getPropertyValue('src')) continue;
              const src = face.style.getPropertyValue('src');
              if (!src) continue;
              const family = unquoteAll(face.style.getPropertyValue('font-family'));
              const urls: string[] = [];
              for (const match of src.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/g)) {
                try {
                  urls.push(new URL(match[2]!, sheet.href || document.baseURI).href);
                } catch {
                  /* unresolvable src — omit rather than record a broken URL */
                }
              }
              if (!family || !urls.length) continue;
              const key = `${family}|${urls.join(',')}`;
              if (seenFace.has(key)) continue;
              seenFace.add(key);
              font_faces.push({
                family,
                weight: face.style.getPropertyValue('font-weight') || undefined,
                style: face.style.getPropertyValue('font-style') || undefined,
                urls,
              });
            }
          }
          return { root_vars, fonts: fontResults, font_faces };
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
