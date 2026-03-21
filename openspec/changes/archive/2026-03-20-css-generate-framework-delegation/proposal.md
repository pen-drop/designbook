## Why

`debo-css-generate` uses a hardcoded framework registry in `delegate-framework.md` — adding a new CSS framework requires editing the orchestrator skill. The rest of the system (debo-design-tokens) already uses stage-discovery for framework delegation: scanning `skills/*/tasks/<stage>.md` with `when` conditions. This change brings css-generate in line with that pattern.

## What Changes

- `debo-css-generate` workflow gains `stages: [generate-jsonata, generate-css]` in its frontmatter
- `designbook-css-daisyui/tasks/generate-jsonata.md` created (`when: frameworks.css: daisyui`)
- `designbook-css-tailwind/tasks/generate-jsonata.md` created (`when: frameworks.css: tailwind`)
- `designbook-css-generate/tasks/generate-css.md` created (no `when` — generic pipeline: execute transforms, ensure imports, verify output)
- `designbook-css-generate/steps/delegate-framework.md` removed — replaced by Rule 1 stage discovery
- `designbook-css-generate/SKILL.md` slimmed to pipeline overview + pointer to task files
- Existing `steps/` content merged into `tasks/generate-css.md`
- `debo-css-generate.md` workflow body updated to match new stages architecture (removes old `!WORKFLOW_PLAN`/`!TASK` markers)

## Capabilities

### New Capabilities

- `css-generate-stages`: Two-stage CSS generation pipeline — `generate-jsonata` (framework-specific, auto-discovered) and `generate-css` (generic execution). Each CSS framework skill registers itself by providing `tasks/generate-jsonata.md`.

### Modified Capabilities

- none

## Impact

- `.agents/skills/designbook-css-generate/` — SKILL.md slimmed, steps/ cleaned up, tasks/ added
- `.agents/skills/designbook-css-daisyui/` — tasks/generate-jsonata.md added
- `.agents/skills/designbook-css-tailwind/` — tasks/generate-jsonata.md added
- `.agents/workflows/debo-css-generate.md` — stages frontmatter + body updated
- No runtime code changes — purely AI instruction files
