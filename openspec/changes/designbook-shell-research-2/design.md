## Context

Post-workflow `--research` audit of `design-shell` revealed three skill file coherence issues. All are in `.agents/skills/` markdown files — no TypeScript or CLI changes needed.

## Goals / Non-Goals

**Goals:**
- Polish task respects loaded rules (no contradictory fixes)
- inspect-stitch declares its session dependency explicitly
- scenes-constraints.md contains only hard constraints, not duplicated task instructions

**Non-Goals:**
- Changing the workflow stage order or adding new stages
- Modifying CLI behavior (already fixed in uniform-task-resolution)
- Refactoring the inspect/screenshot pipeline architecture

## Decisions

1. **polish.md gets a rule-compliance guard**: Add a step that checks proposed fixes against loaded rules before applying. Specifically: if a fix adds max-width/padding to a component, it must use container wrapping instead.

2. **inspect-stitch.md adds `requires` frontmatter**: New `requires: [inspect]` key in frontmatter signals that this task needs a Playwright session from the inspect-storybook task. This is documentation-only — the CLI doesn't enforce it, but agents and humans can discover the dependency.

3. **scenes-constraints.md gets trimmed**: Remove the example-heavy instructional sections (provider-prefix examples, inline-all examples) that duplicate create-scene task content. Keep only the constraint declarations (the "must" and "must not" rules).

## Risks / Trade-offs

- Trimming scenes-constraints.md could reduce redundant reinforcement that helps AI agents follow rules. Mitigated by keeping the constraint declarations — only removing the duplicated examples.
- The `requires` key on inspect-stitch is advisory only. Enforcement would require CLI changes (out of scope).
