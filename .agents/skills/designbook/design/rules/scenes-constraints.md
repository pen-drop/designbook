---
trigger:
  steps: [create-scene, map-entity]
---

# Scenes Critical Constraints

> ⛔ **Rebuild Storybook before create-scene when components were created in the same run.**
> The `components` inventory for the scene is resolved from Storybook's live
> `/index.json` + SDC namespace map, both built once at startup. Components
> created earlier in the same workflow run are absent until a rebuild, so the
> resolver returns `Available: (none)` and scene validation fails one stage
> before `validate` ever runs. Run `_debo storybook start --force` once before
> the first `create-scene` of a run that added components — a preflight, not a
> failure recovery.

> Full `*.scenes.yml` format and `SceneNode` types: see [scenes/schemas.yml](../../scenes/schemas.yml).

> ⛔ **`component:` values MUST always use `provider:component` format.**
> Write `$DESIGNBOOK_COMPONENT_NAMESPACE:header`, NEVER just `header`.
> The engine substitutes `$DESIGNBOOK_COMPONENT_NAMESPACE` (and any `$VAR` /
> `${VAR}` env token) on `workflow done --data` submission. The scene file on
> disk contains the resolved provider literal (e.g. `test_integration_drupal:page`).

```yaml
# ✅ Correct — provider prefix on every component, including nested slots
- component: "$DESIGNBOOK_COMPONENT_NAMESPACE:card"
  slots:
    media:
      - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:image"
        props:
          src: https://placehold.co/400x300

# ❌ Wrong — missing provider prefix
- component: card
  slots:
    media:
      - component: image
```

> ⛔ **No `type: element` in scenes.** Use plain strings/markup for text content. `type: element` is only valid in `*.story.yml` files.

Slots accept three value types:
1. **Component references** — objects with a `component` property
2. **Plain strings / markup** — rendered as raw HTML/text content, **only as the direct scalar slot value**. ⛔ A string placed as an *array element* is passed to the component renderer (which expects a component node) and silently becomes `null` — the text just disappears. Put text in a scalar slot value, or wrap it in a component/element node when it must sit in an array alongside components.
3. **`$content` / `$variable`** — special placeholder variables

```yaml
# ✅ Correct — plain string in slot
- component: "$DESIGNBOOK_COMPONENT_NAMESPACE:heading"
  slots:
    text: "Welcome to the Blog"

# ❌ Wrong — string as an ARRAY element silently renders as null
- component: "$DESIGNBOOK_COMPONENT_NAMESPACE:header"
  slots:
    logo:
      - "Designbook"        # disappears — array items go through the component renderer

# ✅ Correct — text as a scalar slot value, components in the array
- component: "$DESIGNBOOK_COMPONENT_NAMESPACE:nav"
  slots:
    brand: "Home"           # scalar string renders
    items:
      - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:link"
        props:
          href: "/about"

# ❌ Wrong — type: element is story-only
- component: "$DESIGNBOOK_COMPONENT_NAMESPACE:heading"
  slots:
    text:
      - type: element
        tag: span
        value: "Welcome to the Blog"
```

> ⛔ **Select a component variant via `props.variant` only.** The renderer passes
> only a node's `props` to the component — a top-level `variant:` key on a scene/story
> node is silently ignored and the component renders its default. Put the variant id
> under `props`.

```yaml
# ✅ Correct — variant chosen via props
- component: "$DESIGNBOOK_COMPONENT_NAMESPACE:button"
  props:
    variant: primary

# ❌ Wrong — top-level variant is ignored, renders default
- component: "$DESIGNBOOK_COMPONENT_NAMESPACE:button"
  variant: primary
```

> ⛔ **Shell scenes: inline all slots.** Header and footer MUST inline ALL sub-component slots — never use `story: default` alone.

## Slot HTML: Inline Styles Only

> ⛔ **Slot HTML in scene files MUST use inline `style=""` attributes — never CSS framework utility classes.**

Scene YAML files are not included in CSS build tool source paths. Utility classes written in slot HTML will not be compiled and will have no effect at runtime.

```yaml
# ✅ Correct — inline styles always work
slots:
  logo: '<img src="/logo.png" alt="Logo" style="height:47px;width:auto;">'

# ❌ Wrong — utility classes are not compiled from scene YAML
slots:
  logo: '<img src="/logo.png" alt="Logo" class="h-12 w-auto">'
```

This applies to all markup strings in scene files — both in `slots:` and in `props:` that accept HTML. Component templates can use utility classes freely since they are in configured source paths.

