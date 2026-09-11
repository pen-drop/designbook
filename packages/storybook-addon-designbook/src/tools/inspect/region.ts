import type { CapturedSource, PropertyNode } from './element-walker.js';

export interface RegionProperties {
  matched_via: 'role' | 'heading' | 'label' | 'bbox' | 'none';
  root_id?: string;
  nodes: PropertyNode[];
}

const ROLE_HINTS: Array<{ pattern: RegExp; role: string }> = [
  { pattern: /^(site_)?header$|^banner$/i, role: 'banner' },
  { pattern: /^(site_)?footer$|^contentinfo$/i, role: 'contentinfo' },
  { pattern: /^(main|content)$/i, role: 'main' },
  { pattern: /(nav|navigation|menu)/i, role: 'navigation' },
  { pattern: /^(form|search)/i, role: 'form' },
];

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

export function pickRegionLabel(params: Record<string, unknown>): string {
  const componentName = getNested(params, ['component', 'component']);
  if (typeof componentName === 'string' && componentName) return componentName;
  const componentId = getNested(params, ['component', 'id']);
  if (typeof componentId === 'string' && componentId) return componentId;
  const sectionId = getNested(params, ['section', 'id']);
  if (typeof sectionId === 'string' && sectionId) return sectionId;
  const scenePath = params['scene_path'];
  if (typeof scenePath === 'string' && scenePath) {
    const segments = scenePath.split('/').filter(Boolean);
    if (segments[0] === 'sections' && segments.length >= 2) {
      return segments[1] ?? '';
    }
    if (segments[0] === 'design-system') {
      return 'shell';
    }
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
 * When a heading element (<h1>-<h6>) wins the match, return its enclosing
 * region instead — otherwise the subtree contains only the heading line and
 * loses the section content. Walks up via parent_id until a section, a
 * role-bearing container, or main landmark is reached.
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

function byLargestArea(a: PropertyNode, b: PropertyNode): number {
  const areaA = a.bbox.width * a.bbox.height;
  const areaB = b.bbox.width * b.bbox.height;
  if (areaA !== areaB) return areaB - areaA;
  return a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x;
}

export function locateRegion(captured: CapturedSource, label: string): RegionProperties {
  const normalized = label.toLowerCase().replace(/[-_]/g, ' ').trim();

  // 1. Role match
  for (const hint of ROLE_HINTS) {
    if (hint.pattern.test(label)) {
      const candidates = captured.nodes.filter((n) => n.role === hint.role).sort(byLargestArea);
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
    .sort(byLargestArea)[0];
  if (headingHit) {
    const root = headingHit.kind === 'heading' ? promoteToContainer(captured, headingHit) : headingHit;
    return { matched_via: 'heading', root_id: root.id, nodes: descendantsOf(captured, root.id) };
  }

  // 3. Label match
  const labelHit = captured.nodes
    .filter((n) => n.label.toLowerCase().replace(/[-_]/g, ' ') === normalized)
    .sort(byLargestArea)[0];
  if (labelHit) {
    return { matched_via: 'label', root_id: labelHit.id, nodes: descendantsOf(captured, labelHit.id) };
  }

  // 4. Bbox / reading-order fallback intentionally not implemented in v1.
  return { matched_via: 'none', nodes: [] };
}
