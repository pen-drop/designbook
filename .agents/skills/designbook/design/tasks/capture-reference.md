---
name: designbook:design:capture-reference
title: "Capture Reference: {scene_id} ({breakpoint}/{region})"
trigger:
  steps: [capture]
filter:
  type: screenshot
priority: 10
params:
  type: object
  $ref: ../schemas.yml#/Check
  required: [scene_id, reference_folder, breakpoints]
  properties:
    scene_id:
      $ref: ../../scenes/schemas.yml#/SceneId
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
    breakpoints: { type: string }
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
each:
  checks:
    $ref: ../schemas.yml#/Check
---

# Capture Reference

Captures a reference screenshot by loading the source URL at the given breakpoint viewport width via Playwright.

## Execution

1. **Resolve reference URL** from `StoryMeta` entity:
   ```bash
   _debo story --scene ${scene}
   ```
   Read the `reference.url` from the story JSON output. If no reference URL is available, skip with a warning.

   **Download URLs:** If the reference URL triggers a file download instead of rendering in the browser (e.g., a provider-specific download endpoint), download it first:
   ```bash
   curl -sL "$URL" -o /tmp/reference-${storyId}.html
   ```
   Then use `file:///tmp/reference-${storyId}.html` as the capture URL.

2. **Capture screenshot** for this breakpoint/region combination using the `playwright-capture` rule.

   Follow the capture protocol defined in `playwright-capture.md` — it handles viewport resolution, region-based capture mode selection, and the staged file flow.

## Output

Screenshots are written to the reference folder:

| Breakpoint | Region | Path |
|-----------|--------|------|
| sm | header | `{reference_folder}/sm--header.png` |
| sm | footer | `{reference_folder}/sm--footer.png` |
| xl | full | `{reference_folder}/xl--full.png` |
