---
when:
  steps: [extract-reference]
params:
  type: object
  required: [vision]
  properties:
    story_id: { type: string, default: "" }
    reference_folder: { type: string, default: "" }
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      type: object
result:
  type: object
  required: [reference_dir, reference]
  properties:
    reference_dir:
      type: string
    reference:
      type: array
      items:
        $ref: ../schemas.yml#/Reference
    screenshot:
      type: string
      default: ""
---

# Extract Reference

Standalone task that resolves and extracts a design reference. First stage in all design workflows (design-component, design-shell, design-screen, design-verify).

Output is a `DesignReference` JSON object saved to `$DESIGNBOOK_DATA/references/<hash>/extract.json`. Screenshots are saved alongside it. Two strategies, both always include vision:

- **`playwright+vision`** -- Playwright extracts exact DOM values, Vision provides semantic understanding. Best quality.
- **`vision`** -- Screenshot only, all values estimated by AI. Fallback when no markup is available.

## Reference Directory

`$REF_DIR` is `params.reference_folder` (pre-resolved by the workflow engine's `reference_folder` resolver). If `reference_folder` is empty (standalone invocation without a workflow), fall back to the manual hash computation:

```bash
HASH=$(echo -n "<normalized-url>" | sha256sum | cut -c1-12)
REF_DIR="$DESIGNBOOK_DATA/references/$HASH"
mkdir -p "$REF_DIR"
```

## Step 1: Find Reference URL

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

If the user says "skip", complete the task with empty results (no extract.json, empty reference array, no screenshot).

## Step 2: Reuse Check

After resolving the URL and computing the hash, check if an extraction already exists:

```bash
test -f "$REF_DIR/extract.json"
```

**If `extract.json` exists:**

Read the `extracted` field from the JSON to show the extraction date:

> "Extraktion von `<url>` existiert bereits (extrahiert am `<date>`). Wiederverwenden oder neu extrahieren?"

Wait for response. The user may:
- **Reuse**: Read `extract.json`, build results from it, skip to Step 5
- **Re-extract**: Continue to Step 4

**If `extract.json` does not exist:** Continue to Step 4.

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
npx @playwright/cli open
npx @playwright/cli goto "<referenceUrl>"
npx @playwright/cli resize 1440 1600
npx @playwright/cli run-code "async (page) => { await page.waitForTimeout(3000) }"
npx @playwright/cli screenshot --full-page --filename "$REF_DIR/reference-full.png"
```

Inspect the screenshot visually to understand the page layout.

Take a snapshot to identify landmark refs, then capture region screenshots:

```bash
npx @playwright/cli snapshot
```

From the snapshot, identify header and footer element refs. If they exist:

```bash
npx @playwright/cli screenshot <header-ref> --filename "$REF_DIR/reference-header.png"
npx @playwright/cli screenshot <footer-ref> --filename "$REF_DIR/reference-footer.png"
```

### Phase 2 -- Playwright eval calls (when hasMarkup: true)

Run the 8 eval scripts from [playwright-evals.md](resources/playwright-evals.md) in order: Fonts, Typography, Colors, CSS Variables, Spacing, Landmarks, Interactive, Box Model. Each returns JSON.

For each non-system font found in eval 1: extract `@font-face` declarations and Google Fonts `<link>` imports to get the `source` URL.

After all evals, close the session:

```bash
npx @playwright/cli close
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

Write the assembled `DesignReference` JSON to the reference directory:

```bash
# Write extract.json
cat > "$REF_DIR/extract.json" << 'EOF'
<assembled DesignReference JSON>
EOF
```

The JSON conforms to the `DesignReference` schema in `schemas.yml`. All fields populated from Phase 2 (exact) or Phase 3 (estimated). The `tokens` block contains semantically assigned values.

### Vision Fallback (hasMarkup: false)

1. Take a screenshot of the reference (or use existing screenshot path provided by the user)
2. AI analyzes the screenshot visually
3. Produce the same JSON structure with AI-estimated values
4. Set `strategy: "vision"`

## Step 5: Return Results

All results are returned as data results via `workflow done --data`.

### reference_dir

The absolute path to the hash directory: `$REF_DIR` (e.g. `$DESIGNBOOK_DATA/references/a1b2c3d4e5f6`).

### reference[] Array

Build the reference array from the extracted data:
```json
[{"type": "url", "url": "<reference URL>", "threshold": 3, "title": "<page title>"}]
```

If the source was a screenshot (not URL), use `type: "image"`.

### screenshot

The full-page screenshot at `$REF_DIR/reference-full.png`.

## Step 6: Reuse

If the user chose to reuse in Step 2, read `$REF_DIR/extract.json` and reconstruct the `reference[]` array from the `source` field. The screenshot files already exist in `$REF_DIR/`.
