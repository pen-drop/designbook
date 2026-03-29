## Why

CSS generation is tightly coupled to framework skills — each framework skill (`designbook-css-tailwind`, `designbook-css-daisyui`) contains both declarative rules AND execution logic (task files with hardcoded JSONata templates). This makes it difficult to create new CSS framework skills. Font loading (Google Fonts) is hardcoded into both `generate-jsonata` and `generate-css` tasks with no way to swap providers or opt out. The workflow resolver only allows one task per step (highest specificity wins), preventing multiple skills from contributing to the same step.

## What Changes

- **Framework CSS skills become purely declarative** — only `rules/` (naming conventions + `css-mapping.md`), no `tasks/`. The `css-mapping.md` rule declares how token groups map to CSS output (prefix, wrapper syntax).
- **CSS generation logic centralizes in `designbook/css-generate`** — the `generate-jsonata` task reads the `css-mapping` rule from the active framework skill and generates JSONata templates accordingly.
- **Font loading configured via `frameworks.fonts`** — the font provider is set in `designbook.config.yml` under `frameworks.fonts` (e.g. `google-fonts`). Font skills provide a `tasks/generate-jsonata.md` with `when: frameworks.fonts: <provider>` — contributing a task to the same `generate-jsonata` step alongside the generic CSS task. The font skill reads the `css-mapping` rule to identify font-related token groups.
- **Multiple tasks per step** — the workflow resolver returns ALL matching tasks for a step instead of picking the most specific one. Tasks within the same step run in parallel. **BREAKING** for `workflow-plan-resolution` resolution behavior.
- **`depends_on` removed from tasks** — stage ordering defines execution order; explicit per-task `depends_on` is redundant. **BREAKING** for task format.
- **Workflow resolver skips steps without task match** — instead of erroring when no task file matches a step, the resolver skips it silently.

## Capabilities

### New Capabilities
- `css-mapping-convention`: Convention for `css-mapping.md` rule files — declares token-group-to-CSS mappings that the generic `generate-jsonata` task interprets
- `multi-task-steps`: Workflow resolver returns all matching tasks per step instead of single highest-specificity match

### Modified Capabilities
- `css-generate-stages`: Framework skills no longer provide `tasks/generate-jsonata.md`; the generic generator reads `css-mapping` rules instead. Font skills contribute tasks to `generate-jsonata` step.
- `workflow-plan-resolution`: Multiple tasks per step, `depends_on` removed, no-match scenario skips instead of errors

## Impact

- `designbook-css-tailwind/tasks/generate-jsonata.md` — removed, replaced by `rules/css-mapping.md`
- `designbook-css-tailwind/tasks/create-tokens.md` — stays (token creation is separate concern)
- `designbook-css-daisyui/tasks/generate-jsonata.md` — removed, replaced by `rules/css-mapping.md`
- `designbook/css-generate/tasks/generate-css.md` — Step 5 (Google Fonts download) removed
- `packages/storybook-addon-designbook/src/workflow-resolve.ts` — multi-task resolution, skip-on-no-match, `depends_on` removal
