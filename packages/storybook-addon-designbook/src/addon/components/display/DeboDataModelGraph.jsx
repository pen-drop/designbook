import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { styled } from 'storybook/theming';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force';
import { DeboBadge } from '../ui/DeboBadge.jsx';
import { ENTITY_BADGE_COLORS } from './entityColors.js';
import { buildDataModelGraph, directNeighborIds, filterDataModelGraph } from './data-model-graph.js';

const NODE_W = 180;
const NODE_H = 56;
const HW = NODE_W / 2;
const HH = NODE_H / 2;
const PADDING = 40;
const CURVE_SPREAD = 40;
const DRAG_THRESHOLD = 5;
const DIM_OPACITY = 0.3;
const ZOOM_STEP = 1.1;
const ZOOM_RANGE = 20;

const Viewport = styled.div(({ theme }) => ({
  position: 'relative',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: theme.appBorderRadius,
  background: theme.background.content,
  color: theme.textMutedColor,
  height: 'min(70vh, 640px)',
  minHeight: 320,
}));

const ZoomBar = styled.div({
  position: 'absolute',
  top: 8,
  right: 8,
  display: 'flex',
  gap: 4,
  zIndex: 1,
});

const ZoomButton = styled.button(({ theme }) => ({
  minWidth: 28,
  padding: '4px 8px',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: theme.appBorderRadius,
  background: theme.background.app,
  color: theme.color.defaultText,
  fontFamily: theme.typography.fonts.base,
  fontSize: 13,
  cursor: 'pointer',
  '&:focus-visible': { outline: `2px solid ${theme.color.secondary}`, outlineOffset: 2 },
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
  cursor: 'grab',
  '&:active': { cursor: 'grabbing' },
  touchAction: 'none',
  textAlign: 'left',
  '&[aria-pressed="true"]': { borderColor: theme.color.secondary, boxShadow: `0 0 0 1px ${theme.color.secondary}` },
  '&:hover': { borderColor: theme.color.secondary },
  '&:focus-visible': { outline: `2px solid ${theme.color.secondary}`, outlineOffset: 2 },
}));

const NodeTitle = styled.span({
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const DetailsBar = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minHeight: 28,
  marginTop: 8,
  fontSize: 13,
  color: theme.textMutedColor,
}));

const DetailsButton = styled.button(({ theme }) => ({
  padding: '4px 12px',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: theme.appBorderRadius,
  background: 'transparent',
  color: theme.color.defaultText,
  fontFamily: theme.typography.fonts.base,
  fontSize: 13,
  cursor: 'pointer',
  '&:focus-visible': { outline: `2px solid ${theme.color.secondary}`, outlineOffset: 2 },
}));

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

/** Force positions: a stopped simulation advanced a fixed number of ticks on fresh objects. */
function positionNodes(graph) {
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
  return nodes.map(({ id, x, y }) => ({ id, x, y }));
}

