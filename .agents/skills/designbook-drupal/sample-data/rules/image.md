---
when:
  stages: [create-sample-data]
  backend: drupal
---

# Sample Template: image

Applies when a field has `sample_template.template: image`, or when `field_type` matching is active for `image`.

## Output Structure

Generate an `<img>` tag using a Picsum Photos URL. Always use a real placeholder URL — never use `public://` paths, local file paths, or invented filenames.

```yaml
field_hero_image: "<img src=\"https://picsum.photos/id/42/1200/630\" alt=\"Hero banner\"/>"
```

## URL Format

```
https://picsum.photos/id/{id}/{width}/{height}
```

- `{id}` — a stable integer ID (0–1000). Vary the ID across records to get different images.
- `{width}` / `{height}` — dimensions derived from the aspect ratio (see table below).

## Aspect Ratio → Dimensions

Choose dimensions based on the context. Use the `hint` setting to determine which ratio applies:

| Context / hint              | Ratio  | Dimensions     |
|-----------------------------|--------|----------------|
| hero, banner, header        | 16:9   | 1200 × 675     |
| card, teaser, thumbnail     | 4:3    | 800 × 600      |
| square, avatar, icon        | 1:1    | 400 × 400      |
| portrait, person, product   | 3:4    | 600 × 800      |
| wide, cinema, landscape     | 21:9   | 1260 × 540     |
| default (no hint)           | 16:9   | 800 × 450      |

## Settings

| Key    | Default | Description                                                                                           |
|--------|---------|-------------------------------------------------------------------------------------------------------|
| `hint` | —       | Context for the image subject and ratio selection (e.g. `"hero"`, `"product thumbnail"`, `"avatar"`). |

## Rules

- Each record in the same bundle should use a **different Picsum ID** to show visual variety.
- Alt text must be descriptive and derived from the `hint` or field name context.
- Never use `public://` paths, invented filenames, or `placehold.co` URLs in `data.yml` image fields — Picsum only.
