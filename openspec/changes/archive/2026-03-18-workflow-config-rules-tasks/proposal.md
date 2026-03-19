## Why

Projects need a way to define per-stage rules and task instructions directly in `designbook.config.yml` — without creating skill files. This enables project-specific and client-specific customizations (naming conventions, brand constraints, extra steps) that are additive to the existing skill-level rules/tasks.

## What Changes

- Add `workflow.rules` to `designbook.config.yml`: per-stage string arrays applied as constraints alongside skill rule files
- Add `workflow.tasks` to `designbook.config.yml`: per-stage string arrays appended as additional instructions to task file content
- Stage-name is the key (e.g. `create-component`, `debo-design-component:dialog`)
- Update `designbook-workflow` SKILL.md Rule 4 to also load config rules per stage
- Update `designbook-workflow` SKILL.md Rule 2 to also append config tasks per stage

## Capabilities

### New Capabilities

_(none — this extends existing capabilities)_

### Modified Capabilities

- `designbook-configuration`: Add `workflow.rules` and `workflow.tasks` fields to the config schema
- `designbook-workflow` (skill, not spec): Rule 4 and Rule 2 load from config in addition to skill files

## Impact

- `designbook.config.yml` schema gains a `workflow:` top-level key
- `.agents/skills/designbook-workflow/SKILL.md` — Rule 4 and Rule 2 updated
- `.agents/skills/designbook-configuration/SKILL.md` — config mapping updated
- `openspec/specs/designbook-configuration/spec.md` — delta spec with new fields
