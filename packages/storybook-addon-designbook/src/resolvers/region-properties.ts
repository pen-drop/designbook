import { existsSync, mkdirSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve as joinPath, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

type PropertyNode = {
  id: string;
  parent_id?: string;
  child_ids: string[];
  label: string;
  kind: string;
  role?: string;
  heading_context?: string;
  bbox: { x: number; y: number; width: number; height: number };
  style: Record<string, unknown> & {
    padding: string;
    margin: string;
    background: string;
    foreground: string;
  };
  source: { locator: string; raw?: object };
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
};

type CapturedSource = {
  source_kind: string;
  source_ref: string;
  captured_at: string;
  viewport?: { width: number; height: number };
  adapter_version: string;
  nodes: PropertyNode[];
};

type RegionProperties = {
  matched_via: 'role' | 'heading' | 'label' | 'bbox' | 'none';
  root_id?: string;
  nodes: PropertyNode[];
};

const ROLE_HINTS: Array<{ pattern: RegExp; role: string }> = [
  { pattern: /^(site_)?header$|^banner$/i, role: 'banner' },
  { pattern: /^(site_)?footer$|^contentinfo$/i, role: 'contentinfo' },
  { pattern: /^(main|content)$/i, role: 'main' },
  { pattern: /(nav|navigation|menu)/i, role: 'navigation' },
  { pattern: /^(form|search)/i, role: 'form' },
];

const DEFAULT_WALKER_TIMEOUT_MS = 60_000;

function hashUrl(url: string): string {
  return createHash('sha256').update(url.toLowerCase().replace(/\/+$/, '')).digest('hex').slice(0, 12);
}

function referenceFolder(url: string, dataDir: string): string {
  return joinPath(dataDir, 'references', hashUrl(url));
}

function getNested(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const seg of path) {
    if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

function locateWalker(context: ResolverContext): string {
  const cfg = context.config as { workspace?: string; data?: string; 'designbook.home'?: string };
  const candidates: string[] = [];
  const walkerRel = '.agents/skills/designbook/design/resources/element-walker.js';
  if (cfg.workspace) candidates.push(joinPath(cfg.workspace, walkerRel));
  if (typeof cfg['designbook.home'] === 'string') {
    candidates.push(joinPath(cfg['designbook.home'] as string, walkerRel));
  }
  candidates.push(joinPath(process.cwd(), walkerRel));
  if (cfg.data) candidates.push(joinPath(cfg.data, '..', walkerRel));
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0] ?? joinPath(process.cwd(), walkerRel);
}

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
  console.warn(`[region-properties] URL never stabilized within ${totalBudgetMs}ms; walking current DOM`);
}

