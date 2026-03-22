## Context

`SKILL.md` is the always-loaded entry point for every skill invocation. The `skill-creator` skill defines a three-level progressive disclosure model:

1. **Metadata** (name + description) — always in context (~100 words)
2. **SKILL.md body** — in context whenever the skill triggers (<500 lines ideal)
3. **Bundled resources** — loaded as needed (unlimited)

Designbook skills have a stricter sub-convention within this model: because `SKILL.md` is loaded **before** the AI knows which stage to execute, execution instructions in SKILL.md bloat context for every invocation — most of which don't need that information. The correct location for execution content is task files, rule files, or resource files.

Five skills have accumulated 68–406 lines of execution instructions directly in `SKILL.md`, violating this convention. The `designbook-addon-skills` meta-skill does not explicitly document where the line is.

## Goals / Non-Goals

**Goals:**
- Document the SKILL.md convention in `designbook-addon-skills`, incorporating the `skill-creator` progressive disclosure model
- Extract execution instructions from 5 violating skills into appropriate files
- Each cleaned SKILL.md: frontmatter + 1-paragraph overview + index of task/rule/resource links + optional reference material ≤ ~40 lines

**Non-Goals:**
- Changing what skills do — this is structure-only
- Reducing SKILL.md to zero content — reference material (schemas, format diagrams, valid value lists) is permitted per `skill-creator` guidelines
- Touching non-designbook skills (e.g. `skill-creator` itself uses ~470 lines appropriately, general skills have no restriction)

## Decisions

### What belongs in SKILL.md (designbook-* skills)

| Allowed | Not allowed |
|---------|-------------|
| Frontmatter (name, description) | Execution instructions (step-by-step procedures) |
| 1-paragraph skill overview | CLI commands to run |
| Links to tasks/, rules/, resources/ | AI rules ("Rule 1: ...", "Rule 2: ...") |
| Brief format spec / schema diagram (reference) | "Load X skill" directives |
| Valid value lists (e.g. task type table) | Before/after hook logic |
| Validation commands | Procedural rules with if/then branching |

The test: **if removing the section would prevent execution, it belongs in a task/rule file. If it's pure reference, it may stay.**

### Where displaced content goes

| Content type | Destination |
|---|---|
| AI execution rules (Rule 0–6) | `rules/<name>.md` with appropriate `when:` |
| CLI reference, format specs, YAML examples | `resources/<topic>.md` |
| Output structure diagrams | `resources/` |
| Validation commands | `resources/` or `tasks/` body |
| Schema reference | `resources/schema-reference.md` |
| Config reference docs | `resources/config-reference.md` |

### Per-skill displacement plan

**designbook-workflow** (406 lines → ~30 lines)
- AI Rules (Rules 0–6, hooks) → `rules/workflow-execution.md`
- CLI Commands + `--loaded` JSON shape → `resources/cli-reference.md`
- Task JSON format, tasks.yml format → `resources/task-format.md`
- Task file format, rule file format → already documented in `designbook-addon-skills`; remove from here; keep a pointer to `resources/task-format.md`
- Directory structure, status transitions, Storybook integration → `resources/architecture.md`
- Task Types table, Stage names → keep as reference (small, non-procedural)

**designbook-configuration** (147 lines → ~30 lines)
- Two-step bootstrap execution instruction → `rules/config-loading.md`:
  1. Locate `designbook.config.yml` (walk-up); read `cmd` key → `$DESIGNBOOK_CMD` (fallback: `npx storybook-addon-designbook`)
  2. `eval "$($DESIGNBOOK_CMD config)"` → exports all env vars (`$DESIGNBOOK_DIST`, `$DESIGNBOOK_BACKEND`, etc.)
  This rule fires before any workflow command can run. `when:` omitted (applies to all stages).
- Environment variable table + full config YAML example → `resources/config-reference.md`
- `sample_data.field_types`, `entity_mapping.templates`, `workflow.rules/tasks` docs → `resources/config-reference.md`
- Keep: 1-paragraph overview, link to resources/

**designbook-scenes** (82 lines → ~30 lines)
- Critical Rules (3 ⛔ constraints) → `rules/scenes-constraints.md`
- Entity Rendering paragraph (explains map-entity, template lookup, recursive) → `resources/entity-rendering.md` (or fold into existing `resources/`)
- Output structure diagram → keep as small reference
- Drupal template rules note → keep (1 line pointer)
- Validation commands → keep (3-line reference block)

**designbook-sample-data** (80 lines → ~25 lines)
- Format: Nested entity_type.bundle section + Structure/Record Rules tables → `resources/format.md`
- Field Templates section → `resources/format.md`
- Content Guidelines → `resources/format.md`
- Keep: overview, task file link, output path, link to resources/format.md

**designbook-data-model** (68 lines → ~20 lines)
- Schema Reference section (full schema tree, composition note, view config) → `resources/schema-reference.md`
- Keep: overview (1 line), steps (write data-model.yml), link to resources/schema-reference.md

### Convention documentation in designbook-addon-skills

Add an explicit `## SKILL.md Contract` section to `designbook-addon-skills/SKILL.md` (or its `resources/skill-authoring.md`):
- State the progressive disclosure model (citing skill-creator)
- Define what is/isn't allowed in SKILL.md for designbook-* skills
- The ~40-line size target
- Point to resources/ and rules/ as the correct destinations for displaced content

## Risks / Trade-offs

**Risk: Content duplication** — Some format specs in SKILL.md are also referenced from task files. If we move the content to resources/ and the task file already has inline guidance, we may end up with two sources of truth.
→ Mitigation: Task files should reference the resource file via a link, not copy content.

**Risk: AI misses extracted rules** — If execution rules move to `rules/workflow-execution.md` but the rule file's `when:` conditions are too broad or too narrow, the AI may miss them.
→ Mitigation: Set `when.stages` to cover all stages where the rules apply; omit `when.stages` for rules that apply to every stage.

**Risk: Stages mismatch** — `designbook-workflow` rules reference stage names that must match rule `when.stages` exactly.
→ Mitigation: Keep rule files within the same skill so stage names are stable.

## Open Questions

_(none — this is a mechanical extraction, not a design decision)_
