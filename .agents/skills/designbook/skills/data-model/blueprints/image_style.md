---
type: entity-type
name: image_style
priority: 5
trigger:
  domain: data-model
---

# Entity Type: image_style

```yaml
entity_type: image_style
section: config
bundle_properties:
  aspect_ratio:
    type: string
    format: "W:H"
    required: true
  breakpoints:
    type: object
    required: false
    description: >
      Named breakpoints with width and optional aspect_ratio override.
      Breakpoint names are arbitrary labels — not tied to CSS breakpoints.
    properties:
      width:
        type: integer
        required: true
      aspect_ratio:
        type: string
        format: "W:H"
        required: false
```

## Naming Convention

**Ratio-based names** — when the aspect ratio is the same across all viewports. Use `ratio_` prefix followed by the ratio with underscores. The prefix avoids YAML parsing numeric-looking keys as integers:

```yaml
image_style:
  ratio_16_9:
    aspect_ratio: 16:9
  ratio_4_3:
    aspect_ratio: 4:3
  ratio_1_1:
    aspect_ratio: 1:1
```

**Semantic names** — when the ratio changes per viewport (responsive breakpoints). Name describes the usage context:

```yaml
image_style:
  hero:
    aspect_ratio: 21:9
    breakpoints:
      xl: { width: 1200 }
      md: { width: 768, aspect_ratio: 16:9 }
      sm: { width: 480, aspect_ratio: 4:3 }
  card:
    aspect_ratio: 4:3
    breakpoints:
      sm: { width: 480, aspect_ratio: 1:1 }
```

Use ratio-based names by default. Switch to semantic names only when breakpoints override the ratio.

## Rules

- `image_style` lives under `config:` in data-model.yml — NOT under `content:`
- Bundles do NOT use `fields` — properties (`aspect_ratio`, `breakpoints`) are direct bundle keys
- `aspect_ratio` is required on every bundle, format `W:H` (e.g. `16:9`, `4:3`, `1:1`)
- Breakpoint names are arbitrary labels; the `width` value determines the media query threshold
- Breakpoints without `aspect_ratio` inherit the bundle's default ratio
