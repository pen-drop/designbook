/**
 * Structure tab visibility gate (DESIGNBOOK-32, AC-6).
 *
 * The tab must appear for scene stories (which carry a `scene` parameter) AND
 * for entity stories (which carry per-record `sceneTrees` and no `scene`).
 * Gating on `scene` alone hid the tab on every entity story — this test locks
 * the fix so it cannot regress.
 */
import { describe, it, expect } from 'vitest';
import { isStructureTabDisabled } from '../components/panels/structure-tab-visibility';

describe('isStructureTabDisabled', () => {
  it('enables the tab for scene stories (scene param present)', () => {
    expect(isStructureTabDisabled({ scene: { id: 'homepage' } })).toBe(false);
  });

  it('enables the tab for entity stories (sceneTrees param present)', () => {
    expect(isStructureTabDisabled({ sceneTrees: [[{ component: 'x' }]] })).toBe(false);
  });

  it('disables the tab when neither scene nor sceneTrees is present', () => {
    expect(isStructureTabDisabled({})).toBe(true);
    expect(isStructureTabDisabled(undefined)).toBe(true);
    expect(isStructureTabDisabled({ entity: {} } as { scene?: unknown })).toBe(true);
  });
});
