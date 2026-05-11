// Element-property walker. Browser-side code only.
//
//   - walkDocument(doc, options): pure, jsdom-testable, returns CapturedSource
//   - PAGE_SCRIPT: serialized helpers + walkDocument for in-page eval
//
// Node-side orchestration (launching Playwright, navigating, waiting for
// SPA hydration / redirects, writing the JSON) lives in the region-properties
// resolver. This file does not import anything from `node:*`.
//
// The shape is source-agnostic. Future Figma / screenshot walkers can return
// the same CapturedSource via different production paths.

const ADAPTER_VERSION = 'url-playwright/0.1.0';

const ROLE_TAG_MAP = {
  HEADER: 'banner',
  NAV: 'navigation',
  MAIN: 'main',
  FOOTER: 'contentinfo',
  ASIDE: 'complementary',
  SECTION: 'region',
  FORM: 'form',
};

const KIND_TAG_MAP = {
  H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading', H5: 'heading', H6: 'heading',
  P: 'text', SPAN: 'text', LABEL: 'text', LI: 'list-item',
  UL: 'list', OL: 'list',
  A: 'link', BUTTON: 'button',
  INPUT: 'input', TEXTAREA: 'input', SELECT: 'input',
  IMG: 'image', SVG: 'icon', PICTURE: 'image',
  VIDEO: 'media', AUDIO: 'media',
  HEADER: 'container', NAV: 'container', MAIN: 'container',
  FOOTER: 'container', SECTION: 'section', ARTICLE: 'section',
  FORM: 'form',
};

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

function rgbToHex(value) {
  if (!value) return '';
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i);
  if (!m) return value;
  const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
  if (alpha === 0) return undefined;
  const hex = (n) => Number(n).toString(16).padStart(2, '0');
  if (alpha >= 1) return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

function resolveBackground(cs) {
  const c = cs.backgroundColor;
  const isTransparent =
    !c || c === 'transparent' || /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(c);
  if (isTransparent) {
    return cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
  }
  const hex = rgbToHex(c);
  if (hex === undefined) {
    return cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
  }
  return hex || '';
}

function normalizeBox(top, right, bottom, left) {
  const t = parseFloat(top) || 0;
  const r = parseFloat(right) || 0;
  const b = parseFloat(bottom) || 0;
  const l = parseFloat(left) || 0;
  if (t === b && r === l) return t === r ? `${t}` : `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
}

function mapLayout(display, flexDirection) {
  if (display === 'flex' || display === 'inline-flex') {
    return flexDirection === 'column' || flexDirection === 'column-reverse'
      ? 'flex-col'
      : 'flex-row';
  }
  if (display === 'grid' || display === 'inline-grid') return 'grid';
  if (display === 'block' || display === 'inline-block') return 'stack';
  return 'none';
}

function mapAxisAlign(value) {
  const map = {
    'flex-start': 'start',
    'flex-end': 'end',
    'center': 'center',
    'space-between': 'space-between',
    'space-around': 'space-around',
    'space-evenly': 'space-evenly',
  };
  return map[value] || undefined;
}

function mapCrossAlign(value) {
  const map = {
    'flex-start': 'start',
    'flex-end': 'end',
    'center': 'center',
    'stretch': 'stretch',
    'baseline': 'baseline',
  };
  return map[value] || undefined;
}

function isVisible(el, style) {
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) === 0) return false;
  // Note: zero-bbox check intentionally omitted — jsdom never lays out
  // elements, so width/height are always 0 in tests. In Playwright the
  // display/visibility/opacity gates already catch the common invisible cases.
  return true;
}

function hashId(domPath, x, y, w, h) {
  let hash = 0x811c9dc5;
  const input = `${domPath}|${x}|${y}|${w}|${h}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `n_${hash.toString(16).padStart(8, '0')}`;
}

