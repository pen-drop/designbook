---
name: validate
description: Static analysis of skill files — checks tasks, rules, and blueprints against principles and structure conventions
---

# Skill Validator

## What It Does

Static analysis of all task, rule, and blueprint files in a skill directory. Checks each file against the rules in `principles.md` and `structure.md`. Outputs a structured report with findings, metrics, and scores.

Pendant to `research.md` (runtime audit), but purely static — no workflow execution needed.

## Aufruf

When asked to validate a skill:

```
Validate skill <skill-name>
Validate all skills
```

## Process

### Step 1 — Discover files

Scan the skill directory for all `.md` files in `tasks/`, `rules/`, and `blueprints/`. For the core skill (`designbook/`), scan all `<concern>/tasks/`, `<concern>/rules/`, and integration skill `blueprints/` directories.

Also locate `schemas.yml` for `$ref` resolution.

### Step 2 — Classify each file

Determine file type from directory:

| Directory | Type |
|---|---|
| `tasks/` | task |
| `rules/` | rule |
| `blueprints/` | blueprint |

### Step 3 — Check each file

For every file, parse YAML frontmatter and markdown body. Apply all applicable rules.

#### Errors (rule violations)

| ID | Rule | Source | Check |
|---|---|---|---|
| `E01` | Frontmatter missing/invalid | structure.md | YAML frontmatter must be parseable |
| `E02` | Required fields missing | structure.md | Tasks need `when`; tasks with outputs need `result:` |
| `E03` | `$ref` points to nothing | principles.md (Results Declare Schema) | Every `$ref` must resolve to a key in `schemas.yml` |
| `E04` | `when.steps` references unknown step | structure.md (Naming Rule) | Step name must exist in a workflow file |
| `E05` | `stage:` in frontmatter | principles.md (Stage = Filename) | Redundant field, must not exist |
| `E06` | `constrains:` in blueprint | structure.md (Schema Extension) | Only rules may use `constrains:` |
| `E07` | Inline schema duplicates `schemas.yml` type | principles.md (Results Declare Schema) | A `result:` property with `type: object` (or array of objects) defines its shape inline while a matching type exists in the concern's `schemas.yml` — must use `$ref` instead |

#### Warnings (principle deviations)

| ID | Rule | Source | Check |
|---|---|---|---|
| `W01` | Body repeats result schema | principles.md (Results in Schema, Not in Body) | `## Result:` section present + schema is self-explanatory (simple type without semantic ambiguity) |
| `W02` | Task contains HOW not WHAT | principles.md (Tasks Say WHAT) | Body contains implementation details: CSS classes, Twig code, framework-specific syntax, style instructions |
| `W03` | Site-specific content in core skill | principles.md (Site-Agnostic) | Hardcoded brand names, URLs, project-specific references in `designbook/` |
| `W04` | Cross-layer duplicate | research.md (3d) | Task body repeats what a loaded rule already enforces |
| `W05` | Validation steps in body | principles.md (Validation Is Automatic) | Body describes manual validation that the engine handles automatically |
| `W06` | Workflow prefix in workflow definition | principles.md (Workflow Steps Are Plain Names) | `stages.*.steps` contains qualified names |
| `W07` | Property lacks teaching signals | principles.md (Schemas Must Teach the AI) | Property in `params:`, `result:`, or `schemas.yml` of `type: string`/`number`/`object` without `description`, `enum`, `pattern`, or `examples`. **Skip** properties with `path:` (file references) and `$ref:` (delegates teaching to ref target) |
| `W08` | Type missing title/description | principles.md (Schemas Must Teach the AI) | Top-level type in `schemas.yml` lacks both `title:` and `description:` |
| `W09` | `additionalProperties: true` undocumented | principles.md (Schemas Must Teach the AI) | Schema allows arbitrary keys without explaining what belongs there |

**Scope of W07–W09:** schema teaching checks run over `params:` and `result:` blocks of tasks plus all definitions in `schemas.yml`. Properties carrying a `path:` field (file inputs/outputs) are excluded — they are file references, not content schemas. Properties using `$ref:` are also excluded; the ref target is checked separately.

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

**Exclusions:** properties with `path:` are file references and bypass W07–W09 entirely. Properties with `$ref:` count toward `refs_out` only; their teaching is the responsibility of the ref target.

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
| tasks/create-component.md | task | W02 | warning | Body contains Twig code (line 45-60) |

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

## Abgrenzung zu research.md

| | validate.md | research.md |
|---|---|---|
| When | Anytime, no workflow | After workflow execution |
| Input | Scan skill directory | `workflows/archive/*/tasks.yml` |
| Checks | File structure, frontmatter, body redundancy, principles | Type correctness, domain, loading, duplication, coherence |
| Focus | Are files correctly built? | Did the workflow load the right files? |
| Output | Findings + metrics + score | Audit table + Superpowers fix workflow |
