---
when:
  steps: [create-data-model]
constrains:
  data-model:
    properties:
      config:
        properties:
          image_style:
            additionalProperties:
              required: [aspect_ratio]
              properties:
                aspect_ratio: { type: string, pattern: "^\\d+:\\d+$" }
---

# Rule: image_style Config Entity

`image_style` is a built-in config entity type with a special bundle structure. Bundles use `aspect_ratio` and `breakpoints` directly — no `fields`, `view_modes`, or `template`.

## How to Apply

When the data model includes image fields (e.g. `type: image`), ask the author which image styles are needed and add them under `config.image_style`.

## Format

```yaml
config:
  image_style:
    {style_name}:
      aspect_ratio: "{W}:{H}"         # required — e.g. 16:9, 4:3, 1:1
      breakpoints:                     # optional — responsive overrides
        {breakpoint_name}:
          width: {integer}             # required — media query threshold in px
          aspect_ratio: "{W}:{H}"      # optional — overrides default ratio at this breakpoint
```

## Rules

- Every bundle MUST have `aspect_ratio` in `W:H` format (positive integers)
- Breakpoint names are arbitrary labels — NOT tied to CSS/design-token breakpoints
- Breakpoints without `aspect_ratio` inherit the bundle's default ratio
- Do NOT add `fields`, `view_modes`, or `template` to image_style bundles
- Image styles are consumed in scenes via `image:` nodes, not `entity:` nodes
- Ratio-based bundle names MUST use the `ratio_` prefix (e.g. `ratio_16_9`, `ratio_4_3`) to avoid YAML parsing numeric-looking keys as integers
