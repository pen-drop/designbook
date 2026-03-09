import { basename } from 'node:path';

/**
 * Declarative handler definition for scene-like files.
 * New file types = new entry — no method changes needed.
 */
export interface SceneHandler {
  /** File extension suffix to match (e.g., '.scenes.yml') */
  pattern: string;
  /** If the basename starts with this prefix, an overview (docs) entry is generated too */
  overviewPrefix?: string;
  /** If the basename contains this substring, an overview (docs) entry is generated too */
  overviewContains?: string;
}

export interface HandlerMatch {
  handler: SceneHandler;
  hasOverview: boolean;
}

/**
 * Default handler registry.
 * - All *.scenes.yml files produce canvas stories
 * - Files starting with 'spec.' or containing '.section.' also get an Overview docs page
 */
export const defaultHandlers: SceneHandler[] = [
  {
    pattern: '.scenes.yml',
    overviewPrefix: 'spec.',
    overviewContains: '.section.scenes.yml',
  },
];

/**
 * Match a file ID against the handler registry.
 * Returns the matched handler and whether an overview page should be generated.
 */
export function matchHandler(id: string, handlers: SceneHandler[] = defaultHandlers): HandlerMatch | null {
  const name = basename(id);

  for (const handler of handlers) {
    if (!id.endsWith(handler.pattern)) continue;

    const hasOverview =
      (handler.overviewPrefix != null && name.startsWith(handler.overviewPrefix)) ||
      (handler.overviewContains != null && name.includes(handler.overviewContains));

    return { handler, hasOverview };
  }

  return null;
}
