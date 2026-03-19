## Context

Designbook workflows load rules and task instructions from skill files at `.agents/skills/*/rules/*.md` and `.agents/skills/*/tasks/*.md`. These are framework-level defaults — they ship with skills and apply to all projects.

There is currently no mechanism to add project-specific or client-specific rules/tasks without creating skill files. The `designbook.config.yml` already serves as the project configuration point; extending it is the natural fit.

## Goals / Non-Goals

**Goals:**
- Allow per-stage rule strings in `designbook.config.yml` (`workflow.rules`)
- Allow per-stage task instruction strings in `designbook.config.yml` (`workflow.tasks`)
- Config rules/tasks are additive — they never replace skill-level content
- Loaded by the AI via the same mechanism as skill rules (Rule 4) and task files (Rule 2)

**Non-Goals:**
- Config rules cannot override or disable skill rules
- No structured task entries (files, params) — strings only
- No new CLI commands or runtime changes
- No `when` conditions on config rules (the project config already defines the framework context)

## Decisions

### Stage-name as key

Config rules/tasks use the stage name directly as the YAML key. This mirrors the `when.stages` frontmatter in skill rule files — no duplication needed.

```yaml
workflow:
  rules:
    create-component:
      - "..."
    debo-design-component:dialog:
      - "..."  # workflow-scoped dialog stage
```

**Alternatives considered**: A list of objects with `stage:` + `rules:` fields — more verbose, no benefit for simple strings.

### Additive-only, no conditions

Config rules apply purely by stage match. No `when.frameworks.*` conditions — the project already defines its framework in the same config file. This keeps the format minimal.

### AI loads config rules in Rule 4 and Rule 2

No new CLI command. The AI reads `designbook.config.yml` (already loaded at workflow start) and extracts `workflow.rules.<stage>` and `workflow.tasks.<stage>`. These are appended silently to the constraints/instructions for that stage.

## Risks / Trade-offs

- [Risk] Config rules are invisible in skill files → Mitigation: they live in the project's own config, which is the expected place for project customizations
- [Risk] String-only tasks can't declare files for `workflow plan` → Mitigation: by design — config tasks are instructions/hints, not structured task entries; file declarations remain in skill task files
