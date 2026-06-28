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

## Drupal Config Export

The `to_drupal` block transforms a `config.image_style.<key>` definition into a `DrupalConfigEntity[]`
suitable for Drupal config/sync. Input shape:

```
{
  key: "<image-style-machine-name>",
  def: { aspect_ratio: "W:H", breakpoints?: { <name>: { width: <n>, aspect_ratio?: "W:H" } } }
}
```

Output: `[image.style.<key>]`

### to_drupal

```jsonata
(
  /* Parse aspect_ratio string "W:H" into width/height integers */
  $parseRatio := function($ratio) {(
    $parts := $split($ratio, ":");
    $w := $number($parts[0]);
    $h := $number($parts[1]);
    { "width": $w, "height": $h }
  )};

  $ratio := $parseRatio(def.aspect_ratio);

  /* Build the scale-and-crop effect entry */
  $effectId := "scale_and_crop_" & key;
  $effects := $merge([{
    $effectId: {
      "uuid": $effectId,
      "id": "image_scale_and_crop",
      "weight": 1,
      "data": {
        "width": $ratio.width * 100,
        "height": $ratio.height * 100,
        "anchor": "center-center",
        "upscale": false
      }
    }
  }]);

  [{
    "config_name": "image.style." & key,
    "data": {
      "langcode":     "en",
      "status":       true,
      "dependencies": {
        "module": ["image"]
      },
      "name":   key,
      "label":  key,
      "effects": $effects
    }
  }]
)
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
