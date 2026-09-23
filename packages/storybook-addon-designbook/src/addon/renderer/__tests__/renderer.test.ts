// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { h } from 'vue';
import { renderComponent, mountVueRoot } from '../renderer';
import type { ComponentNode, ComponentModule } from '../../../scene-model/types';

function makeModule(render: ComponentModule['render']): ComponentModule {
  return { render };
}

/** Strip <!--db:s:...--> / <!--db:e:...--> comment markers from rendered HTML. */
function stripMarkers(html: unknown): unknown {
  if (typeof html !== 'string') return html;
  return html.replace(/<!--db:[se]:[^>]*-->/g, '');
}

describe('renderComponent', () => {
  it('renders a single ComponentNode', () => {
    const imports = {
      'test:heading': makeModule((props) => `<h${props.level}>`),
    };
    const node: ComponentNode = { component: 'test:heading', props: { level: '1' } };

    const result = renderComponent(node, imports);
    expect(stripMarkers(result)).toBe('<h1>');
  });

  it('renders an array of ComponentNodes — joins strings', () => {
    const imports = {
      'test:a': makeModule(() => 'A'),
      'test:b': makeModule(() => 'B'),
    };

    const result = renderComponent([{ component: 'test:a' }, { component: 'test:b' }], imports);

    // Multiple string results are concatenated (html framework compatibility)
    expect(stripMarkers(result)).toBe('AB');
  });

  it('resolves slots recursively — array slot is passed as array', () => {
    const childSpy = vi.fn().mockReturnValue('CHILD');
    const parentSpy = vi.fn().mockImplementation((_props, slots) => `PARENT:${JSON.stringify(slots)}`);

    const imports = {
      'test:parent': makeModule(parentSpy),
      'test:child': makeModule(childSpy),
    };

    const node: ComponentNode = {
      component: 'test:parent',
      slots: {
        items: [{ component: 'test:child' }],
      },
    };

    renderComponent(node, imports);

    expect(childSpy).toHaveBeenCalledOnce();
    const [, resolvedSlots] = parentSpy.mock.calls[0]!;
    // Array slot stays as array so Twig templates can iterate with {% for item in items %}
    const items = (resolvedSlots as Record<string, unknown[]>).items;
    expect(items).toHaveLength(1);
    expect(stripMarkers(items![0])).toBe('CHILD');
  });

  it('resolves single ComponentNode slot', () => {
    const childRender = vi.fn().mockReturnValue('badge');
    const parentRender = vi.fn().mockImplementation((_p, slots) => slots.author);

    const imports = {
      'test:card': makeModule(parentRender),
      'test:badge': makeModule(childRender),
    };

    const node: ComponentNode = {
      component: 'test:card',
      slots: {
        author: { component: 'test:badge' },
      },
    };

    const result = renderComponent(node, imports);
    expect(stripMarkers(result)).toBe('badge');
  });

  it('passes string slots through unchanged', () => {
    const render = vi.fn().mockImplementation((_p, slots) => slots.text);
    const imports = { 'test:heading': makeModule(render) };

    const node: ComponentNode = {
      component: 'test:heading',
      slots: { text: 'Hello World' },
    };

    const result = renderComponent(node, imports);
    expect(stripMarkers(result)).toBe('Hello World');
  });

  it('passes props as first argument and slots as second — no cross-contamination', () => {
    const renderSpy = vi.fn().mockReturnValue('output');
    const imports = { 'test:heading': makeModule(renderSpy) };

    const node: ComponentNode = {
      component: 'test:heading',
      props: { level: 'h1', weight: 'bold' },
      slots: { text: 'Hello' },
    };

    renderComponent(node, imports);

    expect(renderSpy).toHaveBeenCalledOnce();
    const [calledProps, calledSlots] = renderSpy.mock.calls[0]!;
    expect(calledProps).toEqual({ level: 'h1', weight: 'bold' });
    expect(calledSlots).toEqual({ text: 'Hello' });
    // Props must not bleed into slots and vice versa
    expect(calledProps).not.toHaveProperty('text');
    expect(calledSlots).not.toHaveProperty('level');
    expect(calledSlots).not.toHaveProperty('weight');
  });

  it('passes empty object as props when no props declared', () => {
    const renderSpy = vi.fn().mockReturnValue('output');
    const imports = { 'test:label': makeModule(renderSpy) };

    renderComponent({ component: 'test:label', slots: { text: 'Hi' } }, imports);

    const [calledProps] = renderSpy.mock.calls[0]!;
    expect(calledProps).toEqual({});
  });

  it('warns and returns null for missing import', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = renderComponent({ component: 'test:missing' }, {});
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('test:missing'));
    warnSpy.mockRestore();
  });
});

describe('mountVueRoot', () => {
  it('mounts the vnode into the container, wrapped in db:s/db:e comment markers', async () => {
    const container = document.createElement('div');
    const node: ComponentNode = { component: 'test:card', path: '0' };
    const vnode = h('p', {}, 'Hello Vue');

    const handle = await mountVueRoot(node, vnode, container);

    expect(container.textContent).toContain('Hello Vue');
    const comments = Array.from(container.childNodes).filter((n) => n.nodeType === Node.COMMENT_NODE);
    expect(comments).toHaveLength(2);
    expect(comments[0]!.textContent).toBe('db:s:test:card@0');
    expect(comments[1]!.textContent).toBe('db:e:test:card@0');

    handle.unmount();
  });

  it('unmount() removes the markers, the mount point, and disposes the app', async () => {
    const container = document.createElement('div');
    const node: ComponentNode = { component: 'test:card', path: '0' };
    const vnode = h('p', {}, 'Hello Vue');

    const handle = await mountVueRoot(node, vnode, container);
    expect(container.childNodes.length).toBeGreaterThan(0);

    handle.unmount();

    expect(container.childNodes.length).toBe(0);
  });

  it('a second mount cleanly replaces the first (no leaked nodes)', async () => {
    const container = document.createElement('div');
    const node: ComponentNode = { component: 'test:card', path: '0' };

    const first = await mountVueRoot(node, h('p', {}, 'First'), container);
    expect(container.textContent).toContain('First');
    first.unmount();

    const second = await mountVueRoot(node, h('p', {}, 'Second'), container);
    expect(container.textContent).toContain('Second');
    expect(container.textContent).not.toContain('First');
    // Exactly one mount's worth of nodes present (2 markers + 1 mount point)
    expect(container.childNodes.length).toBe(3);

    second.unmount();
    expect(container.childNodes.length).toBe(0);
  });

  it('falls back to the bare component id when path is absent', async () => {
    const container = document.createElement('div');
    const node: ComponentNode = { component: 'test:card' };

    const handle = await mountVueRoot(node, h('p', {}, 'No path'), container);

    const comments = Array.from(container.childNodes).filter((n) => n.nodeType === Node.COMMENT_NODE);
    expect(comments[0]!.textContent).toBe('db:s:test:card');
    expect(comments[1]!.textContent).toBe('db:e:test:card');

    handle.unmount();
  });
});
