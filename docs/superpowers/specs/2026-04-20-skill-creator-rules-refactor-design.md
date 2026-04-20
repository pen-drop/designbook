# Design: Skill-Creator Rules Refactor — Per-File-Type Rules as Single Source of Truth

## Summary

The rules of the `designbook-skill-creator` skill are reorganized per artifact type (task, blueprint, rule, schema, workflow) and become the single source of truth for both authoring guidance **and** validation checks. The checks currently hardcoded in `resources/validate.md` (E01–E07, W01–W09) move into the respective rule files and get file-type-specific IDs (`TASK-01`, `BLUEPRINT-01`, …). `validate.md` becomes a pure runner — it enumerates rule files, reads their `## Checks` tables, and applies them, without holding any check logic itself.

This solves two problems at once:

1. **Authoring clarity.** When creating a new task, exactly one rule file (`rules/task-files.md`) is loaded, covering both the "what" (principles, examples) and the validation criteria.
2. **Validator coherence.** Checks live in one place. The validator duplicates nothing; changes to rules take effect for both validation and authoring automatically.

## Motivation (from review.md, line 68)

> skill-creator: it must be much clearer what goes into tasks, blueprints, and rules. This is already in the validate resource. It should go into rule files so they are validated when creating each file type. In validate there should also be references to the respective rules.

## Current State

```
.agents/skills/designbook-skill-creator/
├── SKILL.md
├── rules/
│   ├── principles.md          # ~365 lines, principles mixed across all file types
│   ├── structure.md           # ~200 lines, structure conventions mixed across all file types
│   └── validate-params.md     # 19 lines, task-specific param checks
└── resources/
    ├── validate.md            # 172 lines, 16 hardcoded checks with cross-references to principles/structure
    ├── research.md
    ├── schemas.md
    ├── schema-composition.md
    └── skill-map.md
```

Problems:

- `validate.md` duplicates the rules: the check table has "Source: principles.md (Tasks Say WHAT)" plus the full check description. If the principle in `principles.md` drifts, the check stays behind.
- `principles.md` and `structure.md` mix rules for tasks, blueprints, rules, schemas, and workflow files in one flow — when creating a rule file, it's unclear which sections apply.
- Check IDs (`E01`, `W07`) give no hint which file type they target — `W07` hits both task params and `schemas.yml` types.
- `validate-params.md` is already a file-type-specific rule, but outside the unified pattern.

## Target Architecture

### Directory layout

```
.agents/skills/designbook-skill-creator/
├── SKILL.md
├── rules/
│   ├── common-rules.md        # Cross-cutting rules for every file type (frontmatter parseable, site-agnostic, skill-root structure)
│   ├── task-files.md          # Everything for tasks/*.md
│   ├── blueprint-files.md     # Everything for blueprints/*.md
│   ├── rule-files.md          # Everything for rules/*.md (except this skill's own)
│   ├── schema-files.md        # Everything for schemas.yml
│   └── workflow-files.md      # Everything for workflows/*.md
└── resources/
    ├── validate.md            # Pure runner — no own check logic
    ├── research.md
    ├── schemas.md
    ├── schema-composition.md
    └── skill-map.md
```

**Naming convention:** Every file-type rule file carries the suffix `-files.md` — this kills the collision between the filename `rule.md` and the concept "rule". `common-rules.md` keeps its name because it doesn't describe a single file type.

`rules/principles.md`, `rules/structure.md`, `rules/validate-params.md` are **removed outright** (CLAUDE.md: no backwards-compat shims). Their content is migrated into the new files.

### Rule file format

Every rule file has the same shape:

```markdown
---
name: <file-type>-rules
description: Authoring + validation rules for <file-type> files
applies-to:
  - tasks/*.md
  - <further globs>
---

# <File-Type> Rules

## Principle 1 — <name>
[Narrative with Wrong/Correct examples, same style as current principles.md]

## Principle 2 — <name>
…

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| TASK-01 | error | `result:` schema uses `$ref` when a matching type exists in `schemas.yml` | frontmatter |
| TASK-02 | warning | Body contains no implementation details (CSS classes, Twig code, framework-specific syntax) | body |
| … | | | |
```

