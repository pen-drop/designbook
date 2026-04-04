## Context

Images in Designbook are currently stored as baked `<img>` HTML strings in `data.yml`. The rendering pipeline (EntityBuilder → JSONata → ComponentNode → CSF → browser) passes these strings through without awareness of aspect ratios or responsive needs. The `designbook:placeholder` component reference already exists but resolves to a no-op warn stub because there is no built-in component system — `csf-prep.ts` only knows how to resolve external `.component.yml` imports.

Key files in the current pipeline:
- `scene-module-builder.ts` — orchestrates YAML → BuilderRegistry → ComponentNode[] → CSF
- `builder-registry.ts` — dispatches scene nodes to matching builders
- `csf-prep.ts` — collects component IDs, resolves imports, emits CSF module string
- `renderer.ts` — runtime: walks ComponentNode trees, calls `mod.render(props, slots)`
- `entity-builder.ts` — resolves `type: 'entity'` via JSONata expressions

## Goals / Non-Goals

**Goals:**
- Decouple image aspect ratio from sample data — data stores identity, not presentation
- Allow the same image to render at different aspect ratios depending on view mode
- Support responsive aspect ratios per breakpoint (independent from CSS breakpoints)
- Make the image placeholder provider configurable (not hardcoded to Picsum)
- Establish a built-in component system (`designbook:*`) for internal rendering needs

**Non-Goals:**
- Art direction / focal point cropping
- Image optimization (srcset with density descriptors, lazy loading, LQIP)
- CSS framework integration for image styles (Tailwind classes etc.)
- Supporting non-HTML renderers (React, Vue) — HTML string output only for now

## Decisions

### Decision 1: Built-in component system via inline render functions

**Choice:** `designbook:*` prefixed component IDs are resolved in `csf-prep.ts` to inline JS render functions, not external imports.

**Why:** Built-in components are pure HTML generators with no external dependencies. Creating `.component.yml` files for them would be artificial — they don't belong to any provider and shouldn't appear in the component library.

**How:** `csf-prep.ts` checks `componentId.startsWith('designbook:')` and emits the render function inline in the `__imports` map. A registry of built-in components is exported from a new `built-in-components.ts` module.

**Alternative considered:** Registering built-ins as virtual modules via the Vite plugin — rejected because it adds complexity and the render functions are small enough to inline.

### Decision 2: Image styles defined in `data-model.yml` (not separate file)

**Choice:** `image_styles` is a new top-level section in `data-model.yml`, alongside `content` and `config`.

**Why:** Image styles are part of the data architecture — they define how media entities are presented. Keeping them in `data-model.yml` avoids introducing a new file type that every skill and tool would need to discover.

**Alternative considered:** Separate `image-styles.yml` file — rejected because it fragments the data model and creates a new discovery path.

### Decision 3: Image provider configured in `designbook.config.yml`

**Choice:** A new `image_provider` key in `designbook.config.yml` with `type` (string, default `"picsum"`) and optional provider-specific settings.

```yaml
# designbook.config.yml
image_provider:
  type: picsum
```

**Why:** The provider is an environment concern (like `backend` or `framework_component`), not a data model concern. Different environments may want different providers.

**Alternative considered:** Putting provider config in `data-model.yml` — rejected because provider choice is orthogonal to the style definitions.

### Decision 4: `imageStyleBuilder` as a new SceneNodeBuilder

**Choice:** A new builder registered alongside `entityBuilder`, `sceneBuilder`, and `componentBuilder`. It handles nodes with `type: "image"`.

**Node contract:**
```json
{
  "type": "image",
  "image_style": "hero",
  "alt": "Description",
  "src": "/optional/custom/path.jpg"
}
```

**Build output:** A `ComponentNode` with `component: "designbook:image"` and resolved props (sources array for `<picture>`, fallback, inline styles).

**Why:** The builder pattern is already established and well-tested. Adding a new builder is the natural extension point. The builder reads `image_styles` from `ctx.dataModel` and provider config from a new `ctx.config` field (or loaded separately).

### Decision 5: Provider contract — simple function interface

**Choice:** A provider is a function: `(width: number, height: number) => string` that returns an image URL. Each invocation gets a random or sequential ID to ensure variety.

**Built-in providers:**
- `picsum`: `https://picsum.photos/id/{randomId}/{width}/{height}`

**Why:** Minimal interface. Custom providers can be added later without changing the builder.

### Decision 6: Sample data stores `{ alt, src? }` — no HTML

**Choice:** Image fields in `data.yml` become objects with `alt` (required) and `src` (optional). No `src` = provider generates the image. The `src` field is for custom/local images.

```yaml
field_media:
  alt: "Modern architecture building"
  # src: "/images/custom.jpg"  # optional
```

**Why:** Clean separation of data (what is this image?) from presentation (how big and what ratio?).

### Decision 7: Breakpoints are image-style-specific, not global

**Choice:** Each image style defines its own breakpoints with `width` and optional `aspect_ratio` override.

```yaml
image_styles:
  hero:
    aspect_ratio: 21:9
    breakpoints:
      xl: { width: 1200 }
      md: { width: 768, aspect_ratio: 16:9 }
      sm: { width: 480, aspect_ratio: 4:3 }
```

**Why:** Image breakpoints often don't align with CSS layout breakpoints. A hero image might switch ratio at 768px while the layout reflows at 640px. Coupling them would be limiting.

The breakpoint names are arbitrary labels — the builder converts them to `min-width` media queries based on the `width` value, ordered largest-first for `<source>` elements.

## Risks / Trade-offs

- **[Breaking change: existing data.yml]** → Mitigation: documented in proposal. Users must regenerate sample data. The skill's `create-sample-data` stage will produce the new format automatically.
- **[Built-in components are HTML-only]** → Acceptable for now. React/Vue support would need a different render strategy (returning framework elements instead of strings). This can be added later by making the built-in registry framework-aware.
- **[Provider generates random IDs]** → Images change on every regeneration. Acceptable for placeholder content. If determinism is needed later, a seed-based approach can be added without changing the interface.
- **[No `ctx.config` in BuildContext today]** → The `imageStyleBuilder` needs access to designbook config for the provider setting. BuildContext must be extended with a `config` field, loaded in `scene-module-builder.ts`.

## Open Questions

- Should the `designbook:image` component support a `caption` slot for `<figure>` wrapping, or is that the consuming component's responsibility? (Leaning: consuming component's responsibility — keep `designbook:image` focused on image rendering only.)
