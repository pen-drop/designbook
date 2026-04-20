# Skill-Creator Rules Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `principles.md` + `structure.md` + `validate-params.md` with six per-file-type rule files (`common-rules.md`, `task-files.md`, `blueprint-files.md`, `rule-files.md`, `schema-files.md`, `workflow-files.md`) inside `designbook-skill-creator`, and rewrite `resources/validate.md` into a pure runner that dispatches via `applies-to` globs.

**Architecture:** Content migration only — no addon code touched. The new rule files serve two purposes in one place: authoring guidance (narrative + correct/wrong examples, copied from the existing rule files) and validation source of truth (a `## Checks` table at the end of each file following a fixed column contract). `validate.md` keeps its metric/score/output machinery and references the new rule files. Old files are deleted (no backwards-compat — CLAUDE.md).

**Tech Stack:** Markdown only. Existing source files: `.agents/skills/designbook-skill-creator/rules/principles.md` (365 lines), `rules/structure.md` (201 lines), `rules/validate-params.md` (19 lines), `resources/validate.md` (171 lines), `SKILL.md` (80 lines). Design spec: `docs/superpowers/specs/2026-04-20-skill-creator-rules-refactor-design.md`.

**Verification method:** After Task 10 the rebuilt runner is invoked on the `designbook-skill-creator` skill itself. Findings must map 1:1 to the old check IDs via the migration table from the spec. No new findings, no missing ones.

---

## Resolved open decisions

| Spec question | Decision | Rationale |
|---|---|---|
| Naming suffix for per-type files | `*-files.md` (e.g., `task-files.md`) | Codex review flagged `rules/rule.md` as a name collision with the "rule" concept. Uniform suffix removes ambiguity across all five types. |
| W07 split | Split into `TASK-09` (task params/result) **and** `SCHEMA-02` (schemas.yml types) with shared-predicate invariant | Two distinct authoring contexts share identical predicate logic. Wartungs-Invariante in `validate.md`. |
| "Concrete Implementations" principle | Mirrored into `task-files.md`, `blueprint-files.md`, `rule-files.md` with file-type-specific framing | Author of each file type needs the principle from their perspective; cannot live only in `common-rules.md` because framing differs. |
| `## Checks` table format contract | Fixed columns `ID \| Severity \| What to verify \| Where`; severities `error`/`warning`; Where values `frontmatter`/`body`/`filename` | LLM runner reads the table mechanically — needs a hard contract. |
| Check-ID uniqueness | IDs globally unique; `COMMON-*` intentionally disjoint from file-type prefixes | Prevents dedup ambiguity when `common-rules.md` and a type file both apply. |
| Commit cadence | One commit per task; the commit for each "create rule file" task includes only that file | Clean history; easy rollback per file; matches existing project style. |

## File map

### New files

| Path | Purpose |
|---|---|
| `.agents/skills/designbook-skill-creator/rules/common-rules.md` | Cross-cutting rules (frontmatter parseable, site-agnostic, skill-directory layout, SKILL.md conventions, naming conventions). Loaded alongside every file-type rule. |
| `.agents/skills/designbook-skill-creator/rules/task-files.md` | Everything for `tasks/*.md`. Absorbs all task-related principles, `validate-params.md`, `tasks/` naming rules, and the workflow-qualified subsection. |
| `.agents/skills/designbook-skill-creator/rules/blueprint-files.md` | Everything for `blueprints/*.md`. Principles on overridability + concrete implementations, plus trigger/filter and schema-extension rules for blueprints. |
| `.agents/skills/designbook-skill-creator/rules/rule-files.md` | Everything for `rules/*.md`. Hard-constraint principle, "rules never declare params", trigger/filter matching, consumer-semantics `domain:`, strict matching, subcontexts, provider rules, schema-extension fields. |
| `.agents/skills/designbook-skill-creator/rules/schema-files.md` | Everything for `schemas.yml`. "Schemas teach the AI" principle plus reference-integrity / teaching-signal / title-description / additionalProperties checks. |
| `.agents/skills/designbook-skill-creator/rules/workflow-files.md` | Everything for `workflows/*.md`. Plain-name step principle plus the workflow-prefix check. |

### Modified files

| Path | What changes |
|---|---|
| `.agents/skills/designbook-skill-creator/resources/validate.md` | Gutted of `## Errors` and `## Warnings` tables. Keeps: discovery process, metric definitions, schema-audit metrics, score computation, output format, `research.md` boundary, adds Referenzen + Wartung sections. |
| `.agents/skills/designbook-skill-creator/SKILL.md` | "Key Principles" / "File Structure Conventions" replaced by a "Rule Files by Artifact Type" table pointing to the six new files; `description:` frontmatter updated to mention the new file names. |

### Deleted files

| Path | Why |
|---|---|
| `.agents/skills/designbook-skill-creator/rules/principles.md` | Content fully migrated to the six new rule files. CLAUDE.md: no legacy shims. |
| `.agents/skills/designbook-skill-creator/rules/structure.md` | Same. |
| `.agents/skills/designbook-skill-creator/rules/validate-params.md` | Content absorbed into `task-files.md` Checks table (rows `TASK-10` — `TASK-14`). |

---

## Task 1: Create `rules/common-rules.md`

**Files:**
- Create: `.agents/skills/designbook-skill-creator/rules/common-rules.md`

**Background.** This file holds truly cross-cutting rules: YAML frontmatter must be parseable (applies to every artifact), skills must be site-agnostic (applies across tasks/blueprints/rules), plus the skill-directory layout and SKILL.md conventions (these describe the *container* a single file lives in, not the file itself — natural fit for a shared file). Two checks live here: `COMMON-01` (frontmatter parseable) and `COMMON-02` (site-agnostic).

**Applies-to globs** (for runner dispatch) must cover every artifact type so that `COMMON-*` fires on all of them.

- [ ] **Step 1: Create the file with frontmatter and narrative sections**

Create `.agents/skills/designbook-skill-creator/rules/common-rules.md` with the following structure:

