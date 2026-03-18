## Why

SKILL.md files in several designbook-* skills contain mixed execution instructions and reference content, violating the index-only convention defined in `designbook-addon-skills`. This makes skills harder to maintain and creates confusing AI behavior since execution logic now lives in task files.

## What Changes

- `designbook-css-tailwind/SKILL.md` — remove "Generate Expression Files" procedural section; move content to `tasks/generate-jsonata.md` (which already exists but is incomplete)
- `designbook-css-daisyui/SKILL.md` — remove "Generate Expression Files" section + inline jsonata template + duplicate prerequisites; move to `tasks/generate-jsonata.md`; extract token naming tables to `resources/daisyui-tokens.md`
- `designbook-view-modes/SKILL.md` — remove inline JSONata patterns, composition patterns, field mapping guide (~250 lines); extract to `resources/jsonata-patterns.md` and `resources/field-mapping.md`; slim to index
- `designbook-scenes/SKILL.md` — remove 5 "Execution Steps" with bash commands; move to `tasks/create-scene.md`; extract shell scene examples to `resources/scene-reference.md`; slim to index
- `designbook-sample-data/SKILL.md` — remove inline validation rules (5 hard errors + 3 warnings) and prerequisites; move to task file; remove obsolete `!WORKFLOW_FILE` marker
- `designbook-tokens/SKILL.md` — **ALREADY DONE** (cleaned up in this session)

## Capabilities

### New Capabilities

_None — this is a pure refactoring change._

### Modified Capabilities

_None — no spec-level behavior changes, only file reorganization within skill directories._

## Impact

- `.agents/skills/designbook-css-tailwind/` — SKILL.md + tasks/generate-jsonata.md
- `.agents/skills/designbook-css-daisyui/` — SKILL.md + tasks/generate-jsonata.md + new resources/daisyui-tokens.md
- `.agents/skills/designbook-view-modes/` — SKILL.md + new resources/jsonata-patterns.md + new resources/field-mapping.md
- `.agents/skills/designbook-scenes/` — SKILL.md + tasks/create-scene.md (may need to be created/updated) + new resources/scene-reference.md
- `.agents/skills/designbook-sample-data/` — SKILL.md + tasks/create-sample-data.md
