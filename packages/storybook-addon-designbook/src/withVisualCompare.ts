import { useGlobals } from 'storybook/preview-api';
import type { DecoratorFunction } from 'storybook/internal/types';

import { VISUAL_COMPARE_KEY } from './constants';

interface VisualCompareState {
  breakpoint: string | null;
  opacity: number;
}

export const withVisualCompare: DecoratorFunction = (storyFn, context) => {
  const [globals] = useGlobals();
  const state: VisualCompareState = globals[VISUAL_COMPARE_KEY] ?? { breakpoint: null, opacity: 50 };
  const result = storyFn();

  if (!state.breakpoint) return result;

  const storyId = context.id;
  const src = `/__designbook/load?path=screenshots/${encodeURIComponent(storyId)}/reference/${encodeURIComponent(state.breakpoint)}.png`;

  // Create the overlay image element
  const canvasElement = context.canvasElement as HTMLElement;

  // Clean up any previous overlay
  const existing = canvasElement.querySelector('[data-visual-compare-overlay]');
  if (existing) existing.remove();

  // Use requestAnimationFrame to ensure the story has rendered before adding overlay
  requestAnimationFrame(() => {
    // Check the element is still in the DOM
    if (!canvasElement.isConnected) return;

    const overlay = document.createElement('img');
    overlay.dataset.visualCompareOverlay = 'true';
    overlay.src = src;
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      pointer-events: none;
      opacity: ${state.opacity / 100};
      z-index: 9999;
    `;
    // Handle 404 — don't show broken image
    overlay.onerror = () => overlay.remove();

    // Ensure the canvas element is positioned for absolute overlay
    const position = getComputedStyle(canvasElement).position;
    if (position === 'static') {
      canvasElement.style.position = 'relative';
    }

    canvasElement.appendChild(overlay);
  });

  return result;
};
