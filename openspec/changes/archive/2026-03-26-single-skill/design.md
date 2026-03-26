## Context

The designbook agent system currently has ~15 separate `designbook-*` skills plus a `designbook-workflow` execution engine skill, plus 13 `debo-*.md` workflow files in `.agents/workflows/`. Every `debo-*.md` is a 3-line wrapper that says "load designbook-workflow and execute". Skills like `designbook-vision` or `designbook-tokens` exist only to hold a handful of task/rule files — they have no identity of their own.

This fragmentation means:
- Adding a new workflow requires creating both a domain skill dir AND a `debo-*.md` file
- Authoring conventions are split across two locations
- Claude's system-reminder is polluted with many thin skill descriptions
- No consistent internal structure — some skills have `resources/`, some don't

`designbook-drupal` already demonstrates the better pattern: one unified skill with concern-based subdirs. This change applies that pattern to the entire designbook skill system.

## Goals / Non-Goals

**Goals:**
- One `designbook` skill as the single user-facing entry point for all designbook workflows
- Workflows live as named subdirectories directly inside the skill — grouped by concern
- `tasks/`, `rules/`, `resources/` are always the terminal containers at every level — files go into these, never into named dirs directly
- `common/` at skill root holds the only truly cross-group shared files
- Glob-based discovery: `designbook/**/tasks/*.md` and `designbook/**/rules/*.md`
- Runtime workflow dispatch: skill scans `**/workflow.md` files, reads `description`, matches argument or intent
- Execution engine resources merged into `common/resources/`

**Non-Goals:**
- Changing the CLI or workflow execution mechanics
- Merging CSS framework skills (`designbook-css-daisyui`, `designbook-css-tailwind`) — these remain separate
- Changing `designbook-drupal` structure
- Changing OpenSpec (opsx-*) skills

## Decisions

### Decision: Skill name `debo`, directory name `designbook`

The skill is registered as `debo` in `SKILL.md` frontmatter — the directory remains `designbook/`. This preserves the familiar `debo` shorthand while the file system uses the full name.

```yaml
# .agents/skills/designbook/SKILL.md
---
name: debo
description: >
  Designbook design system. Use when the user wants to create or design
  anything. Sub-commands: vision, tokens, data-model, design-component,
  design-screen, design-shell, design-guidelines, design-test, sections,
  shape-section, sample-data, css-generate.
---
```

Commands: `/debo vision`, `/debo design-screen`, `/debo tokens` etc.

Three-layer resolution:

1. **Trigger** — SKILL.md description broad-matches user intent → Claude knows to invoke `/debo`
2. **Sub-command** — sub-command names listed statically in SKILL.md → Claude resolves `/debo design-screen` directly from intent
3. **Dispatch** — skill scans `**/workflows/*.md`, reads each `description` → confirms and executes correct workflow

Sub-command names in SKILL.md are the only piece that must be maintained manually when a new workflow is added. Descriptions stay in workflow files.

**Alternatives considered:**
- Naming both skill and dir `debo` — shorter but loses clarity in the file system
- Naming both `designbook` — breaks the familiar `debo` shorthand

### Decision: Named dirs directly at skill root, no intermediate `workflows/` folder

Workflow concern dirs (`vision/`, `design/`, etc.) sit directly under the skill root. No `workflows/` container. This mirrors `designbook-drupal` exactly.

**Alternatives considered:**
- `workflows/<name>/` as intermediate dir — extra nesting with no benefit; inconsistent with drupal pattern

### Decision: `tasks/`, `rules/`, `resources/` are always the terminal containers

Files always live inside one of these four standard dirs. Named dirs never contain files directly — they only contain more named dirs or the standard containers. This makes the structure consistent and predictable at any depth.

### Decision: Concern grouping reduces top-level dirs

Related workflows are grouped:
- `design/` → `component/`, `screen/`, `shell/` (all create UI components/scenes)
- `sections/` → `sections/`, `shape-section/` (both define section structure)
- `design-test` → visual regression testing, grouped under `design/` as a design concern

Group-level `tasks/`, `rules/`, `resources/` hold files shared within the group.

### Decision: `common/` for cross-group shared files only

Analysis of actual stage usage reveals only one truly cross-group shared task: `create-sample-data.md` (used by `design/screen/` and `sample-data/`). The execution engine resources also live here. Result: `common/` stays minimal — a good sign the grouping is correct.

### Decision: `workflow.md` is the definition file inside each named workflow dir

Each workflow dir contains `workflow.md` with simplified frontmatter (no registration fields). The skill scans `**/workflow.md` at runtime to discover available workflows.

### Decision: Workflow-specific task naming — `<task>--<workflow>.md`

Task files shared across workflows use plain names (`create-component.md`). Workflow-specific tasks use `<task-type>--<workflow-identifier>.md` — task type first, workflow qualifier second:

```
design/tasks/
├── create-component.md              ← shared (no qualifier)
├── intake--design-screen.md         ← workflow-specific
├── intake--design-component.md
├── intake--design-shell.md
└── intake--design-guidelines.md
```

Stage reference uses `:` syntax: `design-screen:intake` → glob `**/intake--design-screen.md`.

