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

## Schema Extension as Core Mechanism

Blueprints frequently extend the task's result schema — adding default values, extra
properties, or default nested structures. This is the **preferred mechanism** — not
body prose. A blueprint describes "what kind of output do I produce, with what default
shape" in frontmatter; the body only contains the narrative guidance and correct/wrong
examples.

Blueprints may use:

- `extends:` — inherit another schema type
- `provides:` (object form) — add properties with defaults

Blueprints **must not** use `constrains:` — that is rule-exclusive, because a blueprint
is overridable and narrowing an enum value non-overridably would break that promise.

For the full schema-extension mechanics (merge semantics, last-writer-wins for `provides:`,
enum-intersection for `constrains:`), see [rule-files.md](rule-files.md#schema-extension-as-core-mechanism).

**Wrong — body prose describing defaults:**

```markdown
# Card Blueprint

The card component has three variants: `default`, `featured`, `compact`.
The default padding is `16px`.
```

**Correct — same defaults expressed in frontmatter:**

```yaml
---
name: card-blueprint
trigger:
  domain: components
  component: card
provides:
  variant:
    default: default
    enum: [default, featured, compact]
  padding:
    default: 16px
---
```

The `BLUEPRINT-03` check below flags body prose that should live in frontmatter instead.

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
