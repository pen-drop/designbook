import type { BBox, CapturedSource, CapturedSourceStyle, PropertyNode, StyleOverride } from './element-walker.js';

export interface BreakpointCapture {
  name: string;
  source: CapturedSource;
}

const STYLE_KEYS: (keyof CapturedSourceStyle)[] = [
  'layout',
  'main_axis_align',
  'cross_axis_align',
  'gap',
  'padding',
  'margin',
  'border',
  'border_radius',
  'background',
  'foreground',
  'font_family',
  'font_size',
  'font_weight',
  'line_height',
  'letter_spacing',
  'text_transform',
];

function styleDiff(base: CapturedSourceStyle, other: CapturedSourceStyle): Partial<CapturedSourceStyle> {
  const diff: Partial<CapturedSourceStyle> = {};
  for (const k of STYLE_KEYS) {
    if (other[k] !== base[k]) {
      // @ts-expect-error — key-indexed copy across a union-valued record
      diff[k] = other[k];
    }
  }
  return diff;
}

/**
 * Merge per-breakpoint captures into one mobile-first CapturedSource. Input MUST
 * be ascending by width (smallest first). Nodes align by `source.locator`
 * (dom_path). The smallest breakpoint is the base; larger breakpoints add
 * `overrides[bp]` (style diffs + visibility). A node missing at a breakpoint is
 * `hidden` there; a node missing from the base appears with `overrides[base].hidden`.
 */
export function mergeBreakpointTrees(captures: BreakpointCapture[]): CapturedSource {
  const base = captures[0]!;
  const baseSource = base.source;

  // Single breakpoint → pass through, just stamp base_breakpoint.
  if (captures.length === 1) {
    return { ...baseSource, base_breakpoint: base.name };
  }

  // Index every breakpoint's nodes by dom_path.
  const byBp = captures.map((c) => {
    const map = new Map<string, PropertyNode>();
    for (const n of c.source.nodes) map.set(n.source.locator, n);
    return { name: c.name, map };
  });
  const baseMap = byBp[0]!.map;

  // Union of dom_paths, base order first then any later-only nodes in encounter order.
  const order: string[] = [];
  const seen = new Set<string>();
  for (const c of byBp) {
    for (const locator of c.map.keys()) {
      if (!seen.has(locator)) {
        seen.add(locator);
        order.push(locator);
      }
    }
  }

  const mergedNodes: PropertyNode[] = order.map((locator) => {
    // Canonical node = base node if present, else its first appearance.
    const firstBp = byBp.find((c) => c.map.has(locator))!;
    const canonical = baseMap.get(locator) ?? firstBp.map.get(locator)!;
    const node: PropertyNode = { ...canonical };
    const overrides: Record<string, StyleOverride> = {};

    const presentInBase = baseMap.has(locator);
    if (!presentInBase) {
      // Hidden at base (mobile); style carried from first appearance.
      overrides[base.name] = { hidden: true };
    }

    for (let i = 1; i < byBp.length; i++) {
      const bp = byBp[i]!;
      const here = bp.map.get(locator);
      if (!here) {
        if (presentInBase) overrides[bp.name] = { hidden: true };
        continue;
      }
      const ov: StyleOverride = {};
      if (!presentInBase) ov.hidden = false; // revealed relative to mobile base
      const sd = styleDiff(node.style, here.style);
      if (Object.keys(sd).length > 0) ov.style = sd;
      if (bboxChanged(node.bbox, here.bbox)) ov.bbox = here.bbox;
      if (ov.hidden !== undefined || ov.style || ov.bbox) overrides[bp.name] = ov;
    }

    if (Object.keys(overrides).length > 0) node.overrides = overrides;
    return node;
  });

  return { ...baseSource, base_breakpoint: base.name, nodes: mergedNodes };
}

function bboxChanged(a: BBox, b: BBox): boolean {
  return a.width !== b.width || a.height !== b.height || a.x !== b.x || a.y !== b.y;
}
