/**
 * Image utilities — shared helpers for image style resolution.
 */

/**
 * Parse an aspect ratio string (e.g. "16:9") into width and height components.
 * Throws if the format is invalid.
 */
export function parseAspectRatio(ratio: string): { w: number; h: number } {
  const match = ratio.match(/^(\d+):(\d+)$/);
  if (!match) {
    throw new Error(`Invalid aspect ratio format: "${ratio}" — expected "W:H" (e.g. "16:9")`);
  }
  const w = Number(match[1]);
  const h = Number(match[2]);
  if (w <= 0 || h <= 0) {
    throw new Error(`Invalid aspect ratio: "${ratio}" — width and height must be positive`);
  }
  return { w, h };
}

/**
 * Calculate pixel height from a width and aspect ratio.
 */
export function calcHeight(width: number, ratio: { w: number; h: number }): number {
  return Math.round((width * ratio.h) / ratio.w);
}
