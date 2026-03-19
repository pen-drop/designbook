/**
 * Runtime Renderer — sync, recursive, framework-agnostic.
 *
 * Traverses ComponentNode[] trees at browser runtime.
 * The only framework-specific point is ComponentModule.render() at each leaf.
 *
 * Runs in the browser after args.__scene has been set at build time.
 * Works with Storybook Controls because args.__scene is the data — modifiable at runtime.
 */

import type { ComponentNode, ComponentModule } from './types';

/**
 * Render a ComponentNode tree to the framework's native output
 * (React element, Vue vnode, HTML string, etc.).
 *
 * @param nodes - Single node or array of nodes to render
 * @param imports - Map of component ID → ComponentModule (from __imports)
 * @returns Framework-specific output. Multiple string results are concatenated (HTML framework).
 */
export function renderComponent(
  nodes: ComponentNode | ComponentNode[],
  imports: Record<string, ComponentModule>,
): unknown {
  const nodeArray = Array.isArray(nodes) ? nodes : [nodes];

  const rendered = nodeArray.map((node) => renderNode(node, imports));

  if (rendered.length === 1) return rendered[0];

  // If all results are strings (HTML/Twig framework), concatenate into one HTML string
  if (rendered.every((r) => typeof r === 'string')) {
    return (rendered as string[]).join('');
  }

  return rendered;
}

function renderNode(node: ComponentNode, imports: Record<string, ComponentModule>): unknown {
  const mod = imports[node.component];

  if (!mod) {
    console.warn(`[Designbook] renderComponent: no module for "${node.component}"`);
    return null;
  }

  const props = node.props ?? {};
  const slots = resolveSlots(node.slots ?? {}, imports);

  return mod.render(props, slots);
}

function resolveSlots(
  slots: Record<string, ComponentNode | ComponentNode[] | string>,
  imports: Record<string, ComponentModule>,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(slots)) {
    if (typeof value === 'string') {
      // Render unresolved $variable placeholders as a visible grey box
      if (/^\$\w+$/.test(value)) {
        resolved[key] =
          `<div style="border:1px dashed #ccc;border-radius:4px;padding:8px 12px;color:#999;font-size:11px;font-family:monospace;">${value}</div>`;
      } else {
        resolved[key] = value;
      }
    } else if (Array.isArray(value)) {
      resolved[key] = value.map((item) => renderNode(item, imports));
    } else {
      resolved[key] = renderNode(value, imports);
    }
  }

  return resolved;
}
