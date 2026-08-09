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

The core skill nests one sub-skill per workflow under `skills/<workflow>/`, beside the shared
`design/` and `scenes/` content roots. That layout has a single authoritative home — see
[`SKILL.md`](../SKILL.md) › *Three-Part Project Architecture* — and is not restated here (Single
Source of Truth; see [writing-files.md](writing-files.md) › Lever 3).

## `SKILL.md` — Index Only

`SKILL.md` is a navigation index. It lists what the skill contains and links to sub-files. It does NOT contain implementation detail, task instructions, or inline rules.

Required frontmatter:

```yaml
---
name: <skill-name>
user-invocable: false                # true adds the human `/name` reach
disable-model-invocation: true       # present only when the model must NOT auto-fire the skill
description: <one-liner or trigger-bearing pointer>
---
```

### Invocation — two orthogonal keys

`user-invocable` and `disable-model-invocation` are **two independent axes**, not a synonym pair.
Both are normative; the earlier form that named only `user-invocable` is dropped without a
compatibility layer.

- `user-invocable: true` adds the human `/name` reach. It never removes model reach.
- `disable-model-invocation: true` turns the model's autonomous auto-trigger **off**. Omit it (or
  set `false`) to leave the skill model-invocable.

The `description:` follows directly from the model axis:

- **Model-invocable** (`disable-model-invocation` absent/`false`): the `description:` is the skill's
  top-level context pointer and **carries the firing triggers** — it is always loaded, so it earns
  the pruning of [writing-files.md](writing-files.md) (Lever 1).
- **Model-invocation disabled** (`disable-model-invocation: true`): the `description:` is a purely
  human-readable one-liner with the trigger ballast stripped — only the human, via `/name`, can
  reach the skill.

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
