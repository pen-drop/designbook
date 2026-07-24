---
name: designbook:design:verify
title: "Verify: {{ story_id }} ({{ breakpoint }}/{{ element }}--{{ state }})"
trigger:
  steps: [verify]
priority: 60
params:
  type: object
  required: [story_id, breakpoint, element, state, reference_folder]
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
    story_meta:
      path: designbook/stories/{{ story_id }}/meta.yml
      type: object
      $ref: ../schemas.yml#/StoryMeta
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
    breakpoint:
      $ref: ../schemas.yml#/BreakpointId
    element:
      $ref: ../schemas.yml#/ElementId
    state:
      type: string
      description: "Interaction state name (e.g. rest, expanded, open)."
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [verified-issues]
  properties:
    verified-issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
---

# Verify

Re-evaluates after polish + recapture. Emits `verified-issues` as a data result for downstream consumption. Does not write to `meta.yml`.

## Execution

Verify compares existing screenshots (captured by the `recapture` task) — it does NOT restart Storybook or re-capture.

1. **Read issues for this check** from the `issues` param (pre-filtered via workflow scope + `each: checks`).

2. **Re-compare based on issue source:**

   **For screenshot issues** — read both images side by side:
   - Reference: `{{ reference_folder }}/{{ breakpoint }}--{{ element }}--{{ state }}.png`
   - Storybook (after polish): `designbook/stories/{{ story_id }}/screenshots/{{ breakpoint }}--{{ element }}--{{ state }}.png`

   Compare visually and determine if the issue is resolved.

   **For extraction issues** — if extraction files exist, re-diff the specific properties mentioned in the issue. Otherwise evaluate visually from screenshots.

3. **Emit `verified-issues`** — each input issue copied over with `status: "done"` and `result: "pass" | "fail"` set.

Complete the task with `workflow done --data` passing the verified-issues array:

```bash
workflow done --data '{"verified-issues": [ ... ]}'
```

The overall check verdict (pass/fail) is derived by downstream tooling from the verified-issues array: `fail` if any issue has `result: "fail"`, else `pass`. No `meta.yml` write.
