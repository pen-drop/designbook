---
name: schema-composition
description: Deep-dive into the schema merge model — how task, blueprint, and rule schemas compose into a merged result schema
---

# Schema Composition

## Concept

A task's result schema is never just what the task declares. The engine merges contributions from the task, its matched blueprints, and its matched rules into a **merged schema**. This merged schema is the single source of truth for validation.

## Keyword Semantics

| Operation | Effect | Allowed in |
|-----------|--------|------------|
| `extends:` | Add new properties; **union enum members** on an existing enum-leaf property | **Rule and Blueprint** |
| `provides:` | Set default values for existing properties | **Rule only** |
| `constrains:` | Intersect enum values to narrow allowed options | **Rule only** |
| `suggests:` | Informational — ignored during merge | **Blueprint only** |

`extends:` and `constrains:` act on a closed enum from opposite directions: `extends:` **widens** it (union — appends allowed values), `constrains:` **narrows** it (intersection — removes disallowed values). See *Widening a closed enum* below.

Blueprints **must not** use `provides:` or `constrains:` — both are rule-exclusive because they enforce hard effects (defaults that affect validation, enum narrowing). Blueprints **may** use `extends:` to add integration-specific properties; added structure is not itself a hard constraint (rules can still narrow or default those properties). Blueprints may also use `suggests:` for machine-readable soft recommendations that do not participate in validation.

## Syntax

Declare extension fields in blueprint or rule frontmatter, keyed by result name:

### `extends:` — Add New Properties

```yaml
---
trigger:
  domain: tokens
filter:
  extensions: stitch
extends:
  design-tokens:
    properties:
      primitive:
        properties:
          color: { type: object, title: Imported Stitch Colors }
      semantic:
        properties:
          color: { type: object, title: Imported Stitch Semantic Colors }
---
```

A **new** property is added. A property that **already exists** is a conflict and errors — **except** an enum leaf: when both the base property and the incoming property carry an `enum` array, the members are **unioned** (base order preserved, new members appended, duplicates dropped) instead of erroring. Use `provides:` to modify a non-enum existing property.

### `provides:` — Set Defaults

```yaml
---
trigger:
  domain: data-model
provides:
  data-model:
    properties:
      content:
        additionalProperties:
          additionalProperties:
            properties:
              fields:
                additionalProperties:
                  properties:
                    sample_template: { type: object }
---
```

Last writer wins — if multiple rules/blueprints provide defaults for the same property, the last one applied takes precedence (rules override blueprints).

### `constrains:` — Narrow Enum Values

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

The engine intersects the declared enum with the base schema's enum. Only values present in **both** survive. If the intersection is empty, validation will reject all values.

## Widening a Closed Enum (Register a Value)

A closed `enum` is a validated allow-list. A skill **registers** a new allowed value with `extends:` (union), the mirror of `constrains:` (intersection). The union is additive: base order preserved, new members appended, duplicates dropped — so it is idempotent and never removes a shipped value. This reaches an enum leaf on **two** surfaces:

1. **On the merged result schema** — the enum leaf is a property of the task's own `result:` (or of a definition the result `$ref`s at the top level). The result-key merge unions it directly, per the `extends:` rule above.

2. **On a shared definition referenced only through a nested `$ref`** — the enum leaf lives on a `schemas.yml` definition the task reaches via an array `items.$ref` or a nested property `$ref`, so it is **never a top-level result key** and the result-key merge never sees it. Key the `extends:` entry by the **definition name**; the value is unioned into that definition in the schema map `workflow done` validates against.

**Worked example — registering a `sync-to` build form.** `sync-to`'s `resolve-filter` emits a `units` array whose `items.$ref` is `ConfigNameUnit`; the closed `build_form` enum lives on that definition (surface 2). A project skill registers a third build form entirely from its own rule/blueprint frontmatter — no edit inside the designbook addon or its plugin cache:

```yaml
---
trigger:
  steps: [sync-to:resolve-filter]
extends:
  ConfigNameUnit:
    properties:
      build_form: { enum: [views-page] }
---
```

`ConfigNameUnit.build_form.enum` becomes `[layout-builder, canvas, views-page]`, so a unit carrying `build_form: views-page` passes `workflow done` validation. The skill also ships the blueprint that expands the new form (matched by its `trigger.config_name` glob), and `resolve-filter`'s dispatch selects it exactly as it selects the two shipped forms.

## Merge Order

```
Phase 1: Base Task Schema        (result: in task frontmatter)
Phase 2: Blueprint extends:      (new properties from blueprints)
Phase 3: Rule extends:           (new properties from rules)
Phase 4: Blueprint provides:     (defaults from blueprints)
Phase 5: Rule provides:          (defaults from rules — override blueprint defaults)
Phase 6: Rule constrains:        (enum narrowing — rules only)
```

**Why this order:**
- Blueprints extend first, then rules — so rules can see all properties
- Rules provide after blueprints — so rule defaults override blueprint defaults
- Constraints come last — they narrow what's already defined

## Keys Ignored During Merge

`suggests:` (blueprint-only) is **not** merged into the task's result schema. It is
informational — intended for UI/discovery consumers. The executor skips it entirely
during the six-phase merge above.

`suggests:` exists so blueprints can publish a machine-readable recommendation shape
without claiming any validation authority. See
[blueprint-files.md](../rules/blueprint-files.md#blueprints-suggest-never-enforce) for
the authoring rules, and the vehicle decision matrix in that same file for how to
choose between `suggests:` (soft) and a rule / schema type (hard).

## `$ref` in Extension Fields

`$ref` is supported within `extends:`, `provides:`, and `constrains:`:

```yaml
extends:
  design-tokens:
    $ref: ../schemas.yml#/StitchTokenExtension
```

References are resolved at `workflow create` time, same as in task frontmatter.

## Example: Full Merge

**Base task** (`tasks/create-tokens.md`):
```yaml
result:
  type: object
  required: [design-tokens]
  properties:
    design-tokens:
      path: $DESIGNBOOK_DATA/design-tokens.yml
      type: object
      properties:
        primitive: { type: object }
        semantic: { type: object }
```

**Blueprint extends** (`blueprints/stitch-tokens.md`):
```yaml
extends:
  design-tokens:
    properties:
      primitive:
        properties:
          color: { type: object, title: Imported Stitch Colors }
```

**Rule constrains** (`rules/renderer-hints.md`):
```yaml
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
```

**Merged result:** The `design-tokens` schema now includes `primitive.color` from the blueprint, and `semantic.spacing.*.renderer` is constrained to `[margin, padding]` by the rule.
