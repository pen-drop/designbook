// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ThemeProvider, themes, ensure } from 'storybook/theming';

vi.mock('../addon/components/designbookApi.js', () => ({
  listDesignbookFiles: () => Promise.resolve([]),
}));

import { DeboDataModel } from '../addon/components/display/DeboDataModel.jsx';

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

type Props = {
  data: unknown;
  selectedEntity: string | null;
  onSelectEntity: (path: string | null) => void;
  view?: string;
  onViewChange?: (view: string) => void;
};

async function render(props: Props) {
  await act(async () => {
    root.render(
      React.createElement(
        Themed,
        { theme: ensure(themes.light) },
        React.createElement(DeboDataModel as React.FC<Props>, props),
      ),
    );
  });
}

const button = (label: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
const nodeButtons = () => [...container.querySelectorAll<HTMLButtonElement>('button[data-node-id]')];
const edgePaths = () => [...container.querySelectorAll<SVGPathElement>('path[data-edge-id]')];

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

    act(() => nodeButtons()[0]?.click());
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
