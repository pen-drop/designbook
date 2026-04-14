---
when:
  steps: [extract-reference]
params:
  scene_id: { type: string }
  component_id: { type: string }
result:
  design-reference:
    path: $STORY_DIR/design-reference.json
  reference:
    type: array
    items:
      $ref: ../schemas.yml#/Reference
  screenshot:
    path: $STORY_DIR/reference-full.png
reads:
  - path: $DESIGNBOOK_DATA/vision.md
  - path: $STORY_DIR/design-reference.json
    optional: true
---

# Extract Reference

Standalone task that resolves and extracts a design reference. First stage in all design workflows (design-component, design-shell, design-screen, design-verify).

Output is structured JSON (`design-reference.json`) conforming to the `DesignReference` schema. Two strategies, both always include vision:

- **`playwright+vision`** -- Playwright extracts exact DOM values, Vision provides semantic understanding. Best quality.
- **`vision`** -- Screenshot only, all values estimated by AI. Fallback when no markup is available.

## Step 1: Resolve $STORY_DIR

Resolve the story directory using the CLI. Exactly one of `scene_id` or `component_id` will be set:

- If `scene_id` is set: `STORY_DIR=$(_debo story --scene ${scene_id} --create | jq -r '.storyDir')`
- If `component_id` is set: `STORY_DIR=$(_debo story --component ${component_id} --create | jq -r '.storyDir')`

## Step 2: Reuse Check

If `$STORY_DIR/design-reference.json` already exists (from a prior workflow run):

> "A design reference already exists for this target:
>
> [show source, strategy, and token summary from existing JSON]
>
> Use existing reference or extract fresh?"

If the user chooses to reuse, read the existing file and skip to Step 6.

## Step 3: Find Reference URL

Read `vision.md` and look for a design reference URL.

**If a URL is found:**

> "In der Vision ist `<url>` als Design Reference hinterlegt. Ist das die richtige Reference fuer [scene/component name], oder moechtest du eine andere URL/Screenshot verwenden?"

Wait for response. The user may:
- Confirm the URL
- Provide a different URL
- Provide a screenshot path
- Say "skip" to proceed without reference

**If no URL in vision.md:**

> "No design reference URL found in vision.md. You can provide:
> - A URL to a reference website
> - A path to a screenshot
> - Or 'skip' to proceed without reference"

Wait for response.

If the user says "skip", complete the task with empty results (no design-reference.json, empty reference array, no screenshot).

## Step 4: Extract Structure

### Strategy Selection

Select strategy based on provider capabilities:

1. **`hasMarkup: true`** -- Playwright extraction + Vision (`playwright+vision`)
2. **`hasMarkup: false`** -- Vision only (`vision`)

### Storybook URL Resolution

When capturing from Storybook (not an external reference URL), obtain the URL dynamically:

```bash
_debo storybook status
```

Extract the `url` field from the JSON response (e.g. `http://localhost:34757`). Do not use `$DESIGNBOOK_URL` from config -- the port is dynamic.

If `storybook status` returns `{ "running": false }`, start it first with `_debo storybook start` and re-check status.

### Phase 1 -- Screenshot (always)

All browser interaction uses `playwright-cli`. See [cli-playwright.md](../../resources/cli-playwright.md) for the full command reference.

```bash
npx playwright-cli open
npx playwright-cli goto "<referenceUrl>"
npx playwright-cli resize 1440 1600
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx playwright-cli screenshot --full-page --filename "$STORY_DIR/reference-full.png"
```

Inspect the screenshot visually to understand the page layout.

Take a snapshot to identify landmark refs, then capture region screenshots:

```bash
npx playwright-cli snapshot
```

From the snapshot, identify header and footer element refs. If they exist:

```bash
npx playwright-cli screenshot <header-ref> --filename "$STORY_DIR/reference-header.png"
npx playwright-cli screenshot <footer-ref> --filename "$STORY_DIR/reference-footer.png"
```

### Phase 2 -- Playwright eval calls (when hasMarkup: true)

Run individual focused eval calls. Each returns JSON.

#### eval 1: Fonts

