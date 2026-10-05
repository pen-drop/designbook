// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ThemeProvider, themes, ensure } from 'storybook/theming';

const files = vi.hoisted(() => ({ content: '' }));
vi.mock('../addon/components/designbookApi.js', () => ({
  listDesignbookFiles: () => Promise.resolve([]),
  loadDesignbookFile: () => Promise.resolve(files.content),
}));
vi.mock('storybook/preview-api', () => ({
  addons: { getChannel: () => ({ on: () => {}, off: () => {} }) },
}));

import { DeboDataModel, resetDataModelLayout } from '../addon/components/display/DeboDataModel.jsx';
import { DeboSection } from '../addon/components/DeboSection.jsx';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ref = (target_type: string, target_bundle?: string) => ({
  type: 'reference',
  settings: { target_type, target_bundle },
});

const model = () => ({
  content: {
    node: {
      article: {
        title: 'Article',
        fields: {
          hero: ref('media', 'image'),
          teaser: ref('media', 'image'),
          related: ref('node', 'article'),
          video: ref('media', 'video'),
        },
      },
    },
    media: { image: { fields: { used_in: ref('node', 'article') } } },
    user: { user: {} },
  },
  config: { view: { recent: { fields: { rows: ref('node', 'article') } } } },
});

// ThemeProvider's typings require `children` as a prop; pass it as an argument instead.
const Themed = ThemeProvider as React.FC<{ theme: unknown; children?: React.ReactNode }>;

let container: HTMLDivElement;
let root: Root;

type Session = { current: Record<string, unknown> | null };
type Props = {
  data: unknown;
  selectedEntity: string | null;
  onSelectEntity: (path: string | null) => void;
  view?: string;
  onViewChange?: (view: string) => void;
  session?: Session;
};

async function renderElement(element: React.ReactElement) {
  await act(async () => {
    root.render(React.createElement(Themed, { theme: ensure(themes.light) }, element));
  });
}

const render = (props: Props) => renderElement(React.createElement(DeboDataModel as React.FC<Props>, props));

/** Unmount and mount again, as DeboFoundationPage's tabs do on every page render. */
async function remount(props: Props) {
  act(() => root.unmount());
  root = createRoot(container);
  await render(props);
}

const button = (label: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
const nodeButtons = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-node-id]')];
const edgePaths = () => [...container.querySelectorAll<SVGPathElement>('path[data-edge-id]')];
const node = (id: string) => container.querySelector<HTMLButtonElement>(`button[data-node-id="${id}"]`)!;
const nodeIds = () => nodeButtons().map((b) => b.getAttribute('aria-label'));
const typeToggle = (type: string) =>
  [...container.querySelectorAll<HTMLButtonElement>('[aria-label="Entity types"] button')].find(
    (b) => b.textContent === type,
  )!;
const box = (id: string) => {
  const fo = node(id).parentElement!;
  return { x: Number(fo.getAttribute('x')), y: Number(fo.getAttribute('y')), opacity: fo.getAttribute('opacity') };
};
const edgeD = (id: string) => container.querySelector(`path[data-edge-id="${id}"]`)!.getAttribute('d');

// Screen → SVG: SVG user space is client space scaled by 2, so a client pixel moves a node 2 units.
beforeEach(() => {
  (SVGElement.prototype as unknown as { getScreenCTM: () => unknown }).getScreenCTM = () => ({
    inverse: () => ({ a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }),
  });
});

function pointer(
  target: Element,
  type: string,
  x: number,
  y: number,
  init: { pointerId?: number; button?: number } = {},
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: init.button ?? 0,
  });
  Object.assign(event, { pointerId: init.pointerId ?? 1, isPrimary: (init.pointerId ?? 1) === 1 });
  act(() => {
    target.dispatchEvent(event);
  });
}

/** A primary-pointer drag of `id` by (dx, dy) client pixels, ending with the click the browser synthesizes. */
function drag(id: string, dx: number, dy: number) {
  const target = node(id);
  pointer(target, 'pointerdown', 100, 100);
  pointer(target, 'pointermove', 100 + dx / 2, 100 + dy / 2);
  pointer(target, 'pointermove', 100 + dx, 100 + dy);
  pointer(target, 'pointerup', 100 + dx, 100 + dy);
  act(() => target.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })));
}

