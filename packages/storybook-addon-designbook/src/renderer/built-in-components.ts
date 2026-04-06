/**
 * Built-in components — inline render functions for `designbook:*` prefixed components.
 *
 * These are resolved in csf-prep.ts without external imports.
 * Each entry implements the ComponentModule interface: { render: (props, slots) => string }.
 */

import type { ComponentModule } from './types';


interface ImageSource {
  media: string;
  src: string;
}

interface ImageFallback {
  src: string;
  alt: string;
}

interface ImageStyle {
  aspectRatio: string;
  objectFit: string;
}

interface ResponsiveStyle {
  media: string;
  aspectRatio: string;
}

export const builtInComponents: Record<string, ComponentModule> = {
  'designbook:placeholder': {
    render: (props) => {
      const message = (props.message as string) ?? 'placeholder';
      return `<div style="border:1px dashed #ccc;border-radius:4px;padding:8px 12px;color:#999;font-size:11px;font-family:monospace;">${message}</div>`;
    },
  },

  'designbook:image': {
    render: (props) => {
      const sources = (props.sources ?? []) as ImageSource[];
      const fallback = props.fallback as ImageFallback | undefined;
      const src = props.src as string | undefined;
      const alt = (props.alt as string) ?? fallback?.alt ?? '';
      const style = props.style as ImageStyle | undefined;
      const responsiveStyles = (props.responsiveStyles ?? []) as ResponsiveStyle[];

      const baseStyle = style
        ? `aspect-ratio:${style.aspectRatio};object-fit:${style.objectFit};width:100%`
        : 'width:100%';

      // Provider mode: <picture> with sources
      if (sources.length > 0 && fallback) {
        const sourceTags = sources.map((s) => `<source media="${s.media}" srcset="${s.src}">`).join('');
        return `<picture>${sourceTags}<img src="${fallback.src}" alt="${alt}" style="${baseStyle}"></picture>`;
      }

      // CSS mode: <img> with aspect-ratio + optional responsive <style>
      const imgSrc = src ?? fallback?.src ?? '';
      const scopeId = 'dbi-' + Math.random().toString(36).slice(2, 8);

      if (responsiveStyles.length > 0) {
        const mediaRules = responsiveStyles
          .map((rs) => `@media ${rs.media} { .${scopeId} { aspect-ratio:${rs.aspectRatio} !important; } }`)
          .join(' ');

        return `<style>${mediaRules}</style><img class="${scopeId}" src="${imgSrc}" alt="${alt}" style="${baseStyle}">`;
      }

      return `<img src="${imgSrc}" alt="${alt}" style="${baseStyle}">`;
    },
  },
};