async function runWalker(url: string, outPath: string, walkerPath: string): Promise<void> {
  const totalTimeoutMs = parseTimeoutMs();

  // Read PAGE_SCRIPT from the walker module dynamically. Use file:// URL
  // because walkerPath may be outside the package's tsconfig rootDir.
  const walkerModUrl = pathToFileURL(walkerPath).href;
  const walkerMod = (await import(walkerModUrl)) as { PAGE_SCRIPT: string };
  const pageScript = walkerMod.PAGE_SCRIPT;
  if (typeof pageScript !== 'string' || pageScript.length === 0) {
    throw new Error(`PAGE_SCRIPT not exported from ${walkerPath}`);
  }

  await mkdir(dirname(outPath), { recursive: true });

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolveOuter, rejectOuter) => {
      timeoutHandle = setTimeout(() => {
        rejectOuter(new Error(`walker timed out after ${totalTimeoutMs}ms`));
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
              // walkDocument is now in scope from PAGE_SCRIPT.
              // @ts-expect-error — walkDocument is dynamically defined.
              return walkDocument(document, { sourceRef: ref, viewport });
            },
            { ref: url, script: pageScript, viewport: vp },
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

function pickRegionLabel(params: Record<string, unknown>): string {
  // Component schema uses `component` (string id) as the canonical identifier.
  // `id` is a legacy fallback.
  const componentName = getNested(params, ['component', 'component']);
  if (typeof componentName === 'string' && componentName) return componentName;
  const componentId = getNested(params, ['component', 'id']);
  if (typeof componentId === 'string' && componentId) return componentId;
  const sectionId = getNested(params, ['section', 'id']);
  if (typeof sectionId === 'string' && sectionId) return sectionId;
  const scenePath = params['scene_path'];
  if (typeof scenePath === 'string' && scenePath) {
    const segments = scenePath.split('/').filter(Boolean);
    // sections/<id>/<id>.section.scenes.yml → use <id> from the directory segment
    if (segments[0] === 'sections' && segments.length >= 2) {
      return segments[1] ?? '';
    }
    // design-system/design-system.scenes.yml → 'shell' (anchor for the shell case)
    if (segments[0] === 'design-system') {
      return 'shell';
    }
    // Fallback: strip all extensions from the basename
    const basename = segments[segments.length - 1] ?? '';
    return basename.replace(/(\.[^./]+)+$/, '');
  }
  return '';
}

function descendantsOf(captured: CapturedSource, rootId: string): PropertyNode[] {
  const byParent = new Map<string, PropertyNode[]>();
  for (const node of captured.nodes) {
    const list = byParent.get(node.parent_id ?? '') ?? [];
    list.push(node);
    byParent.set(node.parent_id ?? '', list);
  }
  const root = captured.nodes.find((n) => n.id === rootId);
  if (!root) return [];
  const visited = new Set<string>([rootId]);
  const out: PropertyNode[] = [root];
  const stack: string[] = [rootId];
  while (stack.length) {
    const parent = stack.pop()!;
    const children = byParent.get(parent) ?? [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      out.push(child);
      stack.push(child.id);
    }
  }
  return out;
}

/**
 * When a heading-element (<h1>-<h6>) wins the match, return its enclosing
 * region instead — otherwise the subtree contains only the heading line
 * and loses the section content. Walks up via parent_id until a section,
 * container with a role, or main landmark is reached. Falls back to the
 * heading itself if no such ancestor exists.
 */
function promoteToContainer(captured: CapturedSource, hit: PropertyNode): PropertyNode {
  const byId = new Map(captured.nodes.map((n) => [n.id, n]));
  let cur: PropertyNode = hit;
  for (let depth = 0; depth < 8 && cur.parent_id; depth++) {
    const parent = byId.get(cur.parent_id);
    if (!parent) break;
    if (parent.kind === 'section' || parent.kind === 'container' || parent.role) {
      return parent;
    }
    cur = parent;
  }
  return hit;
}

function locateRegion(captured: CapturedSource, label: string): RegionProperties {
  const normalized = label.toLowerCase().replace(/[-_]/g, ' ').trim();

  // 1. Role match
  for (const hint of ROLE_HINTS) {
    if (hint.pattern.test(label)) {
      const candidates = captured.nodes
        .filter((n) => n.role === hint.role)
        .sort((a, b) => {
          // Prefer the largest visual area first (real-world sites often have
          // multiple landmark candidates — pick the one that is the actual region,
          // not a small sentinel). Fall back to reading order as tiebreaker.
          const areaA = a.bbox.width * a.bbox.height;
          const areaB = b.bbox.width * b.bbox.height;
          if (areaA !== areaB) return areaB - areaA;
          return a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x;
        });
      if (candidates[0]) {
        return {
          matched_via: 'role',
          root_id: candidates[0].id,
          nodes: descendantsOf(captured, candidates[0].id),
        };
      }
    }
  }

  // 2. Heading match
  const headingHit = captured.nodes
    .filter((n) => {
      const ctx = (n.heading_context ?? '').toLowerCase();
      const lbl = n.label.toLowerCase();
      return (normalized.length > 0 && ctx.includes(normalized)) || (normalized.length > 0 && lbl.includes(normalized));
    })
    .sort((a, b) => {
      // Prefer the largest visual area first (real-world sites often have
      // multiple landmark candidates — pick the one that is the actual region,
      // not a small sentinel). Fall back to reading order as tiebreaker.
      const areaA = a.bbox.width * a.bbox.height;
      const areaB = b.bbox.width * b.bbox.height;
      if (areaA !== areaB) return areaB - areaA;
      return a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x;
    })[0];
  if (headingHit) {
    // When the match is a heading element itself (<h1>-<h6>), promote to the
    // enclosing container/section so the returned subtree carries the
    // actual region content — not just the heading line.
    const root = headingHit.kind === 'heading' ? promoteToContainer(captured, headingHit) : headingHit;
    return {
      matched_via: 'heading',
      root_id: root.id,
      nodes: descendantsOf(captured, root.id),
    };
  }

  // 3. Label match
  const labelHit = captured.nodes
    .filter((n) => n.label.toLowerCase().replace(/[-_]/g, ' ') === normalized)
    .sort((a, b) => {
      // Prefer the largest visual area first (real-world sites often have
      // multiple landmark candidates — pick the one that is the actual region,
      // not a small sentinel). Fall back to reading order as tiebreaker.
      const areaA = a.bbox.width * a.bbox.height;
      const areaB = b.bbox.width * b.bbox.height;
      if (areaA !== areaB) return areaB - areaA;
      return a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x;
    })[0];
  if (labelHit) {
    return {
      matched_via: 'label',
      root_id: labelHit.id,
      nodes: descendantsOf(captured, labelHit.id),
    };
  }

  // 4. Bbox / reading-order fallback intentionally not implemented in v1.
  return { matched_via: 'none', nodes: [] };
}

export const regionPropertiesResolver: ParamResolver = {
  name: 'region_properties',

  async resolve(input: string, _config: Record<string, unknown>, context: ResolverContext): Promise<ResolverResult> {
    const url = input && input !== '' ? input : undefined;
    if (!url || !/^https?:\/\//i.test(url)) {
      return { resolved: true, value: undefined, input: url ?? '' };
    }

    // Prefer the workflow's already-resolved reference_folder so we share the
    // cache directory with extract-reference. Computing it locally would
    // duplicate (and potentially diverge from) reference-folder.ts's URL
    // normalization — case-sensitive paths/queries would land in a different
    // hash bucket and read the wrong cache.
    const paramRefDir = context.params.reference_folder;
    const dataDir = (context.config as { data: string }).data;
    const refDir = typeof paramRefDir === 'string' && paramRefDir ? paramRefDir : referenceFolder(url, dataDir);
    const elementTreeDir = joinPath(refDir, '.element-tree');
    const sourcePath = joinPath(elementTreeDir, 'source.json');

    if (!existsSync(sourcePath)) {
      const walkerPath = locateWalker(context);
      if (!existsSync(walkerPath)) {
        console.warn(`[region-properties] walker not found at ${walkerPath}; skipping capture`);
        return { resolved: true, value: undefined, input: url };
      }
      try {
        mkdirSync(elementTreeDir, { recursive: true });
        await runWalker(url, sourcePath, walkerPath);
      } catch (error) {
        console.warn(`[region-properties] walker failed: ${(error as Error).message}`);
        return { resolved: true, value: undefined, input: url };
      }
    }

    let captured: CapturedSource;
    try {
      captured = JSON.parse(await readFile(sourcePath, 'utf8')) as CapturedSource;
      if (!captured || !Array.isArray(captured.nodes)) {
        throw new Error('CapturedSource is missing nodes[]');
      }
    } catch (error) {
      console.warn(`[region-properties] failed to read ${sourcePath}: ${(error as Error).message}`);
      return { resolved: true, value: undefined, input: url };
    }

    const label = pickRegionLabel(context.params);
    const region = locateRegion(captured, label);
    return {
      resolved: true,
      value: region as unknown as Record<string, unknown>,
      input: url,
    };
  },
};
