---
name: principles
description: Core design principles for all Designbook skill authoring
---

# Skill Design Principles

## Tasks Say WHAT, Never HOW

Task files declare **what outputs to produce** — file paths, required params, prerequisite reads. They never contain style guidelines, implementation instructions, or format prescriptions.

**Correct:**
```markdown
---
params:
  component: ~
files:
  - $DESIGNBOOK_HOME/components/{{ component }}/{{ component }}.component.yml
---
```

**Wrong:**
```markdown
---
params:
  component: ~
---
Use snake_case for the component name. Create the YAML file with these required fields: ...
```

Implementation guidance belongs in blueprints (overridable) or rules (hard constraints) — never in task files.

## Blueprints Are Overridable Starting Points

Blueprints provide an example of what a good output looks like: required tokens, props, slots, markup patterns. Integrations may deviate from blueprints to match their stack.

```markdown
---
when:
  steps: [create-component]
---
# Blueprint: Card

## Required Tokens
- `--card-bg`
- `--card-radius`
...
```

Blueprints are suggestions — an integration with different token conventions is free to diverge. If a constraint is non-negotiable, use a rule instead.

## Rules Are Hard Constraints

Rules enforce constraints that must hold regardless of integration, framework, or user preference. Once a rule's `when` conditions match, it applies absolutely.

```markdown
---
when:
  backend: drupal
  steps: [create-component]
---
All component files must include a `$schema` field pointing to the JSON schema.
```

Rules are never overridden by integration skills. If something CAN be overridden, it is a blueprint.

## Concrete Implementations Belong in Blueprints, Never in Tasks or Rules

Tasks and rules must be **as abstract as possible**. They describe structure, requirements, and constraints — never concrete implementation details that differ between integrations (class names, token names, file naming patterns, markup specifics).

**The distinction:**

| What varies between integrations | → Blueprint |
| What never changes | → Rule |
| What to produce (outputs only) | → Task |

**Examples:**

- "A component must have a `$schema` field" — never changes → **rule**
- "Use `btn btn--primary` as the default button class" — Tailwind uses different classes → **blueprint**
- "Component tokens follow the pattern `--[component]-[property]`" — differs per integration → **blueprint**
- "Create `{{ component }}.component.yml`" — output declaration → **task**

**Wrong** (concrete implementation in a rule):
```markdown
---
when:
  steps: [create-component]
---
Use BEM class naming: `.block__element--modifier`.
```

**Correct** (move naming conventions to a blueprint):
```markdown
---
when:
  steps: [create-component]
---
# Blueprint: Component Naming

Use BEM class naming: `.block__element--modifier`.
```

Both rules and blueprints can live in an integration skill's layer (`designbook-drupal/rules/`, `designbook-css-tailwind/blueprints/`). The layer determines scope; the file type (rule vs blueprint) determines overridability.

## Stages Flush After Completion

After each stage completes, all output files are **flushed** — renamed from their temporary working names to their final canonical names. This flush is what makes outputs referenceable by later stages.

Consequence: a task file must declare the **final flushed paths** in `files:`, not temporary names. If stage B needs to read a file produced by stage A, it references the flushed name via `reads:`.

```markdown
# Stage A task — produces flushed output
files:
  - $DESIGNBOOK_HOME/components/{{ component }}/{{ component }}.component.yml

# Stage B task — reads the flushed output from stage A
reads:
  - path: $DESIGNBOOK_HOME/components/{{ component }}/{{ component }}.component.yml
    workflow: _debo-design-component
```

Never reference unflushed (in-progress) file names from another stage — the file will not exist at that path until the producing stage has completed and flushed.

## Stage = Filename, No Duplication

A task file's filename IS its stage assignment. `tasks/create-component.md` applies to stage `create-component`. Never declare `stage:` in frontmatter — it is redundant and becomes stale.

## Validation Is Automatic

Validation runs automatically via `workflow validate --task`. Never add validation steps or instructions inside task files.
