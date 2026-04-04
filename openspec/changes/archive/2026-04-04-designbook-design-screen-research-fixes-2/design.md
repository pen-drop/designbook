## Context

The `--research` audit of the `design-screen` workflow identified 13 skill file issues across 3 categories: errors (wrong CLI commands, self-contradicting examples), type boundary violations (constraints in blueprints, procedures in rules), and cosmetic issues (duplicate when entries, misleading titles).

All changes are to `.agents/skills/` markdown files — no TypeScript or runtime code is affected.

## Goals / Non-Goals

**Goals:**
- Every skill file respects its type boundary (task=WHAT, rule=constraint, blueprint=overridable)
- CLI commands in tasks use correct prefixes
- Examples in rules/blueprints use real component names, not fictional ones
- No duplicate `when:` entries

**Non-Goals:**
- Changing workflow behavior or stage ordering
- Adding new tasks, rules, or blueprints
- Refactoring skill directory structure

## Decisions

### 1. Constraints extracted from blueprints become standalone rules

Extract the hard constraints from `grid.md` and `container.md` blueprints into new rule files in the same skill directory (`designbook-drupal/components/rules/`). The blueprints keep their overridable guidance but lose the "RULE:" / "NEVER" language.

### 2. DevTools rule stays as rule but loses procedural code

The `devtools-context.md` rule defines WHEN to collect DevTools data — that's a valid constraint. But the full JavaScript code blocks are implementation detail. Move the JS snippets to a reference section or simplify to pseudocode, keeping the rule focused on the constraint: "collect computed styles alongside screenshots."

### 3. Canvas examples use placeholder component names from the actual namespace

Replace `canvas_section`, `canvas_card` with `COMPONENT_NAMESPACE:section`, `COMPONENT_NAMESPACE:hero` — using the namespace variable to stay integration-agnostic while being realistic.

## Risks / Trade-offs

- **[Risk] Extracting constraints from blueprints creates more files** → Acceptable trade-off for correct type boundaries. Two small rule files are better than hidden constraints in blueprints.