```markdown
---
name: common-rules
description: Cross-cutting authoring + validation rules that apply to every skill artifact (task, blueprint, rule, schema, workflow). Load alongside the matching file-type rule file.
applies-to:
  - tasks/*.md
  - "**/tasks/*.md"
  - blueprints/*.md
  - "**/blueprints/*.md"
  - rules/*.md
  - "**/rules/*.md"
  - schemas.yml
  - "**/schemas.yml"
  - workflows/*.md
  - "**/workflows/*.md"
  - SKILL.md
  - "**/SKILL.md"
---

# Common Skill-Authoring Rules

These rules apply to every file under `.agents/skills/`. File-type-specific rules
live in `task-files.md`, `blueprint-files.md`, `rule-files.md`, `schema-files.md`,
and `workflow-files.md`.

## Skills Are Site-Agnostic

[Copy verbatim from the current `rules/principles.md` section "Skills Are Site-Agnostic" (lines 273–302), including both Wrong/Correct code blocks and the final paragraph about structural vs. technical vs. site-specific content.]

## Skill Directory Structure

### Integration Skills (Part 3)

[Copy verbatim from the current `rules/structure.md` "Integration Skills (Part 3)" section (lines 8–24), including the directory tree and frontmatter annotations.]

### Core Skill (Part 1 — `designbook`)

[Copy verbatim from the current `rules/structure.md` "Core Skill (Part 1 — `designbook`)" section (lines 26–40), including the three-level concern tree.]

## `SKILL.md` — Index Only

[Copy verbatim from the current `rules/structure.md` "`SKILL.md` — Index Only" section (lines 178–190), including the required frontmatter block.]

## Naming Conventions

[Copy verbatim from the current `rules/structure.md` "Naming Conventions" section (lines 192–201), including the table and "Concern-first, framework-last." closing line.]

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| COMMON-01 | error | YAML frontmatter at top of file is present and parseable | frontmatter |
| COMMON-02 | warning | No site-specific references (brand names, project URLs, customer-specific section/slot inventories) in any file under the core `designbook/` skill | body |
```

- [ ] **Step 2: Confirm the file parses as valid markdown + YAML frontmatter**

Run:
```bash
head -15 .agents/skills/designbook-skill-creator/rules/common-rules.md
```
Expected: the YAML frontmatter block is visible, followed by the `# Common Skill-Authoring Rules` heading.

Run (tests that the YAML parses):
```bash
python3 -c "import yaml,sys; d=open('.agents/skills/designbook-skill-creator/rules/common-rules.md').read(); fm=d.split('---',2)[1]; yaml.safe_load(fm); print('ok')"
```
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-skill-creator/rules/common-rules.md
git commit -m "skill-creator: add common-rules.md (cross-cutting rules)"
```

---

## Task 2: Create `rules/task-files.md`

**Files:**
- Create: `.agents/skills/designbook-skill-creator/rules/task-files.md`

**Background.** The biggest file. It absorbs all task-centric content from `principles.md`, the task-centric sections from `structure.md`, and all five checks from `validate-params.md`. It owns check IDs `TASK-01` through `TASK-14`. Includes a dedicated `### Workflow-qualified tasks` subsection whose rules only fire when the filename contains `--`.

The "Concrete Implementations Belong in Blueprints" principle is included here (file-type perspective: "what NOT to put in a task"), mirrored in `blueprint-files.md` (perspective: "what belongs here") and `rule-files.md` (perspective: "what NOT to put in a rule"). Only the framing differs between the three.

- [ ] **Step 1: Create the file with frontmatter, narrative, and Checks table**

Create `.agents/skills/designbook-skill-creator/rules/task-files.md` with this structure:

```markdown
---
name: task-files
description: Authoring + validation rules for task files (tasks/*.md). Load before creating or editing any task file; load alongside common-rules.md.
applies-to:
  - tasks/*.md
  - "**/tasks/*.md"
---

# Task File Rules

Load together with [common-rules.md](common-rules.md).

## Tasks Say WHAT, Never HOW

[Copy verbatim from current `rules/principles.md` "Tasks Say WHAT, Never HOW" section (lines 8–42), including both Correct and Wrong YAML examples and the closing "Implementation guidance belongs in blueprints..." sentence.]

## Results Declare Schema, Not Just Paths

[Copy verbatim from current `rules/principles.md` "Results Declare Schema, Not Just Paths" section (lines 44–94), including the two YAML example blocks (first a combined file+data result, then a Correct/Wrong pair for schemas.yml $ref vs inline).]

## Tasks Declare Results in Schema, Not in Body

[Copy verbatim from current `rules/principles.md` "Tasks Declare Results in Schema, Not in Body" section (lines 96–128), including the markdown example with the `## Result: issues` block and the closing note about the `scene` key.]

## Stages Flush After Completion

[Copy verbatim from current `rules/principles.md` "Stages Flush After Completion" section (lines 304–329), including both YAML examples and the warning against unflushed references.]

## Stage = Filename, No Duplication

[Copy verbatim from current `rules/principles.md` "Stage = Filename, No Duplication" section (lines 357–359).]

## Validation Is Automatic

[Copy verbatim from current `rules/principles.md` "Validation Is Automatic" section (lines 361–365).]

## Concrete Implementations Don't Belong in Tasks

Tasks must stay **as abstract as possible**. They describe outputs only — what files to produce, what params to accept, what schema to match. They never contain:

- CSS class names or style syntax
- Framework-specific template code (Twig, JSX, Blade, …)
- File-naming patterns that differ between integrations
- Markup-layout instructions

Implementation details that vary between integrations belong in **blueprints** (overridable starting points). Implementation details that must hold regardless of integration belong in **rules** (hard constraints). See [blueprint-files.md](blueprint-files.md) and [rule-files.md](rule-files.md) for how those files are structured; the `TASK-06` check below enforces this boundary on the task side.

## `tasks/` — Naming Rule

