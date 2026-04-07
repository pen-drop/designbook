## Problem

Visual reference data (source, type, threshold, breakpoints) is currently stored inline in `*.scenes.yml` files via the `reference` array. This creates several problems:

1. **Coupling**: Scene files describe component composition — visual testing metadata doesn't belong there
2. **Collision with component logic**: The `reference` array sits alongside `components`, `slots`, and `theme`, making scene files harder to read and harder to generate
3. **No story-level identity**: References are keyed by scene name, but the addon and screenshots use `storyId` as the universal key — there's a translation layer that doesn't need to exist
4. **Threshold results are lost**: The `design-verify` workflow computes diff percentages per breakpoint, but has no canonical place to persist them back — `report.md` is ephemeral
5. **Addon can't discover metadata**: The `VisualCompareTool` must probe each breakpoint image individually because there's no manifest describing what references exist

## Solution

Move visual reference metadata from `scenes.yml` into a dedicated per-story file:

```
designbook/stories/{storyId}/
  meta.yml              ← reference source, thresholds, last results
  screenshots/
    reference/sm.png    ← baseline images (committed)
    current/sm.png      ← latest capture (gitignored)
    diff/sm.png         ← diff output (gitignored)
```

`meta.yml` structure:

```yaml
reference:
  source:
    type: stitch          # or: url, image
    screenId: "..."       # type-specific source identifier
  breakpoints:
    sm:
      threshold: 3
      lastDiff: 2.1
      lastResult: pass
    xl:
      threshold: 5
      lastDiff: null
      lastResult: null
```

The addon reads `meta.yml` via `/__designbook/load` to discover breakpoints, thresholds, and last results — no more probing individual image files.

## Scope

- New `designbook/stories/` directory structure with `meta.yml` schema
- Migrate `reference` array reading from `scenes.yml` to `meta.yml` in all design tasks
- Update screenshot storage paths from `designbook/screenshots/{storyId}/` to `designbook/stories/{storyId}/screenshots/`
- Update `VisualCompareTool` and `withVisualCompare` to read from `meta.yml`
- Update `screenshot-storage` rule with new path conventions
- Update `resolve-reference`, `visual-compare`, `screenshot`, `polish` tasks
- Update `stitch-reference` rule and `screenshot-stitch` task
- Remove `reference` array from `scenes-schema.md`
- Add `.gitignore` rules for `current/` and `diff/` subdirectories

## Out of Scope

- Changing the visual comparison algorithm or tooling (AI-based comparison stays)
- Modifying the `design-verify` workflow pipeline stages
- Changing how Storybook stories are generated from scenes
- Migration tool for existing `reference` arrays in scene files
