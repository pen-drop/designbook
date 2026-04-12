---
name: designbook:design:extract-reference
when:
  steps: [design-shell:intake, design-screen:intake, tokens:intake, compare-markup]
---

# Design Extraction

Extracts visual design characteristics from any URL (reference site or Storybook) and writes a curated Markdown document. Used by both intake (→ `design-reference.md`) and verify (→ `design-storybook.md`).

## When to Apply

This rule activates when a URL needs design extraction. The calling task determines:
- **Which URL** to extract from (reference or Storybook)
- **Which filename** to write (`design-reference.md` or `design-storybook.md`)

## Story Directory

Resolve via CLI:
```bash
STORY_DIR=$(_debo story --scene <group>:<name> --create | jq -r '.storyDir')
```

## Strategy Selection

Select strategy based on provider capabilities:

1. **`hasMarkup: true`** → Playwright extraction
2. **`hasMarkup: false` + `hasAPI: true`** → Provider MCP API (future)
3. **`hasMarkup: false` + `hasAPI: false`** → AI vision analysis of screenshot

If multiple capabilities exist, prefer Playwright over API over vision.

## Playwright Extraction (hasMarkup: true)

**Important:** Write extraction scripts to the workspace root directory (where `node_modules/` is located), not to `/tmp`.

### Phase 1: DOM Reconnaissance

1. **Open Playwright session on reference URL** using the Node API:
   ```javascript
   const { chromium } = require('playwright');
   const browser = await chromium.launch();
   const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });
   await page.goto(referenceUrl, { waitUntil: 'networkidle' });
   await page.waitForTimeout(3000);
   ```

2. **Retrieve DOM summary**: tag names, class names, landmark roles, nesting depth.

3. **Inspect reference screenshot** visually to understand the page layout.

### Phase 2: Extract All Design Characteristics

Extract everything needed for the design reference in a single pass:

#### Fonts
- Enumerate all unique `fontFamily` values from computed styles across the page
- For each non-system font:
  - Scan `<style>` and `<link rel="stylesheet">` sources for `@font-face` declarations
  - Extract: `font-family`, `src` URLs (woff2/woff), `font-weight`, `font-style`, `font-display`
  - Check for Google Fonts `<link>` imports — extract the full import URL

#### Color Palette
- Collect every unique `backgroundColor` from all elements with a non-transparent background
- Collect every unique `color` from all text-bearing elements
- Collect every unique `borderColor` from elements with visible borders
- Deduplicate and convert all values to hex format
- Note where each color appears (body bg, header, footer section, text, links, buttons, etc.)

#### Layout
- Measure the actual content max-width from the innermost width-constraining ancestor
- Measure edge padding at different viewport widths (mobile, tablet, desktop, wide)
- Measure vertical spacing between major sections

#### Landmark Structure
- For each direct child of `<header>`, `<footer>`, `<main>`:
  - `backgroundColor`, `height`, `padding`, `borderTop`/`borderBottom`
  - Content summary (what kind of elements are inside: text, images, links, form elements, icons)

#### Interactive Patterns
- For each `<a>`, `<button>`, or `[role="button"]` within landmarks:
  - Tag name, computed styles (`backgroundColor`, `color`, `borderRadius`, `padding`, `fontWeight`)
  - Text content, and any child icon elements (tag, class name, text content)

#### Selector rules
- Prefer class-based or landmark-based selectors over tag-only selectors
- Scope selectors to visible content area
- Skip generic wrapper divs with no visual styling
- For repeated identical elements, extract one representative and note count

### Phase 3: Write design-reference.md

Write the extracted data via the workflow CLI with `--flush` so the calling task can read it immediately:

```bash
cat <<'EOF' | _debo workflow write-file $WORKFLOW_NAME $TASK_ID --path $STORY_DIR/design-reference.md --flush
<markdown content>
EOF
```

The `--path` mode writes directly to the given path without requiring a file key declaration. `--flush` ensures the file is available immediately for subsequent reads within the same task.

If the calling task declares a file key for the output (e.g. `design-storybook` in compare-markup), use `--key` instead:

```bash
cat <<'EOF' | _debo workflow write-file $WORKFLOW_NAME $TASK_ID --key design-storybook --flush
<markdown content>
EOF
```

**Output format:**

```markdown
# Design Reference

Source: [reference URL]
Extracted: [date]

## Fonts

| Family | Source | Weights | Style |
|--------|--------|---------|-------|
| [name] | [URL or Google Fonts import] | [weights] | [normal/italic] |

## Color Palette

| Hex | Usage |
|-----|-------|
| #... | [where it appears: body bg, header bg, primary text, ...] |

## Layout

- Container max-width: [value]
- Edge padding: [mobile] → [tablet] → [desktop] → [wide]
- Section spacing: [value]

## Landmark Structure

### Header
- Row 1: [bg color], [height] — [content summary]
- Row 2: [bg color], [height] — [content summary]

### Footer
- Section 1: [bg color] — [content summary]
- Section 2: [bg color] — [content summary]

## Interactive Patterns

| Element | Styles | Description |
|---------|--------|-------------|
| [button/link] | bg: ..., color: ..., radius: ... | [what it does] |
```

## Vision Fallback (hasMarkup: false, hasAPI: false)

1. Take a screenshot of the reference (or use existing screenshot)
2. AI analyzes the screenshot visually
3. Produce the same Markdown format with AI-estimated values
4. Add a note: `Strategy: vision (estimated values)`

## Reuse

If the target file already exists in the story directory and the calling task does not require a fresh extraction, read the existing file instead of re-extracting.

## Display

The Storybook addon discovers `design-reference.md` and `design-storybook.md` in the story directory (alongside `meta.yml`) and renders their content below the story canvas.
