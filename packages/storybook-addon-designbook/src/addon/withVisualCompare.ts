import { useGlobals } from 'storybook/preview-api';
import type { DecoratorFunction } from 'storybook/internal/types';

import { VISUAL_COMPARE_KEY } from '../shared/constants';
import { referenceImagePath } from '../tools/visual-compare-path';
import { capturesFor, type CaptureOverlay, type VisualCompareStory } from './visual-compare-menu';

interface VisualCompareState {
  breakpoint: string | null;
  state: string | null;
  region: string | null; // null = all regions, specific name = single region
  opacity: number;
}

// Cache the full story fetch to avoid multiple requests per breakpoint
const storyCache = new Map<string, Promise<VisualCompareStory | null>>();

function fetchStory(storyId: string): Promise<VisualCompareStory | null> {
  const cached = storyCache.get(storyId);
  if (cached) return cached;

  const promise = fetch(`/__designbook/story/${encodeURIComponent(storyId)}`)
    .then((res) => (res.ok ? (res.json() as Promise<VisualCompareStory>) : null))
    .catch(() => null);

  storyCache.set(storyId, promise);
  return promise;
}

function applyOverlays(
  canvasElement: HTMLElement,
  referenceDir: string,
  state: VisualCompareState,
  regions: CaptureOverlay[],
) {
  if (!canvasElement.isConnected) return;

  const position = getComputedStyle(canvasElement).position;
  if (position === 'static') {
    canvasElement.style.position = 'relative';
  }

  const filtered = state.region ? regions.filter((r) => r.name === state.region) : regions;
  const canvasRect = canvasElement.getBoundingClientRect();

  for (const region of filtered) {
    const src = referenceImagePath(referenceDir, region.path);

    if (!region.selector) {
      // "full" region (empty selector) — full-page overlay
      createOverlayImg(canvasElement, src, state.opacity, {
        top: '0',
        left: '0',
        width: '100%',
      });
      continue;
    }

    // Element region — position over the matching DOM element
    const el = canvasElement.querySelector(region.selector);
    if (!el) continue;

    const elRect = el.getBoundingClientRect();
    if (elRect.width === 0 || elRect.height === 0) continue;

    const top = elRect.top - canvasRect.top;
    const left = elRect.left - canvasRect.left;

    createOverlayImg(canvasElement, src, state.opacity, {
      top: `${top}px`,
      left: `${left}px`,
      width: `${elRect.width}px`,
      height: `${elRect.height}px`,
    });
  }
}

function createOverlayImg(parent: HTMLElement, src: string, opacity: number, position: Record<string, string>) {
  const overlay = document.createElement('img');
  overlay.dataset.visualCompareOverlay = 'true';
  overlay.src = src;
  overlay.style.cssText = `
    position: absolute;
    pointer-events: none;
    opacity: ${opacity / 100};
    z-index: 9999;
    ${Object.entries(position)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')};
  `;
  overlay.onerror = () => overlay.remove();
  parent.appendChild(overlay);
}

export const withVisualCompare: DecoratorFunction = (storyFn, context) => {
  const [globals] = useGlobals();
  const raw = globals[VISUAL_COMPARE_KEY] ?? { breakpoint: null, state: null, region: null, opacity: 50 };
  const rawOpacity = Number(raw.opacity);
  const state: VisualCompareState = {
    breakpoint: raw.breakpoint || null,
    state: raw.state || null,
    region: raw.region || null,
    opacity: Number.isFinite(rawOpacity) ? rawOpacity : 50,
  };
  const result = storyFn();

  const canvasElement = context.canvasElement as HTMLElement;

  // Clean up previous overlays
  canvasElement.querySelectorAll('[data-visual-compare-overlay]').forEach((el) => el.remove());

  if (!state.breakpoint || state.opacity <= 0) return result;

  const storyId = context.id;

  requestAnimationFrame(() => {
    fetchStory(storyId).then((story) => {
      // Clean again in case of race
      canvasElement.querySelectorAll('[data-visual-compare-overlay]').forEach((el) => el.remove());
      if (!story?.referenceDir) return;
      const regions = capturesFor(story, state.breakpoint!, state.state);
      applyOverlays(canvasElement, story.referenceDir, state, regions);
    });
  });

  return result;
};
