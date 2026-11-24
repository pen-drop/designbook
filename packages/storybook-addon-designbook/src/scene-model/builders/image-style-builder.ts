/**
 * Image Style Builder — resolves `type: 'image'` scene nodes.
 *
 * Reads image style definitions from dataModel.image_styles,
 * uses the configured image provider (or CSS fallback),
 * and returns a `designbook:image` ComponentNode.
 */

import type { SceneNodeBuilder, SceneNode, BuildContext, BuildResult, ImageStyleDef } from '../types';
import { parseAspectRatio, calcHeight } from '../image-utils';
import { createProvider } from '../image-providers';

const DEFAULT_WIDTH = 800;

const META = { kind: 'component' as const };

export const imageStyleBuilder: SceneNodeBuilder = {
  appliesTo(node: SceneNode): boolean {
    return 'image' in node && typeof node.image === 'string';
  },

  async build(node: SceneNode, ctx: BuildContext): Promise<BuildResult> {
    const styleName = node['image'] as string | undefined;
    const alt = (node['alt'] as string) ?? '';
    const src = node['src'] as string | undefined;

    if (!styleName) {
      return {
        nodes: [
          {
            component: 'designbook:placeholder',
            props: { message: 'image node missing style name' },
          },
        ],
        meta: META,
      };
    }

    const styleDef = ctx.dataModel.config?.['image_style']?.[styleName] as unknown as ImageStyleDef | undefined;
    if (!styleDef) {
      return {
        nodes: [
          {
            component: 'designbook:placeholder',
            props: { message: `unknown image style: ${styleName}` },
          },
        ],
        meta: META,
      };
    }

    const defaultRatio = parseAspectRatio(styleDef.aspect_ratio);

    // CSS mode: custom image with src — use CSS aspect-ratio
    if (src) {
      const style = {
        aspectRatio: `${defaultRatio.w}/${defaultRatio.h}`,
        objectFit: 'cover',
      };

      const responsiveStyles = buildResponsiveStyles(styleDef.breakpoints);

      return {
        nodes: [
          {
            component: 'designbook:image',
            props: { src, alt, style, responsiveStyles },
          },
        ],
        meta: META,
      };
    }

    // Provider mode: no src — generate URLs via provider
    const provider = createProvider(ctx.config);
    const breakpoints = styleDef.breakpoints ?? {};
    const sortedBreakpoints = Object.entries(breakpoints).sort(([, a], [, b]) => b.width - a.width);

    const sources = sortedBreakpoints.map(([, bp]) => {
      const ratio = bp.aspect_ratio ? parseAspectRatio(bp.aspect_ratio) : defaultRatio;
      const height = calcHeight(bp.width, ratio);
      return {
        media: `(min-width: ${bp.width}px)`,
        src: provider(bp.width, height),
      };
    });

    // Fallback: use smallest breakpoint width, or default
    const smallestWidth =
      sortedBreakpoints.length > 0 ? sortedBreakpoints[sortedBreakpoints.length - 1]![1].width : DEFAULT_WIDTH;
    const smallestBp = sortedBreakpoints.length > 0 ? sortedBreakpoints[sortedBreakpoints.length - 1]![1] : undefined;
    const fallbackRatio = smallestBp?.aspect_ratio ? parseAspectRatio(smallestBp.aspect_ratio) : defaultRatio;
    const fallbackHeight = calcHeight(smallestWidth, fallbackRatio);

    const fallback = {
      src: provider(smallestWidth, fallbackHeight),
      alt,
    };

    const style = {
      aspectRatio: `${defaultRatio.w}/${defaultRatio.h}`,
      objectFit: 'cover',
    };

    return {
      nodes: [
        {
          component: 'designbook:image',
          props: { sources, fallback, style },
        },
      ],
      meta: META,
    };
  },
};

function buildResponsiveStyles(
  breakpoints: Record<string, { width: number; aspect_ratio?: string }> | undefined,
): Array<{ media: string; aspectRatio: string }> {
  if (!breakpoints) return [];

  return Object.entries(breakpoints)
    .filter(([, bp]) => bp.aspect_ratio)
    .sort(([, a], [, b]) => b.width - a.width)
    .map(([, bp]) => {
      const ratio = parseAspectRatio(bp.aspect_ratio!);
      return {
        media: `(max-width: ${bp.width}px)`,
        aspectRatio: `${ratio.w}/${ratio.h}`,
      };
    });
}
