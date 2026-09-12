/**
 * Shared utilities for designbook components.
 */
import { designbookFileExists } from './designbookApi.js';

/**
 * Convert a section title to a kebab-case ID.
 * @param {string} title
 * @returns {string}
 */
export function toSectionId(title) {
  return title
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if a file exists via the designbook middleware.
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export { designbookFileExists as fileExists };
