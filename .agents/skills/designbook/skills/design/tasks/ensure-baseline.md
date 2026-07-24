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

Capture-once, frozen reference baseline. For this `screenshot`:

**Capture the whole baseline matrix at once** with `_debo capture matrix {{ reference_dir }}/meta.yml --url <reference-url> --out {{ reference_dir }}`: it expands every `elements[]` × state × breakpoint from `meta.yml` (widths from `design-tokens.yml`), isolates each element's `selector`, runs each state's `steps`, reuses frozen PNGs, and captures the rest in one browser session, naming each `<breakpoint>--<element>--<state>.png` (`--consent-selector` dismisses a consent banner once). It fails loudly rather than silently doing nothing if `meta.yml` plans zero cells. For a single one-off element shot outside the matrix, use `_debo capture screenshot --url <url> --selector <sel> --width <px> --out <png> [--steps <json>]`.

1. **Reuse if present.** If the result PNG already exists and no `--refresh-reference` flag is set, register the existing file as the result and stop — the baseline is stable and never re-captured.
2. **Otherwise capture** with `_debo capture matrix` (or `_debo capture screenshot` for a single shot); both apply the `playwright-capture` rule's isolate-and-capture mode — resolve the viewport width for the breakpoint, run the element state's `steps` when non-rest, isolate the element `selector` (empty ⇒ full page), and capture full-page transparent to the staged result path. A selector that matches nothing → full-page fallback + warning, never fail.
3. **Verify** by reading the captured image.
