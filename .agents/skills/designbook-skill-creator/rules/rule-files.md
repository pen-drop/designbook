---
name: rule-files
description: Authoring + validation rules for rule files (rules/*.md). Load before creating or editing any rule file; load alongside common-rules.md.
applies-to:
  - rules/*.md
  - "**/rules/*.md"
---

# Rule File Rules

Load together with [common-rules.md](common-rules.md).

## Rules Are Hard Constraints

Rules enforce constraints that must hold regardless of integration, framework, or user preference. Once a rule's `trigger` conditions match, it applies absolutely.

```markdown
---
trigger:
  domain: components
filter:
  backend: drupal
---
All component files must include a `$schema` field pointing to the JSON schema.
```

Rules are never overridden by integration skills. If something CAN be overridden, it is a blueprint.

## Rules Often Target One Output File Type

A well-scoped rule binds to exactly one output file type — a Twig component, a CSS
JSONata transform, a screenshot capture — and describes the **format + logic** for
that output, never the domain specifics.

The split:

- **Format and logic** → rule. "A Twig component file must declare `$schema`." "A screenshot
  capture uses the full viewport, not just the fold." These constraints hold regardless
  of which specific component, token, or page is being produced.
- **Domain specifics** → blueprint. "The primary button uses `btn btn--primary`." "The
  hero section uses the `header-hero` layout token." These vary between integrations and
  sites.

Examples of well-scoped rules:

- `twig-component-format.md` — enforces frontmatter fields and file-naming for any
  Twig component file. Does **not** set colors, classes, or specific component markup.
- `screenshot-capture.md` — defines viewport, full-page-vs-fold, device emulation defaults
  for any screenshot task. Does **not** name specific URLs or pages.
- `css-generate-jsonata.md` — enforces the JSONata shape (input contract, required
  output keys) for any CSS-generation transform. Does **not** define specific token
  names or colors.

**Test:** if the rule body names a specific component, page, or token value, it's either
mis-scoped (should be narrower + matched by trigger/filter) or it should be a blueprint
instead.

## Name Rule Files Descriptively

A rule filename should reflect the output file type or concept the rule constrains. The
reader should be able to guess from the filename alone which file type the rule governs.

**Good names:**

- `twig-component-format.md`
- `screenshot-capture.md`
- `css-generate-jsonata.md`
- `sdc-conventions.md`
- `image-style-config.md`

**Bad names:**

- `conventions.md` (which conventions?)
- `rule-1.md`
- `component-stuff.md`
- `misc.md`

Prefer the name of the output file type or transform over the name of the task that
produces it. `twig-component-format.md` is better than `create-component-rules.md`
because multiple tasks may produce Twig components.

## Rules Never Declare `params:`

Rules are constraints that apply when a step matches. They must not declare their own `params:` schema and must not pick resolvers. Resolver choice is strictly task territory — different tasks can choose different resolvers (or no resolver) for the same input param.

If a rule needs a value (e.g. `story_url`), it reads it from the values already resolved by the task that owns the step. A rule that "requires" a param is really stating a precondition on the task: the task must declare that param with the appropriate resolver.

**Wrong** (rule carrying its own param + resolver):
```markdown
---
name: designbook:design:playwright-validate
trigger:
  steps: [validate]
params:
  type: object
  required: [story_url]
  properties:
    story_url: { type: string, resolve: story_url }
---
```

**Correct** (rule consumes what the task provides):
```markdown
---
name: designbook:design:playwright-validate
trigger:
  steps: [validate]
---

`story_url` is pre-resolved by the task's `story_url` resolver at `workflow create` time.
If the resolver returned an error, fix the input and restart the stage.
```

The same principle applies to blueprints.

## Concrete Implementations Don't Belong in Rules

Rules describe structure and constraints that must hold regardless of integration. They
do not contain concrete implementation details (class names, token names, markup specifics)
— those live in **blueprints**. See [blueprint-files.md](blueprint-files.md#concrete-implementations-belong-in-blueprints)
for the full framing.

The distinction:

| What varies between integrations | → Blueprint |
| What never changes | → Rule |
| What to produce (outputs only) | → Task |

Example:

- "A component must have a `$schema` field" — never changes → **rule**
- "Use `btn btn--primary` as the default button class" — Tailwind uses different classes → **blueprint**

## Schema Extension as Core Mechanism

Rules frequently extend the task's schema — adding properties, narrowing enum values,
declaring provided values. This is the **preferred mechanism** — not body prose. A rule
describes "what I add to the task schema" in frontmatter; the body only contains the
narrative guidance and correct/wrong examples.

Rules can extend the merged result schema of a task. Three operations:

| Field | Effect | Allowed in |
|-------|--------|------------|
| `extends:` | Add new properties (error on duplicates) | Rule, Blueprint |
| `provides:` (object) | Set default values (last writer wins) | Rule, Blueprint |
| `constrains:` | Intersect enum values | Rule only |

```yaml
---
trigger:
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

**Wrong — body prose describing a constraint:**

```markdown
# Renderer Selection

For the Drupal integration, the `renderer` param must be one of `twig`, `sdc`.
The `react` value is not allowed here.
```

**Correct — same constraint expressed in frontmatter:**

```yaml
---
name: renderer-constraint
trigger:
  domain: components
filter:
  backend: drupal
constrains:
  renderer:
    enum: [twig, sdc]
---
```

The `RULE-01` check below flags body prose that should live in frontmatter instead.

## `rules/` — Trigger + Filter Matching

Rules declare activation via two separate frontmatter blocks:

- **`trigger:`** — WHEN the rule becomes active (OR-connected, **strict**: at least one key must explicitly match).
  Supported keys: `steps`, `domain`.
- **`filter:`** — WHERE (project config) the rule is applicable (AND-connected, deferring: undefined keys pass).
  Supported keys: `backend`, `frameworks.*`, `extensions`, `type`.

```markdown
---
trigger:
  domain: components      # activates when a task needs the `components` domain
filter:
  backend: drupal         # only in Drupal projects
---
```

### Consumer Semantics — `domain:` declares WHAT A TASK NEEDS

> **Critical:** `domain:` in a task's frontmatter lists domains the task **consumes** (depends on), not domains it **produces**.

A rule with `trigger.domain: X` activates only when the current task declares `domain: [..., X, ...]`. So:

- A task that CREATES `vision.yml` (the producer) does **not** set `domain: [vision]` — it doesn't consume vision context.
- A task that CREATES a data-model but READS the vision (the consumer) declares `domain: [data-model, vision]` — it needs vision context loaded.

This makes rules like `vision-context.md` (with `trigger.domain: vision`) load only where the vision is actually needed, not during vision creation itself.

**Rule of thumb:** If removing a rule would break the task, declare the rule's domain in the task's `domain:`. If the task is the thing that creates the domain's data, do NOT declare it.

### Strict Trigger Matching

Triggers are strict: a `trigger.domain: X` rule does **not** load for a task that declared no `domain:`. Previously (legacy `when:` semantics) undefined context keys were deferred (treated as match); this is no longer the case. If a rule should always load for certain steps regardless of domain, use `trigger.steps: [...]` instead.

### Domain Subcontexts

Use dot-notation for finer scoping: `components.layout`, `scenes.shell`. A task with `domain: [components]` loads rules with `trigger.domain: components` and `trigger.domain: components.*`. A task with `domain: [components.layout]` loads `trigger.domain: components` (parent) and `trigger.domain: components.layout` (exact), but not `trigger.domain: components.discovery` (sibling).

### Provider Rules (`provides`) — Legacy

> **Prefer code resolvers.** New param resolution should use `resolve:` in the task's param declarations (see `resources/schemas.md`). Provider rules are a legacy mechanism kept for backwards compatibility.

A rule with `provides: <param>` declares that it can resolve a specific workflow param via AI execution. The workflow engine runs provider rules **before** the task starts (step 2a-resolve), but only for params not already resolved by a code resolver or `--params`.

```markdown
---
provides: url
trigger:
  domain: design.intake
filter:
  extensions: stitch
---
```

Use `provide-` as the filename prefix for provider rules (e.g. `provide-stitch-url.md`). Constraint rules (without `provides`) use descriptive names as before.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| RULE-01 | warning | Body does not describe schema constraints as prose (enum values, required fields, type restrictions, property shapes) when they could be expressed via `extends:` / `provides:` / `constrains:` in frontmatter | body |