**Two purposes, one file:**

- For authoring (e.g., `skill-creator` loads `rules/task-files.md` before creating a new task), Claude reads the principles + examples and understands what to produce.
- For validation, `validate.md` loads the same file, extracts the `## Checks` table, and applies each row to every matching file.

### `## Checks` — format contract

The table is read mechanically by the runner (Claude as LLM runner, not an actual parser). For that to work reliably, each rule file follows a strict contract:

- **Fixed column set in fixed order:** `ID | Severity | What to verify | Where`.
- **Header case-sensitive** (exactly as above).
- **No extra columns.** If a rule needs more explanation, that goes into the narrative at the top of the file, not into a new column.
- **Severity values:** `error` or `warning` only. No `info`, no `hint`.
- **`Where` values:** `frontmatter`, `body`, `filename`, or `frontmatter+body`.
- **Exactly one `## Checks` table per file** — no splitting across sections.

### `applies-to` as dispatch key

The `applies-to` frontmatter is a glob list relative to the skill root being validated. Examples:

| Rule file | applies-to |
|---|---|
| `common-rules.md` | `tasks/*.md`, `**/tasks/*.md`, `blueprints/*.md`, `**/blueprints/*.md`, `rules/*.md`, `**/rules/*.md`, `**/schemas.yml`, `**/workflows/*.md` |
| `task-files.md` | `tasks/*.md`, `**/tasks/*.md` |
| `blueprint-files.md` | `blueprints/*.md`, `**/blueprints/*.md` |
| `rule-files.md` | `rules/*.md`, `**/rules/*.md` |
| `schema-files.md` | `schemas.yml`, `**/schemas.yml` |
| `workflow-files.md` | `workflows/*.md`, `**/workflows/*.md` |

The runner builds the dispatch mapping from this. When `common-rules.md` and `task-files.md` both match `tasks/create-component.md`, both check sets run.

### Check IDs — convention and uniqueness

- **Prefix = file type in uppercase** (`TASK`, `BLUEPRINT`, `RULE`, `SCHEMA`, `WORKFLOW`, `COMMON`).
- **Counter = two digits**, sequential within the file (`TASK-01`, `TASK-02`, …).
- **IDs are globally unique** across all rule files. `COMMON-*` is disjoint by construction from file-type-specific checks — a check that applies to multiple file types lives only in `common-rules.md` as `COMMON-*`, never in parallel in the type-specific files.
- **No overlap** between `TASK-*`, `BLUEPRINT-*`, etc.: when the same condition must be checked for tasks and blueprints, it is promoted to `COMMON-*`.

### Identical predicate across type files

In rare cases the same check predicate makes sense in two type files (not in `common-rules.md`, because the per-type explanation differs). Example:

- `TASK-09` — a property in `params:`/`result:` of a task is missing teaching signals.
- `SCHEMA-02` — a property in a top-level type in `schemas.yml` is missing teaching signals.

The predicate ("property has neither `description`, `enum`, `pattern`, nor `examples`") is identical; only the application site differs. **Invariant:** if the predicate definition (what counts as a "teaching signal") changes, both checks must be updated together. This invariant is documented as a comment above each of the two checks and in the runner's "Maintenance" section.

### `validate.md` as runner

New shape of `validate.md`:

```markdown
# Skill Validator — Runner

## Process

1. Scan the skill directory (files + schemas.yml).
2. For each file, load every rule file from `.agents/skills/designbook-skill-creator/rules/`
   whose `applies-to` glob matches.
3. For each loaded rule file, parse the `## Checks` table and apply every row to the file.
4. Apply findings, metrics, and score computation (see below).

## Runner-owned concepts (NOT checks — they stay in validate.md)

- **Per-file metric definitions**: `lines`, `frontmatter_lines`, `body_lines`, `body_ratio`.
- **Schema-audit metrics** per type: `properties_total`, `properties_described`, `coverage`, `has_title_or_description`, `refs_out`, `refs_in`, `completeness`.
- **Schema graph**: `refs_in`/`refs_out` edges between schema types.
- **Score computation**: start at 100, error −20, warning −10, `body_ratio > 0.8` on tasks −5, minimum 0.
- **Output format**: markdown tables with Findings, Metrics, Schema Audit, Schema Graph, Summary.
- **Boundary vs research.md**: the table at the end of the file stays unchanged.

