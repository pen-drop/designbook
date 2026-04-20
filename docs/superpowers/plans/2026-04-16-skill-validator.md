# Skill Validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static analysis resource `validate.md` to the designbook-skill-creator that checks skill files against principles.md and structure.md rules.

**Architecture:** A single resource markdown file that describes a systematic validation process. The agent reads skill files, applies the rules, and outputs a structured report with findings, metrics, and scores. No code — purely skill-level.

**Tech Stack:** Markdown resource in designbook-skill-creator skill

**Spec:** `docs/superpowers/specs/2026-04-16-skill-validator-design.md`

**IMPORTANT:** Before modifying any file under `.agents/skills/`, load the `designbook-skill-creator` skill per CLAUDE.md.

---

## File Structure

- **Create:** `.agents/skills/designbook-skill-creator/resources/validate.md` — the validation resource
- **Modify:** `.agents/skills/designbook-skill-creator/SKILL.md` — add reference to the new resource

---

### Task 1: Create the validate.md resource

**Files:**
- Create: `.agents/skills/designbook-skill-creator/resources/validate.md`

- [ ] **Step 1: Load the designbook-skill-creator skill**

Per CLAUDE.md, required before modifying any file under `.agents/skills/`.

- [ ] **Step 2: Create the resource file**

Create `.agents/skills/designbook-skill-creator/resources/validate.md` with this content:

```markdown
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

#### Warnings (principle deviations)

| ID | Rule | Source | Check |
|---|---|---|---|
| `W01` | Body repeats result schema | principles.md (Results in Schema, Not in Body) | `## Result:` section present + schema is self-explanatory (simple type without semantic ambiguity) |
| `W02` | Task contains HOW not WHAT | principles.md (Tasks Say WHAT) | Body contains implementation details: CSS classes, Twig code, framework-specific syntax, style instructions |
| `W03` | Site-specific content in core skill | principles.md (Site-Agnostic) | Hardcoded brand names, URLs, project-specific references in `designbook/` |
| `W04` | Cross-layer duplicate | research.md (3d) | Task body repeats what a loaded rule already enforces |
| `W05` | Validation steps in body | principles.md (Validation Is Automatic) | Body describes manual validation that the engine handles automatically |
| `W06` | Workflow prefix in workflow definition | principles.md (Workflow Steps Are Plain Names) | `stages.*.steps` contains qualified names |

### Step 4 — Compute metrics

For each file:

| Metric | Description |
|---|---|
| `lines` | Total lines |
| `frontmatter_lines` | Lines in YAML frontmatter |
| `body_lines` | Lines in markdown body |
| `body_ratio` | body_lines / lines (0.0–1.0) |

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

### Summary

| Metric | Value |
|---|---|
| Total files | 12 |
| Errors | 0 |
| Warnings | 3 |
| Avg body ratio | 0.72 |
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
```

- [ ] **Step 3: Verify the resource is well-formed**

```bash
# Check frontmatter parses
head -5 .agents/skills/designbook-skill-creator/resources/validate.md

# Verify all error/warning IDs are present
grep -E "^\| \`[EW][0-9]" .agents/skills/designbook-skill-creator/resources/validate.md
```

Expected: frontmatter with name/description, 6 error rules (E01–E06), 6 warning rules (W01–W06).

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-skill-creator/resources/validate.md
git commit -m "feat(skill-creator): add validate.md resource for static skill analysis"
```

---

### Task 2: Update SKILL.md to reference validate.md

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/SKILL.md:74-77`

- [ ] **Step 1: Add the Validation section**

After the existing "Research Flag" section (line 74-76), add:

```markdown

## Skill Validation

See [`resources/validate.md`](resources/validate.md) for static analysis of skill files (principles compliance, metrics, scoring).
```

- [ ] **Step 2: Verify the link resolves**

```bash
ls .agents/skills/designbook-skill-creator/resources/validate.md
```

Expected: file exists.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-skill-creator/SKILL.md
git commit -m "docs(skill-creator): add validate.md reference to SKILL.md"
```

---

### Task 3: Validate a skill to verify the resource works

**Files:**
- (no file changes — verification only)

- [ ] **Step 1: Run the validator against designbook-drupal**

Read `resources/validate.md`, then apply its process to `.agents/skills/designbook-drupal/`:

1. Discover all files in `tasks/`, `rules/`, `blueprints/`
2. Parse frontmatter + body for each
3. Apply E01–E06 and W01–W06 checks
4. Compute metrics (lines, body_lines, body_ratio)
5. Compute scores
6. Output the report tables

- [ ] **Step 2: Review the report**

Check the report makes sense:
- Are findings accurate? (no false positives)
- Do metrics reflect actual file sizes?
- Is the score plausible?

- [ ] **Step 3: Document any needed adjustments**

If the first run reveals rules that need refinement (too many false positives, unclear checks), note them for a follow-up commit to `validate.md`.
