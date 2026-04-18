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
});
