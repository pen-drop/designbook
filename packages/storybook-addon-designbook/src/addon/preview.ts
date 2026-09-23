import type { ProjectAnnotations, Renderer, StoryContext } from 'storybook/internal/types';

import React from 'react';
import { useGlobals, useEffect, useRef, addons } from 'storybook/preview-api';
import { themes as sbThemes, ensure, ThemeProvider } from 'storybook/theming';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

import { themes as designbookThemes, defaultTheme } from 'virtual:designbook-themes';
import { KEY, VISUAL_COMPARE_KEY } from '../shared/constants';
import { withRoundTrip } from './withRoundTrip';
import { withVisualCompare } from './withVisualCompare';
import { withInspectOverlay } from './decorators/inspect-overlay';
import { setActiveTheme } from './pages/theme-store';
import { mountVueRoot, type VueMountHandle } from './renderer/renderer';
import type { ComponentNode } from '../scene-model/types';

if (
  typeof document !== 'undefined' &&
  !document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter"]')
) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
}

/**
 * True when `value` is a Vue 3 VNode. Vue stamps every vnode it creates with
 * `__v_isVNode: true` — checking that marker lets us detect Vue output
 * without a static (or even dynamic) `import 'vue'` here; SDC/React/Twig
 * consumers never load this branch's code path.
 */
export function isVueVNode(value: unknown): boolean {
  return !!value && typeof value === 'object' && (value as Record<string, unknown>).__v_isVNode === true;
}

/**
 * `renderComponent()` returns a single vnode for one scene root, or an array
 * when a scene has multiple roots — Vue's render function happily accepts an
 * array too (implicit Fragment), so either shape is "Vue output".
 */
export function isVueRenderable(value: unknown): boolean {
  return isVueVNode(value) || (Array.isArray(value) && value.some(isVueVNode));
}

/**
 * Best-effort root `ComponentNode` for `mountVueRoot`'s marker naming — pulled
 * from the same args the generated story's `render()` fed into `renderComponent()`
 * (scene stories: `__scene`; entity/form stories: `__records[record]`). Falls
 * back to a synthetic node keyed on the story id so marker emission never throws.
 */
function rootComponentNodeFor(context: StoryContext): ComponentNode {
  const args = context.args as Record<string, unknown> | undefined;
  const scene = args?.__scene as ComponentNode[] | undefined;
  if (Array.isArray(scene) && scene[0]) return scene[0];
  const records = args?.__records as ComponentNode[][] | undefined;
  const record = typeof args?.record === 'number' ? (args.record as number) : 0;
  if (Array.isArray(records) && records[record]?.[0]) return records[record][0]!;
  return { component: context.id };
}

/**
 * Syncs the active Storybook theme into the shared theme store before each story renders.
 * mount-react.js reads from the store when creating React roots, so Debo* components
 * receive the correct theme via useTheme() from storybook/theming.
 *
 * Also owns the Vue mount/unmount lifecycle: `renderComponent()` (called by the
 * generated story's `render()`) returns a raw VNode for `frameworks.component: vue`
 * projects — this decorator swaps that VNode for a stable, live-mounted DOM
 * container so the html-vite renderer's `instanceof Node` contract is satisfied,
 * and re-mounts (after cleanly unmounting the previous app) whenever the story
 * re-renders with new args or on story teardown.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withDeboTheme(Story: any, context: StoryContext) {
  const [globals] = useGlobals();
  const vueContainerRef = useRef<HTMLDivElement | null>(null);
  const vueHandleRef = useRef<VueMountHandle | null>(null);

  const prefersDark =
    globals?.theme === 'dark' ||
    (globals?.theme == null &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const base = ensure(prefersDark ? sbThemes.dark : sbThemes.light);
  setActiveTheme(base);
  if (typeof document !== 'undefined') {
    document.body.style.backgroundColor = base.background.content;
    document.body.style.color = base.color.defaultText;
  }
  let result = Story(context);

  const vueOutput = isVueRenderable(result) ? result : null;

  // Unconditional hook call (rules-of-hooks) — the effect body no-ops when the
  // current render isn't Vue output, and still tears down any stale mount.
  useEffect(() => {
    if (!vueOutput) {
      vueHandleRef.current?.unmount();
      vueHandleRef.current = null;
      return;
    }
    if (!vueContainerRef.current) {
      vueContainerRef.current = document.createElement('div');
    }
    let cancelled = false;
    vueHandleRef.current?.unmount();
    vueHandleRef.current = null;
    const node = rootComponentNodeFor(context);
    mountVueRoot(node, vueOutput, vueContainerRef.current).then((handle) => {
      if (cancelled) {
        handle.unmount();
      } else {
        vueHandleRef.current = handle;
      }
    });
    return () => {
      cancelled = true;
      vueHandleRef.current?.unmount();
      vueHandleRef.current = null;
    };
  }, [vueOutput, context.id]);

  if (vueOutput) {
    if (!vueContainerRef.current) {
      vueContainerRef.current = document.createElement('div');
    }
    result = vueContainerRef.current;
  }

  // HTML-framework stories return DOM nodes or strings — pass through as-is.
  // React-framework stories return React elements — wrap with ThemeProvider.
  if (result instanceof Node || typeof result === 'string') {
    return result;
  }
  return React.createElement(ThemeProvider, { theme: base, children: result } as React.ComponentProps<
    typeof ThemeProvider
  >);
}

const withDesignbookTheme = withThemeByDataAttribute({
  themes: designbookThemes,
  defaultTheme,
  attributeName: 'data-theme',
});

// Forward Vite HMR custom events to the Storybook channel so useSections/
// useDesignbookData can react to file-change events.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const metaHot = (import.meta as any).hot as { on: (event: string, cb: (data: unknown) => void) => void } | undefined;
if (metaHot) {
  const EVENTS = ['designbook:file-add', 'designbook:file-update', 'designbook:file-delete'] as const;
  for (const event of EVENTS) {
    metaHot.on(event, (data: unknown) => {
      console.debug('[Designbook] HMR event received → forwarding to channel:', event, data);
      try {
        addons.getChannel().emit(event, data);
      } catch (e) {
        console.warn('[Designbook] Failed to forward HMR event to channel:', event, e);
      }
    });
  }
  console.debug('[Designbook] HMR event forwarding registered for', EVENTS);
}

export const decorators = [withDesignbookTheme, withDeboTheme, withRoundTrip, withVisualCompare, withInspectOverlay];

export const initialGlobals = {
  [KEY]: false,
  [VISUAL_COMPARE_KEY]: { breakpoint: null, region: null, opacity: 50 },
};

export const parameters = {};

const preview: ProjectAnnotations<Renderer> = {
  decorators,
  initialGlobals,
  parameters,
};

export default preview;
