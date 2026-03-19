/**
 * Scene YAML validator — statically walks a *.scenes.yml file and validates
 * each node against a registry of known scene node types.
 *
 * Flexible: extend BUILTIN_NODE_VALIDATORS or pass a custom list to
 * validateSceneFile() to register additional node shapes.
 * Unknown node types (no matching validator) are reported as errors.
 */

import { existsSync, readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import type { ValidationResult } from './types.js';

// ── Registry interface ────────────────────────────────────────────────────────

export interface SceneNodeTypeValidator {
  /** Name used in error messages. */
  name: string;
  /** Return true if this validator handles the given raw node. */
  appliesTo: (node: unknown) => boolean;
  /** Optional: deeper validation of a matching node. Returns error strings. */
  validate?: (node: unknown, path: string) => string[];
}

// ── Built-in validators ───────────────────────────────────────────────────────

/** { component: 'provider:name', props?, slots? } */
const componentValidator: SceneNodeTypeValidator = {
  name: 'component',
  appliesTo: (n) => typeof (n as Record<string, unknown>).component === 'string',
};

/** { entity: 'node.docs_page', view_mode: '...', record?: N }
 *  OR { type: 'entity', entity_type: '...', bundle: '...', view_mode: '...' } */
const entityValidator: SceneNodeTypeValidator = {
  name: 'entity',
  appliesTo: (n) => {
    const r = n as Record<string, unknown>;
    return r.type === 'entity' || typeof r.entity === 'string';
  },
};

/** { config: 'view.docs_list' } OR { type: 'config', ... } */
const configValidator: SceneNodeTypeValidator = {
  name: 'config',
  appliesTo: (n) => {
    const r = n as Record<string, unknown>;
    return r.type === 'config' || typeof r.config === 'string';
  },
};

/** { type: 'scene', ref: 'source:name', with?: Record<string, unknown> } */
const sceneRefValidator: SceneNodeTypeValidator = {
  name: 'scene',
  appliesTo: (n) => (n as Record<string, unknown>).type === 'scene',
  validate: (n, path) => {
    if (typeof (n as Record<string, unknown>).ref !== 'string') {
      return [`${path}: scene node requires 'ref' (e.g. "design-system:shell")`];
    }
    return [];
  },
};

export const BUILTIN_NODE_VALIDATORS: SceneNodeTypeValidator[] = [
  componentValidator,
  entityValidator,
  configValidator,
  sceneRefValidator,
];

// ── Walker ────────────────────────────────────────────────────────────────────

function validateNode(node: unknown, path: string, validators: SceneNodeTypeValidator[], errors: string[]): void {
  if (typeof node !== 'object' || node === null || Array.isArray(node)) {
    return; // scalar slot values (string, number, boolean) are valid
  }

  const validator = validators.find((v) => v.appliesTo(node));
  if (!validator) {
    const r = node as Record<string, unknown>;
    const hint = r.type ? `type: "${r.type}"` : `keys: [${Object.keys(r).join(', ')}]`;
    errors.push(`${path}: unknown scene node (${hint}) — no registered validator matches`);
    return;
  }

  if (validator.validate) {
    errors.push(...validator.validate(node, path));
  }

  const r = node as Record<string, unknown>;

  // Recurse into slots for component nodes
  if (typeof r.component === 'string' && r.slots && typeof r.slots === 'object') {
    walkSlots(r.slots as Record<string, unknown>, `${path}.slots`, validators, errors);
  }

  // Recurse into `with` overrides for scene ref nodes
  if (r.type === 'scene' && r.with && typeof r.with === 'object') {
    walkSlots(r.with as Record<string, unknown>, `${path}.with`, validators, errors);
  }
}

function walkSlots(
  slots: Record<string, unknown>,
  path: string,
  validators: SceneNodeTypeValidator[],
  errors: string[],
): void {
  for (const [key, value] of Object.entries(slots)) {
    const slotPath = `${path}.${key}`;
    if (Array.isArray(value)) {
      value.forEach((item, i) => validateNode(item, `${slotPath}[${i}]`, validators, errors));
    } else if (typeof value === 'object' && value !== null) {
      validateNode(value, slotPath, validators, errors);
    }
    // string / number / boolean → valid scalar, skip
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function validateSceneFile(
  file: string,
  validators: SceneNodeTypeValidator[] = BUILTIN_NODE_VALIDATORS,
): ValidationResult {
  if (!existsSync(file)) {
    return { valid: false, errors: [`File not found: ${file}`], warnings: [] };
  }

  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(file, 'utf-8'));
  } catch (err) {
    return { valid: false, errors: [`YAML parse error: ${(err as Error).message}`], warnings: [] };
  }

  const root = raw as Record<string, unknown>;
  if (!Array.isArray(root.scenes)) {
    return { valid: false, errors: ['scenes must be an array'], warnings: [] };
  }

  const errors: string[] = [];

  for (let si = 0; si < root.scenes.length; si++) {
    const scene = root.scenes[si] as Record<string, unknown>;
    const scenePath = `scenes[${si}]`;

    if (!Array.isArray(scene.items)) continue;

    for (let ii = 0; ii < scene.items.length; ii++) {
      validateNode(scene.items[ii], `${scenePath}.items[${ii}]`, validators, errors);
    }
  }

  return { valid: errors.length === 0, errors, warnings: [] };
}
