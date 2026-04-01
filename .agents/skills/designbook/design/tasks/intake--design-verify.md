---
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

## Step 2: Resolve Design References

> ⛔ **MANDATORY**: Execute this step for each selected scene.

Follow the process in [resolve-design-reference.md](partials/resolve-design-reference.md).

For each scene that has an existing `reference:` array in its `*.scenes.yml`, list the entries and ask per entry:

> "Scene **[scene-name]** has references:
>
> | # | Type | Breakpoint | Threshold | Title |
> |---|------|-----------|-----------|-------|
> | 1 | url | sm | 3% | Mobile View |
> | 2 | image | xl | 5% | Desktop View |
>
> For each entry:
> - **Keep** — use as-is
> - **Update** — provide a new reference for this breakpoint
> - **Remove** — drop this breakpoint from testing
>
> Or: **Add** — add a new breakpoint reference entry"

For scenes without a reference array, ask:

> "Scene **[scene-name]** has no references. Would you like to add one?
>
> - **Yes** — I'll ask for each breakpoint
> - **No** — I'll verify token compliance only"

## Step 3: Build Scene List

Build the `scene` iterable for `workflow plan`:

```json
{
  "scene": [
    {"scene": "homepage:landing", "provider": "COMPONENT_NAMESPACE", "section_id": "homepage"},
    {"scene": "design-system:shell", "provider": "COMPONENT_NAMESPACE"}
  ]
}
```

Present the verification plan:

> "I will verify **[n]** scenes:
>
> | Scene | Reference | Breakpoints |
> |-------|-----------|-------------|
> | homepage:landing | url (Landing Page) | sm, xl |
> | design-system:shell | image (Design Reference) | sm, xl |
>
> Ready to start?"

Wait for confirmation — once confirmed, intake is complete.
