## Why

Testing designbook workflows requires running all preceding workflows sequentially before reaching the one under test. In worktrees, the workspace starts empty — there's no starting point. This makes iteration slow and painful, especially when developing skills or fixing bugs in later workflows (e.g., design-screen requires vision + tokens + data-model + design-component + sections to run first).

Additionally, the existing promptfoo fixtures and manual testing use separate data and setup paths, leading to duplication and drift.

## What Changes

- **New `debo-test` skill**: A CLI-invokable skill (`/debo-test <suite> <case>`) that sets up a workspace from fixtures and runs a workflow prompt. After completion, it offers to snapshot the results as a new fixture.
- **Unified fixture structure**: A `fixtures/` directory at repo root containing test suites (e.g., `drupal-stitch`, `drupal-petshop`). Each suite has fixture layers (artifacts from individual workflow steps) and case definitions.
- **Case files as single source of truth**: YAML case files define which fixtures to load, the prompt to execute, and optional assertions — consumed by both the `debo-test` skill (manual) and promptfoo (automated).
- **Snapshot-from-diff**: After a workflow run, `git diff` in the workspace identifies new/changed files and copies them into the fixture directory, preserving path structure.
- **Migration of existing promptfoo fixtures**: Current `promptfoo/fixtures/` content moves into the new `fixtures/drupal-petshop/` structure. Promptfoo configs are updated to reference the new paths.

## Capabilities

### New Capabilities
- `test-fixtures`: Fixture storage format, layering logic, and directory conventions for test suites
- `test-cases`: Case file format (YAML) defining fixture sets, prompts, and assertions
- `debo-test-skill`: The `/debo-test` skill — workspace setup, prompt display/execution, snapshot offer
- `promptfoo-integration`: How promptfoo consumes the unified case files and fixtures

### Modified Capabilities
<!-- No existing spec-level requirements are changing -->

## Impact

- New directory: `fixtures/` at repo root
- New skill: `.agents/skills/designbook-test/` (or similar)
- Modified: `promptfoo/configs/*.yaml` (point to new fixture paths)
- Modified: `promptfoo/scripts/setup-workspace.sh` (use shared setup logic)
- Existing `promptfoo/fixtures/` becomes obsolete after migration
- `scripts/setup-workspace.sh` (integration test workspace) is unaffected — different purpose
