/**
 * Built-in components — inline render functions for `designbook:*` prefixed components.
 *
 * These are resolved in csf-prep.ts without external imports.
 * Each entry implements the ComponentModule interface: { render: (props, slots) => string }.
 */

import type { ComponentModule } from './types';

/**
 * Ambient-only declaration for Vue's `h()` — erased at compile time (no runtime
 * emit), so it never becomes part of this file's actual JS. It exists purely so
 * `vueBuiltInComponents` below typechecks; at runtime the `h` identifier it
 * references resolves against the *generated* CSF module's own `import { h }
 * from 'vue';` once the render function's `.toString()` is re-embedded there
 * (see csf-prep.ts `emitComponentImports`) — never against this file's scope.
 */
declare const h: (type: string, propsOrChildren?: unknown, children?: unknown) => unknown;

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

/**
 * Vue variant of the built-in components — used instead of `builtInComponents`
 * when `frameworks.component: vue` (threaded as the `builtInComponents` option
 * alongside `extraImportLines`/`wrapImport`, same opt-in pattern established
 * for the Vue component resolver). Returns `h(...)` VNodes instead of HTML
 * strings so no `v-html`/escaping is needed.
 *
 * These render functions are serialized via `.toString()` and re-embedded
 * verbatim into the generated CSF module (see csf-prep.ts `emitComponentImports`),
 * so `h` here resolves against that module's own top-level import — never a
 * closure over this file's scope — which is why `h` is never imported here.
 */
export const vueBuiltInComponents: Record<string, ComponentModule> = {
  'designbook:placeholder': builtInComponents['designbook:placeholder']!,

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
        return h('picture', [
          ...sources.map((s) => h('source', { media: s.media, srcset: s.src })),
          h('img', { src: fallback.src, alt, style: baseStyle }),
        ]);
      }

      // CSS mode: <img> with aspect-ratio + optional responsive <style>
      const imgSrc = src ?? fallback?.src ?? '';
      const scopeId = 'dbi-' + Math.random().toString(36).slice(2, 8);

      if (responsiveStyles.length > 0) {
        const mediaRules = responsiveStyles
          .map((rs) => `@media ${rs.media} { .${scopeId} { aspect-ratio:${rs.aspectRatio} !important; } }`)
          .join(' ');

        return h('span', [h('style', mediaRules), h('img', { class: scopeId, src: imgSrc, alt, style: baseStyle })]);
      }

      return h('img', { src: imgSrc, alt, style: baseStyle });
    },
  },
};
