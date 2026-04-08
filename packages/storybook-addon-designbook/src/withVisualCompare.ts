import { useGlobals } from 'storybook/preview-api';
import type { DecoratorFunction } from 'storybook/internal/types';

import { VISUAL_COMPARE_KEY } from './constants';

interface VisualCompareState {
  breakpoint: string | null;
  region: string | null; // null = all regions, specific name = single region
  opacity: number;
}

interface RegionDef {
  name: string;
  selector: string;
}

interface StoryCheck {
  breakpoint: string;
  region: string;
  selector?: string;
}

interface StoryJSON {
  checks: StoryCheck[];
}

// Cache fetched regions keyed by storyId/breakpoint
const regionCache = new Map<string, RegionDef[]>();
// Cache the full story fetch to avoid multiple requests per breakpoint
const storyCache = new Map<string, Promise<StoryJSON | null>>();

function fetchStory(storyId: string): Promise<StoryJSON | null> {
  const cached = storyCache.get(storyId);
  if (cached) return cached;

  const promise = fetch(`/__designbook/story/${encodeURIComponent(storyId)}`)
    .then((res) => (res.ok ? (res.json() as Promise<StoryJSON>) : null))
    .catch(() => null);

  storyCache.set(storyId, promise);
  return promise;
}

async function fetchRegions(storyId: string, breakpoint: string): Promise<RegionDef[]> {
  const cacheKey = `${storyId}/${breakpoint}`;
  const cached = regionCache.get(cacheKey);
  if (cached) return cached;

  const story = await fetchStory(storyId);
  if (!story?.checks) return [];

  const regions = story.checks
    .filter((c) => c.breakpoint === breakpoint)
    .map((c) => ({ name: c.region, selector: c.selector ?? c.region }));

  regionCache.set(cacheKey, regions);
  return regions;
}

function applyOverlays(canvasElement: HTMLElement, storyId: string, state: VisualCompareState, regions: RegionDef[]) {
  if (!canvasElement.isConnected) return;

  const position = getComputedStyle(canvasElement).position;
  if (position === 'static') {
    canvasElement.style.position = 'relative';
  }

  const filtered = state.region ? regions.filter((r) => r.name === state.region) : regions;
  const canvasRect = canvasElement.getBoundingClientRect();

  for (const region of filtered) {
    const src = `/__designbook/load?path=stories/${encodeURIComponent(storyId)}/screenshots/reference/${encodeURIComponent(state.breakpoint!)}--${encodeURIComponent(region.name)}.png`;

    if (!region.selector) {
      // "full" region — full-page overlay
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
  const raw = globals[VISUAL_COMPARE_KEY] ?? { breakpoint: null, region: null, opacity: 50 };
  const rawOpacity = Number(raw.opacity);
  const state: VisualCompareState = {
    breakpoint: raw.breakpoint || null,
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
    fetchRegions(storyId, state.breakpoint!).then((regions) => {
      // Clean again in case of race
      canvasElement.querySelectorAll('[data-visual-compare-overlay]').forEach((el) => el.remove());
      applyOverlays(canvasElement, storyId, state, regions);
    });
  });

  return result;
};
