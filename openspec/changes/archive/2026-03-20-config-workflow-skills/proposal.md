## Why

Workflow steps currently auto-load skill logic only from project-local task/rule files. There is no way to configure external skills (e.g. `frontend-design`) to be loaded at specific stages without embedding them into the project's skill directory — which breaks the separation between project-owned skills and external/shared skills.

## What Changes

- New `workflow.skills` key in `designbook.config.yml` — maps stage names (or `workflow-id:dialog` scoped keys) to arrays of skill names
- The `designbook-workflow` Rule 4 (Rule Auto-Loading) is extended: before executing any stage, the AI checks `workflow.skills.<stage>` in config and loads each listed skill via the Skill tool
- Skill loading happens after task/rule file scanning, so external skills can complement (not replace) local skill logic

## Capabilities

### New Capabilities

- `config-workflow-skills`: Declarative per-stage skill loading via `designbook.config.yml` — external skills are loaded automatically by the workflow runner when a matching stage executes

### Modified Capabilities

- `designbook-configuration`: The config schema gains a new optional `workflow.skills` key (string array values per stage key)
- `workflow-skill`: Rule 4 is extended to check and load `workflow.skills` from config at each stage boundary

## Impact

- `designbook.config.yml` schema (additive, backwards-compatible)
- `designbook-workflow` skill spec — Rule 4 prose updated
- `designbook-configuration` skill spec — schema reference updated
- No CLI changes required — skill loading is AI-side only