/** Edge paths for the current node positions; `positions` maps node id to `{ x, y }`. */
function edgeGeometry(links, positions) {
  // Parallel and reciprocal links share an unordered pair; spread them over distinct curves.
  const pairs = new Map();
  for (const l of links) {
    const key = [l.source, l.target].sort().join('|');
    pairs.set(key, [...(pairs.get(key) || []), l]);
  }

  return links.map((l) => {
    const s = positions.get(l.source);
    const t = positions.get(l.target);
    const key = [l.source, l.target].sort().join('|');
    const group = pairs.get(key);
    const index = group.indexOf(l);
    if (l.source === l.target) {
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
}

/** Initial layout `{ nodes, viewBox }`, viewBox as `[minX, minY, width, height]` around nodes and edges. */
function layout(graph) {
  const nodes = positionNodes(graph);
  const edges = edgeGeometry(graph.links, new Map(nodes.map((n) => [n.id, n])));
  const xs = [...nodes.flatMap((n) => [n.x - HW, n.x + HW]), ...edges.flatMap((e) => e.points.map((p) => p.x))];
  const ys = [...nodes.flatMap((n) => [n.y - HH, n.y + HH]), ...edges.flatMap((e) => e.points.map((p) => p.y))];
  const minX = Math.min(...xs) - PADDING;
  const minY = Math.min(...ys) - PADDING;
  return { nodes, viewBox: [minX, minY, Math.max(...xs) + PADDING - minX, Math.max(...ys) + PADDING - minY] };
}

/** Client point to SVG user space through the inverse screen matrix. */
function toSvg(m, x, y) {
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

/** Zoom `box` around `(cx, cy)` by `factor`, clamped to `fit` × 1/`ZOOM_RANGE`…`ZOOM_RANGE`. */
function zoomBox(box, cx, cy, factor, fit) {
  const [minX, minY, width, height] = box;
  const nextW = width * factor;
  const fitW = fit[2];
  if (nextW < fitW / ZOOM_RANGE || nextW > fitW * ZOOM_RANGE) return box;
  return [cx - (cx - minX) * factor, cy - (cy - minY) * factor, nextW, height * factor];
}

/**
 * Graph of the visible entity types. Layout, drag positions and the focused node are kept in
 * `session` (see DeboDataModel) so they survive remounts; the parent remounts this component
 * with a new key whenever the model or the type selection changes.
 */
export function DeboDataModelGraph({ data, selectedTypes, session = {}, onSelect }) {
  const markerId = `debo-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const svgRef = useRef(null);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const graph = useMemo(() => {
    const full = buildDataModelGraph(data);
    return selectedTypes ? filterDataModelGraph(full, selectedTypes) : full;
  }, [data, selectedTypes]);
  const [view] = useState(() => {
    if (!graph.nodes.length) return null;
    if (!session.layout) session.layout = layout(graph);
    return session.layout;
  });
  const [positions, setPositions] = useState(() => new Map(view?.nodes.map((n) => [n.id, { x: n.x, y: n.y }])));
  const [viewBox, setViewBox] = useState(() => view?.viewBox.slice() ?? null);
  const [focusedId, setFocusedIdState] = useState(() =>
    graph.nodes.some((n) => n.id === session.focusedId) ? session.focusedId : null,
  );
  const setFocusedId = (id) => {
    session.focusedId = id;
    setFocusedIdState(id);
  };
  const edges = useMemo(() => edgeGeometry(graph.links, positions), [graph, positions]);
  const neighbors = useMemo(() => directNeighborIds(graph, focusedId), [graph, focusedId]);
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;

  useEffect(() => {
    const svg = svgRef.current;
    const fit = view?.viewBox;
    if (!svg || !fit) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      const inverse = svg.getScreenCTM()?.inverse();
      if (!inverse || ![inverse.a, inverse.d, inverse.e, inverse.f].every(Number.isFinite)) return;
      const p = toSvg(inverse, event.clientX, event.clientY);
      const factor = event.deltaY < 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
      setViewBox((box) => zoomBox(box, p.x, p.y, factor, fit));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [view]);

  if (!view || !viewBox) return <Muted>No bundles defined</Muted>;
  const [minX, minY, width, height] = viewBox;
  const fitViewBox = view.viewBox;

  const onPointerDown = (event, id) => {
    suppressClick.current = false;
    if (gesture.current || !event.isPrimary || event.button !== 0) return;
    const inverse = svgRef.current?.getScreenCTM()?.inverse();
    if (!inverse || ![inverse.a, inverse.d, inverse.e, inverse.f].every(Number.isFinite)) return;
    // Clamp to the visible SVG area, which exceeds the viewBox when the aspect ratios differ.
    const rect = svgRef.current.getBoundingClientRect();
    const tl = rect.width && rect.height ? toSvg(inverse, rect.left, rect.top) : { x: minX, y: minY };
    const br = rect.width && rect.height ? toSvg(inverse, rect.right, rect.bottom) : { x: minX + width, y: minY + height };
    gesture.current = {
      kind: 'node',
      bounds: { minX: Math.min(tl.x, minX), minY: Math.min(tl.y, minY), maxX: Math.max(br.x, minX + width), maxY: Math.max(br.y, minY + height) },
      pointerId: event.pointerId,
      id,
      client: { x: event.clientX, y: event.clientY },
      start: toSvg(inverse, event.clientX, event.clientY),
      node: positions.get(id),
      inverse,
      dragging: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPanPointerDown = (event) => {
    const tag = event.target?.tagName;
    if (event.target !== svgRef.current && tag !== 'path') return;
    suppressClick.current = false;
    if (gesture.current || !event.isPrimary || event.button !== 0) return;
    const inverse = svgRef.current?.getScreenCTM()?.inverse();
    if (!inverse || ![inverse.a, inverse.d, inverse.e, inverse.f].every(Number.isFinite)) return;
    gesture.current = {
      kind: 'pan',
      pointerId: event.pointerId,
      client: { x: event.clientX, y: event.clientY },
      startBox: viewBoxRef.current,
      inverse,
      dragging: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId) return;
    if (!g.dragging && Math.hypot(event.clientX - g.client.x, event.clientY - g.client.y) <= DRAG_THRESHOLD) return;
    g.dragging = true;
    const p = toSvg(g.inverse, event.clientX, event.clientY);
    if (g.kind === 'pan') {
      const start = toSvg(g.inverse, g.client.x, g.client.y);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      setViewBox([g.startBox[0] - dx, g.startBox[1] - dy, g.startBox[2], g.startBox[3]]);
      return;
    }
    // The whole node box stays inside the visible area, so a release can never strand it.
    const { bounds } = g;
    g.last = {
      x: Math.min(bounds.maxX - HW, Math.max(bounds.minX + HW, g.node.x + p.x - g.start.x)),
      y: Math.min(bounds.maxY - HH, Math.max(bounds.minY + HH, g.node.y + p.y - g.start.y)),
    };
    setPositions((prev) => new Map(prev).set(g.id, g.last));
  };

  const endGesture = (event) => {
    const g = gesture.current;
    if (!g || event.pointerId !== g.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture?.(g.pointerId)) event.currentTarget.releasePointerCapture(g.pointerId);
    if (!g.dragging) return;
    suppressClick.current = true;
    if (g.kind === 'node' && g.last) view.nodes = view.nodes.map((n) => (n.id === g.id ? { id: n.id, ...g.last } : n));
  };

  const onNodeClick = (event, id) => {
    event.stopPropagation();
    // Keyboard activation (detail 0) is never the tail of a drag.
    if (suppressClick.current && event.detail !== 0) {
      suppressClick.current = false;
      return;
    }
    setFocusedId(id);
  };

  const dim = (id) => (neighbors && !neighbors.has(id) ? DIM_OPACITY : 1);
  const focused = graph.nodes.find((n) => n.id === focusedId);

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === 'Escape') setFocusedId(null);
      }}
    >
      <Viewport>
        <ZoomBar>
          <ZoomButton type="button" aria-label="Zoom in" onClick={() => setViewBox((box) => zoomBox(box, box[0] + box[2] / 2, box[1] + box[3] / 2, 1 / ZOOM_STEP, fitViewBox))}>
            +
          </ZoomButton>
          <ZoomButton type="button" aria-label="Zoom out" onClick={() => setViewBox((box) => zoomBox(box, box[0] + box[2] / 2, box[1] + box[3] / 2, ZOOM_STEP, fitViewBox))}>
            −
          </ZoomButton>
          <ZoomButton type="button" aria-label="Fit" onClick={() => setViewBox(fitViewBox.slice())}>
            Fit
          </ZoomButton>
        </ZoomBar>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={viewBox.join(' ')}
          role="img"
          aria-label="Data model graph"
          onPointerDown={onPanPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          onLostPointerCapture={endGesture}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            setFocusedId(null);
          }}
        >
          <defs>
            <marker id={markerId} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
            </marker>
          </defs>
          <g>
            {edges.map((e) => {
              const incident = focusedId != null && (e.source === focusedId || e.target === focusedId);
              return (
                <path
                  key={e.id}
                  data-edge-id={e.id}
                  d={e.d}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity={incident ? 0.9 : neighbors ? 0.6 * DIM_OPACITY : 0.6}
                  strokeWidth={incident ? 2 : 1.5}
                  markerEnd={`url(#${markerId})`}
                >
                  <title>{`${e.source} → ${e.target} (${e.field})`}</title>
                </path>
              );
            })}
          </g>
          {graph.nodes.map((n) => {
            const { x, y } = positions.get(n.id);
            return (
              <foreignObject key={n.id} x={x - HW} y={y - HH} width={NODE_W} height={NODE_H} opacity={dim(n.id)}>
                <NodeButton
                  type="button"
                  data-node-id={n.id}
                  aria-label={n.id}
                  aria-pressed={focusedId === n.id}
                  title={n.id}
                  onPointerDown={(event) => onPointerDown(event, n.id)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endGesture}
                  onPointerCancel={endGesture}
                  onLostPointerCapture={endGesture}
                  onClick={(event) => onNodeClick(event, n.id)}
                  onDoubleClick={() => onSelect?.(n.id)}
                >
                  <NodeTitle>{n.title}</NodeTitle>
                  <DeboBadge color={ENTITY_BADGE_COLORS[n.type] || 'red'}>{n.type}</DeboBadge>
                </NodeButton>
              </foreignObject>
            );
          })}
        </svg>
      </Viewport>
      <DetailsBar>
        {focused ? (
          <DetailsButton type="button" onClick={() => onSelect?.(focused.id)}>
            {`Details: ${focused.id}`}
          </DetailsButton>
        ) : (
          'Click a bundle to highlight its neighbors, double-click to open it.'
        )}
      </DetailsBar>
      {graph.unresolved.length > 0 && (
        <>
          <UnresolvedHeading>Unresolved references</UnresolvedHeading>
          <UnresolvedList>
            {graph.unresolved.map((u) => (
              <li key={`${u.source}:${u.field}:${u.target}`}>
                {`${u.source} · ${u.field} → ${u.target || '(no target)'} — ${u.reason}`}
              </li>
            ))}
          </UnresolvedList>
        </>
      )}
    </div>
  );
}
