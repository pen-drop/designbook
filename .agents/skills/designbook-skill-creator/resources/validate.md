---
name: validate
description: Static analysis runner — discovers rule files via applies-to globs and applies their `## Checks` tables to every skill file. No checks are defined here.
---

# Skill Validator — Runner

## What It Does

Static analysis of all task, rule, blueprint, schema, and workflow files in a skill directory. For each file, the runner loads every rule file from `.agents/skills/designbook-skill-creator/rules/` whose `applies-to` glob matches, extracts its `## Checks` table, and applies every row. Outputs a structured report with findings, metrics, and scores.

Pendant to `research.md` (runtime audit), but purely static — no workflow execution needed.

## Invocation

When asked to validate a skill:

```
Validate skill <skill-name>
Validate all skills
```

## Process

### Step 1 — Discover files

Scan the skill directory for all `.md` files in `tasks/`, `rules/`, `blueprints/`, and `workflows/`; plus any `schemas.yml`; plus `SKILL.md`. For the core skill (`designbook/`), scan all `skills/<workflow>/tasks/`, `skills/<workflow>/rules/`, `skills/<workflow>/workflows/`, the shared `design/` and `scenes/` content roots (beside `skills/`), and integration-skill `blueprints/` directories.

**Always-loaded repo-root files.** For a "validate all skills" run (or when validating the writing
layer), also scan the repo-root `CLAUDE.md`. `AGENTS.md` is a symlink to the same inode — dedupe on
inode and treat `CLAUDE.md` as canonical, so the always-loaded file is scanned once. The
`writing-files.md` rule carries `applies-to: CLAUDE.md`, so its `WRITE-` checks and the
always-loaded metric reach the file.

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

**Writing-layer metrics (report-only — no deduction in Step 5).** These surface the always-loaded
cost and sprawl signals of [writing-files.md](../rules/writing-files.md); they are reported, never
scored, so soft signals do not swamp the existing scores.

| Metric | Applies to | Description |
|---|---|---|
| `always_loaded_cost` | `CLAUDE.md` and every model-invocable `SKILL.md` `description:` | description word-count + `body_lines` — the permanent per-turn context load |
| `body_sprawl` | any body | advisory flag when `body_lines` exceeds a soft per-type reference (no hard cap) |

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

`WRITE-01 .. WRITE-04` findings are all `warning`, so they weigh through the existing mapping
(−10) with no new weight and no change to the contract. The Step-4 writing-layer metrics
(`always_loaded_cost`, `body_sprawl`) are **report-only** and never deduct.

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

## References — Rule Files

All checks live in these rule files. Any change to a check — adding, removing, tightening,
rephrasing — happens in the rule file, not here.

- Task rules: [../rules/task-files.md](../rules/task-files.md) — `TASK-01` .. `TASK-14`
- Blueprint rules: [../rules/blueprint-files.md](../rules/blueprint-files.md) — `BLUEPRINT-01` .. `BLUEPRINT-03`
- Rule rules: [../rules/rule-files.md](../rules/rule-files.md) — `RULE-01`
- Schema rules: [../rules/schema-files.md](../rules/schema-files.md) — `SCHEMA-01` .. `SCHEMA-04`
- Workflow rules: [../rules/workflow-files.md](../rules/workflow-files.md) — `WORKFLOW-01`
- Common rules: [../rules/common-rules.md](../rules/common-rules.md) — `COMMON-01`, `COMMON-02`
- Writing-layer rules: [../rules/writing-files.md](../rules/writing-files.md) — `WRITE-01` .. `WRITE-04`

## Maintenance

Some checks share a predicate across two rule files because their authoring context differs.
Currently:

- `TASK-09` (task params/result teaching signals) and `SCHEMA-02` (schemas.yml teaching signals)
  share the "at least one of `description`, `enum`, `pattern`, `examples`" predicate.

When the predicate definition changes (e.g., adding `const:` as a valid teaching signal),
update **both** checks in the same commit.

## Boundary vs research.md

| | validate.md | research.md |
|---|---|---|
| When | Anytime, no workflow | After workflow execution |
| Input | Scan skill directory | `workflows/archive/*/tasks.yml` |
| Checks | File structure, frontmatter, body redundancy, principles | Type correctness, domain, loading, duplication, coherence |
| Focus | Are files correctly built? | Did the workflow load the right files? |
| Output | Findings + metrics + score | Audit table + Superpowers fix workflow |
