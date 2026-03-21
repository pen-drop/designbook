## Context

Skill files in `.agents/skills/` follow a directory convention defined in `designbook-addon-skills/SKILL.md`. The convention separates:
- `SKILL.md` — index + reference only (no execution instructions)
- `tasks/<stage>.md` — what to create, how, for a given workflow stage
- `rules/<name>.md` — conditional constraints
- `resources/<topic>.md` — reference documentation

Several skills predate this convention and still embed execution logic in SKILL.md.

## Goals / Non-Goals

**Goals:**
- SKILL.md files contain only: frontmatter, brief overview, task/rule links, and reference material
- Execution content (step-by-step procedures, "load X skill" instructions, procedural command sequences) lives in task files
- No behavior change — content moves, not changes

**Non-Goals:**
- Not changing what any skill does
- Not adding new task files for stages that don't exist
- Not changing rule file structure

## Decisions

**Move vs. Duplicate**: Content moves entirely out of SKILL.md into task/resource files. No duplication. If the content already exists in the task file, the SKILL.md version is simply removed.

**Inline validation rules**: Move to task file body (not a new rules/ file), since they're execution guidance for the creating agent, not conditional constraints.

**Resource file granularity**: One resource file per concern. For view-modes: `jsonata-patterns.md` + `field-mapping.md`. For scenes: `scene-reference.md`. For daisyui: `daisyui-tokens.md`.

**Steps/ directories**: The old `steps/` directories in some skills are pre-task-file legacy. Leave them in place — they're referenced by old SKILL.md content that's being removed, but they may still be valid reference material.

## Risks / Trade-offs

- [Content loss risk] If task files already have the content, SKILL.md removal is safe. For view-modes and scenes where task files are incomplete, content must be moved not deleted.
- [Discovery risk] The AI discovers task files by stage name. No change needed there — we're only reorganizing content within existing files/adding resources.
