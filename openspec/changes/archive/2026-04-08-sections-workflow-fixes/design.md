## Context

The `sections` workflow is one of the simpler designbook workflows — it runs intake → create-section. Unlike `design-shell` or `design-screen`, the execute stage was defined without `each`, making it a singleton. But the intake produces multiple sections that each need their own `create-section` task.

The CLI's `workflow plan` command expands iterables based on `each: <name>` declarations in the workflow frontmatter. Without `each`, it expects flat params for a single task.

## Goals / Non-Goals

**Goals:**
- Sections workflow creates N sections in one run (matching design-shell/design-screen pattern)
- Intake task documents the correct CLI params format
- YAML template values are safely quoted
- Intake task lifecycle is clearly defined

**Non-Goals:**
- Changing the CLI's plan expansion logic
- Modifying other workflows
- Adding new CLI features

## Decisions

### 1. Add `each: section` to execute stage

```yaml
stages:
  intake:
    steps: [intake]
  execute:
    each: section
    steps: [create-section]
```

This follows the established pattern from `design-shell` (`each: component`, `each: scene`) and `css-generate` (`each: group`). The CLI already supports this — no code changes needed.

**Alternative:** Keep singleton and run N workflow instances. Rejected — breaks the one-workflow-per-user-action model.

### 2. Update intake params format to match CLI

The intake task currently documents an `--items` format that doesn't exist. Update to the standard `--params` format:

```json
{"section": [
  {"section_id": "getting-started", "section_title": "Getting Started", "description": "...", "order": 1},
  {"section_id": "workflows", "section_title": "Workflows", "description": "...", "order": 2}
]}
```

Key: `"section"` matches the `each: section` declaration.

### 3. Quote YAML template values

Add double quotes to template values that may contain colons, umlauts, or other YAML-special characters:

```yaml
title: "{{ section_title }}"
group: "Designbook/Sections/{{ section_title }}"
description: "{{ description }}"
```

### 4. Auto-complete intake tasks in CLI

`workflow plan` SHALL automatically mark all intake-stage tasks as `done` after successful expansion. Intake tasks are data-gathering steps completed during conversation — they never produce files that need validation.

**Alternative:** Manual marking by the agent. Rejected — adds unnecessary friction and is easy to forget (as observed in the research pass).

## Risks / Trade-offs

- **[Low]** Existing archived sections workflows used the singleton pattern → no migration needed, archived workflows are immutable
- **[Low]** The `section` key in params must exactly match `each: section` → enforced by CLI validation
