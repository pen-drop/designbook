---
name: structure
description: File structure conventions for Designbook skill directories
---

# Skill Directory Structure Conventions

## Integration Skills (Part 3)

Use a flat structure:

```
.agents/skills/[skill-name]/
├── SKILL.md              # Index only (required); no implementation detail
├── tasks/                # One file per stage; filename = stage name
│   └── [stage-name].md
├── rules/                # Constraints loaded when `when` conditions match
│   └── [rule-name].md    # frontmatter: when: { backend: drupal }
├── blueprints/           # Overridable starting points for creation stages
│   └── [name].md         # frontmatter: when: { steps: [create-component] }
├── resources/            # Reference docs, split by concern
│   └── [topic].md
└── *.schema.json         # JSON Schemas bundled in skill dir (not downloaded)
```

## Core Skill (Part 1 — `designbook`)

Uses a three-level concern-based structure:

```
.agents/skills/designbook/
├── SKILL.md
├── resources/            # Execution engine docs
└── <concern>/
    ├── tasks/            # Shared tasks + workflow-specific (intake--<id>.md)
    ├── rules/            # Concern-level rules
    ├── resources/        # Concern-level reference docs
    └── workflows/        # Workflow definitions (<workflow-id>.md)
```

## `tasks/` — Naming Rule

**Filename = stage name.** `tasks/create-component.md` applies to stage `create-component`. The AI discovers tasks by scanning all skill directories for `tasks/<stage>.md`. No explicit stage declaration in frontmatter.

## `rules/` — When Conditions

Rules require an explicit `when:` block. Without `when.steps`, the rule applies to all steps.

```markdown
---
when:
  backend: drupal          # config condition
  steps: [create-component]  # stage filter (optional)
---
```

## `blueprints/` — When Conditions

Same `when` matching as rules. Use `when.steps` to scope to a specific creation stage.

```markdown
---
when:
  steps: [create-component]
---
```

## `SKILL.md` — Index Only

`SKILL.md` is a navigation index. It lists what the skill contains and links to sub-files. It does NOT contain implementation detail, task instructions, or inline rules.

Required frontmatter:

```yaml
---
name: <skill-name>
user-invocable: false        # true only for skills invoked directly by users
description: <one-liner>
---
```

## Naming Conventions

| Scope | Convention | Example |
|-------|-----------|---------|
| Integration skills | `designbook-[backend]-[framework]` or `designbook-[concern]` | `designbook-drupal`, `designbook-css-tailwind` |
| CSS skills | `designbook-css-[framework]` | `designbook-css-tailwind` |
| Addon skills | `designbook-addon-[concern]` | `designbook-addon-skills` |
| Workflow files | `<concern>/workflows/<workflow-id>.md` inside `designbook/` | `design/workflows/design-screen.md` |

Concern-first, framework-last.
