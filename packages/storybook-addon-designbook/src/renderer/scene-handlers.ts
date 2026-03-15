export interface SceneHandler {
  /** File extension suffix to match (e.g., '.scenes.yml') */
  pattern: string;
}

export interface HandlerMatch {
  handler: SceneHandler;
}

/**
 * Default handler registry.
 * Every *.scenes.yml file gets both canvas stories and a docs overview page.
 */
export const defaultHandlers: SceneHandler[] = [{ pattern: '.scenes.yml' }];

/**
 * Match a file ID against the handler registry.
 */
export function matchHandler(id: string, handlers: SceneHandler[] = defaultHandlers): HandlerMatch | null {
  for (const handler of handlers) {
    if (!id.endsWith(handler.pattern)) continue;
    return { handler };
  }
  return null;
}