[Copy verbatim from current `rules/structure.md` "`tasks/` — Naming Rule" section (lines 48–50), i.e. the "Filename = stage name" paragraph. Stop before the "Workflow-qualified tasks" subheading — that content follows below with an adjusted scope marker.]

### Workflow-qualified tasks

**Scope.** This subsection applies **only** to task files whose filename contains `--`
(e.g. `intake--design-verify.md`). Non-qualified task files ignore this subsection.

[Copy verbatim from current `rules/structure.md` "Workflow-qualified tasks" section (lines 52–66), including both the Correct and Wrong YAML examples and the closing paragraph about literal matching. Check `TASK-02` below is scoped to these files only.]

## Param + Body Consistency

Task bodies must not duplicate filename or path information that is already declared in
`params.properties` or `result.properties`. Five specific violations are checked:

1. **Hardcoded paths in the body.** Markdown body (everything below the frontmatter) may only reference files via runtime placeholders — `{{ … }}` JSONata templates or `$ENV_VAR`/`${ENV_VAR}` references. Bare `$DESIGNBOOK_DATA`, bare `.yml` filenames, and `Read X.yml` / `If X.yml exists` patterns are violations.
2. **Missing param declaration.** A file referenced in the body without a matching entry in `params.properties`.
3. **Missing `$ref` on a file result.** A `result:` entry with a `path:` but no `$ref:` to a schema.
4. **Redundant body reference.** A filename in the body whose basename matches the `path:` of an existing param — the param already covers it.
5. **Flat map format.** `params:` or `result:` without `type: object` and `properties:`. The wrapper object is required.

These five map to `TASK-10` through `TASK-14` in the Checks table.

## Checks

<!--
  TASK-09 shares its predicate with SCHEMA-02. If the definition of "teaching signal"
  (description / enum / pattern / examples) changes, update both checks together.
-->

| ID | Severity | What to verify | Where |
|---|---|---|---|
| TASK-01 | error | Required frontmatter fields present: `when`/`trigger`; if the task declares outputs, `result:` must be present | frontmatter |
| TASK-02 | error | Applies only when filename contains `--`: `trigger.steps:` uses the fully qualified step name `<step>:<workflow>` matching the workflow's `stages.*.steps` entry | filename |
| TASK-03 | error | `stage:` field absent in frontmatter (redundant — filename is the stage) | frontmatter |
| TASK-04 | error | No inline schema in `result:` properties when a matching type exists in the concern's `schemas.yml` — must use `$ref` instead | frontmatter |
| TASK-05 | warning | Body does not repeat a self-explanatory `result:` schema (a `## Result: <key>` section for a result whose schema type alone is self-explanatory) | body |
| TASK-06 | warning | Body contains no HOW — no CSS classes, Twig/JSX/Blade, framework-specific syntax, or style/markup instructions | body |
| TASK-07 | warning | Body does not repeat what a loaded rule already enforces (cross-layer duplicate with a matching rule file) | body |
| TASK-08 | warning | Body does not describe manual validation that the engine performs automatically | body |
| TASK-09 | warning | Properties in `params:` and `result:` with `type: string`/`number`/`object` carry at least one teaching signal (`description`, `enum`, `pattern`, or `examples`); properties with `path:` or `$ref:` are exempt | frontmatter |
| TASK-10 | warning | Body contains no hardcoded file path — file references in the body use `{{ … }}` or `$ENV_VAR` placeholders | body |
| TASK-11 | error | Every file referenced in the body is declared in `params.properties` (or `result.properties` if produced by the task) | frontmatter+body |
| TASK-12 | warning | Each `result:` entry with a `path:` also has a `$ref:` pointing to a schema | frontmatter |
| TASK-13 | warning | Body contains no filename reference whose basename matches an existing param's `path:` basename | frontmatter+body |
| TASK-14 | error | `params:` and `result:` use `type: object` with `properties:` — flat-map format is rejected | frontmatter |
```

- [ ] **Step 2: Smoke-test the copies — spot-check one section**

Run:
```bash
grep -c '^## ' .agents/skills/designbook-skill-creator/rules/task-files.md
```
Expected: `10` (ten `## ` top-level sections: Tasks Say WHAT, Results Declare Schema, Tasks Declare Results in Schema Not in Body, Stages Flush After Completion, Stage = Filename, Validation Is Automatic, Concrete Implementations Don't Belong in Tasks, `tasks/` — Naming Rule, Param + Body Consistency, Checks).

