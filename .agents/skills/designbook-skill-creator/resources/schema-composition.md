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
| `extends:` | Add new properties to the schema | **Rule only** |
| `provides:` | Set default values for existing properties | **Rule only** |
| `constrains:` | Intersect enum values to narrow allowed options | **Rule only** |
| `suggests:` | Informational — ignored during merge | **Blueprint only** |

Blueprints **must not** use any of `extends:`, `provides:`, or `constrains:` — all three are rule-exclusive. This ensures blueprints remain purely overridable; any authority lives in rules or schema types. Blueprints may use `suggests:` to publish machine-readable recommendations that do not participate in validation.

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

Error if a property already exists in the base schema. Use `provides:` to modify existing properties.

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
