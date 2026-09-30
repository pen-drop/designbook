import React, { useId, useMemo } from 'react';
import { styled } from 'storybook/theming';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force';
import { DeboBadge } from '../ui/DeboBadge.jsx';
import { ENTITY_BADGE_COLORS } from './entityColors.js';
import { buildDataModelGraph } from './data-model-graph.js';

const NODE_W = 180;
const NODE_H = 56;
const HW = NODE_W / 2;
const HH = NODE_H / 2;
const PADDING = 40;
const CURVE_SPREAD = 40;

const Viewport = styled.div(({ theme }) => ({
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: theme.appBorderRadius,
  background: theme.background.content,
  color: theme.textMutedColor,
  height: 'min(70vh, 640px)',
  minHeight: 320,
}));

const NodeButton = styled.button(({ theme }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',
  gap: 4,
  padding: '6px 10px',
  boxSizing: 'border-box',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: theme.appBorderRadius,
  background: theme.background.app,
  color: theme.color.defaultText,
  fontFamily: theme.typography.fonts.base,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
  '&:hover': { borderColor: theme.color.secondary },
  '&:focus-visible': { outline: `2px solid ${theme.color.secondary}`, outlineOffset: 2 },
}));

const NodeTitle = styled.span({
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const Muted = styled.p(({ theme }) => ({ color: theme.textMutedColor, fontSize: 13 }));

const UnresolvedHeading = styled.h4(({ theme }) => ({
  fontSize: 13,
  fontWeight: 600,
  color: theme.textMutedColor,
  margin: '16px 0 4px',
}));

const UnresolvedList = styled.ul(({ theme }) => ({
  margin: 0,
  paddingLeft: 20,
  fontSize: 13,
  color: theme.color.defaultText,
}));

/** Point where the segment from `from` towards the box centered at `to` crosses the box border. */
function boxBorderPoint(to, from) {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  if (dx === 0 && dy === 0) return { x: to.x, y: to.y - HH };
  const t = Math.min(dx ? HW / Math.abs(dx) : Infinity, dy ? HH / Math.abs(dy) : Infinity);
  return { x: to.x + dx * t, y: to.y + dy * t };
}

/** Static layout: a stopped simulation advanced a fixed number of ticks on fresh objects. */
function layout(graph) {
  const nodes = graph.nodes.map((n) => ({ ...n }));
  const links = graph.links.map((l) => ({ ...l }));
  forceSimulation(nodes)
    .force('link', forceLink(links).id((node) => node.id).distance(220))
    .force('charge', forceManyBody().strength(-500))
    .force('center', forceCenter(0, 0))
    .force('collide', forceCollide(100))
    // forceCenter only centers the mean; weak positioning keeps unlinked bundles near the rest.
    .force('x', forceX(0).strength(0.1))
    .force('y', forceY(0).strength(0.1))
    .stop()
    .tick(300);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Parallel and reciprocal links share an unordered pair; spread them over distinct curves.
  const pairs = new Map();
  for (const l of graph.links) {
    const key = [l.source, l.target].sort().join('|');
    pairs.set(key, [...(pairs.get(key) || []), l]);
  }

  const edges = graph.links.map((l) => {
    const s = byId.get(l.source);
    const t = byId.get(l.target);
    const key = [l.source, l.target].sort().join('|');
    const group = pairs.get(key);
    const index = group.indexOf(l);
    if (s === t) {
      const k = index * 20;
      const start = { x: s.x + HW - 30, y: s.y - HH };
      const end = { x: s.x + HW, y: s.y - HH + 15 };
      const c1 = { x: start.x, y: start.y - 40 - k };
      const c2 = { x: end.x + 40 + k, y: end.y };
      return { ...l, d: `M${start.x},${start.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`, points: [start, c1, c2, end] };
    }
    // Offsets are measured against the canonical (sorted) direction so reciprocal links bend apart.
    const [a, b] = l.source < l.target ? [s, t] : [t, s];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const normal = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
    const offset = (index - (group.length - 1) / 2) * CURVE_SPREAD * 2;
    const c = { x: (s.x + t.x) / 2 + normal.x * offset, y: (s.y + t.y) / 2 + normal.y * offset };
    const start = boxBorderPoint(s, c);
    const end = boxBorderPoint(t, c);
    return { ...l, d: `M${start.x},${start.y} Q${c.x},${c.y} ${end.x},${end.y}`, points: [start, c, end] };
  });

  const xs = [...nodes.flatMap((n) => [n.x - HW, n.x + HW]), ...edges.flatMap((e) => e.points.map((p) => p.x))];
  const ys = [...nodes.flatMap((n) => [n.y - HH, n.y + HH]), ...edges.flatMap((e) => e.points.map((p) => p.y))];
  const minX = Math.min(...xs) - PADDING;
  const minY = Math.min(...ys) - PADDING;
  const viewBox = [minX, minY, Math.max(...xs) + PADDING - minX, Math.max(...ys) + PADDING - minY].join(' ');
  return { nodes, edges, viewBox };
}

export function DeboDataModelGraph({ data, onSelect }) {
  const markerId = `debo-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const graph = useMemo(() => buildDataModelGraph(data), [data]);
  const view = useMemo(() => (graph.nodes.length ? layout(graph) : null), [graph]);

  if (!view) return <Muted>No bundles defined</Muted>;

  return (
    <div>
      <Viewport>
        <svg width="100%" height="100%" viewBox={view.viewBox} role="img" aria-label="Data model graph">
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
            </marker>
          </defs>
          <g>
            {view.edges.map((e) => (
              <path
                key={e.id}
                data-edge-id={e.id}
                d={e.d}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.6}
                strokeWidth={1.5}
                markerEnd={`url(#${markerId})`}
              >
                <title>{`${e.source} → ${e.target} (${e.field})`}</title>
              </path>
            ))}
          </g>
          {view.nodes.map((n) => (
            <foreignObject key={n.id} x={n.x - HW} y={n.y - HH} width={NODE_W} height={NODE_H}>
              <NodeButton type="button" data-node-id={n.id} aria-label={n.id} title={n.id} onClick={() => onSelect?.(n.id)}>
                <NodeTitle>{n.title}</NodeTitle>
                <DeboBadge color={ENTITY_BADGE_COLORS[n.type] || 'red'}>{n.type}</DeboBadge>
              </NodeButton>
            </foreignObject>
          ))}
        </svg>
      </Viewport>
      {graph.unresolved.length > 0 && (
        <>
          <UnresolvedHeading>Unresolved references</UnresolvedHeading>
          <UnresolvedList>
            {graph.unresolved.map((u) => (
              <li key={`${u.source}:${u.field}`}>
                {`${u.source} · ${u.field} → ${u.target || '(no target)'} — ${u.reason}`}
              </li>
            ))}
          </UnresolvedList>
        </>
      )}
    </div>
  );
}