## References

- Task rules: [rules/task-files.md](../rules/task-files.md)
- Blueprint rules: [rules/blueprint-files.md](../rules/blueprint-files.md)
- Rule rules: [rules/rule-files.md](../rules/rule-files.md)
- Schema rules: [rules/schema-files.md](../rules/schema-files.md)
- Workflow rules: [rules/workflow-files.md](../rules/workflow-files.md)
- Common rules: [rules/common-rules.md](../rules/common-rules.md)

## Maintenance

Checks that share a predicate across two rule files (currently: `TASK-09` + `SCHEMA-02`)
are updated together. The predicate definition sits as a comment line above the check
in both files.
```

No check table in `validate.md` anymore. Metric definitions, score computation, output format, schema graph, and the boundary vs `research.md` remain — these are runner concepts, not rules.

## Content Migration

### `principles.md` → target files

| Section in principles.md | Target file |
|---|---|
| Tasks Say WHAT, Never HOW | `task-files.md` |
| Results Declare Schema, Not Just Paths | `task-files.md` |
| Tasks Declare Results in Schema, Not in Body | `task-files.md` |
| Schemas Must Teach the AI | `schema-files.md` |
| Blueprints Are Overridable Starting Points | `blueprint-files.md` |
| Rules Are Hard Constraints | `rule-files.md` |
| Rules Never Declare `params:` | `rule-files.md` |
| Concrete Implementations Belong in Blueprints | `task-files.md` + `blueprint-files.md` + `rule-files.md` (mirrored, see below) |
| Skills Are Site-Agnostic | `common-rules.md` |
| Stages Flush After Completion | `task-files.md` |
| Workflow Steps Are Plain Names | `workflow-files.md` |
| Stage = Filename, No Duplication | `task-files.md` |
| Validation Is Automatic | `task-files.md` |

**On the threefold mapping of "Concrete Implementations Belong in Blueprints":**
this is the only principle whose statement is relevant from the perspective of all three file types (a task author must know: no concrete code in tasks; a rule author must know: no concrete code in rules; a blueprint author must know: this is where concrete code belongs). The migration mirrors the core text in all three files with file-type-specific framing. The derived checks `TASK-06` (body contains no HOW) and `BLUEPRINT-02` (body must stay site-agnostic) remain file-type-specific.

### `structure.md` → target files

| Section in structure.md | Target file |
|---|---|
| Integration Skills Layout | `common-rules.md` (skill-root structure) |
| Core Skill Layout | `common-rules.md` |
| `schemas.yml` — Schema Definitions | `schema-files.md` |
| `tasks/` — Naming Rule (filename = stage) | `task-files.md` |
| `tasks/` — Workflow-qualified tasks (`<step>--<workflow>.md`) | `task-files.md` (own subsection, see below) |
| `rules/` — Trigger + Filter Matching | `rule-files.md` |
| `rules/` — Consumer Semantics (domain) | `rule-files.md` |
| `rules/` — Strict Trigger Matching | `rule-files.md` |
| `rules/` — Domain Subcontexts | `rule-files.md` |
| `rules/` — Provider Rules (Legacy) | `rule-files.md` |
| `rules/` — Schema Extension Fields (extends/provides/constrains) | `rule-files.md` (promoted to top-level "Schema Extension — Core Mechanism", see below) + reference from `blueprint-files.md` |
| `blueprints/` — Trigger + Filter Matching | `blueprint-files.md` |
| `SKILL.md` — Index Only | `common-rules.md` |
| Naming Conventions | `common-rules.md` |

### Workflow-qualified tasks — own subsection in `task-files.md`

The "Workflow-qualified tasks" section in `structure.md` (lines 52–67) defines a hard rule that applies **only to task files whose filename contains `--`**: `trigger.steps:` must carry the fully qualified step name including the workflow prefix. During migration:

- Own subsection `### Workflow-qualified tasks` in `task-files.md`.
- Opening sentence: "This subsection applies only to task files whose filename contains `--` (e.g., `intake--design-verify.md`). Non-qualified task files ignore this subsection."
- The associated check `TASK-02` carries the same scope hint in the `Where` column (`filename`, scope: "filename contains `--`").

