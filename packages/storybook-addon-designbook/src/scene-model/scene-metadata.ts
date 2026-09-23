/**
 * Scene Metadata — shared utilities for scene file processing.
 *
 * Used by both the Storybook indexer (preset.ts) and the Vite plugin
 * loader (vite-plugin.ts) to extract metadata from parsed *.scenes.yml files.
 */

import { basename } from 'node:path';

/**
 * Extract the group/title from a parsed scenes file.
 * Falls back to the file base name if no `name` property exists.
 */
export function extractGroup(parsed: Record<string, unknown>, fileBase: string): string {
  return (parsed?.group as string) || (parsed?.name as string) || fileBase;
}

/**
 * Build a valid JS export name from a scene name.
 * "Ratgeber Detail" → "RatgeberDetail"
 * "pet-discovery-listing" → "PetDiscoveryListing"
 */
export function buildExportName(sceneName: string): string {
  return sceneName
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Build the export name for a form-mode story: `Form` + the mode's export name.
 * "default" → "FormDefault". Shared by the entity module builder (the emitted
 * export) and the form indexer (the index entry) so the two never diverge —
 * the same indexer/loader parity the scene path already depends on.
 */
export function formExportName(formMode: string): string {
  return 'Form' + buildExportName(formMode);
}

/**
 * Extract the scenes array from a parsed YAML object.
 * Supports both the new `scenes[]` format and legacy flat format.
 */
export function extractScenes(parsed: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(parsed?.scenes)) {
    return parsed.scenes as Record<string, unknown>[];
  }
  // Legacy: treat entire file as single scene
  return [parsed];
}

/**
 * Extract the file base name from a scenes file path.
 * "/path/to/ratgeber.scenes.yml" → "ratgeber"
 */
export function fileBaseName(fileName: string): string {
  const baseName = fileName.split('/').pop() || '';
  return baseName.replace('.scenes.yml', '');
}

/**
 * Parse a standalone component story file name into its component name and
 * variant segments. `<name>.<variant>.story.yml` → `{ name, variant }`.
 * Returns `null` when the file name doesn't match the pattern (e.g. missing
 * variant segment).
 */
export function parseComponentStoryFileName(fileName: string): { name: string; variant: string } | null {
  const match = basename(fileName).match(/^(.+)\.([^.]+)\.story\.yml$/);
  if (!match) return null;
  const [, name, variant] = match;
  if (!name || !variant) return null;
  return { name, variant };
}

/**
 * Humanize a kebab/snake-case component or variant segment into a readable
 * display string. "book-card" → "Book Card", "sale_event" → "Sale Event".
 */
export function humanizeComponentName(name: string): string {
  return name
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Storybook title group for a standalone component story. Shared by the
 * indexer (preset.ts) and the loader (vite-plugin.ts) so index titles and
 * loaded-story titles never diverge — same convention as `entityStoryGroup`.
 */
export function componentStoryGroup(name: string): string {
  return `Components/${humanizeComponentName(name)}`;
}
