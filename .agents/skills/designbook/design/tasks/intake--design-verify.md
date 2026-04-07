---
when:
  steps: [design-verify:intake]
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
---

# Intake: Design Verify

Visual testing workflow — verify existing scenes against design references. No components or scenes are created.

## Step 1: Select Section

List all available sections by scanning `$DESIGNBOOK_DATA/sections/*/`.

> ⛔ **Skip sections that have no scene files** (no `*.scenes.yml` files or empty scenes). Only list sections that contain at least one scene.

Present only non-empty sections:

> "Which section would you like to verify?
>
> 1. **[Section Title]** — [n] scenes
> 2. **[Section Title]** — [n] scenes
> 3. **Design System** (shell)
>
> Or type 'all' to verify everything."

Wait for the user's response.

**If 'all':** collect all scenes from all sections + design-system.
**If a specific section:** collect only that section's scenes.
**If 'shell' or 'Design System':** collect only `design-system:shell`.

## Step 2: Build Scene List

Build the `scene` iterable for subsequent stages:

```json
{
  "scene": [
    {"scene": "homepage:landing", "storyId": "designbook-homepage-landing", "section_id": "homepage"},
    {"scene": "design-system:shell", "storyId": "designbook-design-system-shell"}
  ]
}
```

Present the verification plan:

> "I will verify **[n]** scenes:
>
> | Scene | Breakpoints |
> |-------|-------------|
> | design-system:shell | (configured in next step) |
>
> Ready to start?"

Wait for confirmation — once confirmed, intake is complete. The `configure-meta` step will handle reference configuration for each scene.