Run:
```bash
grep -c '^| TASK-' .agents/skills/designbook-skill-creator/rules/task-files.md
```
Expected: `14`

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-skill-creator/rules/task-files.md
git commit -m "skill-creator: add task-files.md (task authoring + checks TASK-01..14)"
```

---

## Task 3: Create `rules/blueprint-files.md`

**Files:**
- Create: `.agents/skills/designbook-skill-creator/rules/blueprint-files.md`

**Background.** Blueprints are overridable starting points. This file owns the "Blueprints Are Overridable" principle, the "Concrete Implementations Belong in Blueprints" principle (file-type perspective: "what belongs here"), and the `blueprints/` trigger+filter matching + schema-extension rules from `structure.md`. Owns check IDs `BLUEPRINT-01` (constrains forbidden) and `BLUEPRINT-02` (site-agnostic framing).

- [ ] **Step 1: Create the file**

Create `.agents/skills/designbook-skill-creator/rules/blueprint-files.md` with this structure:

```markdown
---
name: blueprint-files
description: Authoring + validation rules for blueprint files (blueprints/*.md). Load before creating or editing any blueprint file; load alongside common-rules.md.
applies-to:
  - blueprints/*.md
  - "**/blueprints/*.md"
---

# Blueprint File Rules

Load together with [common-rules.md](common-rules.md).

## Blueprints Are Overridable Starting Points

[Copy verbatim from current `rules/principles.md` "Blueprints Are Overridable Starting Points" section (lines 165–182), including the `## Required Tokens` example block.]

## Concrete Implementations Belong in Blueprints

Blueprints are where integration-specific implementation details live: class names, token
names, markup patterns, file-naming rules that differ between stacks. This is the
file-type perspective of the principle mirrored in `task-files.md` (framing: "don't
put this in a task") and `rule-files.md` (framing: "don't put this in a rule").

[Copy verbatim from current `rules/principles.md` "Concrete Implementations Belong in Blueprints, Never in Tasks or Rules" section (lines 234–271), including the distinction table, the example list, and both Wrong/Correct blocks. Drop the final paragraph about layer vs file-type determining overridability — that belongs in `common-rules.md`'s structure section.]

## `blueprints/` — Trigger + Filter Matching

[Copy verbatim from current `rules/structure.md` "`blueprints/` — Trigger + Filter Matching" section (lines 159–172), including the YAML example with `trigger.domain: components` + `filter.backend: drupal`.]

### Schema Extension Fields

[Copy verbatim from current `rules/structure.md` "Schema Extension Fields" subsection under `blueprints/` (lines 174–176), i.e. the two-sentence paragraph clarifying that blueprints may use `extends:` and `provides:` (object form) but **not** `constrains:`. The broader extends/provides/constrains table lives in `rule-files.md` — reference it from here with a link.]

For the full schema-extension mechanics (merge semantics, last-writer-wins for `provides:`,
enum-intersection for `constrains:`), see [rule-files.md](rule-files.md#schema-extension-fields).

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| BLUEPRINT-01 | error | `constrains:` field is absent from frontmatter (only rules may constrain enum values) | frontmatter |
| BLUEPRINT-02 | warning | Body does not contain site-specific references (brand names, project URLs, customer slot names) — site-specific content in core `designbook/` is caught by COMMON-02 in common-rules.md; this check covers blueprints in integration skills that still must stay site-agnostic | body |
```

- [ ] **Step 2: Verify counts**

Run:
```bash
grep -c '^## ' .agents/skills/designbook-skill-creator/rules/blueprint-files.md
```
Expected: `4` (Blueprints Are Overridable, Concrete Implementations, blueprints/ Trigger + Filter, Checks).

Run:
```bash
grep -c '^| BLUEPRINT-' .agents/skills/designbook-skill-creator/rules/blueprint-files.md
```
Expected: `2`

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-skill-creator/rules/blueprint-files.md
git commit -m "skill-creator: add blueprint-files.md (blueprint authoring + checks)"
```

---

## Task 4: Create `rules/rule-files.md`

**Files:**
- Create: `.agents/skills/designbook-skill-creator/rules/rule-files.md`

**Background.** Everything about authoring rule files. Owns the "Rules Are Hard Constraints" and "Rules Never Declare params:" principles, the mirrored "Concrete Implementations" framing, and all `rules/`-specific structure content: trigger+filter matching, consumer-semantics `domain:`, strict trigger matching, domain subcontexts, provider rules (legacy), and schema-extension fields (extends/provides/constrains — this is where the full table lives). No new checks; rule-file constraints are either caught by `COMMON-01` (frontmatter) or are too subtle for static checking in the current scope.

- [ ] **Step 1: Create the file**

Create `.agents/skills/designbook-skill-creator/rules/rule-files.md` with this structure:

```markdown
---
name: rule-files
description: Authoring + validation rules for rule files (rules/*.md). Load before creating or editing any rule file; load alongside common-rules.md.
applies-to:
  - rules/*.md
  - "**/rules/*.md"
---

# Rule File Rules

Load together with [common-rules.md](common-rules.md).

## Rules Are Hard Constraints

[Copy verbatim from current `rules/principles.md` "Rules Are Hard Constraints" section (lines 184–198), including the YAML example with `trigger.domain: components` + `filter.backend: drupal`.]

## Rules Never Declare `params:`

[Copy verbatim from current `rules/principles.md` "Rules Never Declare `params:`" section (lines 200–232), including both Wrong and Correct blocks and the closing "The same principle applies to blueprints." sentence.]

## Concrete Implementations Don't Belong in Rules

Rules describe structure and constraints that must hold regardless of integration. They
do not contain concrete implementation details (class names, token names, markup specifics)
— those live in **blueprints**. See [blueprint-files.md](blueprint-files.md#concrete-implementations-belong-in-blueprints)
for the full framing.

The distinction:

| What varies between integrations | → Blueprint |
| What never changes | → Rule |
| What to produce (outputs only) | → Task |

Example:

- "A component must have a `$schema` field" — never changes → **rule**
- "Use `btn btn--primary` as the default button class" — Tailwind uses different classes → **blueprint**

## `rules/` — Trigger + Filter Matching

[Copy verbatim from current `rules/structure.md` "`rules/` — Trigger + Filter Matching" section (lines 68–84), including the explanatory paragraph and the YAML example.]

### Consumer Semantics — `domain:` declares WHAT A TASK NEEDS

[Copy verbatim from current `rules/structure.md` "Consumer Semantics — `domain:` declares WHAT A TASK NEEDS" subsection (lines 86–97), including the critical callout and the rule-of-thumb paragraph.]

### Strict Trigger Matching

[Copy verbatim from current `rules/structure.md` "Strict Trigger Matching" subsection (lines 99–101).]

### Domain Subcontexts

[Copy verbatim from current `rules/structure.md` "Domain Subcontexts" subsection (lines 103–105).]

### Provider Rules (`provides`) — Legacy

[Copy verbatim from current `rules/structure.md` "Provider Rules (`provides`) — Legacy" subsection (lines 107–123), including the callout about preferring code resolvers and the YAML example with `provides: url`.]

### Schema Extension Fields

[Copy verbatim from current `rules/structure.md` "Schema Extension Fields" subsection under `rules/` (lines 125–157), including the full extends/provides/constrains table and the YAML example showing `constrains:` on `renderer.enum`. Keep the closing note distinguishing `provides: <param>` (string) from `provides:` (object).]

See [`resources/schema-composition.md`](../resources/schema-composition.md) for the full merge model.

## Checks

<!-- Rule files have no file-type-specific static checks beyond what common-rules.md covers.
     Some rule violations (e.g., rule body containing `params:` in frontmatter) would be
     single-line YAML checks; add them here if they become a recurring authoring mistake. -->

_No rule-file-specific checks. Cross-cutting checks (COMMON-01, COMMON-02) apply via [common-rules.md](common-rules.md)._
```

- [ ] **Step 2: Verify counts**

Run:
```bash
grep -c '^## ' .agents/skills/designbook-skill-creator/rules/rule-files.md
```
Expected: `5` (Rules Are Hard Constraints, Rules Never Declare params, Concrete Implementations, rules/ Trigger + Filter Matching, Checks).

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-skill-creator/rules/rule-files.md
git commit -m "skill-creator: add rule-files.md (rule authoring, no new checks)"
```

---

## Task 5: Create `rules/schema-files.md`

**Files:**
- Create: `.agents/skills/designbook-skill-creator/rules/schema-files.md`

**Background.** Everything about `schemas.yml`. Absorbs the "Schemas Must Teach the AI" principle from `principles.md`, the "`schemas.yml` — Schema Definitions" snippet from `structure.md`, and owns check IDs `SCHEMA-01` through `SCHEMA-04`. `SCHEMA-02` shares its predicate with `TASK-09`; a comment marks the invariant.

- [ ] **Step 1: Create the file**

Create `.agents/skills/designbook-skill-creator/rules/schema-files.md` with this structure:

```markdown
---
name: schema-files
description: Authoring + validation rules for schemas.yml. Load before creating or editing any schemas.yml; load alongside common-rules.md.
applies-to:
  - schemas.yml
  - "**/schemas.yml"
---

# Schema File Rules

Load together with [common-rules.md](common-rules.md).

## `schemas.yml` — Schema Definitions

[Copy verbatim from current `rules/structure.md` "`schemas.yml` — Schema Definitions" section (lines 42–46), including the pointer to `resources/schemas.md`.]

## Schemas Must Teach the AI

[Copy verbatim from current `rules/principles.md` "Schemas Must Teach the AI" section (lines 130–163), including the bullet list, the "A reader must be able to…" paragraph, and both the Wrong and Correct `Vision` YAML examples.]

## Checks

<!--
  SCHEMA-02 shares its predicate with TASK-09. If the definition of "teaching signal"
  (description / enum / pattern / examples) changes, update both checks together.
-->

| ID | Severity | What to verify | Where |
|---|---|---|---|
| SCHEMA-01 | error | Every `$ref` in schemas.yml resolves to an existing key in the same file or in another concern's `schemas.yml` | body |
| SCHEMA-02 | warning | Every top-level-type property with `type: string`/`number`/`object` carries at least one teaching signal (`description`, `enum`, `pattern`, or `examples`); properties with `path:` or `$ref:` are exempt | body |
| SCHEMA-03 | warning | Every top-level type declares a `title:` or `description:` | body |
| SCHEMA-04 | warning | Types that set `additionalProperties: true` document (in a `description:` field) what kind of keys belong there | body |
```

- [ ] **Step 2: Verify counts**

Run:
```bash
grep -c '^## ' .agents/skills/designbook-skill-creator/rules/schema-files.md
```
Expected: `3` (schemas.yml Definitions, Schemas Must Teach the AI, Checks).

Run:
```bash
grep -c '^| SCHEMA-' .agents/skills/designbook-skill-creator/rules/schema-files.md
```
Expected: `4`

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-skill-creator/rules/schema-files.md
git commit -m "skill-creator: add schema-files.md (schemas.yml + checks SCHEMA-01..04)"
```

---

## Task 6: Create `rules/workflow-files.md`

**Files:**
- Create: `.agents/skills/designbook-skill-creator/rules/workflow-files.md`

**Background.** Smallest file. Owns the "Workflow Steps Are Plain Names" principle and one check (`WORKFLOW-01`).

- [ ] **Step 1: Create the file**

Create `.agents/skills/designbook-skill-creator/rules/workflow-files.md` with this structure:

```markdown
---
name: workflow-files
description: Authoring + validation rules for workflow files (workflows/*.md). Load before creating or editing any workflow file; load alongside common-rules.md.
applies-to:
  - workflows/*.md
  - "**/workflows/*.md"
---

# Workflow File Rules

Load together with [common-rules.md](common-rules.md).

## Workflow Steps Are Plain Names

[Copy verbatim from current `rules/principles.md` "Workflow Steps Are Plain Names" section (lines 331–355), including the Correct and Wrong YAML examples and the closing note that `trigger.steps` is used in task files only — replace the link `[`structure.md`](./structure.md)` with `[rule-files.md](rule-files.md)` since the domain matching model now lives there.]

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| WORKFLOW-01 | warning | No `stages.*.steps` entry contains a workflow-qualified name (a `:`-separated step with a workflow prefix) — step names inside a workflow definition must be plain | body |
```

- [ ] **Step 2: Verify counts**

Run:
```bash
grep -c '^## ' .agents/skills/designbook-skill-creator/rules/workflow-files.md
```
Expected: `2` (Workflow Steps Are Plain Names, Checks).

Run:
```bash
grep -c '^| WORKFLOW-' .agents/skills/designbook-skill-creator/rules/workflow-files.md
```
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-skill-creator/rules/workflow-files.md
git commit -m "skill-creator: add workflow-files.md (workflow authoring + WORKFLOW-01)"
```

---

## Task 7: Rewrite `resources/validate.md` as pure runner

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/resources/validate.md`

**Background.** The current `validate.md` has three kinds of content: runner logic (discover files, classify, iterate, score, report) and two tables of hardcoded checks (`### Errors` + `### Warnings`). The check tables leave; everything else stays. Two new sections arrive: **Referenzen** (links to the six rule files) and **Wartung** (predicate-sharing invariant).

The Metric, Schema Audit, Score-Computation, Output-Format, and `research.md` boundary sections are preserved **verbatim**. The discovery/classify/check steps become a dispatch step that loads each rule file whose `applies-to` glob matches the scanned file.

- [ ] **Step 1: Overwrite the file**

Replace the entire contents of `.agents/skills/designbook-skill-creator/resources/validate.md` with:

````markdown
---
name: validate
description: Static analysis runner — discovers rule files via applies-to globs and applies their `## Checks` tables to every skill file. No checks are defined here.
---

# Skill Validator — Runner

## What It Does

Static analysis of all task, rule, blueprint, schema, and workflow files in a skill directory. For each file, the runner loads every rule file from `.agents/skills/designbook-skill-creator/rules/` whose `applies-to` glob matches, extracts its `## Checks` table, and applies every row. Outputs a structured report with findings, metrics, and scores.

Pendant to `research.md` (runtime audit), but purely static — no workflow execution needed.

## Aufruf

When asked to validate a skill:

```
Validate skill <skill-name>
Validate all skills
```

## Process

### Step 1 — Discover files

Scan the skill directory for all `.md` files in `tasks/`, `rules/`, `blueprints/`, and `workflows/`; plus any `schemas.yml`; plus `SKILL.md`. For the core skill (`designbook/`), scan all `<concern>/tasks/`, `<concern>/rules/`, `<concern>/workflows/`, and integration-skill `blueprints/` directories.

Also locate every `schemas.yml` for `$ref` resolution.

### Step 2 — Load rule files

Read all files in `.agents/skills/designbook-skill-creator/rules/`. For each rule file, read its frontmatter `applies-to:` glob list.

### Step 3 — Dispatch + check

For every scanned file, collect all rule files whose `applies-to` globs match the scanned file's path (relative to the skill root). For each matching rule file, read its `## Checks` table and apply every row to the scanned file.

Every row follows the contract:

```
| ID | Severity | What to verify | Where |
```

- `ID` is globally unique across all rule files.
- `Severity` is `error` or `warning`.
- `What to verify` is a natural-language predicate the LLM runner evaluates against the scanned file's content.
- `Where` is `frontmatter`, `body`, `filename`, or `frontmatter+body`.

Record each matched violation as a finding: `{ file, id, severity, description }`.

### Step 4 — Compute metrics

For each file:

| Metric | Description |
|---|---|
| `lines` | Total lines |
| `frontmatter_lines` | Lines in YAML frontmatter |
| `body_lines` | Lines in markdown body |
| `body_ratio` | body_lines / lines (0.0–1.0) |

### Step 4b — Schema audit

For each top-level type in every `schemas.yml`, plus every `params:`/`result:` block in tasks:

| Metric | Description |
|---|---|
| `properties_total` | Count of leaf properties (excluding those with `path:` or `$ref:`) |
| `properties_described` | Properties with `description`, `enum`, `pattern`, or `examples` |
| `coverage` | properties_described / properties_total |
| `has_title_or_description` | Boolean (top-level only) |
| `refs_out` | List of `$ref` targets used by this type |
| `refs_in` | List of types/tasks that `$ref` this type |
| `completeness` | (has_title_or_description ? 1 : 0) + coverage, scaled 0–100% |

**Exclusions:** properties with `path:` are file references and bypass the teaching-signal checks entirely. Properties with `$ref:` count toward `refs_out` only; their teaching is the responsibility of the ref target.

### Step 5 — Compute scores

Per file: start at 100.

| Finding | Deduction |
|---|---|
| Error | −20 |
| Warning | −10 |
| body_ratio > 0.8 on tasks | −5 |

Minimum: 0. Skill score = average of all file scores.

### Step 6 — Output report

Output as markdown tables:

```
## Skill: <skill-name> — Score: <score>/100

### Findings

| File | Type | ID | Severity | Description |
|---|---|---|---|---|
| tasks/create-component.md | task | TASK-06 | warning | Body contains Twig code (line 45-60) |

### Metrics

| File | Type | Lines | Body | Ratio | Score |
|---|---|---|---|---|---|
| tasks/create-component.md | task | 116 | 89 | 0.77 | 70 |

### Schema Audit

Per top-level type in `schemas.yml` (and `params:`/`result:` blocks of tasks). Properties with `path:` and `$ref:` are excluded from coverage.

| Type | Source | Properties | Described | Title/Desc | Completeness |
|---|---|---|---|---|---|
| Vision | vision/schemas.yml#/Vision | 8 | 3/8 | yes | 47% |
| DataModel | data-model/schemas.yml#/DataModel | 14 | 14/14 | yes | 100% |
| <task>.params | design/tasks/extract-reference.md | 2 | 0/2 | n/a | 0% |

### Schema Graph

`refs_in` and `refs_out` count `$ref` edges between schema types only — file references are not edges.

| Type | refs_out | refs_in |
|---|---|---|
| DesignReference | 0 | 5 |
| Issue | 0 | 3 |
| Vision | 1 | 0 |

### Summary

| Metric | Value |
|---|---|
| Total files | 12 |
| Errors | 0 |
| Warnings | 3 |
| Avg body ratio | 0.72 |
| Avg schema completeness | 68% |
| Skill score | 78/100 |
```

## Referenzen — Rule Files

All checks live in these rule files. Any change to a check — adding, removing, tightening,
rephrasing — happens in the rule file, not here.

- Task-Regeln: [../rules/task-files.md](../rules/task-files.md) — `TASK-01` .. `TASK-14`
- Blueprint-Regeln: [../rules/blueprint-files.md](../rules/blueprint-files.md) — `BLUEPRINT-01`, `BLUEPRINT-02`
- Rule-Regeln: [../rules/rule-files.md](../rules/rule-files.md) — (no rule-file-specific checks)
- Schema-Regeln: [../rules/schema-files.md](../rules/schema-files.md) — `SCHEMA-01` .. `SCHEMA-04`
- Workflow-Regeln: [../rules/workflow-files.md](../rules/workflow-files.md) — `WORKFLOW-01`
- Gemeinsame Regeln: [../rules/common-rules.md](../rules/common-rules.md) — `COMMON-01`, `COMMON-02`

## Wartung

Some checks share a predicate across two rule files because their authoring context differs.
Currently:

- `TASK-09` (task params/result teaching signals) and `SCHEMA-02` (schemas.yml teaching signals)
  share the "at least one of `description`, `enum`, `pattern`, `examples`" predicate.

When the predicate definition changes (e.g., adding `const:` as a valid teaching signal),
update **both** checks in the same commit.

## Abgrenzung zu research.md

| | validate.md | research.md |
|---|---|---|
| When | Anytime, no workflow | After workflow execution |
| Input | Scan skill directory | `workflows/archive/*/tasks.yml` |
| Checks | File structure, frontmatter, body redundancy, principles | Type correctness, domain, loading, duplication, coherence |
| Focus | Are files correctly built? | Did the workflow load the right files? |
| Output | Findings + metrics + score | Audit table + Superpowers fix workflow |
````

- [ ] **Step 2: Verify the file no longer contains the old check tables**

Run:
```bash
grep -c '^### Errors\|^### Warnings' .agents/skills/designbook-skill-creator/resources/validate.md
```
Expected: `0`

Run:
```bash
grep -c '^| E0\|^| W0' .agents/skills/designbook-skill-creator/resources/validate.md
```
Expected: `0`

Run (confirms the new sections arrived):
```bash
grep -c '^## Referenzen — Rule Files\|^## Wartung' .agents/skills/designbook-skill-creator/resources/validate.md
```
Expected: `2`

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-skill-creator/resources/validate.md
git commit -m "skill-creator: turn validate.md into pure runner with rule-file dispatch"
```

---

## Task 8: Update `SKILL.md`

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/SKILL.md`

**Background.** The current `SKILL.md` (80 lines) has "Key Principles" (line 51) pointing to `principles.md` and "File Structure Conventions" (line 60) pointing to `structure.md`. Both go. A new "Rule Files by Artifact Type" section replaces them with a dispatch table. The frontmatter `description:` field is also refreshed to name the new rule files.

- [ ] **Step 1: Replace the frontmatter `description`**

Open `.agents/skills/designbook-skill-creator/SKILL.md`. Replace the existing `description:` line (line 4) with:

```
description: Authoritative spec for authoring tasks, rules, blueprints, workflows, and schemas.yml under .agents/skills/designbook/, .agents/skills/designbook-*/, and this skill's own rules/ and resources/. Load the matching per-file-type rule before creating or editing ANY such file — rules/task-files.md for tasks, rules/blueprint-files.md for blueprints, rules/rule-files.md for rules, rules/schema-files.md for schemas.yml, rules/workflow-files.md for workflow definitions, plus rules/common-rules.md always. Skipping this produces files that violate the single source of truth for authoring + validation.
```

- [ ] **Step 2: Replace "Key Principles" + "File Structure Conventions" sections**

In `.agents/skills/designbook-skill-creator/SKILL.md`, delete the following existing sections (lines 51–62 in the current file):

- `## Key Principles` and its paragraph + bullet list
- `## File Structure Conventions` and its paragraph

Insert in their place:

```markdown
## Rule Files by Artifact Type

Load the matching rule file **before** creating or editing any file of that type.
`common-rules.md` loads on top in every case.

| Creating/editing | Load |
|---|---|
| `tasks/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/task-files.md](rules/task-files.md) |
| `blueprints/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/blueprint-files.md](rules/blueprint-files.md) |
| `rules/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/rule-files.md](rules/rule-files.md) |
| `schemas.yml` | [rules/common-rules.md](rules/common-rules.md) + [rules/schema-files.md](rules/schema-files.md) |
| `workflows/*.md` | [rules/common-rules.md](rules/common-rules.md) + [rules/workflow-files.md](rules/workflow-files.md) |

