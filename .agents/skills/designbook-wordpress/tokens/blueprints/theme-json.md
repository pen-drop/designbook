---
type: blueprint
name: theme-json
trigger:
  steps: [export-tokens]
filter:
  backend: wordpress
---

# Blueprint: theme.json from design tokens

Map token groups to presets; the slug is the token path below the group joined with `-`
(`primitive.color.neutral.50` → `neutral-50`), the name its human-readable form. Resolve
`{…}` references to their final value.

| Token group | theme.json preset | Value key |
|---|---|---|
| `primitive.color.*`, `semantic.color.*` | `settings.color.palette` | `color` |
| `primitive.fontFamily.*` | `settings.typography.fontFamilies` | `fontFamily` |
| `primitive.fontSize.*` | `settings.typography.fontSizes` | `size` (px value with unit) |
| `primitive.spacing.*` | `settings.spacing.spacingSizes` | `size` |

```json
{
  "$schema": "https://schemas.wp.org/trunk/theme.json",
  "version": 3,
  "settings": {
    "color": { "palette": [{ "slug": "neutral-50", "name": "Neutral 50", "color": "#fffbf2" }] },
    "typography": {
      "fontFamilies": [{ "slug": "heading", "name": "Heading", "fontFamily": "Montserrat, sans-serif" }],
      "fontSizes": [{ "slug": "16", "name": "16", "size": "16px" }]
    },
    "spacing": { "spacingSizes": [{ "slug": "md", "name": "MD", "size": "24px" }] }
  }
}
```

Semantic colors keep their role names as slugs (`foreground`, `surface`), so theme styles can
reference `var(--wp--preset--color--foreground)`.
