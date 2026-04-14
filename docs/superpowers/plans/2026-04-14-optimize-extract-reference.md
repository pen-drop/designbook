# Optimize extract-reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the lossy Markdown roundtrip in extract-reference with structured JSON output, add vision-enhanced semantic extraction, and formalize the DesignHint schema.

**Architecture:** All changes are to markdown skill files (`.agents/skills/`). No TypeScript code changes. The extract-reference task gets a full rewrite with a new 4-phase flow (screenshot, playwright evals, vision+merge, write JSON). All downstream consumers switch from reading `design-reference.md` to `design-reference.json`.

**Tech Stack:** YAML frontmatter, markdown task files, JSON schema definitions in `schemas.yml`

---

### Task 1: Add DesignReference and DesignHint schemas to schemas.yml

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml`

- [ ] **Step 1: Add DesignReference schema**

Append after the `EntityMapping` schema (after line 72):

```yaml

DesignReference:
  type: object
  required: [source, extracted, strategy]
  properties:
    source: { type: string }
    extracted: { type: string }
    strategy: { type: string, enum: [vision, playwright+vision] }
    fonts:
      type: array
      items:
        type: object
        properties:
          family: { type: string }
          source: { type: string }
          weights: { type: array, items: { type: number } }
          styles: { type: array, items: { type: string } }
    typography:
      type: array
      items:
        type: object
        properties:
          element: { type: string }
          font_family: { type: string }
          font_size: { type: string }
          line_height: { type: string }
          letter_spacing: { type: string }
          font_weight: { type: number }
          color: { type: string }
    colors:
      type: array
      items:
        type: object
        properties:
          hex: { type: string }
          usage: { type: array, items: { type: string } }
    css_variables:
      type: array
      items:
        type: object
        properties:
          name: { type: string }
          value: { type: string }
    spacing:
      type: object
      properties:
        container_max_width: { type: string }
        edge_padding: { type: string }
        section_gap: { type: string }
        values: { type: array, items: { type: string } }
    landmarks:
      type: object
      properties:
        header:
          type: object
          properties:
            rows:
              type: array
              items:
                type: object
                properties:
                  tag: { type: string }
                  bg: { type: string }
                  height: { type: string }
                  padding: { type: string }
                  content: { type: string }
                  layout: { type: string }
                  gap: { type: string }
        footer:
          type: object
          properties:
            rows:
              type: array
              items:
                type: object
                properties:
                  tag: { type: string }
                  bg: { type: string }
                  height: { type: string }
                  padding: { type: string }
                  content: { type: string }
                  layout: { type: string }
                  gap: { type: string }
    interactive:
      type: array
      items:
        type: object
        properties:
          element: { type: string }
          selector: { type: string }
          bg: { type: string }
          color: { type: string }
          border_radius: { type: string }
          padding: { type: string }
          font: { type: string }
          box_shadow: { type: string }
          border: { type: string }
    tokens:
      type: object
      properties:
        colors:
          type: object
        fonts:
          type: object
        spacing:
          type: array
          items: { type: string }
        radii:
          type: array
          items: { type: string }
```

- [ ] **Step 2: Add DesignHint schema**

Append after DesignReference:

```yaml

DesignHint:
  type: object
  properties:
    landmark: { type: string }
    rows:
      type: array
      items:
        type: object
        properties:
          bg: { type: string }
          height: { type: string }
          layout: { type: string }
          gap: { type: string }
          padding: { type: string }
          content: { type: string }
    fonts:
      type: object
    interactive:
      type: array
      items:
        type: object
        properties:
          element: { type: string }
          bg: { type: string }
          color: { type: string }
          border_radius: { type: string }
          padding: { type: string }
          box_shadow: { type: string }
    tokens:
      type: object
```

- [ ] **Step 3: Update Component schema — design_hint field**

In the `Component` schema (line 47), change:
```yaml
# Old:
    design_hint: { type: object }
# New:
    design_hint:
      $ref: "#/DesignHint"
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/schemas.yml
git commit -m "feat: add DesignReference and DesignHint schemas, type design_hint"
```

---

### Task 2: Rewrite extract-reference.md

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md`

- [ ] **Step 1: Read the current file**

Read `.agents/skills/designbook/design/tasks/extract-reference.md` to understand the full current content (254 lines).

- [ ] **Step 2: Replace the entire file**

Replace with the new version. Key changes:
- Result `design-reference` path changes from `.md` to `.json`
- New `reads` entry for `design-reference.json` (reuse check)
- Remove `design-reference.md` read
- New 4-phase extraction flow: Screenshot → Playwright evals → Vision+Merge → Write JSON
- Deeper eval scripts (8 evals instead of 5)
- Region screenshots via snapshot refs
- Vision pass always runs (baseline), Playwright enhances when available
- Token extraction in both paths

New file content:

