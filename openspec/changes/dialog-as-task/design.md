## Context

Workflow execution has two classes of stages: the special `dialog` phase (Rule 2, pre-plan bootstrap) and regular task stages (Rule 5). This asymmetry means dialog skips `reads:` enforcement, has unreliable rule loading, and cannot be extended by skills without explicit registration. The name `dialog` also conflicts with the UI term for modal windows.

## Goals / Non-Goals

**Goals:**
- Uniform stage processing: intake is a normal task, Rule 5 applies to all stages
- Hard `reads:` enforcement before the intake stage (Rule 5a)
- Skills hook into intake via `intake.md` task files without explicit registration
- `workflow validate` with `files: []` exits 0 automatically
- Rename `dialog` → `intake` consistently across all skills, workflows, and config

**Non-Goals:**
- Changing what happens during intake (conversation with user, gathering params)
- Changing the `workflow plan` timing (still called after intake completes)
- Adding CLI changes (covered by separate `workflow-rules-command` change if needed later)

## Decisions

### Rename `dialog` → `intake`
`intake` is unambiguous in English and German, has no conflict with UI terminology, and clearly describes the phase: collecting input before work begins.

All occurrences updated: `stages:` arrays, `when.stages` in rule files, config keys (`debo-*:dialog` → `debo-*:intake`), and new task files named `intake.md`.

### `files: []` makes validate a no-op
`workflow validate` checks each declared file. With an empty array there is nothing to check → exits 0 automatically. No special-casing needed in the CLI.

### `workflow done` called after intake completes
Intake is tracked like any other task. The AI calls `workflow done` with an empty `validation[]` array after the user has confirmed their answers and before `workflow plan` is called.

### Rule 2 eliminated entirely
Rule 5a (reads check) and Rule 5b (stage execution + rule loading) cover everything Rule 2 provided. Removing Rule 2 simplifies `workflow-execution.md` and removes the special-casing entirely.

### Skills provide `intake.md` to enforce reads and load rules
Skills that require files to exist before intake (e.g. `guidelines.yml`, `vision.md`) declare them in `intake.md`'s `reads:` frontmatter. The AI checks these via Rule 5a before asking the user anything.

## Risks / Trade-offs

- [Risk] Existing workflows referencing `dialog` stage break → Mitigation: rename is a find-replace across known files, low risk
- [Risk] Config keys (`debo-*:dialog`) in user projects not updated → Mitigation: document in change notes; keys are user-visible in `designbook.config.yml`
- [Risk] `workflow done` for intake with empty loaded JSON looks odd → Mitigation: `validation: []` is already valid per the CLI spec
