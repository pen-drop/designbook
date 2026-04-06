## Context

The CLI's `workflow plan` (and `workflow create`) resolver scans `rules/*.md` across all skill directories and matches them by `when.steps` / `when.backend` / `when.frameworks` conditions. Blueprints, however, are only loaded when explicitly declared in a workflow's frontmatter `stages.*.steps` block — they are not scanned automatically.

This works for stages like `intake` where blueprints are declared in the workflow definition. But for stages like `map-entity`, the relevant blueprint (`canvas.md`) lives in an integration skill (`designbook-drupal/data-mapping/blueprints/`) and is matched by `when.steps: [map-entity]` — the same mechanism used by rules.

## Goals / Non-Goals

**Goals:**
- Add blueprint scanning to the CLI plan resolver, matching `blueprints/*.md` by the same `when` conditions used for rules
- Ensure all data-mapping blueprints (`canvas.md`, `field-map.md`, `layout-builder.md`, `views.md`) are automatically loaded for `map-entity` tasks

**Non-Goals:**
- Changing how workflow-frontmatter-declared blueprints work (those continue as-is)
- Adding blueprint filtering by `type` at the CLI level (the agent filters by `type: data-mapping` from the loaded blueprints)

## Decisions

### 1. Scan blueprints the same way as rules

The resolver already scans `skills/*/rules/*.md` and matches by `when` conditions. Apply the identical logic to `skills/*/blueprints/*.md`. Store results in `task.blueprints[]` alongside `task.rules[]`.

**Alternative considered:** Declare blueprints explicitly in each workflow's frontmatter per stage — rejected because it creates maintenance burden and coupling between workflow files and integration skill blueprints.

### 2. Merge scanned blueprints with declared blueprints

If a workflow's frontmatter already declares blueprints for a stage (e.g., intake declares `section.md`, `grid.md`, `container.md`), scanned blueprints are appended (deduplicated by path). Frontmatter declarations take precedence.

## Risks / Trade-offs

- **Risk:** Blueprint scanning adds time to `workflow plan` → **Mitigation:** Blueprint files are few (typically < 20 across all skills); scanning is fast.
- **Risk:** Unwanted blueprints loaded due to broad `when.steps` → **Mitigation:** Agents already filter blueprints by `type` field; only matching types are applied.
