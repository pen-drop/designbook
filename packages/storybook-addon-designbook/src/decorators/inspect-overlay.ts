/**
 * Inspect Overlay Decorator — draws type-colored outlines around top-level scene nodes.
 *
 * Listens for 'designbook/inspect-mode' channel events.
 * When active, wraps each top-level rendered element with a colored border.
 * Click on a node emits 'designbook/select-node' with the node index.
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

function getNodeLabel(node: SceneTreeNode): string {
  switch (node.kind) {
    case 'entity':
      return `${node.component} — entity: ${node.entity?.entity_type}/${node.entity?.bundle}`;
    case 'scene-ref':
      return `scene: ${node.ref?.source}`;
    case 'component':
      return node.component ?? 'component';
    default:
      return node.kind;
  }
}

function applyOverlay(container: HTMLElement, sceneTree: SceneTreeNode[]) {
  // Get the direct children of the story root that correspond to top-level nodes
  const children = Array.from(container.children).filter((el) => !el.hasAttribute(OVERLAY_ATTR)) as HTMLElement[];

  const channel = addons.getChannel();

  // Match top-level SceneTree nodes to rendered children
  // Scene-refs flatten their children, so we need to account for that
  let childIdx = 0;
  for (let treeIdx = 0; treeIdx < sceneTree.length && childIdx < children.length; treeIdx++) {
    const node = sceneTree[treeIdx]!;
    const color = KIND_COLORS[node.kind] ?? '#9ca3af';

    if (node.kind === 'scene-ref' && node.children) {
      // Scene-ref flattens — skip as many children as it has
      for (let i = 0; i < node.children.length && childIdx < children.length; i++) {
        wrapChild(children[childIdx]!, color, getNodeLabel(node), treeIdx, channel);
        childIdx++;
      }
    } else {
      wrapChild(children[childIdx]!, color, getNodeLabel(node), treeIdx, channel);
      childIdx++;
    }
  }
}

function wrapChild(
  el: HTMLElement,
  color: string,
  label: string,
  index: number,
  channel: ReturnType<typeof addons.getChannel>,
) {
  el.style.outline = `2px solid ${color}`;
  el.style.outlineOffset = '-2px';
  el.style.position = 'relative';
  el.style.cursor = 'pointer';
  el.setAttribute(OVERLAY_ATTR, String(index));

  // Create label element
  const labelEl = document.createElement('div');
  labelEl.setAttribute(OVERLAY_ATTR, 'label');
  labelEl.textContent = label;
  Object.assign(labelEl.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    background: color,
    color: 'white',
    fontSize: '11px',
    fontFamily: 'Inter, sans-serif',
    padding: '2px 6px',
    borderRadius: '0 0 4px 0',
    zIndex: '1000',
    pointerEvents: 'none',
    opacity: '0',
    transition: 'opacity 0.15s',
  });
  el.appendChild(labelEl);

  // Show label on hover
  el.addEventListener('mouseenter', () => {
    labelEl.style.opacity = '1';
  });
  el.addEventListener('mouseleave', () => {
    labelEl.style.opacity = '0';
  });

  // Click selects node
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    channel.emit(EVENTS.SELECT_NODE, { index });
  });
}

function removeOverlay(container: HTMLElement) {
  const overlaid = container.querySelectorAll(`[${OVERLAY_ATTR}]`);
  overlaid.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.getAttribute(OVERLAY_ATTR) === 'label') {
      htmlEl.remove();
    } else {
      htmlEl.style.outline = '';
      htmlEl.style.outlineOffset = '';
      htmlEl.style.cursor = '';
      htmlEl.removeAttribute(OVERLAY_ATTR);
    }
  });
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
    // Find the story root element
    const root = document.getElementById('storybook-root') ?? document.getElementById('root');
    if (!root) return;

    if (inspectActive && sceneTree?.length) {
      // Small delay to ensure the story has rendered
      const timer = setTimeout(() => applyOverlay(root, sceneTree), 50);
      return () => {
        clearTimeout(timer);
        removeOverlay(root);
      };
    } else {
      removeOverlay(root);
    }
  }, [inspectActive, sceneTree]);

  return Story(context);
}
