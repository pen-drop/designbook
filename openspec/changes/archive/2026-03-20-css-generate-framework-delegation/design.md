## Context

`debo-css-generate` currently orchestrates CSS generation via `designbook-css-generate/SKILL.md`, which internally delegates to a hardcoded framework registry (`steps/delegate-framework.md`). The rest of the system uses a stage-discovery pattern: workflows declare `stages:` in frontmatter, and the AI scans `skills/*/tasks/<stage>.md` at plan time, filtering by `when` conditions. This is already working for `debo-design-tokens` with `designbook-css-daisyui/tasks/create-tokens.md`.

## Goals / Non-Goals

**Goals:**
- CSS framework skills self-register by providing `tasks/generate-jsonata.md`
- No central registry to maintain — adding a framework = one new file
- `debo-css-generate` workflow uses the stages architecture consistently with all other `debo-*` workflows
- Generic pipeline steps (execute, imports, verify) live in a single framework-agnostic task file

**Non-Goals:**
- Not changing the jsonata-w execution mechanism itself
- Not adding new CSS frameworks (tailwind/daisyui only for now)
- Not changing CSS output format or file structure

## Decisions

### Two stages: `generate-jsonata` + `generate-css`

The pipeline has exactly one framework-specific step (generate `.jsonata` expression files) and several generic steps (run transforms, manage imports, verify output). Splitting into two stages maps cleanly to this boundary.

**Alternative considered**: Single `create-css` stage where framework task files contain the full pipeline. Rejected because the 5 generic steps would need to be duplicated in every framework task file.

### `generate-jsonata` task files live in framework skills

Each CSS framework skill owns `tasks/generate-jsonata.md` with `when: frameworks.css: <framework>`. Discovery follows Rule 1 precedence: specific `when` beats generic fallback. No generic fallback needed for `generate-jsonata` — if no framework matches, the pipeline errors explicitly.

### `generate-css` task file is the generic executor

`designbook-css-generate/tasks/generate-css.md` (no `when`) absorbs the content of the current `steps/execute-transforms.md`, `steps/ensure-imports.md`, and `steps/verify-output.md`. The `steps/` directory is retired.

### `steps/delegate-framework.md` is removed

With stage discovery, the delegation mechanism is implicit — the AI selects the matching `generate-jsonata` task file at plan time. No explicit dispatch needed.

### `debo-css-generate` workflow updated to stages frontmatter

Old `!WORKFLOW_PLAN`/`!TASK` markers are replaced with `stages: [generate-jsonata, generate-css]` in the frontmatter, matching all other `debo-*` workflows.

## Risks / Trade-offs

- **`daisyui` extends `tailwind`** → DaisyUI projects need `generate-jsonata` from both skills (color/font from daisyui, layout-width/layout-spacing from tailwind). The task files need to handle this — either DaisyUI's task explicitly includes layout token generation, or both task files are loaded. Currently the daisyui skill notes it requires the tailwind skill as a prerequisite. This needs to be explicit in the task file.
  → Mitigation: DaisyUI `generate-jsonata.md` includes the Tailwind layout token generation inline (no separate file loading needed, it just defines all needed jsonata expressions including layout ones).

- **`steps/` removal** → `steps/verify-input.md` and `steps/check-regeneration.md` are currently referenced. These become part of the workflow body (verify + regen check happen before the plan step, not in a task).
  → Mitigation: Move verify-input and check-regeneration into the workflow body as pre-plan steps.

## Open Questions

- Should `generate-jsonata` task files reference the existing `steps/` content during transition, or inline everything from the start? → Inline from start (cleaner).
