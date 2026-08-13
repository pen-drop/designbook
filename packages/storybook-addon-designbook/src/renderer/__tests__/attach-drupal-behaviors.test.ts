import { describe, it, expect, vi, afterEach } from 'vitest';
import { attachDrupalBehaviors } from '../renderer';

type G = { Drupal?: { attachBehaviors?: (r: Element, s?: unknown) => void }; drupalSettings?: unknown };

afterEach(() => {
  delete (globalThis as unknown as G).Drupal;
  delete (globalThis as unknown as G).drupalSettings;
});

describe('attachDrupalBehaviors', () => {
  it('calls Drupal.attachBehaviors once with the root and drupalSettings', () => {
    const attach = vi.fn();
    (globalThis as unknown as G).Drupal = { attachBehaviors: attach };
    (globalThis as unknown as G).drupalSettings = { foo: 1 };
    const root = {} as HTMLElement;
    attachDrupalBehaviors(root);
    expect(attach).toHaveBeenCalledTimes(1);
    expect(attach).toHaveBeenCalledWith(root, { foo: 1 });
  });

  it('no-ops when Drupal is absent', () => {
    expect(() => attachDrupalBehaviors({} as HTMLElement)).not.toThrow();
  });

  it('no-ops when root is undefined', () => {
    const attach = vi.fn();
    (globalThis as unknown as G).Drupal = { attachBehaviors: attach };
    attachDrupalBehaviors(undefined);
    expect(attach).not.toHaveBeenCalled();
  });
});
