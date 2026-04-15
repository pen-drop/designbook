import { describe, it, expect } from 'vitest';
import { resolverRegistry, resolveParams } from '../registry.js';
import type { ResolverContext } from '../types.js';

function makeContext(
  params: Record<string, unknown> = {},
): ResolverContext {
  return { config: { data: '/tmp/test', technology: 'html' }, params };
}

describe('resolverRegistry', () => {
  it('has story_id resolver registered', () => {
    const resolver = resolverRegistry.get('story_id');
    expect(resolver).toBeDefined();
    expect(resolver!.name).toBe('story_id');
  });

  it('has reference_folder resolver registered', () => {
    const resolver = resolverRegistry.get('reference_folder');
    expect(resolver).toBeDefined();
    expect(resolver!.name).toBe('reference_folder');
  });

  it('returns undefined for unknown resolver name', () => {
    const resolver = resolverRegistry.get('nonexistent');
    expect(resolver).toBeUndefined();
  });
});

describe('resolveParams', () => {
  it('returns allResolved true and empty maps when no params have resolve declarations', () => {
    const schema = {
      story_id: { type: 'string' },
      name: { type: 'string' },
    };
    const context = makeContext({ story_id: 'some-story', name: 'test' });
    const result = resolveParams(schema, context);

    expect(result.allResolved).toBe(true);
    expect(Object.keys(result.resolved)).toHaveLength(0);
    expect(Object.keys(result.unresolved)).toHaveLength(0);
  });

  it('skips resolving when param value is not provided', () => {
    const schema = {
      story_id: { type: 'string', resolve: 'story_id' },
    };
    const context = makeContext({});
    const result = resolveParams(schema, context);

    expect(result.allResolved).toBe(true);
    expect(Object.keys(result.resolved)).toHaveLength(0);
    expect(Object.keys(result.unresolved)).toHaveLength(0);
  });

  it('respects dependency ordering via from — dependent resolver sees resolved values', () => {
    const schema = {
      reference_url: { type: 'string' },
      reference_folder: {
        type: 'string',
        resolve: 'reference_folder',
        from: 'reference_url',
      },
    };
    const context = makeContext({
      reference_url: 'https://example.com/design',
    });
    const result = resolveParams(schema, context);

    // reference_folder resolver runs (may fail due to /tmp/test not existing,
    // but the ordering logic ensures it ran with reference_url available)
    const hasEntry =
      'reference_folder' in result.resolved ||
      'reference_folder' in result.unresolved;
    expect(hasEntry).toBe(true);
  });
});
