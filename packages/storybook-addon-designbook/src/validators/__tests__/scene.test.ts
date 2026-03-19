import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateSceneFile, BUILTIN_NODE_VALIDATORS } from '../scene.js';
import type { SceneNodeTypeValidator } from '../scene.js';

const fixtures = resolve(import.meta.dirname, 'fixtures', 'scene');

describe('validateSceneFile', () => {
  it('accepts a valid scenes file', () => {
    const result = validateSceneFile(resolve(fixtures, 'valid.scenes.yml'));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns error for missing file', () => {
    const result = validateSceneFile('/nonexistent/foo.scenes.yml');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not found');
  });

  it('reports unknown top-level node type', () => {
    const result = validateSceneFile(resolve(fixtures, 'unknown-type.scenes.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('unknown scene node');
    expect(result.errors[0]).toContain('foobar');
  });

  it('reports unknown node type nested in a slot', () => {
    const result = validateSceneFile(resolve(fixtures, 'unknown-in-slot.scenes.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('unknown scene node');
    expect(result.errors[0]).toContain('unknown-thing');
  });

  it('reports scene ref missing ref key', () => {
    const result = validateSceneFile(resolve(fixtures, 'scene-ref-missing-ref.scenes.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("requires 'ref'");
  });

  it('reports type:element as unknown node type', () => {
    const result = validateSceneFile(resolve(fixtures, 'element-missing-value.scenes.yml'));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('unknown scene node');
    expect(result.errors[0]).toContain('element');
  });

  it('accepts custom registered node type via extended validators', () => {
    const customValidator: SceneNodeTypeValidator = {
      name: 'custom-widget',
      appliesTo: (n) => (n as Record<string, unknown>).type === 'custom-widget',
    };
    const validators = [...BUILTIN_NODE_VALIDATORS, customValidator];
    const result = validateSceneFile(resolve(fixtures, 'unknown-type.scenes.yml'), validators);
    // 'foobar' is still unknown — custom-widget doesn't match
    expect(result.valid).toBe(false);
  });

  it('custom validator that matches all types passes unknown nodes', () => {
    const catchAllValidator: SceneNodeTypeValidator = {
      name: 'catch-all',
      appliesTo: () => true,
    };
    const result = validateSceneFile(resolve(fixtures, 'unknown-type.scenes.yml'), [catchAllValidator]);
    expect(result.valid).toBe(true);
  });
});
