/**
 * Scene Metadata — shared utilities for scene file processing.
 *
 * Used by both the Storybook indexer (preset.ts) and the Vite plugin
 * loader (vite-plugin.ts) to extract metadata from parsed *.scenes.yml files.
 */

/**
 * Extract the group/title from a parsed scenes file.
 * Falls back to the file base name if no `name` property exists.
 */
export function extractGroup(parsed: Record<string, unknown>, fileBase: string): string {
  return (parsed?.name as string) || fileBase;
}

/**
 * Build a valid JS export name from a scene name.
 * "Ratgeber Detail" → "RatgeberDetail"
 * "pet-discovery-listing" → "PetDiscoveryListing"
 */
export function buildExportName(sceneName: string): string {
  return sceneName
    .split(/[\s-]+/)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
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