```bash
npx playwright-cli eval "() => {
  const fonts = new Map();
  document.querySelectorAll('*').forEach(el => {
    const ff = getComputedStyle(el).fontFamily.split(',')[0].trim().replace(/['\x22]/g, '');
    if (!fonts.has(ff)) fonts.set(ff, { weights: new Set(), styles: new Set() });
    const entry = fonts.get(ff);
    entry.weights.add(parseInt(getComputedStyle(el).fontWeight));
    entry.styles.add(getComputedStyle(el).fontStyle);
  });
  return JSON.stringify([...fonts.entries()].map(([f, d]) => ({
    family: f,
    weights: [...d.weights].sort(),
    styles: [...d.styles]
  })));
}"
```

For each non-system font: extract `@font-face` declarations and Google Fonts `<link>` imports to get the `source` URL.

#### eval 2: Typography

```bash
npx playwright-cli eval "() => {
  const elements = ['h1','h2','h3','h4','h5','h6','p','a','button','li','span','label','figcaption'];
  const results = [];
  for (const tag of elements) {
    const el = document.querySelector(tag);
    if (!el) continue;
    const cs = getComputedStyle(el);
    results.push({
      element: tag,
      font_family: cs.fontFamily.split(',')[0].trim().replace(/['\x22]/g, ''),
      font_size: cs.fontSize,
      line_height: cs.lineHeight,
      letter_spacing: cs.letterSpacing,
      font_weight: parseInt(cs.fontWeight),
      color: cs.color
    });
  }
  return JSON.stringify(results);
}"
```

#### eval 3: Colors

```bash
npx playwright-cli eval "() => {
  const colors = new Map();
  function addColor(hex, usage) {
    if (!colors.has(hex)) colors.set(hex, new Set());
    colors.get(hex).add(usage);
  }
  function rgbToHex(rgb) {
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return null;
    return '#' + m.slice(0,3).map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
  }
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    if (bg !== 'rgba(0, 0, 0, 0)') { const h = rgbToHex(bg); if (h) addColor(h, 'background'); }
    const c = cs.color; { const h = rgbToHex(c); if (h) addColor(h, 'text'); }
    const bc = cs.borderColor; if (bc && bc !== cs.color) { const h = rgbToHex(bc); if (h) addColor(h, 'border'); }
    const bs = cs.boxShadow; if (bs && bs !== 'none') {
      const m2 = bs.match(/rgba?\([^)]+\)/); if (m2) { const h = rgbToHex(m2[0]); if (h) addColor(h, 'shadow'); }
    }
  });
  return JSON.stringify([...colors.entries()].map(([hex, usage]) => ({ hex, usage: [...usage] })));
}"
```

#### eval 4: CSS Variables

```bash
npx playwright-cli eval "() => {
  const vars = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText === ':root' || rule.selectorText === ':host') {
          for (const prop of rule.style) {
            if (prop.startsWith('--')) {
              vars.push({ name: prop, value: rule.style.getPropertyValue(prop).trim() });
            }
          }
        }
      }
    } catch(e) { /* cross-origin sheet */ }
  }
  return JSON.stringify(vars);
}"
```

#### eval 5: Spacing

```bash
npx playwright-cli eval "() => {
  const spacings = new Set();
  const body = document.body;
  const bodyCs = getComputedStyle(body);
  const main = document.querySelector('main') || document.querySelector('[role=main]') || body.children[0];
  const mainCs = main ? getComputedStyle(main) : {};
  document.querySelectorAll('section, article, [class*=container], [class*=wrapper], main > *').forEach(el => {
    const cs = getComputedStyle(el);
    ['marginTop','marginBottom','paddingTop','paddingBottom','paddingLeft','paddingRight','gap'].forEach(p => {
      const v = cs[p]; if (v && v !== '0px' && v !== 'normal') spacings.add(v);
    });
  });
  return JSON.stringify({
    container_max_width: mainCs.maxWidth || 'none',
    edge_padding: bodyCs.paddingLeft || '0px',
    section_gap: mainCs.gap || 'auto',
    values: [...spacings].sort((a,b) => parseInt(a) - parseInt(b))
  });
}"
```

#### eval 6: Landmarks

```bash
npx playwright-cli eval "() => {
  function getRow(el) {
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      bg: cs.backgroundColor,
      height: el.offsetHeight + 'px',
      padding: cs.padding,
      content: el.textContent?.substring(0, 200).trim(),
      layout: cs.display + (cs.flexDirection ? ' ' + cs.flexDirection : '') + (cs.gridTemplateColumns ? ' grid' : ''),
      gap: cs.gap || 'none'
    };
  }
  const header = document.querySelector('header');
  const headerRows = header ? [...header.children].map(getRow) : [];
  const footer = document.querySelector('footer');
  const footerRows = footer ? [...footer.children].map(getRow) : [];
  return JSON.stringify({ header: { rows: headerRows }, footer: { rows: footerRows } });
}"
```

