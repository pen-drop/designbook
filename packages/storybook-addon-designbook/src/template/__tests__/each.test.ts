import { describe, it, expect } from 'vitest';
import { resolveEach } from '../each.js';

describe('resolveEach', () => {
  it('binds single-axis iteration', async () => {
    const each = { check: 'checks' };
    const scope = { checks: [{ story_id: 'a' }, { story_id: 'b' }] };
    expect(await resolveEach(each, scope)).toEqual([
      { check: { story_id: 'a' }, $i: 0, $total: 2 },
      { check: { story_id: 'b' }, $i: 1, $total: 2 },
    ]);
  });

  it('binds nested lookup (replaces singularize)', async () => {
    const each = { variant: 'component.variants' };
    const scope = { component: { variants: [{ id: 'main' }, { id: 'footer' }] } };
    const result = await resolveEach(each, scope);
    expect(result.map((r) => (r.variant as { id: string }).id)).toEqual(['main', 'footer']);
  });

  it('produces cross-product for multiple bindings', async () => {
    const each = { variant: 'variants', bp: 'breakpoints' };
    const scope = { variants: [{ id: 'main' }], breakpoints: ['sm', 'xl'] };
    const result = await resolveEach(each, scope);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ variant: { id: 'main' }, bp: 'sm' });
    expect(result[1]).toMatchObject({ variant: { id: 'main' }, bp: 'xl' });
  });

  it('supports filter expressions', async () => {
    const each = { v: 'variants[published = true]' };
    const scope = {
      variants: [
        { id: 'a', published: true },
        { id: 'b', published: false },
      ],
    };
    const result = await resolveEach(each, scope);
    expect(result).toHaveLength(1);
    expect((result[0]!.v as { id: string }).id).toBe('a');
  });

  it('accepts long form with schema', async () => {
    const each = { check: { expr: 'checks', schema: { $ref: '…/Check' } } };
    const scope = { checks: [{ story_id: 'a' }] };
    const result = await resolveEach(each, scope);
    expect(result[0]!.check).toEqual({ story_id: 'a' });
  });

  it('returns [] when expression yields undefined/null', async () => {
    expect(await resolveEach({ x: 'missing' }, {})).toEqual([]);
  });

  it('wraps scalar result into a single-item axis (JSONata singleton unwrapping)', async () => {
    expect(await resolveEach({ x: 'scalar' }, { scalar: 'hi' })).toEqual([{ x: 'hi', $i: 0, $total: 1 }]);
  });
});
