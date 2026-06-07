# Region Properties Resolver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a code resolver `region_properties` to core so `create-component` and `create-scene` consume 1:1 element properties (color, padding, layout, …) from the rendered source instead of guessing them from screenshots.

**Architecture:** A pure JS walker (`element-walker.js`) walks the DOM via Playwright and produces a deterministic `CapturedSource`. A TS resolver invokes the walker on first use, caches the output, locates the subtree for the current task's region, and returns `RegionProperties`. A core rule (`region-properties.md`) extends the schemas of `create-component` and `create-scene` with this optional param and tells the AI to treat its `style` values as authoritative. `extract-reference` and `extract.json` stay AI-driven and untouched. No new skill, no new dependency.

**Tech Stack:** ESM JS walker (jsdom-testable + playwright-cli driver), TypeScript resolver in `packages/storybook-addon-designbook/src/resolvers/`, vitest + jsdom for unit tests, `debo-test research drupal-web design-shell` as the end-to-end harness.

**Spec:** [`docs/superpowers/specs/2026-05-09-region-properties-design.md`](../specs/2026-05-09-region-properties-design.md)

**Pre-flight for skill-file tasks:** before creating or editing any file under `.agents/skills/designbook/`, load `designbook-skill-creator` and read the matching per-file-type rule (`schema-files.md`, `rule-files.md`, plus `common-rules.md`).

---

## File Structure

```
.agents/skills/designbook/design/
  schemas.yml                                          # Task 2 — add RegionProperties + PropertyNode
  resources/
    element-walker.js                                  # Task 1
  rules/
    region-properties.md                               # Task 4

packages/storybook-addon-designbook/src/resolvers/
  region-properties.ts                                 # Task 3
  index.ts                                             # Task 3 — register resolver
  __tests__/region-properties.test.ts                  # Task 3

packages/storybook-addon-designbook/src/__tests__/
  element-walker.test.ts                               # Task 1

tests/fixtures/element-walker/
  basic-page.html                                      # Task 1

# End-to-end uses existing fixture; no new files
fixtures/drupal-web/                                   # already present
  cases/design-shell.yaml                              # already present
  vision/designbook/vision.yml                         # already present (LEANDO / leando.de)
```

---

## Task 1: Element walker (the engine)

The walker is the entire capture engine. It exports a pure `walkDocument` for jsdom-based unit tests, and a default export for `playwright-cli run-code` to drive a real browser. Handles SPA hydration and post-load redirects.

**Files:**
- Create: `.agents/skills/designbook/design/resources/element-walker.js`
- Create: `tests/fixtures/element-walker/basic-page.html`
- Create: `packages/storybook-addon-designbook/src/__tests__/element-walker.test.ts`

- [ ] **Step 1: Write the test fixture HTML**