This extends the existing `skill:task` resolution pattern — `design-screen:intake` resolves the same way as `designbook-vision:intake` did previously, but via glob within the unified skill instead of a direct skill-dir path.

**Task type first** — consistent with shared task names (`create-component`, `map-entity`) and groups all intakes alphabetically together in directory listings.

**Alternatives considered:**
- `design-screen--intake.md` (workflow first) — groups by workflow, but breaks alphabetical consistency with shared tasks

### Decision: `before:` workflow references use path-relative names

`before: workflow: css-generate` resolves to `css-generate/workflows/css-generate.md` within the same skill. No `/debo-` prefix. Cross-concern task reuse (e.g. `design-screen` using `create-sample-data` from `sample-data/`) requires no `before:` — the task is simply referenced as a plain stage and discovered via glob. Stage ordering within `stages:` controls execution order.

### Decision: Execution engine resources at skill root `resources/`

`designbook-workflow/resources/` (workflow-execution.md, cli-reference.md, task-format.md, architecture.md) moves to `designbook/resources/` — the skill root level. These are not "common" shared files, they ARE the skill itself. The `designbook-workflow` skill dir is removed. `common/` is also removed — cross-group shared tasks live directly in `designbook/tasks/`, global rules in `designbook/rules/`.

## Final Directory Structure

```
.agents/skills/designbook/
├── SKILL.md
├── resources/                               ← execution engine (der skill selbst)
│   ├── architecture.md
│   ├── cli-reference.md
│   ├── task-format.md
│   └── workflow-execution.md
├── rules/                                   ← global rules
├── vision/
│   ├── tasks/
│   │   ├── intake--vision.md
│   │   └── create-vision.md
│   ├── rules/
│   │   └── vision-format.md
│   └── workflows/
│       └── vision.md
├── tokens/
│   ├── tasks/
│   │   ├── intake--tokens.md
│   │   └── create-tokens.md
│   ├── rules/
│   │   └── renderer-hints.md
│   └── workflows/
│       └── tokens.md
├── data-model/
│   ├── tasks/
│   │   ├── intake--data-model.md
│   │   └── create-data-model.md
│   ├── rules/
│   │   └── sample-template-mapping.md
│   ├── resources/
│   │   └── schema-reference.md
│   └── workflows/
│       └── data-model.md
├── design/
│   ├── tasks/
│   │   ├── create-component.md
│   │   ├── create-scene--design-screen.md
│   │   ├── create-scene--design-shell.md
│   │   ├── map-entity--design-screen.md
│   │   ├── `plan-components--design-screen.md`
│   │   ├── plan-entities--design-screen.md
│   │   ├── intake--design-component.md
│   │   ├── intake--design-screen.md
│   │   ├── intake--design-shell.md
│   │   ├── intake--design-guidelines.md
│   │   └── visual-diff--design-test.md
│   ├── rules/
│   │   └── scenes-constraints.md
│   ├── resources/
│   │   ├── scenes-schema.md
│   │   └── jsonata-reference.md
│   └── workflows/
│       ├── design-component.md
│       ├── design-screen.md
│       ├── design-shell.md
│       ├── design-guidelines.md
│       └── design-test.md
├── sections/
│   ├── tasks/
│   │   ├── create-section.md
│   │   ├── intake--sections.md
│   │   └── intake--shape-section.md
│   └── workflows/
│       ├── sections.md
│       └── shape-section.md
├── sample-data/
│   ├── tasks/
│   │   ├── create-sample-data.md
│   │   └── intake--sample-data.md
│   ├── resources/
│   │   └── format.md
│   └── workflows/
│       └── sample-data.md
├── css-generate/
│   ├── tasks/
│   │   ├── intake--css-generate.md
│   │   └── generate-css.md
│   └── workflows/
│       └── css-generate.md
```

## Risks / Trade-offs

- [Skill description length] Claude's triggering relies on SKILL.md description. → Mitigation: Each `workflow.md` has a `description` field read at runtime; SKILL.md stays brief.
- [Breaking all debo-* commands] → Mitigation: Old workflow files removed so failure is explicit; document in SKILL.md.
- [common/ growing] If cross-group sharing increases, `common/` could bloat. → Current analysis shows 1 task + 4 resource files — minimal by design.

## Migration Plan

1. Create `designbook/` skill dir with SKILL.md
2. Create `common/` — move `designbook-workflow/resources/` content + `create-sample-data.md`
3. Migrate each standalone workflow: `vision/`, `tokens/`, `data-model/`, `sample-data/`, `css-generate/`, `guidelines/`
4. Migrate grouped workflows: `design/` (component + screen + shell + guidelines + test), `sections/` (sections + shape-section)
5. Move group-shared files to group-level `tasks/`, `rules/`, `resources/`
6. Remove old skill dirs and `debo-*.md` files
7. Update CLI glob discovery to scan `designbook/**/tasks/*.md` and `designbook/**/rules/*.md`
8. Update `before:` resolution to use relative workflow names
9. Update `designbook-addon-skills` authoring docs

## Open Questions

- Should `designbook-addon-skills` also merge? Keeping separate seems right — follow-up.
