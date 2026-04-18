import { describe, it, expect, vi, afterEach } from 'vitest';
import * as componentsIndex from '../../resolvers/components-index.js';
import { validateSceneAgainstInventory } from '../scene.js';

afterEach(() => vi.restoreAllMocks());

describe('validateSceneAgainstInventory', () => {
  it('passes when every component: id is in the inventory', async () => {
    vi.spyOn(componentsIndex.componentsIndexResolver, 'resolve').mockResolvedValue({
      resolved: true,
      value: [{ id: 'ns:header', import_path: 'x', story_id: 'y' }],
      input: '',
    });
    const scene = { scenes: [{ component: 'ns:header' }] };
    const r = await validateSceneAgainstInventory(scene, { config: {} as never });
    expect(r.valid).toBe(true);
  });

  it('fails when a component: id is missing from the inventory', async () => {
    vi.spyOn(componentsIndex.componentsIndexResolver, 'resolve').mockResolvedValue({
      resolved: true,
      value: [{ id: 'ns:header', import_path: 'x', story_id: 'y' }],
      input: '',
    });
    const scene = { scenes: [{ component: 'ns:logo' }] };
    const r = await validateSceneAgainstInventory(scene, { config: {} as never });
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/Unknown component "ns:logo".*Available: ns:header/);
  });

  it('fails when the resolver itself fails to resolve', async () => {
    vi.spyOn(componentsIndex.componentsIndexResolver, 'resolve').mockResolvedValue({
      resolved: false,
      input: '',
      error: 'Storybook is not running',
    });
    const scene = { scenes: [{ component: 'ns:header' }] };
    const r = await validateSceneAgainstInventory(scene, { config: {} as never });
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(['components_index resolver failed: Storybook is not running']);
  });

  it('accumulates one error per unknown component id', async () => {
    vi.spyOn(componentsIndex.componentsIndexResolver, 'resolve').mockResolvedValue({
      resolved: true,
      value: [{ id: 'ns:header', import_path: 'x', story_id: 'y' }],
      input: '',
    });
    const scene = {
      scenes: [{ component: 'ns:logo' }, { nested: { component: 'ns:button' } }, { component: 'ns:header' }],
    };
    const r = await validateSceneAgainstInventory(scene, { config: {} as never });
    expect(r.valid).toBe(false);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]).toMatch(/ns:logo/);
    expect(r.errors[1]).toMatch(/ns:button/);
  });
});