const click = (el: Element, detail = 1) =>
  act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail })));
const dblclick = (el: Element) => act(() => el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('DeboDataModel graph view', () => {
  it('starts on cards, switches to graph and selects a node through the existing callback', async () => {
    const data = model();
    const before = structuredClone(data);
    const onSelectEntity = vi.fn();
    await render({ data, selectedEntity: null, onSelectEntity });

    expect(button('Cards').getAttribute('aria-pressed')).toBe('true');
    expect(button('Graph').getAttribute('aria-pressed')).toBe('false');
    expect(nodeButtons()).toHaveLength(0);

    act(() => button('Graph').click());
    expect(button('Graph').getAttribute('aria-pressed')).toBe('true');
    expect(nodeButtons().map((b) => b.getAttribute('aria-label'))).toEqual([
      'node.article',
      'media.image',
      'user.user',
      'view.recent',
    ]);

    const edges = edgePaths();
    expect(edges.map((p) => p.dataset['edgeId'])).toEqual([
      'node.article:hero',
      'node.article:teaser',
      'node.article:related',
      'media.image:used_in',
      'view.recent:rows',
    ]);
    const d = edges.map((p) => p.getAttribute('d'));
    expect(new Set(d).size).toBe(d.length);
    expect(edges.every((p) => p.getAttribute('marker-end')?.startsWith('url(#'))).toBe(true);
    expect(edges[0]?.querySelector('title')?.textContent).toContain('hero');

    expect(container.textContent).toContain('Unresolved references');
    expect(container.textContent).toContain('media.video');

    click(node('node.article'));
    expect(onSelectEntity).not.toHaveBeenCalled();
    dblclick(node('node.article'));
    expect(onSelectEntity).toHaveBeenCalledWith('node.article');
    expect(data).toEqual(before);
  });

  it('keeps the graph selected across detail and back', async () => {
    const data = model();
    const onSelectEntity = vi.fn();
    await render({ data, selectedEntity: null, onSelectEntity });
    act(() => button('Graph').click());

    await render({ data, selectedEntity: 'node.article', onSelectEntity });
    expect(nodeButtons()).toHaveLength(0);
    expect(container.textContent).toContain('Article');

    await render({ data, selectedEntity: null, onSelectEntity });
    expect(button('Graph').getAttribute('aria-pressed')).toBe('true');
    expect(nodeButtons()).toHaveLength(4);

    act(() => button('Cards').click());
    expect(nodeButtons()).toHaveLength(0);
  });

  it('follows a parent-owned view choice when one is supplied', async () => {
    const onViewChange = vi.fn();
    await render({ data: model(), selectedEntity: null, onSelectEntity: vi.fn(), view: 'graph', onViewChange });
    expect(nodeButtons()).toHaveLength(4);

    act(() => button('Cards').click());
    expect(onViewChange).toHaveBeenCalledWith('cards');
    expect(nodeButtons()).toHaveLength(4);
  });

  it('recomputes on data replacement, including singleton and empty models', async () => {
    const onSelectEntity = vi.fn();
    await render({ data: model(), selectedEntity: null, onSelectEntity });
    act(() => button('Graph').click());

    await render({ data: { content: { node: { page: {} } } }, selectedEntity: null, onSelectEntity });
    expect(nodeButtons().map((b) => b.getAttribute('aria-label'))).toEqual(['node.page']);
    expect(edgePaths()).toHaveLength(0);
    const viewBox = container.querySelector('svg')?.getAttribute('viewBox') ?? '';
    const [, , w, h] = viewBox.split(' ').map(Number);
    expect(w).toBeGreaterThan(0);
    expect(h).toBeGreaterThan(0);

    await render({ data: { content: {} }, selectedEntity: null, onSelectEntity });
    expect(container.textContent).toContain('No bundles defined');
  });
});

describe('DeboDataModel entity-type filter', () => {
  it('offers every type once, initially active, and filters cards and graph alike', async () => {
    const data = {
      ...model(),
      config: { node: { page: {} }, view: { recent: { fields: { rows: ref('node', 'article') } } } },
    };
    await render({ data, selectedEntity: null, onSelectEntity: vi.fn() });
    const toggles = [...container.querySelectorAll<HTMLButtonElement>('[aria-label="Entity types"] button')];
    expect(toggles.map((b) => b.textContent)).toEqual(['node', 'media', 'user', 'view']);
    expect(toggles.every((b) => b.type === 'button' && b.getAttribute('aria-pressed') === 'true')).toBe(true);

    act(() => typeToggle('media').click());
    expect(typeToggle('media').getAttribute('aria-pressed')).toBe('false');
    expect(container.textContent).not.toContain('Media');
    expect(container.textContent).toContain('Config Entities');

    act(() => button('Graph').click());
    expect(nodeIds()).toEqual(['node.article', 'user.user', 'node.page', 'view.recent']);
    expect(edgePaths().map((p) => p.dataset['edgeId'])).toEqual(['node.article:related', 'view.recent:rows']);
    // Hidden resolved targets never become unresolved; the genuinely missing one stays.
    expect(container.textContent).toContain('media.video');
    expect(container.textContent).not.toContain('undeclared target — media.image');

    act(() => typeToggle('node').click());
    expect(nodeIds()).toEqual(['user.user', 'view.recent']); // node.page is a node too
    expect(edgePaths()).toHaveLength(0);
    expect(container.textContent).not.toContain('Unresolved references');

    act(() => button('Cards').click());
    act(() => typeToggle('view').click());
    expect(container.textContent).not.toContain('Config Entities');
    act(() => typeToggle('user').click());
    expect(container.textContent).toContain('No entity types selected');
    act(() => button('Graph').click());
    expect(container.textContent).toContain('No entity types selected');
    act(() => typeToggle('user').click());
    expect(nodeIds()).toEqual(['user.user']);
  });

  it('drops a graph focus whose type is filtered out, also when the type returns', async () => {
    await render({ data: model(), selectedEntity: null, onSelectEntity: vi.fn(), view: 'graph' });
    click(node('node.article'));
    expect(node('node.article').getAttribute('aria-pressed')).toBe('true');
    act(() => typeToggle('node').click());
    act(() => typeToggle('node').click());
    expect(nodeButtons().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);

    // Hiding another type keeps the focus.
    click(node('node.article'));
    act(() => typeToggle('user').click());
    expect(node('node.article').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('DeboDataModel graph interaction', () => {
  it('drags a node with its edges only, keeps it on release and suppresses only the drag click', async () => {
    const onSelectEntity = vi.fn();
    await render({ data: model(), selectedEntity: null, onSelectEntity, view: 'graph' });
    const viewBox = container.querySelector('svg')!.getAttribute('viewBox');
    const article = box('node.article');
    const user = box('user.user');
    const rows = edgeD('view.recent:rows');

    drag('node.article', 10, 5);
    expect(box('node.article').x).toBeCloseTo(article.x + 20);
    expect(box('node.article').y).toBeCloseTo(article.y + 10);
    expect(edgeD('view.recent:rows')).not.toBe(rows);
    expect(box('user.user')).toEqual(user);
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe(viewBox);
    expect(node('node.article').getAttribute('aria-pressed')).toBe('false');
    expect(onSelectEntity).not.toHaveBeenCalled();
    expect(node('node.article').style.cursor).toBe('');

    click(node('node.article'));
    expect(node('node.article').getAttribute('aria-pressed')).toBe('true');

    // Below the threshold the gesture is a click; a secondary button never drags.
    const moved = box('node.article');
    pointer(node('user.user'), 'pointerdown', 0, 0);
    pointer(node('user.user'), 'pointermove', 3, 3);
    pointer(node('user.user'), 'pointerup', 3, 3);
    click(node('user.user'));
    expect(node('user.user').getAttribute('aria-pressed')).toBe('true');
    pointer(node('node.article'), 'pointerdown', 0, 0, { button: 2 });
    pointer(node('node.article'), 'pointermove', 50, 50);
    expect(box('node.article')).toMatchObject({ x: moved.x, y: moved.y });
  });

  it('clamps the node box to the viewBox and ends a cancelled gesture at its last position', async () => {
    await render({ data: model(), selectedEntity: null, onSelectEntity: vi.fn(), view: 'graph' });
    const [minX, minY] = container.querySelector('svg')!.getAttribute('viewBox')!.split(' ').map(Number);
    const target = node('user.user');
    pointer(target, 'pointerdown', 0, 0);
    pointer(target, 'pointermove', -100000, -100000);
    pointer(target, 'pointercancel', -100000, -100000);
    expect(box('user.user')).toMatchObject({ x: minX, y: minY });
    pointer(target, 'pointermove', 50, 50);
    expect(box('user.user')).toMatchObject({ x: minX, y: minY });

    // With a layout box the visible area (client 0..1000 → user 0..2000) bounds the drag, not the viewBox.
    const svg = container.querySelector('svg')!;
    svg.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 1000, bottom: 1000, width: 1000, height: 1000 }) as DOMRect;
    pointer(target, 'pointerdown', 0, 0);
    pointer(target, 'pointermove', 100000, 100000);
    pointer(target, 'pointerup', 100000, 100000);
    expect(box('user.user')).toMatchObject({ x: 2000 - 180, y: 2000 - 56 });
  });

  it('highlights the clicked node and its direct neighbors without moving anything', async () => {
    const onSelectEntity = vi.fn();
    await render({ data: model(), selectedEntity: null, onSelectEntity, view: 'graph' });
    const geometry = () => [
      container.querySelector('svg')!.getAttribute('viewBox'),
      ...edgePaths().map((p) => p.getAttribute('d')),
    ];
    const before = geometry();

    click(node('node.article'));
    expect(nodeIds().map((id) => box(id!).opacity)).toEqual(['1', '1', '0.3', '1']);
    expect(edgePaths().map((p) => p.getAttribute('stroke-width'))).toEqual(['2', '2', '2', '2', '2']);
    expect(geometry()).toEqual(before);

    click(node('user.user'), 0); // keyboard activation
    expect(nodeIds().map((id) => box(id!).opacity)).toEqual(['0.3', '0.3', '1', '0.3']);
    act(() => button('Details: user.user').click());
    expect(onSelectEntity).toHaveBeenCalledWith('user.user');

    act(() => {
      node('user.user').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(nodeIds().map((id) => box(id!).opacity)).toEqual(['1', '1', '1', '1']);
    click(node('media.image'));
    click(container.querySelector('svg')!);
    expect(nodeButtons().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('keeps filter, positions and focus across remounts of equal data, resets them on a model change', async () => {
    const session: Session = { current: null };
    const props = { selectedEntity: null, onSelectEntity: vi.fn(), view: 'graph', session };
    await render({ ...props, data: model() });
    const computed = box('node.article');
    drag('node.article', 10, 0);
    click(node('node.article'));
    act(() => typeToggle('user').click()); // a filter change drops the dragged layout
    expect(box('node.article')).not.toMatchObject({ x: computed.x + 20 });
    drag('node.article', 10, 0);
    const dragged = box('node.article');
    click(node('node.article'));

    await remount({ ...props, data: structuredClone(model()) });
    expect(typeToggle('user').getAttribute('aria-pressed')).toBe('false');
    expect(box('node.article')).toEqual(dragged);
    expect(node('node.article').getAttribute('aria-pressed')).toBe('true');

    act(() => typeToggle('media').click());
    expect(nodeIds()).not.toContain('media.image');
    expect(node('node.article').getAttribute('aria-pressed')).toBe('true');

    const changed = model();
    changed.content.node.article.title = 'Story';
    await remount({ ...props, data: changed });
    expect(typeToggle('user').getAttribute('aria-pressed')).toBe('true');
    expect(typeToggle('media').getAttribute('aria-pressed')).toBe('true');
    expect(box('node.article')).toMatchObject({ x: computed.x, y: computed.y });
    expect(nodeButtons().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('restores the computed layout on the source Reload but keeps the type filter', async () => {
    files.content = JSON.stringify(model());
    const session: Session = { current: null };
    const section = () =>
      renderElement(
        React.createElement(DeboSection as unknown as React.FC<Record<string, unknown>>, {
          dataPath: 'data-model.yml',
          parser: JSON.parse,
          onReload: () => resetDataModelLayout(session),
          renderContent: (data: unknown) =>
            React.createElement(DeboDataModel as React.FC<Props>, {
              data,
              selectedEntity: null,
              onSelectEntity: () => {},
              view: 'graph',
              session,
            }),
        }),
      );
    await section();
    act(() => typeToggle('user').click());
    const computed = box('node.article');
    drag('node.article', 10, 0);
    click(node('node.article'));
    expect(box('node.article')).not.toEqual(computed);

    await act(async () => button('Refresh').click());
    expect(box('node.article')).toMatchObject({ x: computed.x, y: computed.y });
    expect(typeToggle('user').getAttribute('aria-pressed')).toBe('false');
    expect(node('node.article').getAttribute('aria-pressed')).toBe('false');
  });
});

describe('DeboDataModel graph zoom', () => {
  type Box = [number, number, number, number];
  const viewBox = (): Box => {
    const parts = (container.querySelector('svg')!.getAttribute('viewBox') ?? '').split(' ').map(Number);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 0];
  };

  it('zooms the viewBox around the pointer, via +/−/Fit, and still drags a node afterwards', async () => {
    await render({ data: model(), selectedEntity: null, onSelectEntity: vi.fn(), view: 'graph' });
    const svg = container.querySelector('svg')!;
    const original = viewBox();
    // Mock CTM maps client (100, 100) → user (200, 200).
    const userX = 200;
    const userY = 200;
    const ratioX = (box: Box) => (userX - box[0]) / box[2];
    const ratioY = (box: Box) => (userY - box[1]) / box[3];

    act(() => {
      svg.dispatchEvent(
        new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100, clientX: 100, clientY: 100 }),
      );
    });
    const zoomedIn = viewBox();
    expect(zoomedIn[2]).toBeLessThan(original[2]);
    expect(zoomedIn[3]).toBeLessThan(original[3]);
    expect(ratioX(zoomedIn)).toBeCloseTo(ratioX(original));
    expect(ratioY(zoomedIn)).toBeCloseTo(ratioY(original));

    act(() => {
      svg.dispatchEvent(
        new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100, clientX: 100, clientY: 100 }),
      );
    });
    const afterWheelOut = viewBox();
    expect(afterWheelOut[2]).toBeGreaterThan(zoomedIn[2]);
    expect(afterWheelOut[3]).toBeGreaterThan(zoomedIn[3]);

    click(button('+'));
    const afterPlus = viewBox();
    expect(afterPlus[2]).toBeLessThan(afterWheelOut[2]);
    expect(afterPlus[3]).toBeLessThan(afterWheelOut[3]);
    click(button('−'));
    expect(viewBox()[2]).toBeGreaterThan(afterPlus[2]);
    click(button('Fit'));
    expect(viewBox()).toEqual(original);

    click(button('+'));
    const article = box('node.article');
    const rows = edgeD('view.recent:rows');
    drag('node.article', 10, 5);
    expect(box('node.article').x).toBeCloseTo(article.x + 20);
    expect(box('node.article').y).toBeCloseTo(article.y + 10);
    expect(edgeD('view.recent:rows')).not.toBe(rows);
  });

  it('pans the viewBox when dragging empty background and still unfocuses on a click', async () => {
    await render({ data: model(), selectedEntity: null, onSelectEntity: vi.fn(), view: 'graph' });
    const svg = container.querySelector('svg')!;
    click(node('node.article'));
    expect(node('node.article').getAttribute('aria-pressed')).toBe('true');
    const before = viewBox();
    pointer(svg, 'pointerdown', 100, 100);
    pointer(svg, 'pointermove', 110, 100);
    pointer(svg, 'pointerup', 110, 100);
    act(() => svg.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })));
    const panned = viewBox();
    expect(panned[0]).toBeCloseTo(before[0] - 20);
    expect(panned[1]).toBeCloseTo(before[1]);
    expect(panned[2]).toBeCloseTo(before[2]);
    expect(panned[3]).toBeCloseTo(before[3]);
    expect(node('node.article').getAttribute('aria-pressed')).toBe('true');

    click(svg);
    expect(nodeButtons().every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
  });
});