Path: `tests/fixtures/element-walker/basic-page.html`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Element Walker Fixture</title>
  <style>
    body { margin: 0; font-family: Inter, sans-serif; color: #111; background: #fff; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 0 32px; height: 72px; background: #ffffff; }
    nav { display: flex; gap: 24px; }
    nav a { color: #333; font-weight: 500; }
    main h1 { font-size: 32px; font-weight: 700; }
    .cta { background: #007acc; color: #fff; padding: 8px 16px; border-radius: 4px; }
  </style>
</head>
<body>
  <header role="banner">
    <a href="/" class="logo">Brand</a>
    <nav role="navigation">
      <a href="/products">Products</a>
      <a href="/pricing">Pricing</a>
      <a href="/about">About</a>
    </nav>
    <a href="/signup" class="cta">Sign up</a>
  </header>
  <main role="main">
    <h1>Build faster</h1>
    <p>Plain text paragraph for testing text nodes.</p>
  </main>
  <footer role="contentinfo">
    <p>© 2026 Example</p>
  </footer>
</body>
</html>
```

- [ ] **Step 2: Add jsdom devDependency if missing**

Check `packages/storybook-addon-designbook/package.json`. If `jsdom` is not in `devDependencies`, add it:

```bash
pnpm --filter storybook-addon-designbook add -D jsdom @types/jsdom
```

- [ ] **Step 3: Write the failing test**

Path: `packages/storybook-addon-designbook/src/__tests__/element-walker.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { walkDocument } from '../../../../.agents/skills/designbook/design/resources/element-walker.js';

function loadFixture(): Document {
  const html = readFileSync(
    resolve(__dirname, '../../../../tests/fixtures/element-walker/basic-page.html'),
    'utf8',
  );
  return new JSDOM(html, { pretendToBeVisual: true }).window.document;
}

describe('element walker', () => {
  it('produces a CapturedSource with url-dom kind', () => {
    const doc = loadFixture();
    const captured = walkDocument(doc, {
      sourceRef: 'file://fixture',
      viewport: { width: 1440, height: 900 },
    });

    expect(captured.source_kind).toBe('url-dom');
    expect(captured.source_ref).toBe('file://fixture');
    expect(captured.viewport).toEqual({ width: 1440, height: 900 });
    expect(captured.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(captured.adapter_version).toMatch(/^url-playwright\//);
    expect(Array.isArray(captured.nodes)).toBe(true);
    expect(captured.nodes.length).toBeGreaterThan(5);
  });

  it('captures the header with role=banner and flex-row layout', () => {
    const doc = loadFixture();
    const captured = walkDocument(doc, { sourceRef: 'file://fixture' });
    const header = captured.nodes.find((n) => n.role === 'banner');

    expect(header).toBeDefined();
    expect(header!.kind).toBe('container');
    expect(header!.style.layout).toBe('flex-row');
    expect(header!.style.main_axis_align).toBe('space-between');
    expect(header!.style.background).toBe('#ffffff');
    expect(header!.source.locator).toContain('header');
    expect(header!.child_ids.length).toBeGreaterThan(0);
  });

  it('assigns deterministic IDs', () => {
    const doc = loadFixture();
    const a = walkDocument(doc, { sourceRef: 'file://fixture' });
    const b = walkDocument(doc, { sourceRef: 'file://fixture' });
    expect(a.nodes.map((n) => n.id)).toEqual(b.nodes.map((n) => n.id));
  });

  it('skips nodes with display:none', () => {
    const dom = new JSDOM(
      `<html><body><div id="visible">Hi</div><div id="hidden" style="display:none">Bye</div></body></html>`,
      { pretendToBeVisual: true },
    );
    const captured = walkDocument(dom.window.document, { sourceRef: 'test' });
    const labels = captured.nodes.map((n) => n.label).join(' ');
    expect(labels).toContain('Hi');
    expect(labels).not.toContain('Bye');
  });

  it('normalizes background colors to hex', () => {
    const dom = new JSDOM(
      `<html><body><div style="background-color: rgb(255, 0, 0)">Red</div></body></html>`,
      { pretendToBeVisual: true },
    );
    const captured = walkDocument(dom.window.document, { sourceRef: 'test' });
    const red = captured.nodes.find((n) => n.label === 'Red');
    expect(red!.style.background).toBe('#ff0000');
  });

  it('classifies link/button/image kinds', () => {
    const doc = loadFixture();
    const captured = walkDocument(doc, { sourceRef: 'file://fixture' });
    const ctaLink = captured.nodes.find((n) => n.label === 'Sign up');
    expect(ctaLink!.kind).toBe('link');
    expect(ctaLink!.href).toBe('/signup');
  });
});
```

- [ ] **Step 4: Run the test, verify it fails**

```bash
pnpm --filter storybook-addon-designbook test -- element-walker
```
Expected: FAIL with "Cannot find module ... element-walker.js" — file doesn't exist yet.

- [ ] **Step 5: Implement the walker**

Path: `.agents/skills/designbook/design/resources/element-walker.js`

```javascript
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
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
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
```

- [ ] **Step 6: Run tests, verify they pass**

```bash
pnpm --filter storybook-addon-designbook test -- element-walker
```
Expected: PASS — all 6 tests green.

- [ ] **Step 7: Run `pnpm check`**

```bash
pnpm check
```
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add .agents/skills/designbook/design/resources/element-walker.js
git add tests/fixtures/element-walker/basic-page.html
git add packages/storybook-addon-designbook/src/__tests__/element-walker.test.ts
git add packages/storybook-addon-designbook/package.json packages/storybook-addon-designbook/pnpm-lock.yaml 2>/dev/null || true
git commit -m "feat(designbook): add element-walker (DOM property tree)"
```

---

## Task 2: Schemas (RegionProperties + PropertyNode)

Add the type definitions to core schemas.

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml`

**Pre-flight:** load `designbook-skill-creator`, read `rules/schema-files.md` and `rules/common-rules.md`.

- [ ] **Step 1: Read the existing schemas.yml**

```bash
cat .agents/skills/designbook/design/schemas.yml | head -20
```
Note where existing top-level types end so the new types are appended cleanly.

- [ ] **Step 2: Append RegionProperties and PropertyNode**

Add to the end of `.agents/skills/designbook/design/schemas.yml`:

```yaml
RegionProperties:
  type: object
  title: Region Properties
  description: |
    Authoritative element properties for the region the current task covers.
    Produced by the region-properties code resolver from the rendered DOM.
    When `matched_via !== "none"`, `style` values are ground truth — markup
    and CSS MUST use them where present. Falls back to extract.json + design
    hints only for properties not in the bag.
  required: [matched_via, nodes]
  properties:
    matched_via:
      type: string
      description: Which heuristic located the region root.
      enum: [role, heading, label, bbox, none]
    root_id:
      type: string
      description: ID of the region root inside `nodes`. Absent when matched_via === "none".
      examples: ["n_8a3f21bc"]
    nodes:
      type: array
      description: All PropertyNodes in the region subtree. Hierarchy via parent_id / child_ids. Empty when matched_via === "none".
      items:
        $ref: "#/PropertyNode"

PropertyNode:
  type: object
  title: Property Node
  description: One visible element from the captured source. Source-agnostic — a future Figma walker would return the same shape.
  required: [id, child_ids, label, kind, bbox, style, source]
  properties:
    id:
      type: string
      description: Deterministic node ID. Walker-chosen (DOM uses hash of dom_path + bbox).
      examples: ["n_8a3f21bc"]
    parent_id:
      type: string
      description: ID of this node's parent PropertyNode. Absent for the root.
    child_ids:
      type: array
      description: Child node IDs in reading / visual order.
      items: { type: string }
    label:
      type: string
      description: Human-readable name. Heading text, layer name, ARIA label, or text content.
      examples: ["Site Header", "Buy now", "Pricing"]
    kind:
      type: string
      description: Coarse element category — drives consumer reasoning even when specific style fields are missing.
      enum: [section, container, text, image, icon, button, input, link, list, list-item, form, media]
    role:
      type: string
      description: Normalized semantic role. Strong for DOM (HTML5 landmarks + ARIA). Optional.
      enum: [banner, navigation, main, contentinfo, search, form, complementary, region]
    heading_context:
      type: string
      description: Nearest preceding section / heading text. The strongest source-agnostic anchor for region matching.
      examples: ["Pricing", "Frequently asked questions"]
    bbox:
      type: object
      description: Pixel coordinates relative to the viewport.
      required: [x, y, width, height]
      properties:
        x: { type: number, description: "Left edge in px" }
        y: { type: number, description: "Top edge in px" }
        width: { type: number, description: "Width in px" }
        height: { type: number, description: "Height in px" }
    text:
      type: string
      description: Visible text content, trimmed, max 200 chars.
    href:
      type: string
      description: Absolute or root-relative URL for link nodes.
    src:
      type: string
      description: Asset URL or path for media nodes.
    alt:
      type: string
      description: Alt text or accessible name.
    style:
      type: object
      title: Curated Style
      description: Source-agnostic curated style block. Walkers map their native properties (CSS computed style, Figma layout/fills/typography) onto this shape.
      required: [padding, margin, background, foreground]
      properties:
        layout:
          type: string
          description: Layout primitive.
          enum: [flex-row, flex-col, grid, stack, absolute, none]
        main_axis_align:
          type: string
          description: Main-axis alignment.
          enum: [start, center, end, space-between, space-around, space-evenly]
        cross_axis_align:
          type: string
          description: Cross-axis alignment.
          enum: [start, center, end, stretch, baseline]
        gap:
          type: string
          description: Gap between flex / grid items, normalized in px.
          examples: ["16px", "8px 24px"]
        padding:
          type: string
          description: Normalized "<top> <right> <bottom> <left>" or shorthand.
          examples: ["0 32 0 32", "16"]
        margin:
          type: string
          description: Same normalization as padding.
        border:
          type: string
          description: Border shorthand.
          examples: ["1px solid #e5e7eb"]
        border_radius:
          type: string
          examples: ["4px", "9999px"]
        background:
          type: string
          description: Resolved hex color, or url() / image ref.
          examples: ["#ffffff", "linear-gradient(...)", "url(/hero.jpg)"]
        foreground:
          type: string
          description: Text or icon color (resolved hex).
          examples: ["#111111"]
        font_family:
          type: string
          examples: ["Inter, sans-serif"]
        font_size:
          type: string
          examples: ["16px", "1.125rem"]
        font_weight:
          type: string
          examples: ["400", "600"]
        line_height:
          type: string
        letter_spacing:
          type: string
        text_transform:
          type: string
          enum: [uppercase, lowercase, capitalize]
    source:
      type: object
      title: Source Locator
      description: Walker-specific identification. `locator` is opaque to consumers; `raw` carries the unmapped native data when deep dives are needed.
      required: [locator]
      properties:
        locator:
          type: string
          description: Walker-defined — DOM path for the URL walker.
          examples: ["body > header"]
        raw:
          type: object
          description: Walker-specific extra fields. Opaque to consumers — only loaded when explicitly requested. Keys vary by walker.
          additionalProperties: true
```

- [ ] **Step 3: Verify schemas pass schema-files.md checks**

Walk SCHEMA-01..04:
- SCHEMA-01: every `$ref` resolves (`#/PropertyNode` referenced from `RegionProperties.nodes.items`) — verify.
- SCHEMA-02: every property with `type: string`/`number`/`object` carries a teaching signal — verify.
- SCHEMA-03: every top-level type has `title:` or `description:` — both have it.
- SCHEMA-04: types using `additionalProperties: true` document what kind of keys belong (`source.raw` is documented).

- [ ] **Step 4: Run `pnpm check`**

```bash
pnpm check
```
Expected: PASS — schemas.yml is valid YAML, existing tests untouched.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/schemas.yml
git commit -m "feat(designbook): add RegionProperties + PropertyNode schemas"
```

---

## Task 3: Code resolver

The TypeScript resolver wires walker invocation, caching, and region location. Registers as `region_properties` in the resolver registry.

**Files:**
- Create: `packages/storybook-addon-designbook/src/resolvers/region-properties.ts`
- Modify: `packages/storybook-addon-designbook/src/resolvers/index.ts`
- Modify: `packages/storybook-addon-designbook/src/resolvers/types.ts` (widen `ResolverResult.value` to include objects)
- Create: `packages/storybook-addon-designbook/src/resolvers/__tests__/region-properties.test.ts`

- [ ] **Step 1: Widen `ResolverResult.value`**

Open `packages/storybook-addon-designbook/src/resolvers/types.ts`. Change:

```ts
export interface ResolverResult {
  resolved: boolean;
  value?: string | unknown[];
  ...
}
```

to:

```ts
export interface ResolverResult {
  resolved: boolean;
  value?: string | unknown[] | Record<string, unknown>;
  ...
}
```

- [ ] **Step 2: Verify the type change doesn't break existing resolvers**

```bash
pnpm --filter storybook-addon-designbook typecheck
```
Expected: PASS.

- [ ] **Step 3: Write the failing resolver test**

Path: `packages/storybook-addon-designbook/src/resolvers/__tests__/region-properties.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { regionPropertiesResolver } from '../region-properties.js';
import type { ResolverContext } from '../types.js';

const FIXTURE_CAPTURED = {
  source_kind: 'url-dom',
  source_ref: 'https://example.com',
  captured_at: '2026-05-09T08:00:00Z',
  adapter_version: 'url-playwright/0.1.0',
  nodes: [
    {
      id: 'n_root',
      parent_id: undefined,
      child_ids: ['n_header', 'n_main'],
      label: 'Page',
      kind: 'container',
      bbox: { x: 0, y: 0, width: 1440, height: 2400 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body' },
    },
    {
      id: 'n_header',
      parent_id: 'n_root',
      child_ids: ['n_logo'],
      label: 'Site Header',
      kind: 'container',
      role: 'banner',
      bbox: { x: 0, y: 0, width: 1440, height: 72 },
      style: {
        padding: '0 32 0 32',
        margin: '0',
        background: '#ffffff',
        foreground: '#111111',
        layout: 'flex-row',
        main_axis_align: 'space-between',
      },
      source: { locator: 'body > header' },
    },
    {
      id: 'n_logo',
      parent_id: 'n_header',
      child_ids: [],
      label: 'Brand',
      kind: 'link',
      bbox: { x: 32, y: 20, width: 80, height: 32 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body > header > a' },
      href: '/',
    },
    {
      id: 'n_main',
      parent_id: 'n_root',
      child_ids: [],
      label: 'main',
      kind: 'container',
      role: 'main',
      bbox: { x: 0, y: 72, width: 1440, height: 1800 },
      style: { padding: '0', margin: '0', background: '#ffffff', foreground: '#111111' },
      source: { locator: 'body > main' },
    },
  ],
};

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => JSON.stringify(FIXTURE_CAPTURED)),
  mkdir: vi.fn(async () => undefined),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true), // pretend cache always hit so we don't run Playwright
  mkdirSync: vi.fn(),
}));

function buildContext(params: Record<string, unknown>): ResolverContext {
  return {
    config: { data: '/tmp/designbook-data' } as never,
    params,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('regionPropertiesResolver', () => {
  it('returns value: undefined when type is not "url"', async () => {
    const result = await regionPropertiesResolver.resolve(
      '',
      {},
      buildContext({
        'vision.design_reference.type': 'figma',
        'vision.design_reference.url': 'figma://xyz',
      }),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBeUndefined();
  });

  it('locates header via role match', async () => {
    const result = await regionPropertiesResolver.resolve(
      '',
      { from: 'vision.design_reference.url' },
      buildContext({
        'vision.design_reference.type': 'url',
        'vision.design_reference.url': 'https://example.com',
        'component.id': 'site_header',
      }),
    );
    expect(result.resolved).toBe(true);
    const region = result.value as { matched_via: string; root_id?: string; nodes: Array<{ id: string }> };
    expect(region.matched_via).toBe('role');
    expect(region.root_id).toBe('n_header');
    expect(region.nodes.map((n) => n.id)).toEqual(['n_header', 'n_logo']);
  });

  it('locates section via heading match when role does not apply', async () => {
    // Inject a section with a heading_context.
    const captured = {
      ...FIXTURE_CAPTURED,
      nodes: [
        ...FIXTURE_CAPTURED.nodes,
        {
          id: 'n_pricing',
          parent_id: 'n_main',
          child_ids: [],
          label: 'pricing-section',
          kind: 'section',
          heading_context: 'Pricing',
          bbox: { x: 0, y: 800, width: 1440, height: 600 },
          style: { padding: '64', margin: '0', background: '#fafafa', foreground: '#111111' },
          source: { locator: 'body > main > section:nth-of-type(2)' },
        },
      ],
    };
    const fs = await import('node:fs/promises');
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(JSON.stringify(captured));

    const result = await regionPropertiesResolver.resolve(
      '',
      { from: 'vision.design_reference.url' },
      buildContext({
        'vision.design_reference.type': 'url',
        'vision.design_reference.url': 'https://example.com',
        'component.id': 'pricing',
      }),
    );
    const region = result.value as { matched_via: string; root_id: string };
    expect(region.matched_via).toBe('heading');
    expect(region.root_id).toBe('n_pricing');
  });

  it('returns matched_via:none with empty nodes when no heuristic hits', async () => {
    const result = await regionPropertiesResolver.resolve(
      '',
      { from: 'vision.design_reference.url' },
      buildContext({
        'vision.design_reference.type': 'url',
        'vision.design_reference.url': 'https://example.com',
        'component.id': 'nonexistent_widget',
      }),
    );
    const region = result.value as { matched_via: string; nodes: unknown[] };
    expect(region.matched_via).toBe('none');
    expect(region.nodes).toEqual([]);
  });
});
```

- [ ] **Step 4: Run the test, verify it fails**

```bash
pnpm --filter storybook-addon-designbook test -- region-properties
```
Expected: FAIL — module doesn't exist.

- [ ] **Step 5: Implement the resolver**

Path: `packages/storybook-addon-designbook/src/resolvers/region-properties.ts`

```typescript
import { existsSync, mkdirSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve as joinPath } from 'node:path';
import { createHash } from 'node:crypto';
import type { ParamResolver, ResolverContext, ResolverResult } from './types.js';

type PropertyNode = {
  id: string;
  parent_id?: string;
  child_ids: string[];
  label: string;
  kind: string;
  role?: string;
  heading_context?: string;
  bbox: { x: number; y: number; width: number; height: number };
  style: Record<string, unknown> & { padding: string; margin: string; background: string; foreground: string };
  source: { locator: string; raw?: object };
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
};

type CapturedSource = {
  source_kind: string;
  source_ref: string;
  captured_at: string;
  viewport?: { width: number; height: number };
  adapter_version: string;
  nodes: PropertyNode[];
};

type RegionProperties = {
  matched_via: 'role' | 'heading' | 'label' | 'bbox' | 'none';
  root_id?: string;
  nodes: PropertyNode[];
};

const ROLE_HINTS: Array<{ pattern: RegExp; role: string }> = [
  { pattern: /^(site_)?header$|^banner$/i, role: 'banner' },
  { pattern: /^(site_)?footer$|^contentinfo$/i, role: 'contentinfo' },
  { pattern: /^(main|content)$/i, role: 'main' },
  { pattern: /(nav|navigation|menu)/i, role: 'navigation' },
  { pattern: /^(form|search)/i, role: 'form' },
];

function hashUrl(url: string): string {
  return createHash('sha256').update(url.toLowerCase().replace(/\/+$/, '')).digest('hex').slice(0, 12);
}

function referenceFolder(url: string, dataDir: string): string {
  return joinPath(dataDir, 'references', hashUrl(url));
}

async function runWalker(url: string, outPath: string): Promise<void> {
  await mkdir(outPath.replace(/\/[^/]+$/, ''), { recursive: true });
  const walkerPath = joinPath(
    process.cwd(),
    '.agents/skills/designbook/design/resources/element-walker.js',
  );
  const env = {
    ...process.env,
    GRAPHIFY_OUT: outPath,
    GRAPHIFY_SOURCE_REF: url,
  };

  await new Promise<void>((resolveProc, rejectProc) => {
    const child = spawn(
      'sh',
      [
        '-c',
        `npx playwright-cli open && \
         npx playwright-cli goto "${url}" && \
         npx playwright-cli resize 1440 1600 && \
         npx playwright-cli run-code "$(cat "${walkerPath}")" && \
         npx playwright-cli close`,
      ],
      { env, stdio: 'inherit' },
    );
    child.on('exit', (code) => (code === 0 ? resolveProc() : rejectProc(new Error(`walker exit ${code}`))));
    child.on('error', rejectProc);
  });
}

function pickRegionLabel(params: Record<string, unknown>): string {
  const componentId = params['component.id'];
  if (typeof componentId === 'string' && componentId) return componentId;
  const sectionId = params['section.id'];
  if (typeof sectionId === 'string' && sectionId) return sectionId;
  const scenePath = params['scene_path'];
  if (typeof scenePath === 'string' && scenePath) {
    return scenePath.replace(/\.[^/.]+$/, '').split('/').pop() || '';
  }
  return '';
}

function descendantsOf(captured: CapturedSource, rootId: string): PropertyNode[] {
  const byParent = new Map<string, PropertyNode[]>();
  for (const node of captured.nodes) {
    const list = byParent.get(node.parent_id ?? '') ?? [];
    list.push(node);
    byParent.set(node.parent_id ?? '', list);
  }
  const root = captured.nodes.find((n) => n.id === rootId);
  if (!root) return [];
  const out: PropertyNode[] = [root];
  const stack: string[] = [rootId];
  while (stack.length) {
    const parent = stack.pop()!;
    const children = byParent.get(parent) ?? [];
    for (const child of children) {
      out.push(child);
      stack.push(child.id);
    }
  }
  return out;
}

function locateRegion(captured: CapturedSource, label: string): RegionProperties {
  const normalized = label.toLowerCase().replace(/[-_]/g, ' ').trim();

  // 1. Role match
  for (const hint of ROLE_HINTS) {
    if (hint.pattern.test(label)) {
      const candidates = captured.nodes
        .filter((n) => n.role === hint.role)
        .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x);
      if (candidates[0]) {
        return {
          matched_via: 'role',
          root_id: candidates[0].id,
          nodes: descendantsOf(captured, candidates[0].id),
        };
      }
    }
  }

  // 2. Heading match
  const headingHit = captured.nodes
    .filter((n) => {
      const ctx = (n.heading_context ?? '').toLowerCase();
      const lbl = n.label.toLowerCase();
      return ctx.includes(normalized) || lbl.includes(normalized);
    })
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)[0];
  if (headingHit) {
    return {
      matched_via: 'heading',
      root_id: headingHit.id,
      nodes: descendantsOf(captured, headingHit.id),
    };
  }

  // 3. Label match
  const labelHit = captured.nodes
    .filter((n) => n.label.toLowerCase().replace(/[-_]/g, ' ') === normalized)
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)[0];
  if (labelHit) {
    return {
      matched_via: 'label',
      root_id: labelHit.id,
      nodes: descendantsOf(captured, labelHit.id),
    };
  }

  // 4. Bbox / reading-order fallback could go here (requires extract.json sections index).
  // Intentionally not implemented in v1; expand once needed.

  return { matched_via: 'none', nodes: [] };
}

export const regionPropertiesResolver: ParamResolver = {
  name: 'region_properties',

  async resolve(
    _input: string,
    config: Record<string, unknown>,
    context: ResolverContext,
  ): Promise<ResolverResult> {
    const type = context.params['vision.design_reference.type'];
    const url = context.params['vision.design_reference.url'];
    if (type !== 'url' || typeof url !== 'string' || url === '') {
      return { resolved: true, value: undefined, input: '' };
    }

    const dataDir = (context.config as { data: string }).data;
    const refDir = referenceFolder(url, dataDir);
    const elementTreeDir = joinPath(refDir, '.element-tree');
    const sourcePath = joinPath(elementTreeDir, 'source.json');

    if (!existsSync(sourcePath)) {
      try {
        mkdirSync(elementTreeDir, { recursive: true });
        await runWalker(url, sourcePath);
      } catch (error) {
        console.warn(`[region-properties] walker failed: ${(error as Error).message}`);
        return { resolved: true, value: undefined, input: url };
      }
    }

    let captured: CapturedSource;
    try {
      captured = JSON.parse(await readFile(sourcePath, 'utf8')) as CapturedSource;
    } catch (error) {
      console.warn(`[region-properties] failed to read ${sourcePath}: ${(error as Error).message}`);
      return { resolved: true, value: undefined, input: url };
    }

    const label = pickRegionLabel(context.params);
    const region = locateRegion(captured, label);
    return { resolved: true, value: region as unknown as Record<string, unknown>, input: url };
  },
};
```

- [ ] **Step 6: Register the resolver**

Open `packages/storybook-addon-designbook/src/resolvers/index.ts`. Add the import and registration alongside existing resolvers (follow the file's existing pattern; if there's a registry array, add `regionPropertiesResolver` to it).

```ts
import { regionPropertiesResolver } from './region-properties.js';
// …existing imports…

export const resolvers = [
  // …existing resolvers…
  regionPropertiesResolver,
];
```

- [ ] **Step 7: Run tests, verify they pass**

```bash
pnpm --filter storybook-addon-designbook test -- region-properties
```
Expected: PASS — all 4 tests green.

- [ ] **Step 8: Run `pnpm check`**

```bash
pnpm check
```
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/storybook-addon-designbook/src/resolvers/region-properties.ts
git add packages/storybook-addon-designbook/src/resolvers/__tests__/region-properties.test.ts
git add packages/storybook-addon-designbook/src/resolvers/index.ts
git add packages/storybook-addon-designbook/src/resolvers/types.ts
git commit -m "feat(designbook): add region_properties code resolver"
```

---

## Task 4: Rule (`region-properties.md`)

The rule extends the schemas of `create-component` and `create-scene` with the optional `region_properties` param and tells the AI how to consume it.

**Files:**
- Create: `.agents/skills/designbook/design/rules/region-properties.md`

**Pre-flight:** load `designbook-skill-creator`, read `rules/rule-files.md`. The rule uses `extends:` (preferred mechanism per the schema-extension section) plus a body explaining usage.

- [ ] **Step 1: Write the rule**

```markdown
---
name: designbook:design:region-properties
trigger:
  steps: [create-component, create-scene]
extends:
  region_properties:
    $ref: ../schemas.yml#/RegionProperties
    description: |
      Authoritative element properties for the region this task covers. Optional —
      present only when vision.design_reference.type === "url" and the resolver
      found a matching subtree in the rendered DOM.
    resolve: region_properties
    from: vision.design_reference.url
---

# Region Properties

When `region_properties` is set and `region_properties.matched_via !== "none"`:

- The `nodes[]` describe the actual rendered subtree of the region this task covers.
- The `style` values on those nodes are ground truth. Use them 1:1 in markup and CSS.
- Do not guess values that are present in `style`. Only fall back to design tokens
  and `design_hint` for properties not in the bag.
- The `bbox` and `kind` fields anchor the structural decisions (e.g. flex direction,
  grid layout) — derive the markup hierarchy from the node tree, not from the
  screenshot alone.

When `region_properties` is missing or `matched_via === "none"`, run with the
previous behavior: derive from `reference` (extract.json) + `design_hint` only.

## Why two artifacts converge here

`reference` (from `extract-reference`) is an AI-curated **table of contents** —
which sections, landmarks, forms, and breakpoints exist on the page.

`region_properties` is a deterministic **detail layer** — for the specific
region this task covers, the exact computed properties of every visible
element.

Both are valid inputs. Use `reference` for structural decisions about which
component cuts to make and which content belongs where. Use `region_properties`
for the per-element styling once the cut is decided.
```

- [ ] **Step 2: Verify the rule passes rule-files.md checks**

Walk RULE-01: this rule's body explains schema usage, not schema constraints. The `extends:` block in frontmatter is the schema part. Acceptable.

- [ ] **Step 3: Run `pnpm check`**

```bash
pnpm check
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/rules/region-properties.md
git commit -m "feat(designbook): add region-properties rule (extends create-component / create-scene)"
```

---

## Task 5: End-to-end smoke test via `debo-test research drupal-web design-shell`

The `drupal-web` fixture already has a vision pointing at `https://leando.de/` (a real Angular SPA with redirects) — perfect for exercising the walker's SPA / redirect handling and the resolver's region-match heuristic against an actual production site.

**Files:**
- (no new files; integration validation against existing fixture)

- [ ] **Step 1: Verify CLI prerequisites**

```bash
which graphify && echo "graphify is installed (not used here, but extract-reference may invoke it)"
which npx
npx playwright-cli --help | head -3 2>/dev/null || npm i -g playwright-cli
```

- [ ] **Step 2: Run a baseline-only research pass**

From the repo root (or worktree root):

```bash
npx debo-test research drupal-web design-shell --baseline-only
```

This:
1. Wipes any prior `workspaces/drupal-web/` and rebuilds from `packages/integrations/test-integration-drupal/`.
2. Layers `fixtures/drupal-web/` data and the `design-shell` case fixtures onto the workspace.
3. Starts Storybook.
4. Runs the `design-shell` case prompt (which internally invokes `extract-reference` against `https://leando.de/`, then proceeds to `create-component` etc.).
5. Stops after iteration 0 (baseline), produces an audit + score TSV.

- [ ] **Step 3: Verify the walker output materialized**

```bash
REF_HASH=$(echo -n "https://leando.de" | sha256sum | cut -c1-12)
WS_TREE="workspaces/drupal-web/data/references/${REF_HASH}/.element-tree/source.json"
test -f "${WS_TREE}" && echo "OK: ${WS_TREE}" || echo "FAIL: tree not produced"
jq '.nodes | length' "${WS_TREE}"
jq '.nodes[] | select(.role == "banner") | {id, label}' "${WS_TREE}"
```

Expected: file exists, > 50 nodes (leando.de is a real page), at least one node with `role: "banner"`.

If `FAIL: tree not produced`, possible causes:
- Resolver didn't fire — verify `region-properties.md` rule is loaded for the design-shell workflow's create-component step.
- Walker exited non-zero — check workspace logs (`workspaces/drupal-web/.designbook-logs/` or similar).
- Vision URL resolved to an unreachable target — verify `https://leando.de/` is reachable.

- [ ] **Step 4: Verify the resolver locates regions**

Inspect the workspace's create-component output in the research-runs dir:

```bash
SLUG=$(ls research-runs/ | grep drupal-web-design-shell | tail -1)
cat research-runs/${SLUG}/iterations/000-baseline/audit.md | head -40
```

Expected: at least one `create-component` task in the audit shows that `region_properties` was non-empty (look for log lines mentioning `matched_via`).

- [ ] **Step 5: Verify the cache-hit path on a re-run**

```bash
npx debo-test research drupal-web design-shell --baseline-only
```

This wipes the workspace AND the cache (`setup-workspace.sh` rebuilds from scratch). To verify cache hit specifically, instead trigger create-component twice WITHOUT wiping: run a second create-component manually inside the existing workspace and confirm the walker is not re-invoked (no "Playwright" log lines on the second call).

For phase-1 sign-off, the `--baseline-only` pass producing the tree is sufficient evidence — caching is unit-tested in Task 3.

- [ ] **Step 6: Verify a generated component reflects walker-captured properties**

Pick a component the case actually generated (likely a header or main shell):

```bash
COMPONENTS_DIR="workspaces/drupal-web/web/themes/custom/leando/components"
# adjust to actual path used by the drupal integration
ls "${COMPONENTS_DIR}/site-header" 2>/dev/null
cat "${COMPONENTS_DIR}/site-header/site-header.twig" 2>/dev/null
```

Spot-check: does the generated CSS / Twig use the colors and padding from the captured `style`? E.g., if the leando.de header has `background: #ffffff` and `padding: 0 32 0 32` in the captured tree, the generated component CSS should match — not a default Tailwind `bg-white p-8`.

- [ ] **Step 7: Run `pnpm check` from repo root**

```bash
pnpm check
```
Expected: PASS — no regressions.

- [ ] **Step 8: Commit checkpoint**

```bash
git commit --allow-empty -m "chore(designbook): region-properties resolver e2e validated against drupal-web/design-shell"
```

---

## Self-Review Checklist

**Spec coverage** (every section of the spec maps to a task):
- Walker (CapturedSource shape, walkDocument export, default playwright export, SPA / redirect handling) → Task 1
- RegionProperties + PropertyNode schemas → Task 2
- Code resolver (walker invocation, caching, locateRegion, scope handling) → Task 3
- Rule (extends + body usage prose) → Task 4
- "extract-reference and extract.json untouched" → enforced by scope (no edits to those files)
- "No new skill, no new dependency" → enforced by scope (only `jsdom` added as devDep)
- Region matching heuristic (role → heading → label → bbox) → Task 3 `locateRegion` implementation
- Caching at `{reference_folder}/.element-tree/source.json` → Task 3
- Error behavior (missing Playwright, unreachable URL, region match fail) → Task 3 try/catch + matched_via:none branch
- Testing — walker unit tests → Task 1; resolver unit tests → Task 3; end-to-end → Task 5

**Placeholder scan:** none of "TBD", "fill in details", "implement later" appear. Every code block is complete.

**Type consistency:**
- `walkDocument` signature in walker matches imports in `element-walker.test.ts` and the resolver's invocation via Playwright `page.evaluate`.
- `CapturedSource` / `PropertyNode` enum values (kind, role, style.layout, etc.) listed in schemas (Task 2) match the walker output (Task 1) and the resolver's expectations (Task 3).
- `RegionProperties.matched_via` enum values listed in schema match those returned by `locateRegion` ("role" / "heading" / "label" / "bbox" / "none").
- Walker output path `.element-tree/source.json` consistent across walker default export (Task 1), resolver (Task 3), and smoke test (Task 5).
- Resolver name `region_properties` consistent in TS (`name: 'region_properties'`), rule frontmatter (`resolve: region_properties`), and resolver registry registration.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-09-region-properties.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
