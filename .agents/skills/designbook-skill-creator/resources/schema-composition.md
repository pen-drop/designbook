---
name: schema-composition
description: Deep-dive into the schema merge model — how task, blueprint, and rule schemas compose into a merged result schema
---

# Schema Composition

## Concept

A task's result schema is never just what the task declares. The engine merges contributions from the task, its matched blueprints, and its matched rules into a **merged schema**. This merged schema is the single source of truth for validation.

## The Three Operations

| Operation | Effect | Allowed in |
|-----------|--------|------------|
| `extends:` | Add new properties to the schema | Blueprint, Rule |
| `provides:` | Set default values for existing properties | Blueprint, Rule |
| `constrains:` | Intersect enum values to narrow allowed options | **Rule only** |

Blueprints **must not** use `constrains:` — only rules may constrain. This ensures blueprints remain overridable while rules enforce hard limits.

## Syntax

Declare extension fields in blueprint or rule frontmatter, keyed by result name:

### `extends:` — Add New Properties

```yaml
---
when:
  steps: [create-tokens]
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
when:
  steps: [create-data-model]
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
when:
  steps: [create-tokens]
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
