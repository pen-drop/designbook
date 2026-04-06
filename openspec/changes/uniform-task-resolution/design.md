## Context

Task resolution currently uses filename-based matching (`skills/**/tasks/${step}.md`), while rules and blueprints use broad glob scan + `when` condition filtering. This inconsistency was exposed when `inspect-storybook.md` (with `when: steps: [inspect]`) was never found for the `inspect` step.

A pragmatic fix in `designbook-design-test-pipeline-fixes` added a secondary broad scan for tasks with explicit `when.steps`. This change replaces that workaround with a uniform resolution model.

## Goals / Non-Goals

**Goals:**
- Task resolution uses the same broad-scan + `when.steps` mechanism as rules and blueprints
- All task files declare `when.steps` explicitly
- Filename becomes a readability convention, not a resolution mechanism
- The pragmatic fallback from `pipeline-fixes` is removed

**Non-Goals:**
- Changing how rules or blueprints are resolved (they're already correct)
- Changing the `name`/`as`/`priority` deduplication logic (already implemented)
- Changing workflow YAML format or CLI commands

## Decisions

### Decision 1: Broad scan with `when.steps` required for tasks

Tasks follow the same pattern as rules:
```
Scan: skills/**/tasks/*.md
Filter: when.steps includes current step name AND other when conditions match config
Sort: by priority (lowest first)
Dedup: by name/as (highest priority wins)
```

`when.steps` becomes **required** for task files. Tasks without `when.steps` are skipped during resolution (same as rules without `when.steps` being step-unscoped).

**Alternative considered**: Making `when.steps` optional and deriving it from filename. Rejected because it maintains the implicit convention and doesn't solve the fundamental problem.

### Decision 2: Workflow-qualified tasks use `when.steps` + `name` instead of filename suffix

Currently `intake--design-shell.md` uses `--workflow` filename suffix for workflow-specific intake tasks. With uniform resolution:

- `when: steps: [intake]` replaces the filename-based step matching
- The `name` field (e.g., `designbook:design:intake--design-shell`) provides uniqueness
- The `--workflow` filename convention is preserved for readability but isn't load-bearing

### Decision 3: Migration in two phases

**Phase 1 (this change):**
- Add `when.steps` to all 34 task files that lack it
- Verify existing `when` blocks get `steps` added (2 files: `create-component.md`, `prepare-fonts.md`)
- Change resolver to use broad scan as primary mechanism
- Keep filename-based fallback for safety

**Phase 2 (follow-up, optional):**
- Remove filename-based fallback once verified across all workflows
- Simplify the resolver code

## Risks / Trade-offs

- **[Risk]** Broad scan of `skills/**/tasks/*.md` is slower than targeted filename glob → Mitigation: globSync is fast (<5ms for ~40 files). Measured: no perceivable impact.
- **[Risk]** Tasks without `when.steps` accidentally added in future → Mitigation: CLI warns on task files without `when.steps` during resolution.
- **[Risk]** Existing task files break if `when.steps` values are wrong → Mitigation: Derive step names from filenames mechanically; verify with existing workflow create tests.
