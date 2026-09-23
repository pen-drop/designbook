/**
 * Runtime Renderer — sync, recursive, framework-agnostic.
 *
 * Traverses ComponentNode[] trees at browser runtime.
 * The only framework-specific point is ComponentModule.render() at each leaf.
 *
 * Runs in the browser after args.__scene has been set at build time.
 * Works with Storybook Controls because args.__scene is the data — modifiable at runtime.
 */

import type { ComponentNode, ComponentModule } from '../../scene-model/types';

/**
 * True when `value` is a Vue 3 VNode. Vue stamps every vnode it creates with
 * `__v_isVNode: true` — checking that marker lets us detect Vue output
 * without a static (or even dynamic) `import 'vue'` here; SDC/React/Twig
 * consumers never load this branch's code path. Single source of truth —
 * re-exported by `preview.ts` for the top-level render-result check.
 */
export function isVueVNode(value: unknown): boolean {
  return !!value && typeof value === 'object' && (value as Record<string, unknown>).__v_isVNode === true;
}

/**
 * Vue helpers needed to wrap a nested VNode result with `db:s:`/`db:e:`
 * comment markers (see `renderNode`). Threaded in from the generated CSF
 * module's own `import { createCommentVNode, Fragment } from 'vue';` (see
 * `defaultVueExtraImportLines` in scene-module-builder.ts) — never imported
 * statically here, so SDC-only installs never need the `vue` package.
 */
export interface VueMarkerHelpers {
  h: (type: unknown, propsOrChildren?: unknown, children?: unknown) => unknown;
  createCommentVNode: (text: string) => unknown;
  Fragment: unknown;
}

/**
 * Render a ComponentNode tree to the framework's native output
 * (React element, Vue vnode, HTML string, etc.).
 *
 * @param nodes - Single node or array of nodes to render
 * @param imports - Map of component ID → ComponentModule (from __imports)
 * @param vueHelpers - Optional Vue `createCommentVNode`/`Fragment` bindings,
 *   threaded from the generated CSF module when `frameworks.component: vue`,
 *   so nested Vue VNodes also get `db:s:`/`db:e:` inspect-overlay markers.
 * @returns Framework-specific output. Multiple string results are concatenated (HTML framework).
 */
export function renderComponent(
  nodes: ComponentNode | ComponentNode[],
  imports: Record<string, ComponentModule>,
  vueHelpers?: VueMarkerHelpers,
): unknown {
  const nodeArray = Array.isArray(nodes) ? nodes : [nodes];

  const rendered = nodeArray.map((node) => renderNode(node, imports, vueHelpers));

  if (rendered.length === 1) return rendered[0];

  // If all results are strings (HTML/Twig framework), concatenate into one HTML string
  if (rendered.every((r) => typeof r === 'string')) {
    return (rendered as string[]).join('');
  }

  return rendered;
}

function renderNode(
  node: ComponentNode,
  imports: Record<string, ComponentModule>,
  vueHelpers?: VueMarkerHelpers,
): unknown {
  const mod = imports[node.component];

  if (!mod) {
    console.warn(`[Designbook] renderComponent: no module for "${node.component}"`);
    return null;
  }

  const props = node.props ?? {};
  const slots = resolveSlots(node.slots ?? {}, imports, vueHelpers);

  const result = mod.render(props, slots);

  // Wrap HTML output with comment markers for inspect-overlay lookup.
  // The canonical path is threaded from view(); roots are non-empty ("0", …).
  if (typeof result === 'string') {
    const marker = node.path ? `${node.component}@${node.path}` : node.component;
    return `<!--db:s:${marker}-->${result}<!--db:e:${marker}-->`;
  }

  // Vue VNode output: wrap in a Fragment with comment-VNode markers so nested
  // Vue components get the same inspect-overlay boundaries as string output.
  // Without this, `findComponentBoundary` (inspect-overlay.ts) can only ever
  // resolve the single root VNode mounted by `mountVueRoot`.
  if (vueHelpers && isVueVNode(result)) {
    const marker = node.path ? `${node.component}@${node.path}` : node.component;
    const { h, createCommentVNode, Fragment } = vueHelpers;
    return h(Fragment, [createCommentVNode(`db:s:${marker}`), result, createCommentVNode(`db:e:${marker}`)]);
  }

  return result;
}

