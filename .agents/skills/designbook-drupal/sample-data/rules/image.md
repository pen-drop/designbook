---
trigger:
  domain: sample-data
filter:
  backend: drupal
---

# Sample Rule: image

Applies to a field of type `image`.

## Output Structure

Generate an object with `alt` (required) and optionally `src`. **Do NOT generate `<img>` HTML tags** — image rendering is handled by the image style system at display time.

```yaml
field_hero_image:
  alt: "Aerial view of modern glass office building"
```

If the user has placed custom images in the project, reference them via `src`:

```yaml
field_hero_image:
  alt: "Company headquarters"
  src: "/images/headquarters.jpg"
```

When no `src` is provided, the image provider (configured in `designbook.config.yml`) generates placeholder images automatically at render time.

## Field hint

| Key    | Default | Description                                                                          |
|--------|---------|--------------------------------------------------------------------------------------|
| `hint` | —       | The field's `hint` in the data model: context for the image subject (e.g. `"hero"`, `"product thumbnail"`, `"avatar"`). Used to generate descriptive alt text. |

## Rules

- Output an object with `alt` key — never an `<img>` tag or HTML string.
- Alt text must be descriptive and derived from the `hint` or field name context.
- Each record in the same bundle should have **different, varied alt text** to show content variety.
- Never use `public://` paths, invented filenames, or placeholder service URLs in `data.yml` image fields.
- The `src` field is optional — omit it to let the image provider generate placeholders.
