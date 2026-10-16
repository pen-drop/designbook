// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { StrictMode, type ReactNode } from 'react';
import { renderComponent } from '../renderer';
import { reactHelpers, mountReact } from '../react';
import { isReactStoryOutput } from '../renderer';
import type { ComponentModule, ComponentNode } from '../../../scene-model/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;

const h = reactHelpers.createElement;
type P = Record<string, unknown> & { children?: ReactNode; actions?: ReactNode };

const Badge = (p: P) => h('span', { className: 'badge' }, String(p.price));
const Card = (p: P) => h('div', { className: 'card' }, h('footer', null, p.actions), h('main', null, p.children));
const Multi = () => h(reactHelpers.Fragment, null, h('i', null, 'a'), h('i', null, 'b'));
const Empty = () => null;
const Row = (p: P) => h('tr', null, h('td', null, String(p.label)));
const Table = (p: P) => h('table', null, h('tbody', null, p.children));

const wrap = (C: (p: P) => unknown): ComponentModule => ({
  render: (p, s) => reactHelpers.createElement(C as never, { ...p, ...s }),
});
const imports: Record<string, ComponentModule> = {
  't:badge': wrap(Badge),
  't:card': wrap(Card),
  't:multi': wrap(Multi),
  't:empty': wrap(Empty),
  't:row': wrap(Row),
  't:table': wrap(Table),
  'designbook:element': { render: (p) => reactHelpers.builtIns['designbook:element']!(p) },
  'designbook:image': { render: (p) => reactHelpers.builtIns['designbook:image']!(p) },
  'designbook:placeholder': { render: (p) => reactHelpers.builtIns['designbook:placeholder']!(p) },
};

const comments = (root: Node): string[] => {
  const out: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  while (walker.nextNode()) out.push(walker.currentNode.nodeValue ?? '');
  return out;
};

let container: HTMLElement;
let handle: ReturnType<typeof mountReact> | undefined;
afterEach(() => {
  handle?.unmount();
  handle = undefined;
});

function mount(nodes: ComponentNode[], strict = false) {
  container = document.createElement('div');
  document.body.appendChild(container);
  handle = mountReact(container);
  const out = renderComponent(nodes, imports, reactHelpers);
  handle.render(strict ? h(StrictMode, null, out as ReactNode) : (out as ReactNode));
  return out;
}

const card = (badgePaths: string[]): ComponentNode => ({
  component: 't:card',
  path: '0',
  slots: {
    actions: [{ component: 't:badge', path: '0.actions.0', props: { price: 'A' } }],
    children: badgePaths.map((p, i) => ({ component: 't:badge', path: p, props: { price: `$${i}` } })),
  },
});

