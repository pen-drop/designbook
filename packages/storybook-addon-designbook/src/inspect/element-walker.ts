// Element-property walker. Browser-side logic only — no node:* imports.
//
//   - walkDocument(doc, options): pure, jsdom-testable, returns CapturedSource
//   - PAGE_SCRIPT: serialized helpers + walkDocument for in-page eval()
//
// Node-side orchestration (launching Playwright, navigating, waiting, writing
// JSON) lives in ./capture.ts. The CapturedSource shape is source-agnostic:
// future Figma / screenshot walkers can produce the same shape.

export interface CapturedSourceViewport {
  width: number;
  height: number;
}

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CapturedSourceStyle {
  layout?: 'flex-row' | 'flex-col' | 'grid' | 'stack' | 'none';
  main_axis_align?: string;
  cross_axis_align?: string;
  gap?: string;
  padding: string;
  margin: string;
  border?: string;
  border_radius?: string;
  background: string;
  foreground?: string;
  font_family?: string;
  font_size?: string;
  font_weight?: string;
  line_height?: string;
  letter_spacing?: string;
  text_transform?: string;
}

export interface PropertyNode {
  id: string;
  parent_id?: string;
  child_ids: string[];
  label: string;
  kind: string;
  role?: string;
  heading_context?: string;
  bbox: BBox;
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  style: CapturedSourceStyle;
  source: { locator: string; raw?: object };
}

export interface CapturedSource {
  source_kind: string;
  source_ref: string;
  captured_at: string;
  viewport?: CapturedSourceViewport;
  adapter_version: string;
  nodes: PropertyNode[];
}

export interface WalkDocumentOptions {
  sourceRef?: string;
  viewport?: CapturedSourceViewport;
}

const ADAPTER_VERSION = 'url-playwright/0.1.0';

const ROLE_TAG_MAP: Record<string, string> = {
  HEADER: 'banner',
  NAV: 'navigation',
  MAIN: 'main',
  FOOTER: 'contentinfo',
  ASIDE: 'complementary',
  SECTION: 'region',
  FORM: 'form',
};

const KIND_TAG_MAP: Record<string, string> = {
  H1: 'heading',
  H2: 'heading',
  H3: 'heading',
  H4: 'heading',
  H5: 'heading',
  H6: 'heading',
  P: 'text',
  SPAN: 'text',
  LABEL: 'text',
  LI: 'list-item',
  UL: 'list',
  OL: 'list',
  A: 'link',
  BUTTON: 'button',
  INPUT: 'input',
  TEXTAREA: 'input',
  SELECT: 'input',
  IMG: 'image',
  SVG: 'icon',
  PICTURE: 'image',
  VIDEO: 'media',
  AUDIO: 'media',
  HEADER: 'container',
  NAV: 'container',
  MAIN: 'container',
  FOOTER: 'container',
  SECTION: 'section',
  ARTICLE: 'section',
  FORM: 'form',
};

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

function rgbToHex(value: string): string | undefined {
  if (!value) return '';
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i);
  if (!m) return value;
  const alpha = m[4] === undefined ? 1 : parseFloat(m[4]);
  if (alpha === 0) return undefined;
  const hex = (n: string) => Number(n).toString(16).padStart(2, '0');
  if (alpha >= 1) return `#${hex(m[1] as string)}${hex(m[2] as string)}${hex(m[3] as string)}`;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

function resolveBackground(cs: CSSStyleDeclaration): string {
  const c = cs.backgroundColor;
  const isTransparent = !c || c === 'transparent' || /rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(c);
  if (isTransparent) {
    return cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
  }
  const hex = rgbToHex(c);
  if (hex === undefined) {
    return cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
  }
  return hex || '';
}