Each rule file contains narrative + correct/wrong examples (authoring guidance) and a
`## Checks` table (validation source of truth). The same files are loaded by the
validator runner — see [resources/validate.md](resources/validate.md).
```

- [ ] **Step 3: Verify**

Run:
```bash
grep -c '^## Rule Files by Artifact Type' .agents/skills/designbook-skill-creator/SKILL.md
```
Expected: `1`

Run:
```bash
grep -c 'rules/principles.md\|rules/structure.md' .agents/skills/designbook-skill-creator/SKILL.md
```
Expected: `0` (no dangling references to deleted files)

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-skill-creator/SKILL.md
git commit -m "skill-creator: point SKILL.md at per-file-type rule files"
```

---

## Task 9: Delete the legacy rule files

**Files:**
- Delete: `.agents/skills/designbook-skill-creator/rules/principles.md`
- Delete: `.agents/skills/designbook-skill-creator/rules/structure.md`
- Delete: `.agents/skills/designbook-skill-creator/rules/validate-params.md`

**Background.** All content is migrated. CLAUDE.md forbids backwards-compat shims; remove the files outright.

- [ ] **Step 1: Double-check no other skill or code file references these paths**

Run:
```bash
grep -rn 'rules/principles.md\|rules/structure.md\|rules/validate-params.md' --include='*.md' --include='*.ts' --include='*.yml' .agents packages docs 2>/dev/null
```
Expected: only matches in `docs/superpowers/specs/` and `docs/superpowers/plans/` (historical). If any live skill, addon source, or workflow definition references the old paths, stop and update those references first.

