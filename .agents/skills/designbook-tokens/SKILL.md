---
name: designbook-tokens
description: Generates design tokens in W3C YAML format.
---

# Designbook Tokens Skill

Validates and saves design tokens to `$DESIGNBOOK_DIST/design-system/design-tokens.yml` in W3C Design Token format.

## Task Files

- [create-tokens.md](tasks/create-tokens.md) — Generate design-tokens.yml from dialog results

---

## Reference

### Token Structure

```
{top-level group}         # e.g. color, typography, spacing
  └── {token name}        # e.g. primary, heading
        ├── $value (required)
        ├── $type (required)
        └── description
```

### Valid `$type` Values

`color`, `fontFamily`, `dimension`, `number`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `gradient`, `transition`, `border`, `strokeStyle`, `typography`
