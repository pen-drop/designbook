---
name: designbook:design:ensure-baseline-live
title: "Ensure Baseline (live): {{ screenshot.element }} ({{ screenshot.breakpoint }}/{{ screenshot.state }})"
trigger:
  steps: [ensure-baseline-live]
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
      description: "Absolute path to the reference directory (references/<hash>/) where the live Storybook baseline PNG is (re)captured each run."
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

# Ensure Baseline (live)

Live-reference baseline for `sync-verify`, where the reference **is** the current
Storybook render — not a frozen design. The Storybook render tracks the mapped
component/story source and the freshly generated CSS, so the baseline is
**re-captured every run**, unconditionally: there is no reuse-if-present branch and
no `--refresh-reference` gate. This guarantees the backend config is always diffed
against the current Storybook render, never a stale snapshot. (The frozen,
capture-once counterpart is `ensure-baseline`, used by `design-verify`.)

For this `screenshot`:

1. **Capture** via the `playwright-capture` rule's isolate-and-capture mode:
   resolve the viewport width for `screenshot.breakpoint` from `design-tokens.yml`; run the
   element state's `steps` against the reference page (in full layout) when the state is non-rest;
   then isolate `screenshot.selector` (empty ⇒ full page) and capture full-page transparent to the
   staged result path. A selector that matches nothing → full-page fallback + warning, never fail.
   Always capture — never reuse an existing PNG at the result path.
2. **Verify** by reading the captured image.