/**
 * Run Drupal.attachBehaviors over a rendered story root. Guarded so projects
 * without the Drupal runtime (no storybook-addon-sdc previewHead) no-op instead
 * of throwing. `once()` inside each behavior guards re-render double-binding.
 */
export function attachDrupalBehaviors(root: HTMLElement | undefined): void {
  const g = globalThis as unknown as {
    Drupal?: { attachBehaviors?: (r: Element, s?: unknown) => void };
    drupalSettings?: unknown;
  };
  if (root && g.Drupal?.attachBehaviors) {
    g.Drupal.attachBehaviors(root, g.drupalSettings);
  }
}

// ── Vue mount adapter ───────────────────────────────────────────────────

/**
 * Handle returned by `mountVueRoot`. Call `unmount()` on story teardown /
 * re-render to dispose the Vue app instance and remove the marker/mount
 * DOM nodes.
 */
export interface VueMountHandle {
  unmount: () => void;
}

/**
 * Mount a Vue VNode (as produced by the Vue `wrapImport`'s `h(...)` call) into
 * `container`, wrapping the mounted root with the same `db:s:<marker>` /
 * `db:e:<marker>` HTML-comment markers `renderNode` uses for string/HTML
 * output — the inspect overlay locates a rendered root by walking these
 * comment-node siblings regardless of framework.
 *
 * `vue` is imported dynamically so non-Vue projects (SDC, React) never need
 * it installed — this function is only reachable when a Vue story actually
 * renders.
 */
export async function mountVueRoot(
  node: ComponentNode,
  vnode: unknown,
  container: HTMLElement,
): Promise<VueMountHandle> {
  const { createApp } = await import('vue');

  const marker = node.path ? `${node.component}@${node.path}` : node.component;
  const startMarker = document.createComment(`db:s:${marker}`);
  const endMarker = document.createComment(`db:e:${marker}`);
  const mountPoint = document.createElement('div');

  container.appendChild(startMarker);
  container.appendChild(mountPoint);
  container.appendChild(endMarker);

  const app = createApp({ render: () => vnode });
  app.mount(mountPoint);

  return {
    unmount: () => {
      app.unmount();
      startMarker.remove();
      mountPoint.remove();
      endMarker.remove();
    },
  };
}

const PLACEHOLDER_STYLE =
  'border:1px dashed #ccc;border-radius:4px;padding:8px 12px;color:#999;font-size:11px;font-family:monospace;';

function resolveSlots(
  slots: Record<string, ComponentNode | ComponentNode[] | string | null | undefined>,
  imports: Record<string, ComponentModule>,
  vueHelpers?: VueMarkerHelpers,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(slots)) {
    if (value == null) {
      resolved[key] = '';
    } else if (typeof value === 'string') {
      // Render unresolved $variable placeholders as a visible grey box.
      // `renderComponent()` is framework-agnostic and this fallback feeds
      // both the HTML/Twig string path (raw markup) and the Vue `wrapImport`
      // slots object — a raw HTML string handed to Vue as slot content would
      // render as escaped text, so build a real VNode when Vue helpers are
      // threaded in (same defect class as the `designbook:placeholder`
      // built-in — see built-in-components.ts).
      if (/^\$\w+$/.test(value)) {
        resolved[key] = vueHelpers
          ? vueHelpers.h('div', { style: PLACEHOLDER_STYLE }, value)
          : `<div style="${PLACEHOLDER_STYLE}">${value}</div>`;
      } else {
        resolved[key] = value;
      }
    } else if (Array.isArray(value)) {
      resolved[key] = value.map((item) => renderNode(item, imports, vueHelpers));
    } else {
      resolved[key] = renderNode(value, imports, vueHelpers);
    }
  }

  return resolved;
}
