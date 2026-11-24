/**
 * JSONata Mapping Analyzer — extracts field→component mappings from JSONata AST.
 *
 * Walks the AST produced by jsonata(source).ast() and identifies where entity
 * field references (path expressions like `title`, `field_media.url`) are used
 * as values in the output structure, tracking which component prop or slot they
 * map to.
 */

import jsonata from 'jsonata';
import type { FieldMapping } from './types';

// ─── JSONata AST node shapes (subset we care about) ─────────────────────────

interface AstNode {
  type: string;
  value?: string | number | boolean;
  position?: number;
  steps?: AstNode[];
  lhs?: AstNode | AstNode[] | AstNode[][];
  rhs?: AstNode;
  expressions?: AstNode[];
  condition?: AstNode;
  then?: AstNode;
  else?: AstNode;
}

// ─── Extraction ──────────────────────────────────────────────────────────────

/**
 * Extract field mappings from a JSONata expression source string.
 *
 * The JSONata expression is expected to produce an array of component/entity
 * objects with `type`, `component`, `props`, and `slots` keys. Field references
 * in prop/slot values are extracted with their target component and prop/slot name.
 */
export function extractFieldMappings(source: string): FieldMapping[] {
  const expr = jsonata(source);
  const ast = expr.ast() as AstNode;
  const results: FieldMapping[] = [];
  walkExpression(ast, '', '', false, results);
  return results;
}

/**
 * Recursively walk the AST. Context tracks the current component and
 * whether we're inside props or slots.
 */
function walkExpression(
  node: AstNode,
  currentComponent: string,
  targetName: string,
  conditional: boolean,
  results: FieldMapping[],
): void {
  if (!node) return;

  // Array expression — walk each element
  if (node.type === 'unary' && node.value === '[' && node.expressions) {
    for (const expr of node.expressions) {
      walkExpression(expr, currentComponent, targetName, conditional, results);
    }
    return;
  }

  // Conditional expression: `field ? { ... }`
  if (node.type === 'condition') {
    if (node.then) walkExpression(node.then, currentComponent, targetName, true, results);
    if (node.else) walkExpression(node.else, currentComponent, targetName, conditional, results);
    return;
  }

  // Object expression `{ ... }` — this could be a component definition
  if (node.type === 'unary' && node.value === '{' && Array.isArray(node.lhs)) {
    const pairs = node.lhs as AstNode[][];
    const obj = readObjectPairs(pairs);

    // Detect component definitions: objects with "component" key
    if (obj.component) {
      const componentName = obj.component;
      // Walk props
      if (obj._propsNode) {
        walkPropsOrSlots(obj._propsNode, componentName, 'prop', conditional, results);
      }
      // Walk slots
      if (obj._slotsNode) {
        walkPropsOrSlots(obj._slotsNode, componentName, 'slot', conditional, results);
      }
      return;
    }

    // Generic object — walk all value expressions
    for (const pair of pairs) {
      if (Array.isArray(pair) && pair.length === 2) {
        walkExpression(pair[1]!, currentComponent, (pair[0]?.value as string) ?? '', conditional, results);
      }
    }
    return;
  }

  // Path expression — this is a field reference
  if (node.type === 'path' && node.steps) {
    const field = node.steps.map((s) => s.value).join('.');
    if (currentComponent && targetName) {
      results.push({
        field,
        component: currentComponent,
        target: targetName,
        type: 'prop', // Will be overridden by caller if in slots context
        conditional,
      });
    }
    return;
  }

  // Name expression (single field, no dots)
  if (node.type === 'name' && node.value && typeof node.value === 'string') {
    if (currentComponent && targetName) {
      results.push({
        field: node.value,
        component: currentComponent,
        target: targetName,
        type: 'prop',
        conditional,
      });
    }
    return;
  }
}

/**
 * Walk props or slots object pairs, extracting field references.
 */
function walkPropsOrSlots(
  node: AstNode,
  componentName: string,
  mappingType: 'prop' | 'slot',
  conditional: boolean,
  results: FieldMapping[],
): void {
  if (node.type !== 'unary' || node.value !== '{' || !Array.isArray(node.lhs)) return;

  const pairs = node.lhs as AstNode[][];
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const key = pair[0]?.value as string;
    const valueNode = pair[1]!;

    // Value is a field reference (path or name)
    if (valueNode.type === 'path' && valueNode.steps) {
      const field = valueNode.steps.map((s) => s.value).join('.');
      results.push({ field, component: componentName, target: key, type: mappingType, conditional });
    } else if (valueNode.type === 'name' && typeof valueNode.value === 'string') {
      results.push({ field: valueNode.value, component: componentName, target: key, type: mappingType, conditional });
    } else if (valueNode.type === 'unary' && valueNode.value === '{') {
      // Nested component in a slot
      walkExpression(valueNode, componentName, key, conditional, results);
    } else if (valueNode.type === 'unary' && valueNode.value === '[') {
      // Array of components in a slot
      walkExpression(valueNode, componentName, key, conditional, results);
    }
    // Static values (string, number, boolean) are ignored — no entity field involved
  }
}

/**
 * Read key-value pairs from an object AST node.
 * Returns string values for simple keys and preserves AST nodes for props/slots.
 */
function readObjectPairs(pairs: AstNode[][]): Record<string, string> & { _propsNode?: AstNode; _slotsNode?: AstNode } {
  const result: Record<string, string> & { _propsNode?: AstNode; _slotsNode?: AstNode } = {};

  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const key = pair[0]?.value as string;
    const val = pair[1]!;

    if (key === 'props' && val.type === 'unary' && val.value === '{') {
      result._propsNode = val;
    } else if (key === 'slots' && val.type === 'unary' && val.value === '{') {
      result._slotsNode = val;
    } else if (val.type === 'string' && typeof val.value === 'string') {
      result[key] = val.value;
    }
  }

  return result;
}
