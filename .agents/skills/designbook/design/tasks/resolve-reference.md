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

## Step 2: Read Reference Array

For scenes, the `reference` is an array where each entry represents one breakpoint:

```yaml
reference:
  - type: url
    url: "https://..."
    breakpoint: sm
    threshold: 5
    title: "Mobile View"
  - type: image
    url: "..."
    breakpoint: xl
    threshold: 2
```

- If no `reference` array exists → skip with: "No reference — skipping."
- Each entry is resolved independently by its `type`.
- Mixed types are allowed (e.g. url for mobile, image for desktop). Integration skills can add custom types.

## Step 3: Resolve storyId

Run `_debo resolve-url --scene ${scene}` to get the `storyId` for the output path.

**Fallback if `resolve-url` fails**: scan `designbook/screenshots/` for a directory matching the scene pattern and use that as the `storyId`.

## Step 4: Read Matched Rules and Resolve

For each entry in the `reference` array, resolve by its `type`. Rules provide type-specific resolution:

- **`url`** → `url-reference` rule: screenshot the URL at the entry's breakpoint via Playwright
- **`image`** → `image-reference` rule: fetch image directly via WebFetch/Read
- Integration-specific types (e.g. from design tool skills) → matched rule from the corresponding skill
- **Unknown type with no matching rule** → warn and skip

Save each resolved image to:

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
| sm        | https://example.com/mobile | `designbook/screenshots/{storyId}/reference/sm.png` |
| xl        | https://example.com/desktop | `designbook/screenshots/{storyId}/reference/xl.png` |
