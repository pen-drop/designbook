## Why

The current designbook skill system is fragmented: ~15 separate `designbook-*` skills plus 13 `debo-*.md` workflow files, all doing thin dispatch. This makes discovery hard, authoring inconsistent, and the relationship between workflows, tasks, and rules unclear. Consolidating into one `designbook` skill with a clear internal structure solves all three.

## What Changes

- **NEW** `.agents/skills/designbook/` — unified skill replacing all domain-specific designbook-* skills
- **NEW** `workflows/<name>/` subdirectory structure inside the skill — replaces `debo-*.md` workflow files
- **NEW** Glob-based discovery: `designbook/**/tasks/*.md`, `designbook/**/rules/*.md` — recursive, no registration needed
- **REMOVED** `designbook-vision`, `designbook-tokens`, `designbook-data-model`, `designbook-sample-data`, `designbook-sections`, `designbook-shape-section`, `designbook-design-component`, `designbook-design-screen`, `designbook-design-shell`, `designbook-guidelines`, `designbook-scenes`, `designbook-test`, `designbook-css-generate` — all merged into `designbook/`
- **DELETED** `designbook-promptfoo` — removed entirely, not migrated
- **REMOVED** `designbook-workflow` — execution engine resources move into `designbook/resources/`
- **REMOVED** `.agents/workflows/debo-*.md` — replaced by `designbook/workflows/*/workflow.md`
- **KEPT** `designbook-css-daisyui`, `designbook-css-tailwind` — separate (framework-specific, project-dependent)
- **KEPT** `designbook-drupal`, `designbook-addon-skills` — separate (different concerns)
- User-facing commands change: `/debo-vision` → `/designbook vision`, `/debo-design-component` → `/designbook design-component`, etc.
- `before: workflow:` references update: `/debo-css-generate` → `/designbook css-generate`

## Capabilities

### New Capabilities

- `designbook-single-skill`: The unified `designbook` skill — SKILL.md with runtime workflow dispatch, `workflows/<name>/` structure with co-located tasks/rules/resources, shared `tasks/` and `rules/` at root level, execution engine resources in `resources/`

### Modified Capabilities

- `designbook-workflow`: Execution engine resources move into `designbook/resources/` — no longer a standalone skill
- `workflow-format`: `debo-*.md` format replaced by `workflows/<name>/workflow.md` with simplified frontmatter (no `name:`, `id:`, `category:` — just `title`, `description`, `stages`, `before`)
- `skill-scan-subdirs`: Glob pattern extends to `designbook/**/tasks/*.md` and `designbook/**/rules/*.md` for recursive discovery within the unified skill

## Impact

- All `debo-*` slash commands replaced by `/designbook <workflow>`
- Skill triggering descriptions update (SKILL.md description covers all sub-workflows)
- `designbook-workflow` skill registration removed
- CSS framework skills (`designbook-css-daisyui`, `designbook-css-tailwind`) remain unchanged — their tasks/rules still discovered via cross-skill glob
- `designbook-addon-skills` authoring docs need updating to reflect new skill structure conventions
