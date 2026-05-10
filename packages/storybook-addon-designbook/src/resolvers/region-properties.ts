import { existsSync, mkdirSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
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

async function runWalker(url: string, outPath: string): Promise<void> {
  await mkdir(dirname(outPath), { recursive: true });
  const walkerPath = joinPath(process.cwd(), '.agents/skills/designbook/design/resources/element-walker.js');
  const env = {
    ...process.env,
    DESIGNBOOK_WALKER_OUT: outPath,
    DESIGNBOOK_WALKER_SOURCE_REF: url,
  };

  await new Promise<void>((resolveProc, rejectProc) => {
    const child = spawn(
      'sh',
      [
        '-c',
        `npx playwright-cli open && \
         npx playwright-cli goto "${url}" && \
         npx playwright-cli resize 1440 1600 && \
         npx playwright-cli run-code "$(cat "${walkerPath}")" && \
         npx playwright-cli close`,
      ],
      { env, stdio: 'inherit' },
    );
    child.on('exit', (code) => (code === 0 ? resolveProc() : rejectProc(new Error(`walker exit ${code}`))));
    child.on('error', rejectProc);
  });
}

function pickRegionLabel(params: Record<string, unknown>): string {
  const componentId = getNested(params, ['component', 'id']);
  if (typeof componentId === 'string' && componentId) return componentId;
  const sectionId = getNested(params, ['section', 'id']);
  if (typeof sectionId === 'string' && sectionId) return sectionId;
  const scenePath = params['scene_path'];
  if (typeof scenePath === 'string' && scenePath) {
    return (
      scenePath
        .replace(/\.[^/.]+$/, '')
        .split('/')
        .pop() ?? ''
    );
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
  const out: PropertyNode[] = [root];
  const stack: string[] = [rootId];
  while (stack.length) {
    const parent = stack.pop()!;
    const children = byParent.get(parent) ?? [];
    for (const child of children) {
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
      try {
        mkdirSync(elementTreeDir, { recursive: true });
        await runWalker(url, sourcePath);
      } catch (error) {
        console.warn(`[region-properties] walker failed: ${(error as Error).message}`);
        return { resolved: true, value: undefined, input: url };
      }
    }

    let captured: CapturedSource;
    try {
      captured = JSON.parse(await readFile(sourcePath, 'utf8')) as CapturedSource;
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