```markdown
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

### Phase 1 -- Screenshot (always)

Open a Playwright session, take the full-page screenshot, then capture region screenshots.

```bash
npx playwright-cli open
npx playwright-cli goto "<referenceUrl>"
npx playwright-cli resize 1440 1600
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx playwright-cli screenshot --full-page --filename "$STORY_DIR/reference-full.png"
```

Take a snapshot to identify landmark refs, then capture region screenshots:

```bash
npx playwright-cli snapshot
```

From the snapshot, identify header and footer element refs. If they exist:

```bash
npx playwright-cli screenshot <header-ref> --filename "$STORY_DIR/reference-header.png"
npx playwright-cli screenshot <footer-ref> --filename "$STORY_DIR/reference-footer.png"
```

Inspect all screenshots visually to understand the page layout.

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
      const m = bs.match(/rgba?\([^)]+\)/); if (m) { const h = rgbToHex(m[0]); if (h) addColor(h, 'shadow'); }
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

Assemble the `DesignReference` JSON object from the merged data and write it:

```bash
cat <<'ENDJSON' > "$STORY_DIR/design-reference.json"
{
  "source": "<reference URL>",
  "extracted": "<ISO date>",
  "strategy": "<vision|playwright+vision>",
  "fonts": [ ... ],
  "typography": [ ... ],
  "colors": [ ... ],
  "css_variables": [ ... ],
  "spacing": { ... },
  "landmarks": { ... },
  "interactive": [ ... ],
  "tokens": {
    "colors": { "primary": "#...", "secondary": "#...", ... },
    "fonts": { "heading": "...", "body": "...", ... },
    "spacing": ["4px", "8px", "16px", "24px", "32px", "48px"],
    "radii": ["4px", "8px", "9999px"]
  }
}
ENDJSON
```

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
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/extract-reference.md
git commit -m "feat: rewrite extract-reference with structured JSON output and vision-enhanced extraction"
```

---

### Task 3: Update intake reads and body text (.md to .json)

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-component.md`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-shell.md`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-screen.md`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-verify.md`

All four files need the same kind of change: update `reads` paths and body text references from `design-reference.md` to `design-reference.json`.

- [ ] **Step 1: Update intake--design-component.md**

In the frontmatter (line 10), change the reads path:
```yaml
# Old:
  - path: $STORY_DIR/design-reference.md
# New:
  - path: $STORY_DIR/design-reference.json
```

In the body text, replace all occurrences of `design-reference.md` with `design-reference.json`. There are 4 occurrences:
- Line 18: `$STORY_DIR/design-reference.md` → `$STORY_DIR/design-reference.json`
- Line 22: `design-reference.md` → `design-reference.json`
- Line 44: `design-reference.md` → `design-reference.json`
- Line 139: `design-reference.md` → `design-reference.json`

- [ ] **Step 2: Update intake--design-shell.md**

In the frontmatter (line 13), change the reads path:
```yaml
# Old:
  - path: $STORY_DIR/design-reference.md
# New:
  - path: $STORY_DIR/design-reference.json
```

In the body text, replace all occurrences of `design-reference.md` with `design-reference.json`. There are 6 occurrences:
- Line 24: `$STORY_DIR/design-reference.md` → `$STORY_DIR/design-reference.json`
- Line 30: `design-reference.md` → `design-reference.json`
- Line 62: `design-reference.md` → `design-reference.json`
- Line 87: `design-reference.md` → `design-reference.json`
- Line 148: `design-reference.md` → `design-reference.json`
- Line 151: `design-reference.md` → `design-reference.json`

- [ ] **Step 3: Update intake--design-screen.md**

In the frontmatter (line 23), change the reads path:
```yaml
# Old:
  - path: $STORY_DIR/design-reference.md
# New:
  - path: $STORY_DIR/design-reference.json
```

In the body text, replace all occurrences of `design-reference.md` with `design-reference.json`. There are 3 occurrences:
- Line 33: `$STORY_DIR/design-reference.md` → `$STORY_DIR/design-reference.json`
- Line 98: `design-reference.md` → `design-reference.json`
- Line 161: `design-reference.md` → `design-reference.json`

- [ ] **Step 4: Update intake--design-verify.md**

In the frontmatter (line 21), change the reads path:
```yaml
# Old:
  - path: $STORY_DIR/design-reference.md
# New:
  - path: $STORY_DIR/design-reference.json
```

In the body text, replace all occurrences of `design-reference.md` with `design-reference.json`. There are 2 occurrences:
- Line 54: `design-reference.md` → `design-reference.json`
- Line 59: `design-reference.md` → `design-reference.json`

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-component.md \
        .agents/skills/designbook/design/tasks/intake--design-shell.md \
        .agents/skills/designbook/design/tasks/intake--design-screen.md \
        .agents/skills/designbook/design/tasks/intake--design-verify.md
