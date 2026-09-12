import { describe, it, expect } from 'vitest';
import { mergeBreakpointTrees } from '../merge-breakpoints.js';
import type { CapturedSource, PropertyNode } from '../element-walker.js';

function node(locator: string, extra: Partial<PropertyNode> = {}): PropertyNode {
  return {
    id: `id_${locator}`,
    child_ids: [],
    label: locator,
    kind: 'container',
    bbox: { x: 0, y: 0, width: 100, height: 20 },
    style: { padding: '0', margin: '0', background: '#ffffff' },
    source: { locator },
    ...extra,
  };
}

function src(nodes: PropertyNode[]): CapturedSource {
  return { source_kind: 'url-dom', source_ref: 'u', captured_at: 't', adapter_version: 'v', nodes };
}

describe('mergeBreakpointTrees', () => {
  it('uses the smallest breakpoint as base and sets base_breakpoint', () => {
    const merged = mergeBreakpointTrees([
      { name: 'sm', source: src([node('body')]) },
      { name: 'xl', source: src([node('body')]) },
    ]);
    expect(merged.base_breakpoint).toBe('sm');
    expect(merged.nodes).toHaveLength(1);
  });

  it('records a style override where a node differs at a larger breakpoint', () => {
    const merged = mergeBreakpointTrees([
      {
        name: 'sm',
        source: src([node('nav', { style: { padding: '0', margin: '0', background: '#fff', layout: 'flex-col' } })]),
      },
      {
        name: 'xl',
        source: src([node('nav', { style: { padding: '0', margin: '0', background: '#fff', layout: 'flex-row' } })]),
      },
    ]);
    const nav = merged.nodes.find((n) => n.source.locator === 'nav')!;
    expect(nav.style.layout).toBe('flex-col'); // base = mobile
    expect(nav.overrides?.xl?.style?.layout).toBe('flex-row');
  });

  it('marks a node hidden at base when it only appears at a larger breakpoint', () => {
    const merged = mergeBreakpointTrees([
      { name: 'sm', source: src([node('body')]) },
      { name: 'xl', source: src([node('body'), node('searchbar')]) },
    ]);
    const search = merged.nodes.find((n) => n.source.locator === 'searchbar')!;
    expect(search.overrides?.sm?.hidden).toBe(true);
  });

  it('marks a node hidden at a larger breakpoint when it drops out there', () => {
    const merged = mergeBreakpointTrees([
      { name: 'sm', source: src([node('body'), node('burger')]) },
      { name: 'xl', source: src([node('body')]) },
    ]);
    const burger = merged.nodes.find((n) => n.source.locator === 'burger')!;
    expect(burger.overrides?.xl?.hidden).toBe(true);
  });

  it('passes a single breakpoint through unchanged (no overrides)', () => {
    const merged = mergeBreakpointTrees([{ name: 'sm', source: src([node('body')]) }]);
    expect(merged.base_breakpoint).toBe('sm');
    expect(merged.nodes[0]!.overrides).toBeUndefined();
  });
});
