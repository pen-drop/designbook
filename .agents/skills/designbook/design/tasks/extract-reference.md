---
when:
  steps: [extract-reference]
params:
  scene_id: { type: string }
  component_id: { type: string }
result:
  design-reference:
    path: $STORY_DIR/design-reference.md
  reference:
    type: array
    items:
      $ref: ../schemas.yml#/Reference
  screenshot:
    path: $STORY_DIR/reference-full.png
reads:
  - path: $DESIGNBOOK_DATA/vision.md
  - path: $STORY_DIR/design-reference.md
    optional: true
---

# Extract Reference

Standalone task that resolves and extracts a design reference. First stage in all design workflows (design-component, design-shell, design-screen, design-verify).

## Step 1: Resolve $STORY_DIR

Resolve the story directory using the CLI. Exactly one of `scene_id` or `component_id` will be set:

- If `scene_id` is set: `STORY_DIR=$(_debo story --scene ${scene_id} --create | jq -r '.storyDir')`
- If `component_id` is set: `STORY_DIR=$(_debo story --component ${component_id} --create | jq -r '.storyDir')`

## Step 2: Reuse Check

If `$STORY_DIR/design-reference.md` already exists (from a prior workflow run):

> "A design reference already exists for this target:
>
> [show first 10 lines of existing file]
>
> Use existing reference or extract fresh?"

If the user chooses to reuse, read the existing file and skip to Step 5.

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

If the user says "skip", complete the task with empty results (no design-reference.md, empty reference array, no screenshot).

## Step 4: Extract Structure

### Strategy Selection

Select strategy based on provider capabilities:

1. **`hasMarkup: true`** → Playwright extraction
2. **`hasMarkup: false` + `hasAPI: true`** → Provider MCP API (future)
3. **`hasMarkup: false` + `hasAPI: false`** → AI vision analysis of screenshot

If multiple capabilities exist, prefer Playwright over API over vision.

### Storybook URL Resolution

When capturing from Storybook (not an external reference URL), obtain the URL dynamically:

```bash
_debo storybook status
```

Extract the `url` field from the JSON response (e.g. `http://localhost:34757`). Do not use `$DESIGNBOOK_URL` from config — the port is dynamic.

If `storybook status` returns `{ "running": false }`, start it first with `_debo storybook start` and re-check status.

### Playwright Extraction (hasMarkup: true)

All browser interaction uses `playwright-cli` — no Node API scripts. See [cli-playwright.md](../../resources/cli-playwright.md) for the full command reference.

#### Phase 1: Open Session and Screenshot

```bash
npx playwright-cli open
npx playwright-cli goto "<referenceUrl>"
npx playwright-cli resize 1440 1600
npx playwright-cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx playwright-cli screenshot --full-page --filename "$STORY_DIR/reference-full.png"
```

Inspect the screenshot visually to understand the page layout.

#### Phase 2: Extract All Design Characteristics

Use `playwright-cli eval` to extract DOM data. Run multiple eval calls — one per concern — to keep each extraction focused and readable.

##### Fonts
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

##### Color Palette
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

##### Landmark Structure
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

##### Layout
- Measure container max-width, edge padding, section spacing via `eval`

##### Interactive Patterns
- For each `<a>`, `<button>`, or `[role="button"]` within landmarks: extract computed styles via `eval`

#### Close Session

```bash
npx playwright-cli close
```

#### Phase 3: Write design-reference.md

Write the extracted data via the workflow CLI with `--flush` so the calling task can read it immediately:

```bash
cat <<'EOF' | _debo workflow result --task $TASK_ID --key design-reference --flush
<markdown content>
EOF
```

`--flush` ensures the file is available immediately for subsequent reads within the same task.

### Vision Fallback (hasMarkup: false, hasAPI: false)

1. Take a screenshot of the reference (or use existing screenshot)
2. AI analyzes the screenshot visually
3. Produce the same Markdown format with AI-estimated values
4. Add a note: `Strategy: vision (estimated values)`

## Step 5: Write Results

### design-reference.md

Write the extracted data to `$STORY_DIR/design-reference.md` using the output format below.

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

### reference[] Array

Build the reference array from the extracted data:
```json
[{"type": "url", "url": "<reference URL>", "threshold": 3, "title": "<page title>"}]
```

If the source was a screenshot (not URL), use `type: "image"`.

### screenshot

The full-page screenshot at `$STORY_DIR/reference-full.png`.

## Reuse

If the target file already exists and the user chose to reuse (Step 2), read it and reconstruct the `reference[]` array from the `Source:` line. The screenshot file should already exist alongside it.
