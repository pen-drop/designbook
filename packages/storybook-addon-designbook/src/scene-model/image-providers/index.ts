/**
 * Image Providers — generate placeholder image URLs for given dimensions.
 */

import type { DesignbookConfig } from '../types';

/** An image provider returns a URL for a given width × height. */
export type ImageProvider = (width: number, height: number) => string;

/** Picsum provider — generates random placeholder images. */
function createPicsumProvider(): ImageProvider {
  const usedIds = new Set<number>();

  return (width: number, height: number): string => {
    let id: number;
    do {
      id = Math.floor(Math.random() * 1001);
    } while (usedIds.has(id) && usedIds.size < 1000);
    usedIds.add(id);
    return `https://picsum.photos/id/${id}/${width}/${height}`;
  };
}

/** Create an image provider based on configuration. */
export function createProvider(config?: DesignbookConfig): ImageProvider {
  const type = config?.image_provider?.type ?? 'picsum';

  switch (type) {
    case 'picsum':
      return createPicsumProvider();
    default:
      console.warn(`[Designbook] Unknown image provider type: "${type}", falling back to picsum`);
      return createPicsumProvider();
  }
}