- [ ] **Step 2: Remove the three files**

Run:
```bash
rm .agents/skills/designbook-skill-creator/rules/principles.md
rm .agents/skills/designbook-skill-creator/rules/structure.md
rm .agents/skills/designbook-skill-creator/rules/validate-params.md
```

- [ ] **Step 3: Verify the rules/ directory has exactly the six new files**

Run:
```bash
ls -1 .agents/skills/designbook-skill-creator/rules/
```
Expected output (in any order):
```
blueprint-files.md
common-rules.md
rule-files.md
schema-files.md
task-files.md
workflow-files.md
```

- [ ] **Step 4: Commit**

```bash
git add -A .agents/skills/designbook-skill-creator/rules/
git commit -m "skill-creator: remove legacy principles.md, structure.md, validate-params.md"
```

---

## Task 10: Run the new validator on `designbook-skill-creator` itself

**Files:** (no file writes — diagnostic run)

**Background.** The refactor is complete. The acceptance test is that the rebuilt runner, loaded with the six new rule files, produces findings on the `designbook-skill-creator` skill itself that map cleanly to the old E/W IDs via the spec's migration table. Any new finding that doesn't map back, or any old finding that vanished, is a migration bug.

Because `validate.md` is prose for a human/LLM runner (not executable code), this task is performed as a guided walkthrough: load the runner + rule files, apply each rule file's checks to each skill file manually (or via a fresh subagent), and produce the findings table.

