---
name: designbook:design:polish-config
title: "Polish Config {{ issue.id }}"
description: "{{ issue.description }}"
trigger:
  steps: [polish-config]
domain: [sync-verify]
priority: 50
params:
  type: object
  required: [issue]
  properties:
    issue:
      type: object
      $ref: ../schemas.yml#/Issue
each:
  issue:
    expr: "issues"
    schema: { $ref: ../schemas.yml#/Issue }
---

# Polish Config

Single backend fix pass for one consolidated deviation from triage. The candidate is the
backend render; the reference is the Storybook render. Close the deviation by adjusting the
**backend config** that produced the render (the display config for a `config` kind; the
synced page's block/layout/`page_layout` config for a `scene` kind — a Scene carries its
visible content inline in that config, so there is no content to edit), then hand off to the
re-capture stage.

> ⛔ The Storybook component, scene, and story are the **reference** — never edit them here.
> The only fix surface is the backend config that produced the render.

## Step 0: Inspect Before Any Fix

1. Read the `issue.description` — affected subject, the properties to change (VON → NACH
   values), and the config to edit.
2. Open the backend render and the Storybook baseline for the affected `(breakpoint,
   element, state)` and confirm what the deviation looks like before changing anything.

## Step 1: Fix the Backend Config

Apply the smallest backend change that closes the deviation. The loaded subject-mapping and
backend-integration rules define which backend surface maps to the rendered subject and how
it is edited.

**Change scope:**

| In scope | Out of scope |
|----------|-------------|
| The backend config that produced the render (the display / layout / `page_layout` config) | The Storybook component, scene, or story (the reference) |
| Config-to-component field/formatter/mapping | Any content entity — a Scene's content lives inline in its config |
| | `design-tokens.yml` |
| | The `render_url` resolver / workflow configuration |

## Step 2: Hand Off to Re-Capture

The single fix pass is complete once the config edit lands. The workflow re-captures the
backend render and re-compares against the frozen Storybook baseline to produce the final
score — do not re-capture inside this task.
