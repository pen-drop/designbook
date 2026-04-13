---
when:
  steps: [create-scene, design-shell:intake, design-screen:intake]
---

# Drupal Scene Constraints

## Image Node Format

> ⛔ **Image nodes use the duck-typed `image:` key referencing a config entity.**
> The `image` value MUST match a bundle name under `config.image_style` in `data-model.yml`.
> Ratio-based style names use the `ratio_` prefix (e.g. `ratio_16_9`) to avoid YAML numeric parsing issues.

```yaml
# ✅ Correct — image node with named style
- image: hero
  alt: "Modern architecture building"

# ✅ Correct — ratio-based style with ratio_ prefix
- image: ratio_16_9
  alt: "Landscape photo"

# ✅ Correct — image node with custom source (CSS aspect-ratio mode)
- image: card
  alt: "Team photo"
  src: "/images/team.jpg"

# ❌ Wrong — old format with type: image
- type: image
  image_style: hero
  alt: "Some image"

# ❌ Wrong — using component instead of image node
- component: "$COMPONENT_NAMESPACE:image"
  props:
    src: "https://picsum.photos/800/600"
```

## Entity Reference Format

> ⛔ **Entity references use a two-part `entity` string plus a separate `view_mode` key.**

```yaml
# ✅ Correct — entity is "entity_type.bundle", view_mode is a separate field
- entity: "[entity_type].[bundle]"
  view_mode: "full"
  record: 0

# ❌ Wrong — view_mode embedded in entity string causes double-dot path
- entity: "[entity_type].[bundle].full"
  record: 0
```

The renderer loads: `$DESIGNBOOK_DATA/entity-mapping/{entity_type}.{bundle}.{view_mode}.jsonata`

The `entity` string provides `entity_type` (part 0) and `bundle` (part 1). `view_mode` is read from its own key — if omitted, the path becomes `[entity_type].[bundle]..jsonata` (double dot, file not found).

`record:` is an optional integer (default: 0) — selects which record from `data.yml` to use.

## Listing Scenes Use listing.* Entities

> ⛔ **Listing scenes MUST use a `listing.*` config entity as the content node.** Never use `entity + records: []` for listing pages.

```yaml
# ✅ Correct — listing entity handles the collection
- entity: "[listing_type].[bundle]"
  view_mode: "default"

# ❌ Wrong — records shorthand is for component demos only
- entity: "[entity_type].[bundle]"
  view_mode: "teaser"
  records: [0, 1, 2]
```

`records:` shorthand is for isolated component previews only. Listing pages use a `listing.*` config entity — its JSONata file declares its own entity refs inline.