- [ ] **Step 1: Run the validator on this skill**

From a clean agent context:

```
Load .agents/skills/designbook-skill-creator/resources/validate.md.
Validate the skill at .agents/skills/designbook-skill-creator/.
```

Produce the findings report (Step 6 of the runner's Process section — the full output including Findings, Metrics, Schema Audit, Schema Graph, Summary).

- [ ] **Step 2: Cross-check findings against the migration table**

Using the migration table from `docs/superpowers/specs/2026-04-20-skill-creator-rules-refactor-design.md` ("Check-ID-Mapping (alt → neu)"), verify that every finding's new ID corresponds to an old `E0*`/`W0*` that would have fired on the same file. Flag any unmapped finding.

Expected mapping behavior:
- All surviving E01–W09 rules should still fire on the same lines/files, renumbered per the mapping table.
- `TASK-10` through `TASK-14` (from `validate-params.md`) should fire on the same lines/files they used to fire on.
- No finding should be absent because its check was dropped during migration.
- No finding should be present because a new check snuck in.

- [ ] **Step 3: If mismatches found, fix the offending rule file**

If a finding disappeared, the check's predicate was weakened during migration — tighten the `What to verify` text in the relevant rule file.

If a spurious finding appeared, the predicate was widened — narrow the text or add the missing exemption (e.g., "properties with `path:` or `$ref:` are exempt").

For each fix, re-run Step 1 until the findings are stable and map 1:1.

- [ ] **Step 4: Commit findings + any follow-up fixes**

If Step 3 required any file edits:

```bash
git add .agents/skills/designbook-skill-creator/rules/
git commit -m "skill-creator: reconcile refactored checks with pre-migration findings"
```

If Step 2 passed cleanly with no fixes: no additional commit — the refactor is complete.

- [ ] **Step 5: Run the validator on the other five skills as a smoke-check**

Repeat Step 1 for each of: `designbook`, `designbook-drupal`, `designbook-css-tailwind`, `designbook-stitch`, `designbook-devtools`. Report findings. For each skill, apply Steps 2–3 if mismatches appear.

Commit any additional predicate fixes under the same message as Step 4 (or as a follow-up commit).

---

## Self-review

**Spec coverage** — every section in `docs/superpowers/specs/2026-04-20-skill-creator-rules-refactor-design.md` has a task:
- "Ziel-Architektur / Verzeichnisstruktur" → Tasks 1–6 create the six files, Task 9 deletes the three old ones.
- "Rule-Datei-Format" and "`## Checks` — Format-Kontrakt" → the fixed column order appears in every Checks table in Tasks 1–6.
- "`applies-to` als Dispatch-Schlüssel" → each Task 1–6 includes `applies-to` globs matching the spec's table; Task 7's runner step 3 describes dispatch.
- "Check-IDs — Konvention und Eindeutigkeit" → Checks tables in Tasks 1–6 use globally unique IDs; COMMON-* lives only in Task 1 (`common-rules.md`); the same IDs appear nowhere else.
- "Identisches Prädikat über Typ-Dateien" → comments above `TASK-09` in Task 2 and `SCHEMA-02` in Task 5 state the invariant; the Wartung section in Task 7's `validate.md` re-states it.
- "Runner-eigene Konzepte" → Task 7 keeps Metrics (Step 4), Schema Audit (Step 4b), Scores (Step 5), Output Format (Step 6), Schema-Graph (inside Step 6), Abgrenzung (final table).
- "Content-Migration" (principles.md + structure.md + validate-params.md tables) → every listed section is pulled in by name + line range inside Tasks 1–6.
- "Workflow-qualified tasks" → Task 2 includes the dedicated `### Workflow-qualified tasks` subsection with the filename-scoped check.
- "`SKILL.md` Anpassung" → Task 8 replaces Key Principles + File Structure Conventions with the "Rule Files by Artifact Type" table and updates the `description:` frontmatter.
- "Erfolgs-Kriterien" 1–7 → Tasks 9 (1), 7 (2), 10 (3), covered implicitly in Tasks 1–6 (4, 5, 6), 8 (7).

**Placeholder scan** — no TBD/TODO, no "implement later", no "similar to Task N". Each section to copy is named by heading + line range in the current source file; each new Checks row is written out. The only prose placeholders are `[Copy verbatim from current rules/... section ...]` — these are **intentional** migration instructions, each with a concrete source file and line range.

**Type consistency** — check IDs used in Tasks 1–6 match the spec's migration table exactly (TASK-01..14, BLUEPRINT-01..02, SCHEMA-01..04, WORKFLOW-01, COMMON-01..02). File-name references (`task-files.md`, `blueprint-files.md`, `rule-files.md`, `schema-files.md`, `workflow-files.md`, `common-rules.md`) are identical across all tasks.

---

## Execution notes

- Tasks 1–6 can run in parallel. Tasks 7 and 8 depend on 1–6 (the SKILL.md table and validate.md Referenzen section link to the new files). Task 9 depends on 7 + 8 (the old files are referenced nowhere after Task 8 lands). Task 10 depends on all of the above.
- Commits are one-per-task; use the given commit messages verbatim so `git log` reads cleanly.
- Content copies are line-range-anchored to today's source files. Do not refactor the narrative text during the migration — that would mask regressions in Task 10. Refactoring passes happen as separate commits after the refactor lands and Task 10 confirms parity.
