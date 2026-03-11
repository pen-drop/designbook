import { describe, it, expect, vi } from 'vitest';
import { sdcComponentRenderer } from '../builders/sdc/renderer';
import type { RenderContext, ComponentSceneNode } from '../types';

function createMockContext(overrides: Partial<RenderContext> = {}): RenderContext {
  return {
    provider: 'test_provider',
    dataModel: { content: {} },
    sampleData: {},
    designbookDir: '/tmp/test',
    renderNode: (node) => `/* rendered: ${node.type} */`,
    trackImport: (componentId) => componentId.replace(/[-:]/g, ''),
    evaluateExpression: async () => null,
    ...overrides,
  };
}

describe('sdcComponentRenderer', () => {
  it('applies to component nodes only', () => {
    expect(sdcComponentRenderer.appliesTo({ type: 'component' })).toBe(true);
    expect(sdcComponentRenderer.appliesTo({ type: 'entity' })).toBe(false);
    expect(sdcComponentRenderer.appliesTo({ type: 'custom' })).toBe(false);
  });

  it('renders a simple component with props', () => {
    const ctx = createMockContext();
    const node: ComponentSceneNode = {
      type: 'component',
      component: 'test_provider:heading',
      props: { level: 'h1' },
    };

    const result = sdcComponentRenderer.render(node, ctx);
    expect(result).toContain('test_providerheading');
    expect(result).toContain('"h1"');
  });

  it('passes component ID directly to trackImport', () => {
    const trackSpy = vi.fn((id: string) => id.replace(/[-:]/g, ''));
    const ctx = createMockContext({ trackImport: trackSpy });

    const node: ComponentSceneNode = {
      type: 'component',
      component: 'test_provider:heading',
    };

    sdcComponentRenderer.render(node, ctx);
    expect(trackSpy).toHaveBeenCalledWith('test_provider:heading');
  });

  it('throws when component has no provider prefix', () => {
    const ctx = createMockContext();

    const node: ComponentSceneNode = {
      type: 'component',
      component: 'heading',
    };

    expect(() => sdcComponentRenderer.render(node, ctx)).toThrow('Invalid SDC component reference');
  });

  it('throws when component has too many colons', () => {
    const ctx = createMockContext();

    const node: ComponentSceneNode = {
      type: 'component',
      component: 'a:b:c',
    };

    expect(() => sdcComponentRenderer.render(node, ctx)).toThrow('Invalid SDC component reference');
  });

  it('renders slots with string values', () => {
    const ctx = createMockContext();
    const node: ComponentSceneNode = {
      type: 'component',
      component: 'test_provider:text-block',
      slots: { content: '<p>Hello</p>' },
    };

    const result = sdcComponentRenderer.render(node, ctx);
    expect(result).toContain('content:');
    expect(result).toContain('Hello');
  });

  it('renders nested array slots via ctx.renderNode', () => {
    const renderNodeSpy = vi.fn(() => 'child_rendered()');
    const ctx = createMockContext({ renderNode: renderNodeSpy });

    const node: ComponentSceneNode = {
      type: 'component',
      component: 'test_provider:card',
      slots: {
        children: [
          { type: 'component', component: 'test_provider:heading' },
          { type: 'component', component: 'test_provider:text-block' },
        ],
      },
    };

    const result = sdcComponentRenderer.render(node, ctx);
    expect(renderNodeSpy).toHaveBeenCalledTimes(2);
    expect(result).toContain('child_rendered()');
  });

  it('renders story reference args', () => {
    const ctx = createMockContext();
    const node: ComponentSceneNode = {
      type: 'component',
      component: 'test_provider:card',
      story: 'featured',
    };

    const result = sdcComponentRenderer.render(node, ctx);
    expect(result).toContain('Featured');
    expect(result).toContain('args');
  });

  it('has priority -10 (built-in)', () => {
    expect(sdcComponentRenderer.priority).toBe(-10);
  });
});
