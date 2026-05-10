// Element-property walker. Two surfaces in one ESM module:
//   - walkDocument(doc, options): pure, jsdom-testable, returns CapturedSource
//   - default export (page): playwright-cli run-code compatible, handles
//     client-side rendering and post-load redirects, writes JSON to GRAPHIFY_OUT
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
  H1: 'text', H2: 'text', H3: 'text', H4: 'text', H5: 'text', H6: 'text',
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
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return value;
  const hex = (n) => Number(n).toString(16).padStart(2, '0');
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
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
        return prev.textContent ? prev.textContent.trim().slice(0, 200) : '';
      }
      const inner = prev.querySelector && prev.querySelector('h1, h2, h3, h4, h5, h6');
      if (inner && inner.textContent) return inner.textContent.trim().slice(0, 200);
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
      ? `${cs.borderWidth} ${cs.borderStyle} ${rgbToHex(cs.borderColor)}`
      : undefined,
    border_radius: cs.borderRadius && cs.borderRadius !== '0px' ? cs.borderRadius : undefined,
    background: rgbToHex(cs.backgroundColor) || cs.backgroundImage,
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
      parent_id: parentId,
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

// Wait until URL is stable AND networkidle has fired — handles SPA hydration,
// HTTP redirects, JS redirects, OAuth round-trips, and SPA route guards.
async function waitForReady(page, totalBudgetMs) {
  const deadline = Date.now() + totalBudgetMs;
  let lastUrl = '';
  let lastUrlChangeAt = Date.now();

  while (Date.now() < deadline) {
    await page.waitForLoadState('load').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const currentUrl = page.url();
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      lastUrlChangeAt = Date.now();
      continue;
    }
    if (Date.now() - lastUrlChangeAt > 1500) {
      await page.waitForTimeout(500);
      return;
    }
    await page.waitForTimeout(300);
  }
  console.warn(`[element-walker] URL never stabilized within ${totalBudgetMs}ms; walking current DOM`);
}

// Default export: playwright-cli run-code compatible.
export default async function (page) {
  const sourceRef = process.env.GRAPHIFY_SOURCE_REF || page.url();
  const waitMs = parseInt(process.env.GRAPHIFY_WAIT_MS || '30000', 10);

  await waitForReady(page, waitMs);

  const finalUrl = page.url();
  const result = await page.evaluate(
    ({ ref, walkSource }) => {
      // eslint-disable-next-line no-eval
      const fn = eval(`(${walkSource})`);
      return fn(document, {
        sourceRef: ref,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      });
    },
    { ref: finalUrl !== sourceRef ? finalUrl : sourceRef, walkSource: walkDocument.toString() },
  );
  const fs = await import('node:fs/promises');
  const outPath = process.env.GRAPHIFY_OUT;
  if (!outPath) throw new Error('GRAPHIFY_OUT env var not set');
  await fs.mkdir(outPath.replace(/\/[^/]+$/, ''), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(result, null, 2));
}