function normalizeBox(top: string, right: string, bottom: string, left: string): string {
  const t = parseFloat(top) || 0;
  const r = parseFloat(right) || 0;
  const b = parseFloat(bottom) || 0;
  const l = parseFloat(left) || 0;
  if (t === b && r === l) return t === r ? `${t}` : `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
}

function mapLayout(display: string, flexDirection: string): CapturedSourceStyle['layout'] {
  if (display === 'flex' || display === 'inline-flex') {
    return flexDirection === 'column' || flexDirection === 'column-reverse' ? 'flex-col' : 'flex-row';
  }
  if (display === 'grid' || display === 'inline-grid') return 'grid';
  if (display === 'block' || display === 'inline-block') return 'stack';
  return 'none';
}

function mapAxisAlign(value: string): string | undefined {
  const map: Record<string, string> = {
    'flex-start': 'start',
    'flex-end': 'end',
    center: 'center',
    'space-between': 'space-between',
    'space-around': 'space-around',
    'space-evenly': 'space-evenly',
  };
  return map[value] || undefined;
}

function mapCrossAlign(value: string): string | undefined {
  const map: Record<string, string> = {
    'flex-start': 'start',
    'flex-end': 'end',
    center: 'center',
    stretch: 'stretch',
    baseline: 'baseline',
  };
  return map[value] || undefined;
}

function isVisible(style: CSSStyleDeclaration): boolean {
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) === 0) return false;
  // Note: zero-bbox check intentionally omitted — jsdom never lays out
  // elements, so width/height are always 0 in tests.
  return true;
}

function hashId(domPath: string, x: number, y: number, w: number, h: number): string {
  let hash = 0x811c9dc5;
  const input = `${domPath}|${x}|${y}|${w}|${h}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `n_${hash.toString(16).padStart(8, '0')}`;
}

function getDomPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1 && node.tagName !== 'HTML') {
    let segment = node.tagName.toLowerCase();
    if (node.parentElement) {
      const sameTag = Array.from(node.parentElement.children).filter((c) => c.tagName === node!.tagName);
      if (sameTag.length > 1) {
        segment += `:nth-of-type(${sameTag.indexOf(node) + 1})`;
      }
    }
    parts.unshift(segment);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

function findHeadingContext(el: Element): string | undefined {
  let node: Element | null = el;
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

function getRole(el: Element): string | undefined {
  const aria = el.getAttribute('role');
  if (aria) return aria;
  return ROLE_TAG_MAP[el.tagName];
}

function getKind(el: Element): string {
  return KIND_TAG_MAP[el.tagName] || 'container';
}

function getLabel(el: Element): string {
  if (HEADING_TAGS.has(el.tagName) && el.textContent) {
    return el.textContent.trim().slice(0, 200);
  }
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim().slice(0, 200);
  if (el.tagName === 'IMG') return el.getAttribute('alt') || el.tagName.toLowerCase();
  if (el.textContent && el.children.length === 0) {
    return el.textContent.trim().slice(0, 200);
  }
  return el.tagName.toLowerCase();
}

function buildStyle(el: Element, view: Window): CapturedSourceStyle {
  const cs = view.getComputedStyle(el);
  return {
    layout: mapLayout(cs.display, cs.flexDirection),
    main_axis_align: mapAxisAlign(cs.justifyContent),
    cross_axis_align: mapCrossAlign(cs.alignItems),
    gap: cs.gap && cs.gap !== 'normal' ? cs.gap : undefined,
    padding: normalizeBox(cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft),
    margin: normalizeBox(cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft),
    border:
      cs.borderWidth && parseFloat(cs.borderWidth) > 0
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

export function walkDocument(doc: Document, options: WalkDocumentOptions = {}): CapturedSource {
  const view = (doc.defaultView ?? globalThis) as unknown as Window;
  const nodes: PropertyNode[] = [];

  function visit(el: Element, parentId: string | null): PropertyNode | null {
    const cs = view.getComputedStyle(el);
    if (!isVisible(cs)) return null;
    const rect = el.getBoundingClientRect();
    const domPath = getDomPath(el);
    const id = hashId(domPath, rect.x, rect.y, rect.width, rect.height);

    const node: PropertyNode = {
      id,
      ...(parentId ? { parent_id: parentId } : {}),
      child_ids: [],
      label: getLabel(el),
      kind: getKind(el),
      role: getRole(el),
      heading_context: findHeadingContext(el),
      bbox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      text: el.children.length === 0 && el.textContent ? el.textContent.trim().slice(0, 200) || undefined : undefined,
      href: el.getAttribute('href') || undefined,
      src: el.getAttribute('src') || undefined,
      alt: el.getAttribute('alt') || undefined,
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

// Self-contained source string for in-page evaluation. walkDocument.toString()
// alone strips module-scoped helpers; re-assemble all dependencies in order so
// a single eval() in the browser context makes walkDocument callable.
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
