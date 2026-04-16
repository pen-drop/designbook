## Why

A `--research` audit of the `design-shell` workflow revealed that blueprint embed dependencies are invisible to the intake stage, causing build-order failures (Twig `Cannot find template` errors) and forcing hardcoded workarounds. Additionally, the Storybook URL is not dynamically resolved via `_debo storybook status`, leading to wrong-port screenshots. Several skill files have stale loading scopes, redundant rules, and broken data flow paths between stages.

## What Changes

- **Add `embeds:` frontmatter field to blueprints**: Declares which other components a blueprint uses via `{% embed %}`. The intake task resolves these dependencies and auto-adds missing infrastructure components (e.g., container).
- **Add dependency-aware build order to intake**: Components are sorted by their `embeds:` dependency graph (leaves first), ensuring embedded components exist before dependents are compiled.
- **Require `_debo storybook status` for URL resolution**: All tasks and resources that access Storybook must obtain the URL from `storybook status` response, never from `$DESIGNBOOK_URL` config or hardcoded ports.
- **Fix `reference` data flow in `create-scene--design-shell.md`**: The `reference` parameter has no data path from intake to scene creation — wire it through the workflow engine.
- **Fix `component-source.md` wildcard conflict**: Rule instructs per-component `@source` additions, but workspaces may already have a wildcard `@source` covering all components. Add a conditional check.
- **Fix `create-component.md` SKILL.md reference**: References `SKILL.md` as "single source of truth for classes" but it only covers token generation. Correct the reference.
- **Narrow loading scope for `scenes-constraints.md`**: Currently loaded during intake where it's irrelevant — restrict to `create-scene` steps only.
- **Narrow loading scope for `section.md` and `grid.md` blueprints**: Currently loaded for `design-shell:intake` but unused — shell workflows don't produce sections or grids.
- **Fix `intake--design-shell.md` terminology**: References `extract-reference` as a "rule" when it is a resource.

## Capabilities

### New Capabilities
- `blueprint-embed-deps`: Blueprint frontmatter `embeds:` field for declaring component embed dependencies, with automatic dependency resolution and build-order sorting during intake

### Modified Capabilities
- `workflow-execution`: Intake tasks must resolve blueprint `embeds:` dependencies and sort component build order accordingly
- `design-workflow-compare`: Storybook URL must be obtained via `_debo storybook status`, not from config; `reference` data flow from intake to scene creation must be wired
- `scene-conventions`: Loading scope narrowed — `scenes-constraints.md` only loaded for `create-scene` steps, not intake

## Impact

- **Skill files**: 10+ files across `designbook`, `designbook-drupal`, `designbook-css-tailwind` skills
- **Blueprint frontmatter**: `header.md`, `footer.md`, `newsletter.md` (and future blueprints using embed) gain `embeds:` field
- **Task files**: `intake--design-shell.md` gains dependency resolution logic; `create-scene--design-shell.md` gains `reference` data path
- **Rule files**: `component-source.md`, `scenes-constraints.md` loading conditions updated
- No CLI code changes required — all changes are in skill definition files
- No breaking changes to external APIs or user-facing behavior
