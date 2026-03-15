/**
 * SceneNodeRenderService — priority-based renderer registry.
 *
 * Dispatches scene nodes to the first matching renderer,
 * ordered by priority (highest first). Falls back to a
 * placeholder comment for unhandled nodes.
 */

import type { SceneNode, SceneNodeRenderer, RenderContext } from './types';

export class SceneNodeRenderService {
  private renderers: SceneNodeRenderer[] = [];
  private debug: boolean;

  constructor(options?: { debug?: boolean }) {
    this.debug = options?.debug ?? false;
  }

  /**
   * Register one or more renderers. Re-sorts by priority after each call.
   */
  register(renderers: SceneNodeRenderer[]): void {
    this.renderers.push(...renderers);
    // Sort descending by priority (higher = first)
    this.renderers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Render a scene node by dispatching to the first matching renderer.
   */
  render(node: SceneNode, ctx: RenderContext): string {
    for (const renderer of this.renderers) {
      if (renderer.appliesTo(node)) {
        if (this.debug) {
          console.log(`[Designbook] Renderer '${renderer.name}' handled node type '${node.type}'`);
        }
        return renderer.render(node, ctx);
      }
    }

    // Fallback: no renderer matched
    if (this.debug) {
      console.warn(`[Designbook] No renderer found for node type '${node.type}'`);
    }
    return `'' /* [Designbook] no renderer for node type '${node.type}' */`;
  }

  /**
   * Get the list of registered renderers (for debugging/testing).
   */
  getRenderers(): readonly SceneNodeRenderer[] {
    return this.renderers;
  }
}
