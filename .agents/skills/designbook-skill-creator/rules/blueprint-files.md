---
name: blueprint-files
description: Authoring + validation rules for blueprint files (blueprints/*.md). Load before creating or editing any blueprint file; load alongside common-rules.md.
applies-to:
  - blueprints/*.md
  - "**/blueprints/*.md"
---

# Blueprint File Rules

Load together with [common-rules.md](common-rules.md).

## Blueprints Are Overridable Starting Points

Blueprints provide an example of what a good output looks like: required tokens, props, slots, markup patterns. Integrations may deviate from blueprints to match their stack.

```markdown
---
trigger:
  domain: components
---
# Blueprint: Card

## Required Tokens
- `--card-bg`
- `--card-radius`
...
```

Blueprints are suggestions — an integration with different token conventions is free to diverge. If a constraint is non-negotiable, use a rule instead.

## Concrete Implementations Belong in Blueprints

Blueprints are where integration-specific implementation details live: class names, token
names, markup patterns, file-naming rules that differ between stacks. This is the
file-type perspective of the principle mirrored in `task-files.md` (framing: "don't
put this in a task") and `rule-files.md` (framing: "don't put this in a rule").

Tasks and rules must be **as abstract as possible**. They describe structure, requirements, and constraints — never concrete implementation details that differ between integrations (class names, token names, file naming patterns, markup specifics).

**The distinction:**

| What varies between integrations | → Blueprint |
| What never changes | → Rule |
| What to produce (outputs only) | → Task |

When the integration-specific detail is structured (a prop enum, a default value, a
recommended shape), express it as `suggests:` in frontmatter. When it is narrative
guidance, keep it in the body.

**Examples:**

- "A component must have a `$schema` field" — never changes → **rule**
- "Use `btn btn--primary` as the default button class" — Tailwind uses different classes → **blueprint**
- "Component tokens follow the pattern `--[component]-[property]`" — differs per integration → **blueprint**
- "Create `{{ component }}.component.yml`" — output declaration → **task**

**Wrong** (concrete implementation in a rule):
```markdown
---
trigger:
  domain: components
---
Use BEM class naming: `.block__element--modifier`.
```

**Correct** (move naming conventions to a blueprint):
```markdown
---
trigger:
  domain: components
---
# Blueprint: Component Naming

Use BEM class naming: `.block__element--modifier`.
```

## Name Blueprint Files Descriptively

A blueprint filename should reflect the output pattern or component family it provides
a starting point for. The reader should be able to guess, from the filename alone, what
the blueprint is used for.

**Good names:**

- `card-blueprint.md`
- `header-section.md`
- `form-layout.md`
- `hero-banner.md`

**Bad names:**

- `blueprint-1.md`
- `stuff.md`
- `generic.md`
- `components.md` (too broad — which component?)

Prefer component/pattern names over framework names. `card-blueprint.md` works for Drupal
SDC, Tailwind, and Stitch; `drupal-card.md` forces a fork per integration.

## Blueprints Suggest, Never Enforce

Blueprints are overridable starting points. When an integration deviates from a
blueprint, it replaces the entire blueprint file — not a merged subset. Hard
constraints in a blueprint are therefore meaningless: they get overridden wholesale.
A blueprint's only job is to suggest.

Blueprints **must not** use `extends:`, `provides:`, or `constrains:` in frontmatter.
All three are rule-exclusive — see [rule-files.md](rule-files.md#schema-extension-as-core-mechanism).

Blueprints **may** use `suggests:` to express soft recommendations in a
machine-readable form. `suggests:` is a JSON-Schema-like property map (supports
`enum`, `default`, `type`, `description`, nested objects). The executor reads
`suggests:` only for UI/discovery purposes — it is **never** merged into the task's
validation schema. It never narrows enums. It never enforces defaults.

**Wrong — blueprint with `provides:`:**

```yaml
---
name: container-blueprint
trigger:
  domain: components
  component: container
provides:
  max_width:
    default: md
    enum: [sm, md, lg, xl, full]
---
```

**Correct — same recommendations as `suggests:`:**

```yaml
---
name: container-blueprint
trigger:
  domain: components
  component: container
suggests:
  max_width:
    enum: [sm, md, lg, xl, full]
    default: md
    description: Container outer width preset
  padding_top:
    enum: [auto, none, sm, md, lg]
  padding_bottom:
    enum: [auto, none, sm, md, lg]
---

# Blueprint: Container

The container component wraps arbitrary content and applies layout spacing.
See `suggests:` above for recommended prop values.
```

### Vehicle decision matrix

Blueprints carry no authority by design — any hard constraint must live in a rule
or schema, never in a blueprint. Pick the vehicle by what the content is:

| Situation | Vehicle |
|---|---|
| Recommended prop shape or enum for a component (overridable) | Blueprint `suggests:` |
| Loose prose guidance, no structure | Blueprint body |
| Hard contract other tools must validate against | Schema type in integration's `schemas.yml` (via `$ref` on a core type) |
| Non-overridable narrowing for a specific backend/config | Rule with `constrains:` |
| Runtime default value that affects validation | Rule with `provides:` |
| Added property that affects validation | Rule with `extends:` |

The `BLUEPRINT-01` check flags any of `extends:`/`provides:`/`constrains:` in
blueprint frontmatter. The `BLUEPRINT-03` check flags body prose that should live
in `suggests:` (soft) or in `schemas.yml` / a rule (hard).

## `blueprints/` — Trigger + Filter Matching

Blueprints use the same `trigger:` + `filter:` matching as rules, including strict-trigger semantics and consumer-based `domain:` activation.

```markdown
---
trigger:
  domain: components       # activates when a task needs the `components` domain
filter:
  backend: drupal          # only in Drupal projects
---
```

`trigger.domain:` uses prefix matching (via `matchDomain()`); other `filter:` keys use exact matching against config values.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| BLUEPRINT-01 | error | `constrains:` field is absent from frontmatter (only rules may constrain enum values) | frontmatter |
| BLUEPRINT-02 | warning | Body does not contain site-specific references (brand names, project URLs, customer slot names) — site-specific content in core `designbook/` is caught by COMMON-02 in common-rules.md; this check covers blueprints in integration skills that still must stay site-agnostic | body |
| BLUEPRINT-03 | warning | Body does not describe schema extensions as prose (default values, additional result properties, enumerations) when they could be expressed via `extends:` or `provides:` in frontmatter | body |
