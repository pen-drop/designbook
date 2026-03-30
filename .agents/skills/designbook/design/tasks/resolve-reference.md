---
params:
  scene: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    optional: true
---

# Resolve Reference

Resolves the design reference for a scene or component, saving reference images for visual comparison.

## Step 1: Identify Target Type

Determine if the target is a **scene** or a **component**:

- If `${scene}` contains `:` → it's a scene reference. Read the `*.scenes.yml` file to find the `reference` block.
- If the target is a component → read matched framework skill rules for component reference resolution. If no rule matches, skip with: "No component-reference rule — skipping."

## Step 2: Read Reference Block

For scenes, the `reference` block looks like:

```yaml
reference:
  type: stitch | image | figma | url
  url: "..."
  title: "..."
  screens:           # optional, per-breakpoint
    xl: "..."
    sm: "..."
```

- If no `reference` block exists → skip with: "No reference — skipping."
- If `screens` exists → resolve each breakpoint separately.
- If only `url` exists (no `screens`) → use `url` for all breakpoints.
- Missing breakpoint in `screens` → fall back to the largest defined breakpoint.

## Step 3: Resolve storyId

Run `_debo resolve-url --scene ${scene}` to get the `storyId` for the output path.

## Step 4: Read Matched Rules and Resolve

Read all matched rules for the `resolve-reference` step. Rules provide type-specific resolution instructions:

- **`url`** → `url-reference` rule: screenshot the website at each breakpoint via Playwright
- **`image`** → `image-reference` rule: fetch image directly via WebFetch/Read
- **`stitch`** → `stitch-reference` rule (from designbook-stitch): use MCP to fetch screenshot
- **Unknown type with no matching rule** → warn and skip

Save resolved images to:

```
designbook/screenshots/${storyId}/reference/${breakpoint}.png
```

Create the output directory:

```bash
mkdir -p "designbook/screenshots/${storyId}/reference"
```

## Output

Report which references were resolved:

| Breakpoint | Source | Path |
|-----------|--------|------|
| sm        | stitch://... | `designbook/screenshots/{storyId}/reference/sm.png` |
| xl        | stitch://... | `designbook/screenshots/{storyId}/reference/xl.png` |
