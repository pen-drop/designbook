## Why

A --research audit of the `design-shell` workflow revealed systematic type violations, stale step references, schema gaps, and a CLI bug that prevents `$ref` resolution in task result schemas. These issues caused manual workarounds during the workflow run (inlining schemas, adding missing fields to tasks.yml by hand) and will affect every future design-shell and design-screen execution.

## What Changes

- **Fix `$ref` resolution in CLI**: `expandWorkflowTasks` does not resolve `$ref` entries in task result schemas and passes `undefined` as the schemas map to `workflowPlan`. Both gaps must be closed so that `$ref: ../schemas.yml#/Check` and similar references work at validation time.
- **Extend `schemas.yml#/Issue` schema**: Add `id`, `storyId`, `checkKey`, `scene` fields that triage emits and polish consumes — currently undeclared, causing a type gap between pipeline stages.
- **Reclassify `extract-reference.md`**: Move from `rules/` to `resources/` — it contains procedural Playwright instructions, not hard constraints. Remove stale `create-tokens` from its `when.steps`.
- **Reclassify `static-assets.md`**: Move from `blueprints/` to `resources/` — it contains non-overridable procedural instructions (curl commands, Playwright sequences). Fix incorrect `playwright-cli` command references.
- **Fix bare `create-scene` step names**: In `designbook-drupal/scenes/scenes-constraints.md` and `designbook-css-tailwind/scenes-constraints.md`, replace `create-scene` with qualified `design-shell:create-scene`, `design-screen:create-scene`.
- **Remove stale `recapture` step**: From `vision-context.md` and `playwright-capture.md` — this step does not exist in any workflow.
- **Deduplicate `{% block %}` constraint**: Remove inline duplication from `section.md`, `grid.md`, `container.md` blueprints — defer to `sdc-conventions.md` rule.
- **Fix `polish.md` stale `design_hint` reference**: Remove unreachable `design_hint` reference (copy-paste error from `create-component.md`).
- **Add `$ref` to `triage.md` params**: `params: issues` should reference `schemas.yml#/Issue`.

## Capabilities

### New Capabilities
- `workflow-ref-resolution`: CLI resolves `$ref` entries in task result schemas during workflow expansion, eliminating manual schema inlining

### Modified Capabilities
- `workflow-format`: Issue schema extended with triage-emitted fields (`id`, `storyId`, `checkKey`, `scene`)
- `design-workflow-compare`: Step name fixes, stale step cleanup, file reclassification for extract-reference and static-assets

## Impact

- **CLI code**: `packages/storybook-addon-designbook/src/cli/workflow.ts` — `expandWorkflowTasks` must call `collectAndResolveSchemas` and pass result to `workflowPlan`
- **CLI code**: `packages/storybook-addon-designbook/src/cli/workflow-resolve.ts` — `expandResultDeclarations` must resolve `$ref` instead of stripping it
- **Skill files**: 12+ files across `designbook`, `designbook-drupal`, `designbook-css-tailwind` skills
- **Schema**: `designbook/design/tasks/schemas.yml` — Issue type extended
- No breaking changes to external APIs or user-facing behavior
