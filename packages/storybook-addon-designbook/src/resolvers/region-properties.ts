import { existsSync, mkdirSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve as joinPath, dirname } from 'node:path';
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

async function runWalker(url: string, outPath: string, walkerPath: string): Promise<void> {
  await mkdir(dirname(outPath), { recursive: true });
  const walkerSource = await readFile(walkerPath, 'utf8');

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DESIGNBOOK_WALKER_OUT: outPath,
    DESIGNBOOK_WALKER_SOURCE_REF: url,
  };

  let activeChild: ChildProcess | null = null;

  function runOne(args: string[]): Promise<void> {
    return new Promise<void>((resolveProc, rejectProc) => {
      const child = spawn('npx', ['playwright-cli', ...args], { env, stdio: 'inherit' });
      activeChild = child;
      child.on('exit', (code) => {
        activeChild = null;
        if (code === 0) {
          resolveProc();
        } else {
          rejectProc(new Error(`playwright-cli ${args[0]} exit ${code}`));
        }
      });
      child.on('error', (err) => {
        activeChild = null;
        rejectProc(err);
      });
    });
  }

  const totalTimeoutMs = Number.parseInt(
    process.env.DESIGNBOOK_WALKER_TOTAL_TIMEOUT_MS ?? `${DEFAULT_WALKER_TIMEOUT_MS}`,
    10,
  );
  const effectiveTimeout =
    Number.isFinite(totalTimeoutMs) && totalTimeoutMs > 0 ? totalTimeoutMs : DEFAULT_WALKER_TIMEOUT_MS;

  const pipeline = (async () => {
    await runOne(['open']);
    try {
      await runOne(['goto', url]);
      await runOne(['resize', '1440', '1600']);
      await runOne(['run-code', walkerSource]);
    } finally {
      // Always close, even on failure.
      await runOne(['close']).catch(() => {});
    }
  })();

  await new Promise<void>((resolveAll, rejectAll) => {
    const timer = setTimeout(() => {
      try {
        activeChild?.kill('SIGKILL');
      } catch {
        // ignore
      }
      rejectAll(new Error(`walker timed out after ${effectiveTimeout}ms`));
    }, effectiveTimeout);
    pipeline.then(
      () => {
        clearTimeout(timer);
        resolveAll();
      },
      (err) => {
        clearTimeout(timer);
        rejectAll(err);
      },
    );
  });
}

function pickRegionLabel(params: Record<string, unknown>): string {
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

function locateRegion(captured: CapturedSource, label: string): RegionProperties {
  const normalized = label.toLowerCase().replace(/[-_]/g, ' ').trim();

  // 1. Role match
  for (const hint of ROLE_HINTS) {
    if (hint.pattern.test(label)) {
      const candidates = captured.nodes
        .filter((n) => n.role === hint.role)
        .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);
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
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)[0];
  if (headingHit) {
    return {
      matched_via: 'heading',
      root_id: headingHit.id,
      nodes: descendantsOf(captured, headingHit.id),
    };
  }

  // 3. Label match
  const labelHit = captured.nodes
    .filter((n) => n.label.toLowerCase().replace(/[-_]/g, ' ') === normalized)
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)[0];
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
    const type = getNested(context.params, ['vision', 'design_reference', 'type']);
    const url = input && input !== '' ? input : undefined;

    if (type !== 'url' || !url) {
      return { resolved: true, value: undefined, input: url ?? '' };
    }

    const dataDir = (context.config as { data: string }).data;
    const refDir = referenceFolder(url, dataDir);
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
