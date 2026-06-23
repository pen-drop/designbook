---
name: designbook:design:ensure-baseline
title: "Ensure Baseline: {{ screenshot.element }} ({{ screenshot.breakpoint }}/{{ screenshot.state }})"
trigger:
  steps: [extract-reference, ensure-baseline]
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

Capture-once, frozen reference baseline. For this `screenshot`:

1. **Reuse if present.** If the result PNG already exists and no `--refresh-reference` flag is set, register the existing file as the result and stop — the baseline is stable and never re-captured.
2. **Otherwise capture** via the `playwright-capture` rule's isolate-and-capture mode:
   resolve the viewport width for `screenshot.breakpoint` from `design-tokens.yml`; run the
   element state's `steps` against the reference page (in full layout) when the state is non-rest;
   then isolate `screenshot.selector` (empty ⇒ full page) and capture full-page transparent to the
   staged result path. A selector that matches nothing → full-page fallback + warning, never fail.
3. **Verify** by reading the captured image.
