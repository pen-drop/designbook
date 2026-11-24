// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

vi.mock('virtual:designbook-themes', () => ({ themes: {}, defaultTheme: 'light' }));

import { isVueVNode, isVueRenderable } from '../preview';

describe('isVueVNode', () => {
  it('returns true for an object stamped with __v_isVNode', () => {
    expect(isVueVNode({ __v_isVNode: true, type: 'div' })).toBe(true);
  });

  it('returns false for a plain object', () => {
    expect(isVueVNode({ type: 'div' })).toBe(false);
  });

  it('returns false for a string, null, and undefined', () => {
    expect(isVueVNode('<div></div>')).toBe(false);
    expect(isVueVNode(null)).toBe(false);
    expect(isVueVNode(undefined)).toBe(false);
  });

  it('returns false for a DOM node', () => {
    expect(isVueVNode(document.createElement('div'))).toBe(false);
  });
});

describe('isVueRenderable', () => {
  it('returns true for a single vnode', () => {
    expect(isVueRenderable({ __v_isVNode: true })).toBe(true);
  });

  it('returns true for an array containing at least one vnode', () => {
    expect(isVueRenderable(['plain-html', { __v_isVNode: true }])).toBe(true);
  });

  it('returns false for an array of non-vnode values', () => {
    expect(isVueRenderable(['<div></div>', 42])).toBe(false);
  });

  it('returns false for a plain HTML string', () => {
    expect(isVueRenderable('<div></div>')).toBe(false);
  });
});
