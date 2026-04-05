---
when:
  steps: [design-shell:create-scene, design-screen:create-scene, design-screen:map-entity]
---

# Scenes Critical Constraints

> Full `*.scenes.yml` format and `ComponentNode` output schema: see [scenes-schema](../resources/scenes-schema.md).

> ⛔ **`component:` values MUST always use `provider:component` format.**
> Write `$COMPONENT_NAMESPACE:header`, NEVER just `header`.
> `COMPONENT_NAMESPACE` is set by the workflow bootstrap (Rule 0).

```yaml
# ✅ Correct — provider prefix on every component, including nested slots
- component: "$COMPONENT_NAMESPACE:card"
  slots:
    media:
      - component: "$COMPONENT_NAMESPACE:image"
        props:
          src: https://placehold.co/400x300

# ❌ Wrong — missing provider prefix
- component: card
  slots:
    media:
      - component: image
```

> ⛔ **No `type: element` in scenes.** Use plain strings for text content. `type: element` is only valid in `*.story.yml` files.

```yaml
# ✅ Correct — plain string in slot
- component: "$COMPONENT_NAMESPACE:heading"
  slots:
    text: "Welcome to the Blog"

# ❌ Wrong — type: element is story-only
- component: "$COMPONENT_NAMESPACE:heading"
  slots:
    text:
      - type: element
        tag: span
        value: "Welcome to the Blog"
```

> ⛔ **Shell scenes: inline all slots.** Header and footer MUST inline ALL sub-component slots — never use `story: default` alone.

## Image Node Format

> ⛔ **Image nodes use `type: image` with `image_style` referencing a config entity.**
> The `image_style` value MUST match a bundle name under `config.image_style` in `data-model.yml`.

```yaml
# ✅ Correct — image node with named style
- type: image
  image_style: hero
  alt: "Modern architecture building"

# ✅ Correct — image node with custom source (CSS aspect-ratio mode)
- type: image
  image_style: card
  alt: "Team photo"
  src: "/images/team.jpg"

# ❌ Wrong — missing image_style
- type: image
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