git commit -m "feat: update all intakes to read design-reference.json instead of .md"
```

---

### Task 4: Update create-scene.md and create-tokens.md

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/create-scene.md`
- Modify: `.agents/skills/designbook/tokens/tasks/create-tokens.md`

- [ ] **Step 1: Update create-scene.md**

In the frontmatter reads (line 19), change:
```yaml
# Old:
  - path: $STORY_DIR/design-reference.md
    optional: true
# New:
  - path: $STORY_DIR/design-reference.json
    optional: true
```

In the body text (line 33), change:
```markdown
# Old:
- `design-reference.md` — optional design source; provides a URL for scene `reference:` entries
# New:
- `design-reference.json` — optional design source; provides source URL for scene `reference:` entries
```

In the Reference Resolution section (line 64), change:
```markdown
# Old:
If `$STORY_DIR/design-reference.md` exists, read its `Source:` line to extract the reference URL. Use this URL to populate the scene's `reference:` array (type: url, threshold: 3). If the `{{ reference }}` param is empty but design-reference.md exists, construct the reference entry from the extracted URL.
# New:
If `$STORY_DIR/design-reference.json` exists, read its `source` field to extract the reference URL. Use this URL to populate the scene's `reference:` array (type: url, threshold: 3). If the `{{ reference }}` param is empty but design-reference.json exists, construct the reference entry from the JSON `source` field.
```

- [ ] **Step 2: Update create-tokens.md**

In the frontmatter reads (line 7), change:
```yaml
# Old:
  - path: $STORY_DIR/design-reference.md
    optional: true
# New:
  - path: $STORY_DIR/design-reference.json
    optional: true
```

In the body text, replace all occurrences of `design-reference.md` with `design-reference.json`. There are 7 occurrences at lines 30, 32, 34, 42, 52, 62, and the `Source:` parse instruction at line 34.

Additionally, update the body text to reflect that the data is now structured JSON instead of Markdown sections:

Line 30: change `If $STORY_DIR/design-reference.md already exists` to `If $STORY_DIR/design-reference.json already exists`

Line 32: change `apply the extract-reference rule to the design reference URL from vision.md. Write the result directly to $STORY_DIR/design-reference.md` to `apply the extract-reference rule to the design reference URL from vision.md. Write the result to $STORY_DIR/design-reference.json`

Line 34: change `Use its **Fonts** and **Color Palette** sections as the starting point` to `Use its `fonts`, `colors`, and `tokens` fields as the starting point`

Line 42: change `present the fonts and colors from design-reference.md` to `present the fonts and colors from design-reference.json`

Line 52: change `present the color palette from design-reference.md grouped by hue similarity` to `present the color palette from design-reference.json (use the `tokens.colors` field for semantic grouping, `colors` array for the full palette)`

Line 62: change `present the font families from design-reference.md` to `present the font families from design-reference.json (use the `tokens.fonts` field for role assignment)`

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/create-scene.md \
        .agents/skills/designbook/tokens/tasks/create-tokens.md
git commit -m "feat: update create-scene and create-tokens to read design-reference.json"
```

---

### Task 5: Cleanup and cross-reference validation

**Files:**
- Modify: `.agents/skills/designbook/resources/cli-workflow.md` (line 187, if needed)
- Verify: all remaining references to `design-reference.md` are removed

- [ ] **Step 1: Grep for remaining design-reference.md references**

```bash
grep -r "design-reference\.md" .agents/skills/ --include="*.md"
```

Expected: zero results. If any remain, update them to `.json`.

- [ ] **Step 2: Update cli-workflow.md if needed**

Line 187 mentions `design-reference.md` as an example of auxiliary reference files. If found in Step 1, update the example to `design-reference.json`.

- [ ] **Step 3: Verify DesignReference schema keys match extract-reference output**

Read `schemas.yml` and verify all top-level properties in `DesignReference` (source, extracted, strategy, fonts, typography, colors, css_variables, spacing, landmarks, interactive, tokens) match the JSON structure written in extract-reference.md Phase 4.

- [ ] **Step 4: Verify DesignHint schema keys match Component schema**

Verify that `Component.design_hint` references `DesignHint` via `$ref`, and that `DesignHint` properties (landmark, rows, fonts, interactive, tokens) are a subset of `DesignReference` properties.

- [ ] **Step 5: Verify all reads declarations point to .json**

```bash
grep -r "design-reference" .agents/skills/ --include="*.md" | grep -v ".json" | grep -v "spec\|plan\|\.md:"
```

Expected: no frontmatter `reads:` or `path:` entries still pointing to `.md`.

- [ ] **Step 6: Commit if any fixes were needed**

```bash
git add -A .agents/skills/
git commit -m "fix: cleanup remaining design-reference.md references"
```

If no fixes needed, skip this step.
