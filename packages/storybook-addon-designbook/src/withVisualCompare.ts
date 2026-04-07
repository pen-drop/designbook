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

// Cache fetched regions keyed by storyId/breakpoint
const regionCache = new Map<string, RegionDef[]>();

async function fetchRegions(storyId: string, breakpoint: string): Promise<RegionDef[]> {
  const cacheKey = `${storyId}/${breakpoint}`;
  const cached = regionCache.get(cacheKey);
  if (cached) return cached;

  const metaUrl = `/__designbook/load?path=stories/${encodeURIComponent(storyId)}/meta.yml`;
  try {
    const res = await fetch(metaUrl);
    if (!res.ok) return [];
    const text = await res.text();
    let content: string;
    try {
      const json = JSON.parse(text) as { exists?: boolean; content?: string };
      if (!json.exists || !json.content) return [];
      content = json.content;
    } catch {
      content = text;
    }

    // Parse regions for the given breakpoint from meta.yml
    const regions = parseRegions(content, breakpoint);
    regionCache.set(cacheKey, regions);
    return regions;
  } catch {
    return [];
  }
}

function parseRegions(yamlContent: string, targetBp: string): RegionDef[] {
  const regions: RegionDef[] = [];
  let inBreakpoints = false;
  let currentBp: string | null = null;
  let inRegions = false;
  let currentRegion: string | null = null;

  for (const line of yamlContent.split('\n')) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (trimmed.startsWith('breakpoints:')) {
      inBreakpoints = true;
      continue;
    }
    if (!inBreakpoints) continue;

    // Breakpoint name (indent 4)
    if (indent === 4 && trimmed.endsWith(':') && !trimmed.includes(' ')) {
      currentBp = trimmed.slice(0, -1);
      inRegions = false;
      currentRegion = null;
      continue;
    }

    // Only parse the target breakpoint
    if (currentBp !== targetBp) continue;

    // regions: block (indent 6)
    if (indent === 6 && trimmed === 'regions:') {
      inRegions = true;
      continue;
    }

    // Exit regions block on non-region content at indent 6
    if (indent === 6 && inRegions && trimmed !== 'regions:') {
      inRegions = false;
      currentRegion = null;
    }

    if (!inRegions) continue;

    // Region name (indent 8, ends with colon)
    if (indent === 8 && trimmed.endsWith(':') && !trimmed.includes(' ')) {
      currentRegion = trimmed.slice(0, -1);
      continue;
    }

    // Region property (indent 10)
    if (indent === 10 && currentRegion) {
      const match = trimmed.match(/^selector:\s*"?([^"]+)"?$/);
      if (match) {
        regions.push({ name: currentRegion, selector: match[1]!.trim() });
      }
    }

    // Exit breakpoints block
    if (indent < 4 && trimmed.length > 0) break;
  }

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
