/**
 * React runtime for `frameworks.component: react` — the only addon module that
 * imports React. Generated CSF modules import `reactHelpers` as `__dbReact`
 * (see `defaultReactExtraImportLines`); SDC/Vue/Twig stories never load it.
 *
 * Boundaries: React has no comment-node API, so each rendered ComponentNode is
 * a Fragment of `<template>` anchor + output + `<template>` anchor. A layout
 * effect inserts the `db:s:`/`db:e:` comments next to the anchors on every
 * commit and removes only those comments on cleanup. `<template>` is inert,
 * `display: none` and valid inside tables/lists, so no layout wrapper exists.
 */

import { createElement, Fragment, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { REACT_STORY, type ReactStoryOutput, type NodeRenderHelpers } from './renderer';

function Boundary({ marker, children }: { marker: string; children?: ReactNode }) {
  const start = useRef<HTMLTemplateElement>(null);
  const end = useRef<HTMLTemplateElement>(null);

  // No deps: re-place after every commit so reorders/moves keep the pair around the anchors.
  useLayoutEffect(() => {
    const open = document.createComment(`db:s:${marker}`);
    const close = document.createComment(`db:e:${marker}`);
    start.current?.before(open);
    end.current?.after(close);
    return () => {
      open.remove();
      close.remove();
    };
  });

  return createElement(
    Fragment,
    null,
    createElement('template', { ref: start }),
    children,
    createElement('template', { ref: end }),
  );
}

const PLACEHOLDER_STYLE: CSSProperties = {
  border: '1px dashed #ccc',
  borderRadius: 4,
  padding: '8px 12px',
  color: '#999',
  fontSize: 11,
  fontFamily: 'monospace',
};

/** `"font-size: 2px; color:red"` → `{ fontSize: '2px', color: 'red' }`. */
function styleObject(style: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of style.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const key = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    if (key) out[key] = decl.slice(i + 1).trim();
  }
  return out as CSSProperties;
}

/** HTML attribute map (story YAML) → React DOM props. */
function reactAttributes(attributes: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') out.className = value;
    else if (key === 'for') out.htmlFor = value;
    else if (key === 'style' && typeof value === 'string') out.style = styleObject(value);
    else out[key] = value;
  }
  return out;
}

interface ImageSource {
  media: string;
  src: string;
}

const builtIns: Record<string, (props: Record<string, unknown>) => ReactNode> = {
  'designbook:placeholder': (props) =>
    createElement('div', { style: PLACEHOLDER_STYLE }, (props.message as string) ?? 'placeholder'),

  // Trusted local story markup — same boundary as the HTML-string built-in.
  'designbook:element': (props) => {
    const value = (props.value as string) ?? '';
    return createElement((props.tag as string) || 'div', {
      ...reactAttributes(props.attributes as Record<string, unknown> | undefined),
      ...(value ? { dangerouslySetInnerHTML: { __html: value } } : {}),
    });
  },

  'designbook:image': (props) => {
    const sources = (props.sources ?? []) as ImageSource[];
    const fallback = props.fallback as { src: string; alt: string } | undefined;
    const alt = (props.alt as string) ?? fallback?.alt ?? '';
    const style = props.style as { aspectRatio: string; objectFit: string } | undefined;
    const responsiveStyles = (props.responsiveStyles ?? []) as { media: string; aspectRatio: string }[];
    const baseStyle: CSSProperties = style
      ? { aspectRatio: style.aspectRatio, objectFit: style.objectFit as CSSProperties['objectFit'], width: '100%' }
      : { width: '100%' };

    if (sources.length > 0 && fallback) {
      return createElement(
        'picture',
        null,
        ...sources.map((s, i) => createElement('source', { key: i, media: s.media, srcSet: s.src })),
        createElement('img', { key: 'img', src: fallback.src, alt, style: baseStyle }),
      );
    }

    const src = (props.src as string | undefined) ?? fallback?.src ?? '';
    if (responsiveStyles.length > 0) {
      const scopeId = 'dbi-' + Math.random().toString(36).slice(2, 8);
      const rules = responsiveStyles
        .map((rs) => `@media ${rs.media} { .${scopeId} { aspect-ratio:${rs.aspectRatio} !important; } }`)
        .join(' ');
      return createElement(
        Fragment,
        null,
        createElement('style', null, rules),
        createElement('img', { className: scopeId, src, alt, style: baseStyle }),
      );
    }
    return createElement('img', { src, alt, style: baseStyle });
  },
};

/** One React root per story container; `render` commits synchronously so markers exist on return. */
export function mountReact(container: HTMLElement) {
  const root = createRoot(container);
  return {
    render: (node: ReactNode) => flushSync(() => root.render(node)),
    unmount: () => root.unmount(),
  };
}

export const reactHelpers = {
  createElement,
  Fragment,
  builtIns,
  wrapNode: (marker: string, result: unknown) => createElement(Boundary, { key: marker, marker }, result as ReactNode),
  placeholder: (text: string) => createElement('div', { style: PLACEHOLDER_STYLE }, text),
  story: (node: unknown): ReactStoryOutput => ({ [REACT_STORY]: true, node, mount: mountReact }),
} satisfies NodeRenderHelpers & Record<string, unknown>;
