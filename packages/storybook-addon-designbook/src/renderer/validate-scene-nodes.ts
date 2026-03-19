/**
 * Scene Node Validator — checks that a built ComponentNode tree contains only
 * valid ComponentNodes (objects with a string `component` property).
 *
 * Called after the build pipeline to catch nodes that were not fully resolved
 * (e.g. type:'entity', type:'element', or other raw scene nodes that slipped through).
 */

import type { ComponentNode } from './types';

export interface SceneValidationError {
  path: string;
  node: unknown;
  reason: string;
}

/**
 * Validate a built ComponentNode tree. Returns a list of errors.
 * An empty list means the tree is valid.
 */
export function validateSceneNodes(nodes: ComponentNode[], path = '__scene'): SceneValidationError[] {
  const errors: SceneValidationError[] = [];
  walkNodes(nodes, path, errors);
  return errors;
}

function walkNodes(nodes: ComponentNode[], path: string, errors: SceneValidationError[]): void {
  for (let i = 0; i < nodes.length; i++) {
    walkNode(nodes[i]!, `${path}[${i}]`, errors);
  }
}

function walkNode(node: unknown, path: string, errors: SceneValidationError[]): void {
  if (typeof node !== 'object' || node === null) {
    errors.push({ path, node, reason: `expected ComponentNode object, got ${typeof node}` });
    return;
  }

  const n = node as Record<string, unknown>;

  if (typeof n['component'] !== 'string' || n['component'] === '') {
    errors.push({
      path,
      node,
      reason: `missing or invalid "component" property — got type:"${n['type'] ?? '(none)'}"`,
    });
    return;
  }

  // Recurse into slots
  if (n['slots'] && typeof n['slots'] === 'object') {
    const slots = n['slots'] as Record<string, unknown>;
    for (const [slotName, slotValue] of Object.entries(slots)) {
      const slotPath = `${path}.slots.${slotName}`;
      if (typeof slotValue === 'string') continue;
      if (Array.isArray(slotValue)) {
        walkNodes(slotValue as ComponentNode[], slotPath, errors);
      } else if (typeof slotValue === 'object' && slotValue !== null) {
        walkNode(slotValue, slotPath, errors);
      }
    }
  }
}