#### eval 7: Interactive

```bash
npx playwright-cli eval "() => {
  const items = [];
  document.querySelectorAll('a, button, [role=button], input[type=submit]').forEach(el => {
    const cs = getComputedStyle(el);
    const text = el.textContent?.trim().substring(0, 50);
    if (!text) return;
    items.push({
      element: text,
      selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
      bg: cs.backgroundColor,
      color: cs.color,
      border_radius: cs.borderRadius,
      padding: cs.padding,
      font: cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily.split(',')[0].trim().replace(/['\x22]/g, ''),
      box_shadow: cs.boxShadow !== 'none' ? cs.boxShadow : '',
      border: cs.border !== 'none' ? cs.border : ''
    });
  });
  return JSON.stringify(items);
}"
```

#### eval 8: Box Model

```bash
npx playwright-cli eval "() => {
  const radii = new Set();
  const shadows = new Set();
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.borderRadius && cs.borderRadius !== '0px') radii.add(cs.borderRadius);
    if (cs.boxShadow && cs.boxShadow !== 'none') shadows.add(cs.boxShadow);
  });
  return JSON.stringify({ radii: [...radii], shadows: [...shadows] });
}"
```

#### Close Session

```bash
npx playwright-cli close
```

### Phase 3 -- Vision + Merge (always)

The AI receives:
- All screenshots (`reference-full.png`, and region screenshots if they exist)
- All Playwright JSON results from Phase 2 (if available)

The AI analyzes the screenshots visually and performs semantic assignment:

1. **Token assignment**: Map extracted colors to semantic roles (primary, secondary, accent, surface, on-surface, error, etc.)
2. **Font assignment**: Map extracted fonts to roles (heading, body, mono)
3. **Spacing rhythm**: Identify the base spacing unit (e.g. 4px or 8px system) from the deduplicated spacing values
4. **Radii tokens**: Deduplicate border-radius values into a token set (sm, md, lg, full)
5. **UI pattern recognition**: Note high-level patterns visible in the screenshot (card grids, hero banners, sticky navs, etc.) -- store as `content` descriptions on landmark rows

When Playwright data is available (`playwright+vision`): use exact values, Vision provides only semantic names and pattern recognition.

When no Playwright data (`vision`): Vision estimates all values from the screenshots.

### Phase 4 -- Write output

Assemble the `DesignReference` JSON object from the merged data and write it to `$STORY_DIR/design-reference.json`.

The JSON conforms to the `DesignReference` schema in `schemas.yml`. All fields populated from Phase 2 (exact) or Phase 3 (estimated). The `tokens` block contains semantically assigned values:

```json
{
  "source": "<reference URL>",
  "extracted": "<ISO date>",
  "strategy": "<vision|playwright+vision>",
  "fonts": [...],
  "typography": [...],
  "colors": [...],
  "css_variables": [...],
  "spacing": {...},
  "landmarks": {...},
  "interactive": [...],
  "tokens": {
    "colors": { "primary": "#...", "secondary": "#...", "accent": "#...", "surface": "#...", ... },
    "fonts": { "heading": "...", "body": "...", "mono": "..." },
    "spacing": ["4px", "8px", "16px", "24px", "32px", "48px"],
    "radii": ["4px", "8px", "9999px"]
  }
}
```

### Vision Fallback (hasMarkup: false)

1. Take a screenshot of the reference (or use existing screenshot path provided by the user)
2. AI analyzes the screenshot visually
3. Produce the same JSON structure with AI-estimated values
4. Set `strategy: "vision"`

## Step 5: Write Results

### reference[] Array

Build the reference array from the extracted data:
```json
[{"type": "url", "url": "<reference URL>", "threshold": 3, "title": "<page title>"}]
```

If the source was a screenshot (not URL), use `type: "image"`.

### screenshot

The full-page screenshot at `$STORY_DIR/reference-full.png`.

## Step 6: Reuse

If the target file already exists and the user chose to reuse (Step 2), read the existing JSON and reconstruct the `reference[]` array from the `source` field. The screenshot files should already exist alongside it.
