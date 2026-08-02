---
name: designbook:design:ensure-baseline
title: "Ensure Baseline: {{ screenshot.element }} ({{ screenshot.breakpoint }}/{{ screenshot.state }})"
trigger:
  steps: [ensure-baseline]
priority: 10
params:
  type: object
  required: [screenshot, reference_dir]
  properties:
    screenshot:
      type: object
      $ref: ../schemas.yml#/Screenshot
    reference_dir:
      type: string
      description: "Absolute path to the reference directory (references/<hash>/) where baseline PNGs are frozen."
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [screenshot_file]
  properties:
    screenshot_file:
      path: "{{ reference_dir }}/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png"
      submission: direct
      validators: [image]
each:
  screenshot:
    expr: "reference_screenshots"
    schema: { $ref: ../schemas.yml#/Screenshot }
---

# Ensure Baseline

Verify the frozen reference baseline is present. `extract-reference` captured it during extraction; this step only confirms it and reads it back. For this `screenshot`:

1. **Verify present.** If the result PNG `{{ reference_dir }}/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png` exists, register it as the result and read it (image validator). The baseline is stable and never re-captured.
2. **Fallback capture (missing baseline).** If the PNG is absent — e.g. `design-verify` run standalone without a prior `extract-reference` capture — capture it with `_debo capture matrix {{ reference_dir }}/meta.yml --url <reference-url> --out {{ reference_dir }}` (or `_debo capture screenshot --url <url> --selector <sel> --width <px> --out <png>` for a single cell), applying the `playwright-capture` isolate-and-capture mode. This keeps `design-verify` self-healing.
3. **Read** the (verified or freshly captured) image before returning.