### `validate-params.md` → `task-files.md`

All five checks (hardcoded paths, missing params, missing `$ref`, redundant body references, flat map format) are task-specific and move into the `## Checks` table of `task-files.md`.

### New in `rule-files.md` (not from migration)

Three new sections and one new check tighten the "what is a rule" framing:

- **Rules Often Target One Output File Type** — new top-level section. Documents the natural pattern: a rule usually binds to exactly one output file type (Twig component, CSS-generate JSONata transform, screenshot capture) and describes **format + logic** for that file type — never domain specifics, which belong in blueprints. Examples: a rule "twig-component-format" enforces required frontmatter fields in Twig files but does not set colors; a rule "capture-screenshot" defines viewport / full-page parameters but not concrete URLs.
- **Name Rule Files Descriptively** — naming convention for rule files in production skills: the filename reflects the output file type or concept the rule constrains. Good names: `twig-component-format.md`, `screenshot-capture.md`, `css-generate-jsonata.md`. Bad: `conventions.md`, `rule-1.md`, `component-stuff.md`.
- **Schema Extension as Core Mechanism** — the existing subsection "Schema Extension Fields" under `rules/` Trigger + Filter Matching is promoted to its own top-level section, with framing: "Rules and blueprints frequently extend the task schema. This is the preferred mechanism — not body prose." The extends/provides/constrains table and the YAML example from `structure.md` remain there.
- **New check `RULE-01`** — `warning`: body describes schema constraints (enum values, required fields, type restrictions, property shapes) that should be expressed via `extends:` / `provides:` / `constrains:` in frontmatter instead.

### New in `blueprint-files.md` (not from migration)

- **Name Blueprint Files Descriptively** — parallel to rule naming: filename reflects the output type / component pattern (`card-blueprint.md`, `form-layout.md`, `header-section.md`), never generic (`blueprint-1.md`).
- **Schema Extension as Core Mechanism** — parallel to the `rule-files.md` change; blueprints use `extends:` + `provides:` (object form), **not** `constrains:` (which stays rule-exclusive).
- **New check `BLUEPRINT-03`** — `warning`: body describes default values or additional result properties that should be expressed via `extends:` / `provides:` in frontmatter instead.

### Check ID mapping (old → new)

Full renumbering. The migration is disposable (no legacy carry-over), so one-time complete renumbering by file type:

| Old | Rule | New |
|---|---|---|
| E01 | Frontmatter missing/invalid | `COMMON-01` |
| E02 | Required fields missing (when, result) | `TASK-01` |
| E03 | `$ref` points to nothing | `SCHEMA-01` |
| E04 | `trigger.steps` references unknown step | `TASK-02` (scope: filename contains `--`) |
| E05 | `stage:` in frontmatter | `TASK-03` |
| E06 | `constrains:` in blueprint | `BLUEPRINT-01` |
| E07 | Inline schema duplicates `schemas.yml` type | `TASK-04` |
| W01 | Body repeats result schema | `TASK-05` |
| W02 | HOW instead of WHAT | `TASK-06` |
| W03 | Site-specific content in core | `COMMON-02` |
| W04 | Cross-layer duplicate | `TASK-07` |
| W05 | Validation steps in body | `TASK-08` |
| W06 | Workflow prefix in workflow definition | `WORKFLOW-01` |
| W07 | Property lacks teaching signals (task params/result) | `TASK-09` |
| W07 | Property lacks teaching signals (schemas.yml types) | `SCHEMA-02` |
| W08 | Type missing title/description | `SCHEMA-03` |
| W09 | `additionalProperties: true` undocumented | `SCHEMA-04` |
| — | validate-params.md #1 (hardcoded paths) | `TASK-10` |
| — | validate-params.md #2 (missing param) | `TASK-11` |
| — | validate-params.md #3 (missing `$ref`) | `TASK-12` |
| — | validate-params.md #4 (redundant body) | `TASK-13` |
| — | validate-params.md #5 (flat map format) | `TASK-14` |
| — | (new) rule body describes schema constraints as prose | `RULE-01` |
| — | (new) blueprint body describes schema extensions as prose | `BLUEPRINT-03` |

