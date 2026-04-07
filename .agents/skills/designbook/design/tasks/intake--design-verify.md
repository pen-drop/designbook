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

Build the `scene` iterable for subsequent stages. Each item only needs the scene name — `storyId`, breakpoints, and regions are resolved by `configure-meta-scene` at runtime.

```json
{
  "scene": [
    {"scene": "homepage:landing"},
    {"scene": "design-system:shell"}
  ]
}
```

Present the verification plan:

> "I will verify **[n]** scenes:
>
> | Scene |
> |-------|
> | design-system:shell |
> | homepage:landing |
>
> Ready to start?"

Wait for confirmation — once confirmed, intake is complete. The `configure-meta-scene` step will resolve storyId, determine breakpoints and regions, and write `meta.yml` for each scene.
