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
├── rules/                # Constraints loaded when `domain` matches
│   └── [rule-name].md    # frontmatter: domain: components; when: { backend: drupal }
├── blueprints/           # Overridable starting points for creation stages
│   └── [name].md         # frontmatter: domain: components; when: { backend: drupal }
├── resources/            # Reference docs, split by concern
│   └── [topic].md
└── schemas.yml            # Reusable JSON Schema definitions (PascalCase keys)
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
    ├── workflows/        # Workflow definitions (<workflow-id>.md)
    └── schemas.yml       # Concern-level JSON Schema definitions
```

## `schemas.yml` — Schema Definitions

Each concern directory (core) or skill root (integration) can contain a `schemas.yml` file with reusable JSON Schema definitions. Tasks, rules, and blueprints reference these via `$ref`.

See [`resources/schemas.md`](../resources/schemas.md) for format conventions and `$ref` syntax.

## `tasks/` — Naming Rule

**Filename = stage name.** `tasks/create-component.md` applies to stage `create-component`. The AI discovers tasks by scanning all skill directories for `tasks/<stage>.md`. No explicit stage declaration in frontmatter.

### Workflow-qualified tasks (`<step>--<workflow>.md`)

Task files scoped to a specific workflow use `<step>--<workflow>.md` naming (e.g. `intake--design-verify.md`). Their `when.steps` **MUST** use the fully qualified step name including the workflow prefix:

```yaml
# ✅ CORRECT — matches workflow step "design-verify:intake"
when:
  steps: [design-verify:intake]

# ❌ WRONG — bare step name will NOT match, task gets skipped
when:
  steps: [intake]
```

The CLI matches `when.steps` values literally against the step name from the workflow definition. A workflow that declares `steps: [design-verify:intake]` will only find task files whose `when.steps` contains the exact string `design-verify:intake`.

## `rules/` — Domain Matching

Rules use `when.domain:` to declare which knowledge domain they belong to. The resolver loads a rule when its domain matches the effective domains of the current step (union of task `domain:` + stage `domain:`).

```markdown
---
when:
  domain: components
  backend: drupal          # optional config condition
---
```

Config conditions in `when:` (`backend`, `frameworks.*`, `extensions`) still apply as additional filters. `when.steps` is deprecated for rules — use `when.domain:` instead.

### Domain Subcontexts

Use dot-notation for finer scoping: `components.layout`, `scenes.shell`. A task with `domain: [components]` loads rules with `domain: components` and `domain: components.*`. A task with `domain: [components.layout]` loads `domain: components` (parent) and `domain: components.layout` (exact), but not `domain: components.discovery` (sibling).

### Provider Rules (`provides`) — Legacy

> **Prefer code resolvers.** New param resolution should use `resolve:` in workflow param declarations (see architecture.md). Provider rules are a legacy mechanism kept for backwards compatibility.

A rule with `provides: <param>` declares that it can resolve a specific workflow param via AI execution. The workflow engine runs provider rules **before** the task starts (step 2a-resolve), but only for params not already resolved by a code resolver or `--params`.

```markdown
---
provides: url
when:
  domain: design.intake
  extensions: stitch
---
```

Use `provide-` as the filename prefix for provider rules (e.g. `provide-stitch-url.md`). Constraint rules (without `provides`) use descriptive names as before.

### Schema Extension Fields

Rules can extend the merged result schema of a task. Three operations:

| Field | Effect | Allowed in |
|-------|--------|------------|
| `extends:` | Add new properties (error on duplicates) | Rule, Blueprint |
| `provides:` (object) | Set default values (last writer wins) | Rule, Blueprint |
| `constrains:` | Intersect enum values | Rule only |

```yaml
---
when:
  domain: tokens
constrains:
  design-tokens:
    properties:
      semantic:
        properties:
          spacing:
            additionalProperties:
              properties:
                $extensions:
                  properties:
                    designbook:
                      properties:
                        renderer: { enum: [margin, padding] }
---
```

**Note:** `provides: <param>` (string — Provider Rule) and `provides:` (object — Schema Defaults) are different concepts. Provider Rules resolve workflow params; schema `provides:` sets default values on result properties.

See [`resources/schema-composition.md`](../resources/schema-composition.md) for the full merge model.

## `blueprints/` — Domain Matching

Same `when.domain:` matching as rules. Blueprints declare which knowledge domain they belong to; the resolver loads them when a step's effective domains match.

```markdown
---
when:
  domain: components
  backend: drupal          # optional config condition
---
```

All conditions in `when:` apply as filters — `domain` uses prefix matching, other keys use exact matching against config.

### Schema Extension Fields

Blueprints support `extends:` and `provides:` (object form) to contribute to the merged result schema. **`constrains:` is forbidden in blueprints** — only rules may constrain enum values.

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