function getDomPath(el) {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && node.tagName !== 'HTML') {
    let segment = node.tagName.toLowerCase();
    if (node.parentElement) {
      const sameTag = Array.from(node.parentElement.children).filter(
        (c) => c.tagName === node.tagName,
      );
      if (sameTag.length > 1) {
        segment += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
    }
    parts.unshift(segment);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

function findHeadingContext(el) {
  let node = el;
  while (node && node !== node.ownerDocument.documentElement) {
    const prev = node.previousElementSibling;
    if (prev) {
      if (HEADING_TAGS.has(prev.tagName)) {
        const t = prev.textContent ? prev.textContent.trim() : '';
        if (t) return t.slice(0, 200);
      }
      const inner = prev.querySelector && prev.querySelector('h1, h2, h3, h4, h5, h6');
      if (inner && inner.textContent) {
        const t = inner.textContent.trim();
        if (t) return t.slice(0, 200);
      }
    }
    node = node.parentElement;
  }
  return undefined;
}

function getRole(el) {
  const aria = el.getAttribute && el.getAttribute('role');
  if (aria) return aria;
  return ROLE_TAG_MAP[el.tagName];
}

function getKind(el) {
  return KIND_TAG_MAP[el.tagName] || 'container';
}

function getLabel(el) {
  if (HEADING_TAGS.has(el.tagName) && el.textContent) {
    return el.textContent.trim().slice(0, 200);
  }
  const aria = el.getAttribute && el.getAttribute('aria-label');
  if (aria) return aria.trim().slice(0, 200);
  if (el.tagName === 'IMG') return el.getAttribute('alt') || el.tagName.toLowerCase();
  if (el.textContent && el.children.length === 0) {
    return el.textContent.trim().slice(0, 200);
  }
  return el.tagName.toLowerCase();
}

function buildStyle(el, view) {
  const cs = view.getComputedStyle(el);
  return {
    layout: mapLayout(cs.display, cs.flexDirection),
    main_axis_align: mapAxisAlign(cs.justifyContent),
    cross_axis_align: mapCrossAlign(cs.alignItems),
    gap: cs.gap && cs.gap !== 'normal' ? cs.gap : undefined,
    padding: normalizeBox(cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft),
    margin: normalizeBox(cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft),
    border: cs.borderWidth && parseFloat(cs.borderWidth) > 0
      ? `${cs.borderWidth} ${cs.borderStyle} ${rgbToHex(cs.borderColor) || cs.borderColor}`
      : undefined,
    border_radius: cs.borderRadius && cs.borderRadius !== '0px' ? cs.borderRadius : undefined,
    background: resolveBackground(cs),
    foreground: rgbToHex(cs.color),
    font_family: cs.fontFamily,
    font_size: cs.fontSize,
    font_weight: cs.fontWeight,
    line_height: cs.lineHeight && cs.lineHeight !== 'normal' ? cs.lineHeight : undefined,
    letter_spacing: cs.letterSpacing && cs.letterSpacing !== 'normal' ? cs.letterSpacing : undefined,
    text_transform: cs.textTransform && cs.textTransform !== 'none' ? cs.textTransform : undefined,
  };
}

export function walkDocument(doc, options = {}) {
  const view = doc.defaultView || globalThis;
  const nodes = [];

  function visit(el, parentId) {
    const cs = view.getComputedStyle(el);
    if (!isVisible(el, cs)) return null;
    const rect = el.getBoundingClientRect();
    const domPath = getDomPath(el);
    const id = hashId(domPath, rect.x, rect.y, rect.width, rect.height);

    const node = {
      id,
      // Omit parent_id entirely for the root — schema reserves null for "absent".
      ...(parentId ? { parent_id: parentId } : {}),
      child_ids: [],
      label: getLabel(el),
      kind: getKind(el),
      role: getRole(el),
      heading_context: findHeadingContext(el),
      bbox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      text: el.children.length === 0 && el.textContent
        ? el.textContent.trim().slice(0, 200) || undefined
        : undefined,
      href: (el.getAttribute && el.getAttribute('href')) || undefined,
      src: (el.getAttribute && el.getAttribute('src')) || undefined,
      alt: (el.getAttribute && el.getAttribute('alt')) || undefined,
      style: buildStyle(el, view),
      source: { locator: domPath, raw: undefined },
    };

    nodes.push(node);
    for (const child of Array.from(el.children)) {
      const childNode = visit(child, id);
      if (childNode) node.child_ids.push(childNode.id);
    }
    return node;
  }

  visit(doc.body, null);

  return {
    source_kind: 'url-dom',
    source_ref: options.sourceRef || '',
    captured_at: new Date().toISOString(),
    viewport: options.viewport,
    adapter_version: ADAPTER_VERSION,
    nodes,
  };
}

// Self-contained source string for in-page evaluation. `walkDocument.toString()`
// alone strips module-scoped helpers; we re-assemble all dependencies here in
// dependency order so a single eval() in the browser context makes
// `walkDocument` callable.
export const PAGE_SCRIPT = [
  `const ADAPTER_VERSION = ${JSON.stringify(ADAPTER_VERSION)};`,
  `const ROLE_TAG_MAP = ${JSON.stringify(ROLE_TAG_MAP)};`,
  `const KIND_TAG_MAP = ${JSON.stringify(KIND_TAG_MAP)};`,
  `const HEADING_TAGS = new Set(${JSON.stringify([...HEADING_TAGS])});`,
  rgbToHex.toString(),
  resolveBackground.toString(),
  normalizeBox.toString(),
  mapLayout.toString(),
  mapAxisAlign.toString(),
  mapCrossAlign.toString(),
  isVisible.toString(),
  hashId.toString(),
  getDomPath.toString(),
  findHeadingContext.toString(),
  getRole.toString(),
  getKind.toString(),
  getLabel.toString(),
  buildStyle.toString(),
  walkDocument.toString(),
].join('\n\n');
