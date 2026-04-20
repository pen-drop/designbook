---
name: common-rules
description: Cross-cutting authoring + validation rules that apply to every skill artifact (task, blueprint, rule, schema, workflow). Load alongside the matching file-type rule file.
applies-to:
  - tasks/*.md
  - "**/tasks/*.md"
  - blueprints/*.md
  - "**/blueprints/*.md"
  - rules/*.md
  - "**/rules/*.md"
  - schemas.yml
  - "**/schemas.yml"
  - workflows/*.md
  - "**/workflows/*.md"
  - SKILL.md
  - "**/SKILL.md"
---

# Common Skill-Authoring Rules

These rules apply to every file under `.agents/skills/`. File-type-specific rules
live in `task-files.md`, `blueprint-files.md`, `rule-files.md`, `schema-files.md`,
and `workflow-files.md`.

## Skills Are Site-Agnostic

Tasks, rules, and blueprints must **never reference a specific site, brand, or project**. They describe generic patterns and constraints — the concrete appearance, colors, fonts, section names, and slot inventories always come from analyzing the design reference at runtime.

**Wrong** (site-specific slots in a blueprint):
```markdown
## Slots
- newsletter — newsletter signup section
- social — social media links
- logos — partner logos
```

**Correct** (generic):
```markdown
## Slots
- navigation — footer navigation component (required)
- Additional slots as determined by the design reference
```

**Wrong** (site-specific examples in a rule):
```markdown
Extract the BIBB brand bar above the navigation.
```

**Correct** (generic):
```markdown
For each direct child of a landmark, extract: backgroundColor, height, padding, and a content summary.
```

Blueprints describe **structural patterns** (multi-row headers, multi-section footers, container usage for background sections). Rules describe **technical constraints** (embed behavior, CSS property syntax, inline styles). Neither may prescribe site-specific visual details — those are discovered from the reference.

## Skill Directory Structure

### Integration Skills (Part 3)

Use a flat structure:

```
.agents/skills/[skill-name]/
├── SKILL.md              # Index only (required); no implementation detail
├── tasks/                # One file per stage; filename = stage name
│   └── [stage-name].md
├── rules/                # Constraints loaded when triggers match (strict)
│   └── [rule-name].md    # frontmatter: trigger: { domain: components }; filter: { backend: drupal }
├── blueprints/           # Overridable starting points for creation stages
│   └── [name].md         # frontmatter: trigger: { domain: components }; filter: { backend: drupal }
├── resources/            # Reference docs, split by concern
│   └── [topic].md
└── schemas.yml            # Reusable JSON Schema definitions (PascalCase keys)
```

### Core Skill (Part 1 — `designbook`)

Uses a three-level concern-based structure:

```
.agents/skills/designbook/
├── SKILL.md
├── resources/            # Execution engine docs
└── <concern>/
    ├── tasks/            # Shared tasks + workflow-specific (intake--<id>.md)
    ├── rules/            # Concern-level rules
    ├── resources/        # Concern-level reference docs
    ├── workflows/        # Workflow definitions (<workflow-id>.md)
    └── schemas.yml       # Concern-level JSON Schema definitions
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

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| COMMON-01 | error | YAML frontmatter at top of file is present and parseable | frontmatter |
| COMMON-02 | warning | No site-specific references (brand names, project URLs, customer-specific section/slot inventories) in any file under the core `designbook/` skill | body |
