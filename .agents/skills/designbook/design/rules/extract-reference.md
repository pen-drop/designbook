---
name: designbook:design:extract-reference
when:
  steps: [design-shell:intake, design-screen:intake, tokens:intake]
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

All browser interaction uses `playwright-cli` — no Node API scripts. See [cli-playwright.md](../../resources/cli-playwright.md) for the full command reference.

### Phase 1: Open Session and Screenshot

```bash
npx playwright-cli open
npx playwright-cli goto "<referenceUrl>"
npx playwright-cli resize 1440 1600
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx playwright-cli screenshot --full-page --filename "$STORY_DIR/reference-full.png"
```

Inspect the screenshot visually to understand the page layout.

### Phase 2: Extract All Design Characteristics

Use `playwright-cli eval` to extract DOM data. Run multiple eval calls — one per concern — to keep each extraction focused and readable.

#### Fonts
```bash
npx playwright-cli eval "() => {
  const fonts = new Set();
  document.querySelectorAll('*').forEach(el => {
    const ff = getComputedStyle(el).fontFamily;
    if (ff) fonts.add(ff.split(',')[0].trim().replace(/['\"]/g, ''));
  });
  return JSON.stringify([...fonts]);
}"
```
- For each non-system font: extract `@font-face` declarations, Google Fonts `<link>` imports
- Extract: `font-family`, `src` URLs (woff2/woff), `font-weight`, `font-style`

#### Color Palette
```bash
npx playwright-cli eval "() => {
  const bgs = new Set(); const texts = new Set();
  document.querySelectorAll('*').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bgs.add(cs.backgroundColor);
    texts.add(cs.color);
  });
  return JSON.stringify({ backgrounds: [...bgs], text: [...texts] });
}"
```
- Deduplicate and convert all values to hex format
- Note where each color appears (body bg, header bg, primary text, links, buttons, etc.)

#### Landmark Structure
```bash
npx playwright-cli eval "() => {
  function getProps(el) {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, height: el.offsetHeight + 'px', padding: cs.padding, borderBottom: cs.borderBottom };
  }
  const header = document.querySelector('header');
  const rows = header ? [...header.children].map(c => ({ tag: c.tagName, ...getProps(c), text: c.textContent?.substring(0, 100).trim() })) : [];
  const footer = document.querySelector('footer');
  const sections = footer ? [...footer.children].map(c => ({ tag: c.tagName, ...getProps(c), text: c.textContent?.substring(0, 100).trim() })) : [];
  return JSON.stringify({ header: rows, footer: sections });
}"
```

#### Layout
- Measure container max-width, edge padding, section spacing via `eval`

#### Interactive Patterns
- For each `<a>`, `<button>`, or `[role="button"]` within landmarks: extract computed styles via `eval`

#### Close Session

```bash
npx playwright-cli close
```

### Phase 3: Write design-reference.md

Write the extracted data via the workflow CLI with `--flush` so the calling task can read it immediately:

```bash
cat <<'EOF' | _debo workflow write-file $WORKFLOW_NAME $TASK_ID --path $STORY_DIR/design-reference.md --flush
<markdown content>
EOF
```

The `--path` mode writes directly to the given path without requiring a file key declaration. `--flush` ensures the file is available immediately for subsequent reads within the same task.

If the calling task declares a file key for the output, use `--key` instead:

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