describe('React boundaries', () => {
  it('emits distinct canonical comment pairs for repeated components', () => {
    mount([card(['0.children.0', '0.children.1'])]);
    expect(comments(container)).toEqual([
      'db:s:t:card@0',
      'db:s:t:badge@0.actions.0',
      'db:e:t:badge@0.actions.0',
      'db:s:t:badge@0.children.0',
      'db:e:t:badge@0.children.0',
      'db:s:t:badge@0.children.1',
      'db:e:t:badge@0.children.1',
      'db:e:t:card@0',
    ]);
    expect(container.querySelector('footer')!.textContent).toBe('A');
    expect(container.querySelector('main')!.textContent).toBe('$0$1');
  });

  it('places each start comment directly before its own rendered element (overlay contract)', () => {
    mount([card(['0.children.0'])]);
    const badge = container.querySelector('main .badge')!;
    let prev = badge.previousSibling;
    while (prev && prev.nodeType !== Node.COMMENT_NODE) prev = prev.previousSibling;
    expect(prev?.nodeValue).toBe('db:s:t:badge@0.children.0');
  });

  it('updates text and markers when props, order and membership change', () => {
    mount([card(['0.children.0', '0.children.1'])]);
    const next = card(['0.children.1', '0.children.2']);
    (next.slots!.children as ComponentNode[])[0]!.props = { price: 'X' };
    handle!.render(renderComponent([next], imports, reactHelpers) as ReactNode);
    expect(container.querySelector('main')!.textContent).toBe('X$1');
    expect(comments(container.querySelector('main')!)).toEqual([
      'db:s:t:badge@0.children.1',
      'db:e:t:badge@0.children.1',
      'db:s:t:badge@0.children.2',
      'db:e:t:badge@0.children.2',
    ]);
  });

  it('StrictMode replay leaves exactly one pair per boundary', () => {
    mount([card(['0.children.0'])], true);
    expect(comments(container).filter((c) => c === 'db:s:t:card@0')).toHaveLength(1);
    expect(comments(container)).toHaveLength(6);
  });

  it('wraps fragment and null output, and multiple roots', () => {
    mount([
      { component: 't:multi', path: '0' },
      { component: 't:empty', path: '1' },
    ]);
    expect(comments(container)).toEqual(['db:s:t:multi@0', 'db:e:t:multi@0', 'db:s:t:empty@1', 'db:e:t:empty@1']);
    expect(container.querySelectorAll('i')).toHaveLength(2);
  });

  it('adds no layout wrapper inside table structure', () => {
    mount([
      {
        component: 't:table',
        path: '0',
        slots: { children: [{ component: 't:row', path: '0.children.0', props: { label: 'r' } }] },
      },
    ]);
    const tbody = container.querySelector('tbody')!;
    const elements = Array.from(tbody.children).map((e) => e.tagName);
    expect(elements.filter((t) => t !== 'TEMPLATE')).toEqual(['TR']);
    expect(comments(tbody)).toEqual(['db:s:t:row@0.children.0', 'db:e:t:row@0.children.0']);
  });

  it('unmount removes content and every comment', () => {
    mount([card(['0.children.0'])]);
    handle!.unmount();
    handle = undefined;
    expect(container.childNodes).toHaveLength(0);
  });
});

describe('React built-ins and slots', () => {
  it('renders element markup as DOM, not escaped text, with React attribute mapping', () => {
    mount([
      {
        component: 'designbook:element',
        path: '0',
        props: { tag: 'p', value: '<strong>Bold</strong>', attributes: { class: 'lead', style: 'font-size: 2px' } },
      },
    ]);
    const p = container.querySelector('p.lead')! as HTMLElement;
    expect(p.querySelector('strong')!.textContent).toBe('Bold');
    expect(p.style.fontSize).toBe('2px');
  });

  it('renders responsive picture with sources, alt and aspect ratio', () => {
    mount([
      {
        component: 'designbook:image',
        path: '0',
        props: {
          sources: [{ media: '(min-width: 800px)', src: '/l.jpg' }],
          fallback: { src: '/s.jpg', alt: 'Cover' },
          style: { aspectRatio: '16/9', objectFit: 'cover' },
        },
      },
    ]);
    expect(container.querySelector('source')!.getAttribute('srcset')).toBe('/l.jpg');
    const img = container.querySelector('picture img') as HTMLImageElement;
    expect(img.alt).toBe('Cover');
    expect(img.style.aspectRatio).toBe('16/9');
  });

  it('renders css-mode responsive image with scoped media rules', () => {
    mount([
      {
        component: 'designbook:image',
        path: '0',
        props: { src: '/a.jpg', alt: 'A', responsiveStyles: [{ media: '(min-width: 1px)', aspectRatio: '1/1' }] },
      },
    ]);
    const img = container.querySelector('img')!;
    expect(container.querySelector('style')!.textContent).toContain(`.${img.className}`);
  });

  it('renders slot strings as text and $placeholders as a visible box', () => {
    mount([{ component: 't:card', path: '0', slots: { children: '<b>x</b>', actions: '$missing' } }]);
    expect(container.querySelector('main')!.textContent).toBe('<b>x</b>');
    expect(container.querySelector('main b')).toBeNull();
    expect(container.querySelector('footer div')!.textContent).toBe('$missing');
  });
});

describe('story output tag', () => {
  it('reactHelpers.story tags output so the preview can mount it without importing React', () => {
    const out = reactHelpers.story(null);
    expect(isReactStoryOutput(out)).toBe(true);
    expect(isReactStoryOutput({ node: null })).toBe(false);
    expect(typeof out.mount).toBe('function');
  });
});
