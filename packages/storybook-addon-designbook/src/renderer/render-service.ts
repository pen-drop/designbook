/**
 * ScreenNodeRenderService — priority-based renderer registry.
 *
 * Dispatches screen nodes to the first matching renderer,
 * ordered by priority (highest first). Falls back to a
 * placeholder comment for unhandled nodes.
 */

import type { ScreenNode, ScreenNodeRenderer, RenderContext } from './types';

export class ScreenNodeRenderService {
  private renderers: ScreenNodeRenderer[] = [];
  private debug: boolean;

  constructor(options?: { debug?: boolean }) {
    this.debug = options?.debug ?? false;
  }

  /**
   * Register one or more renderers. Re-sorts by priority after each call.
   */
  register(renderers: ScreenNodeRenderer[]): void {
    this.renderers.push(...renderers);
    // Sort descending by priority (higher = first)
    this.renderers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Render a screen node by dispatching to the first matching renderer.
   */
  render(node: ScreenNode, ctx: RenderContext): string {
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
    return `/* [Designbook] no renderer for node type '${node.type}' */`;
  }

  /**
   * Get the list of registered renderers (for debugging/testing).
   */
  getRenderers(): readonly ScreenNodeRenderer[] {
    return this.renderers;
  }
}
