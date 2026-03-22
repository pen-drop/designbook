## Why

`SKILL.md` is loaded immediately every time a skill is triggered — before the AI knows which stage it needs to run. Several skills have accumulated large amounts of logic, format rules, schema references, and execution instructions directly in `SKILL.md`, making every skill invocation load hundreds of lines of context. This defeats the purpose of the modular task/rule architecture and bloats the AI's context window. The convention "index only" is stated in `designbook-addon-skills` but not enforced with clear guidance, so new content keeps accumulating in `SKILL.md`.

## What Changes

- Add explicit `SKILL.md` contract to `designbook-addon-skills`: what belongs in it, what does not, and where displaced content goes
- Extract logic, format rules, schema references, and execution instructions from these violating SKILL.md files into `resources/` or `rules/` files:
  - `designbook-workflow/SKILL.md` (406 lines → ~20 lines): AI execution rules → `rules/workflow-execution.md`; architecture/CLI/format reference → `resources/`
  - `designbook-configuration/SKILL.md` (147 lines → ~20 lines): all config documentation → `resources/config-reference.md`
  - `designbook-scenes/SKILL.md` (82 lines → ~20 lines): critical rules → `rules/scenes-constraints.md`; output structure, validation → `resources/`
  - `designbook-sample-data/SKILL.md` (80 lines → ~20 lines): format rules + content guidelines → `resources/format.md`
  - `designbook-data-model/SKILL.md` (68 lines → ~20 lines): schema reference → `resources/schema-reference.md`

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

_(no spec-level changes — this is a skill authoring convention enforcement)_

## Impact

- `.agents/skills/designbook-addon-skills/SKILL.md` — add explicit SKILL.md contract section
- `.agents/skills/designbook-workflow/` — new `rules/workflow-execution.md` + `resources/` files; reduce SKILL.md to index
- `.agents/skills/designbook-configuration/` — new `resources/config-reference.md`; reduce SKILL.md to index
- `.agents/skills/designbook-scenes/` — new `rules/scenes-constraints.md`; reduce SKILL.md to index
- `.agents/skills/designbook-sample-data/` — new `resources/format.md`; reduce SKILL.md to index
- `.agents/skills/designbook-data-model/` — new `resources/schema-reference.md`; reduce SKILL.md to index
