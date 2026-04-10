/**
 * Inspect Overlay Decorator — bottom-up hover detection via comment markers.
 *
 * The renderer wraps each component's HTML output with comment markers:
 *   <!--db:s:component-id-->...<!--db:e:component-id-->
 *
 * On mouseover, this decorator walks up the DOM from the hovered element,
 * checks for a preceding db:s: comment at each level, and highlights the
 * first component boundary found. Click emits 'designbook/select-node'.
 */

import { useEffect, useState, useCallback } from 'storybook/preview-api';
import { addons } from 'storybook/preview-api';
import type { StoryContext } from 'storybook/internal/types';
import type { SceneTreeNode } from '../renderer/types';
import { EVENTS } from '../constants';

const KIND_COLORS: Record<string, string> = {
  entity: '#3b82f6', // blue
  'scene-ref': '#22c55e', // green
  component: '#9ca3af', // grey
  string: '#9ca3af', // grey
};

const OVERLAY_ATTR = 'data-designbook-inspect';

/** Build a lookup map: component ID → SceneTreeNode (first occurrence). */
function buildNodeMap(tree: SceneTreeNode[]): Map<string, SceneTreeNode> {
  const map = new Map<string, SceneTreeNode>();
  function walk(nodes: SceneTreeNode[]) {
    for (const node of nodes) {
      if (node.component && !map.has(node.component)) {
        map.set(node.component, node);
      }
      if (node.slots) {
        for (const slotNodes of Object.values(node.slots)) {
          walk(slotNodes);
        }
      }
      if (node.children) walk(node.children);
    }
  }
  walk(tree);
  return map;
}

function getNodeLabel(component: string, node: SceneTreeNode | undefined): string {
  if (!node) return component;
  switch (node.kind) {
    case 'entity':
      return `${component} — entity: ${node.entity?.entity_type}/${node.entity?.bundle}`;
    case 'scene-ref':
      return `scene: ${node.ref?.source}`;
    default:
      return component;
  }
}

/**
 * Walk up from a DOM element checking for a preceding <!--db:s:...--> comment.
 * Returns the element that is the component root and the component ID.
 */
function findComponentBoundary(
  target: HTMLElement,
  root: HTMLElement,
): { element: HTMLElement; component: string; path: string } | null {
  let el: HTMLElement | null = target;

  while (el && el !== root) {
    // Walk backwards through ALL previous siblings to handle multi-root components
    let prev: Node | null = el.previousSibling;
    while (prev) {
      // Skip whitespace text nodes
      if (prev.nodeType === Node.TEXT_NODE && !prev.textContent?.trim()) {
        prev = prev.previousSibling;
        continue;
      }

      if (prev.nodeType === Node.COMMENT_NODE) {
        // Found a db:e: end marker → we're outside that component, stop
        if (prev.textContent?.startsWith('db:e:')) break;
        // Parse "db:s:component@path" or "db:s:component"
        const match = prev.textContent?.match(/^db:s:([^@]+)(?:@(.+))?$/);
        if (match) {
          return { element: el, component: match[1]!, path: match[2] ?? '' };
        }
      }

      // Skip element siblings (multi-root: keep walking backwards)
      prev = prev.previousSibling;
    }

    el = el.parentElement;
  }

  return null;
}

let currentHighlight: { element: HTMLElement; labelEl: HTMLElement } | null = null;

function highlightElement(
  el: HTMLElement,
  component: string,
  path: string,
  node: SceneTreeNode | undefined,
  channel: ReturnType<typeof addons.getChannel>,
) {
  // Don't re-highlight the same element
  if (currentHighlight?.element === el) return;

  removeHighlight();

  const color = KIND_COLORS[node?.kind ?? 'component'] ?? '#9ca3af';
  const label = getNodeLabel(component, node);

  el.style.outline = `2px solid ${color}`;
  el.style.outlineOffset = '-2px';
  el.setAttribute(OVERLAY_ATTR, component);

  // Create label
  const labelEl = document.createElement('div');
  labelEl.setAttribute(OVERLAY_ATTR, 'label');
  labelEl.textContent = label;
  Object.assign(labelEl.style, {
    position: 'fixed',
    background: color,
    color: 'white',
    fontSize: '11px',
    fontFamily: 'Inter, sans-serif',
    padding: '2px 6px',
    borderRadius: '0 0 4px 0',
    zIndex: '10000',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  });

  // Position label at top-left of element
  const rect = el.getBoundingClientRect();
  labelEl.style.top = `${rect.top}px`;
  labelEl.style.left = `${rect.left}px`;
  document.body.appendChild(labelEl);

  currentHighlight = { element: el, labelEl };

  // Emit hover event for live highlighting in the Structure panel
  channel.emit(EVENTS.SELECT_NODE, { component, path });

  // Click handler
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    channel.emit(EVENTS.SELECT_NODE, { component, path });
    el.removeEventListener('click', onClick);
  };
  el.addEventListener('click', onClick, { once: true });
}

function removeHighlight() {
  if (!currentHighlight) return;
  const { element, labelEl } = currentHighlight;
  element.style.outline = '';
  element.style.outlineOffset = '';
  element.removeAttribute(OVERLAY_ATTR);
  labelEl.remove();
  currentHighlight = null;
}

function setupInspect(root: HTMLElement, nodeMap: Map<string, SceneTreeNode>) {
  const channel = addons.getChannel();

  const onMouseMove = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target || target === root) {
      removeHighlight();
      return;
    }

    const boundary = findComponentBoundary(target, root);
    if (boundary) {
      const node = nodeMap.get(boundary.component);
      highlightElement(boundary.element, boundary.component, boundary.path, node, channel);
    } else {
      removeHighlight();
    }
  };

  const onMouseLeave = () => {
    removeHighlight();
  };

  root.addEventListener('mousemove', onMouseMove);
  root.addEventListener('mouseleave', onMouseLeave);

  return () => {
    root.removeEventListener('mousemove', onMouseMove);
    root.removeEventListener('mouseleave', onMouseLeave);
    removeHighlight();
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withInspectOverlay(Story: any, context: StoryContext) {
  const [inspectActive, setInspectActive] = useState(false);
  const sceneTree = context.parameters?.sceneTree as SceneTreeNode[] | undefined;

  const handleInspectMode = useCallback((active: boolean) => {
    setInspectActive(active);
  }, []);

  useEffect(() => {
    const channel = addons.getChannel();
    channel.on(EVENTS.INSPECT_MODE, handleInspectMode);
    return () => {
      channel.off(EVENTS.INSPECT_MODE, handleInspectMode);
    };
  }, [handleInspectMode]);

  useEffect(() => {
    const root = document.getElementById('storybook-root') ?? document.getElementById('root');
    if (!root || !inspectActive || !sceneTree?.length) {
      removeHighlight();
      return;
    }

    const nodeMap = buildNodeMap(sceneTree);

    // Small delay to ensure story has rendered with comment markers
    let cleanup: (() => void) | undefined;
    const timer = setTimeout(() => {
      cleanup = setupInspect(root, nodeMap);
    }, 50);

    return () => {
      clearTimeout(timer);
      cleanup?.();
      removeHighlight();
    };
  }, [inspectActive, sceneTree]);

  return Story(context);
}