## SKILL.md adjustment

The "Key Principles" and "File Structure Conventions" sections in `SKILL.md` currently point at `principles.md` and `structure.md`. After migration, this section is rebuilt as:

```markdown
## Rule Files by Artifact Type

Load the matching rule file **before** creating or editing any file of that type.
Common rules apply on top in every case.

| Creating/editing | Load |
|---|---|
| `tasks/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/task-files.md](rules/task-files.md) |
| `blueprints/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/blueprint-files.md](rules/blueprint-files.md) |
| `rules/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/rule-files.md](rules/rule-files.md) |
| `schemas.yml` | [rules/common-rules.md](rules/common-rules.md) + [rules/schema-files.md](rules/schema-files.md) |
| `workflows/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/workflow-files.md](rules/workflow-files.md) |

## Validation

See [resources/validate.md](resources/validate.md) for the static validator runner.
The runner dispatches to the same rule files via `applies-to` globs — the rules
above are the single source of truth for both authoring and validation.
```

The SKILL.md frontmatter `description` is updated to name the new rule files instead of the old ones.

## Out of scope

- Changes to the workflow engine's runtime behavior or the rule-loading logic in the addon.
- Other review.md items (CSS, image styles, extract-reference, capture, cli-workflow — each its own change).
- **Modernization of existing rule/blueprint files** that currently describe schema extensions as body prose instead of `extends:` / `provides:` / `constrains:`. The new checks `RULE-01` + `BLUEPRINT-03` surface those files during the validator run (plan task 11). The actual migration of the legacy files is a separate change after this refactor lands.
- Automatic fixing of findings. Remains the job of the user/agent as before.

## Success criteria

1. After migration, only the six new rule files exist in `rules/` (`common-rules.md`, `task-files.md`, `blueprint-files.md`, `rule-files.md`, `schema-files.md`, `workflow-files.md`). `principles.md`, `structure.md`, `validate-params.md` are removed.
2. `validate.md` contains no `## Errors`, `## Warnings`, or `## Checks` table. What remains: runner process, metric definitions, schema-audit metrics, schema graph, score computation, output format, reference links to the rule files, boundary vs `research.md`, maintenance note on predicate duplicates.
3. The validator on the existing skills (`designbook`, `designbook-drupal`, `designbook-css-tailwind`, `designbook-stitch`, `designbook-devtools`, `designbook-skill-creator` itself) produces the same findings as before, just with the new IDs per the mapping table.
4. When creating a new task, the skill-creator loads **only** `rules/task-files.md` + `rules/common-rules.md` — no longer `principles.md` + `structure.md` blanket-loaded.
5. All `## Checks` tables follow the format contract (`ID | Severity | What to verify | Where`, severity `error`/`warning`, Where `frontmatter`/`body`/`filename`).
6. Check IDs are globally unique; `COMMON-*` does not overlap with file-type-specific checks.
7. `SKILL.md` points at the new rule files via a "Rule Files by Artifact Type" table.
8. The new checks `RULE-01` and `BLUEPRINT-03`, run against the existing production skills, identify every legacy rule/blueprint file that describes schema extensions as body prose. The result is captured in a follow-up document at `docs/superpowers/audits/2026-04-20-legacy-schema-extension.md` — not fixed in this change.

## Open points

None blocking. All design decisions (scope = B+A, granularity = per-file-type without shared.md, format = narrative + checks table, naming = `*-files.md` suffix, format contract, ID uniqueness, new checks `RULE-01` + `BLUEPRINT-03`, naming convention for production rule/blueprint files) are confirmed via brainstorming + codex review.

**Expected to surface during the validator run (plan task 11), not blocking:** the count of legacy rule/blueprint files that describe schema extensions as body prose. That result becomes the follow-up audit document.
