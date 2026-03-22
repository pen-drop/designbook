## Context

Skill files in `.agent/skills/` are instruction documents for AI agents. The `designbook-figma-twig-sdc` skill establishes a pattern where each discrete operation is a `steps/<name>.md` file, and `SKILL.md` only orchestrates them. The `designbook-data-model` skill partially follows this (has `steps/process-data-model.md`) but still inlines its validation as a `## Validation` section.

## Goals / Non-Goals

**Goals:**
- Move validation CLI command + description into `steps/validate.md`
- Make validation referenceable as `@designbook-data-model/steps/validate.md`
- Keep SKILL.md as a pure index/orchestrator

**Non-Goals:**
- Changing any runtime code
- Modifying the CLI command itself
- Extracting validation from other skills

## Decisions

**Step file content**: `steps/validate.md` will contain the CLI command, expected output format, and error-handling guidance — mirroring the depth of other step files like `validate-twig.md`.

**SKILL.md change**: Remove `## Validation` section entirely; add `validate` to the `## Steps` list. The workflow tracking section already references `@designbook-workflow/SKILL.md` and stays unchanged.

## Risks / Trade-offs

- Existing workflows that copy-paste from SKILL.md inline won't break — they simply continue working; only new references benefit from the step file.
