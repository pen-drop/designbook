## Why

Skill task files have no way to declare which previously-generated files they depend on. This means the AI either guesses, silently fails, or produces wrong output when a prerequisite file is missing. Additionally, `files:` output paths use bare relative paths with no env var prefix, making it unclear where files land. Both issues cause confusing failures mid-workflow.

## What Changes

- **New `reads:` frontmatter field** in task files — declares input file dependencies with the workflow that generates each file. If a file is missing at execution time, the AI stops and tells the user exactly which workflow to run first.
- **Standardize `files:` paths** — all output paths use explicit env var prefix (`$DESIGNBOOK_DIST/` or `$DESIGNBOOK_DRUPAL_THEME/`). No more bare relative paths.
- **Document convention** in `designbook-addon-skills/SKILL.md` — `reads:` added to task file frontmatter spec, AI behavior rule added.
- **Update all existing task files** — add `reads:` where needed, fix all `files:` paths.

## Capabilities

### New Capabilities

- `task-file-reads`: Convention for declaring file dependencies in task frontmatter with missing-file error handling

### Modified Capabilities

_None — no spec-level behavior changes to existing capabilities._

## Impact

- `.agents/skills/designbook-addon-skills/SKILL.md` — frontmatter spec updated
- `.agents/skills/*/tasks/*.md` — all task files updated (reads: + files: prefix)
- No runtime code changes — purely convention and AI instruction
