## Why

Images in sample data are currently baked as `<img>` HTML tags with fixed dimensions (e.g. `<img src="https://picsum.photos/id/42/1200/630" alt="...">`). This means the aspect ratio is locked at data generation time, but the same entity is often displayed in different view modes (teaser, card, hero) that require different aspect ratios. There is no way to express "this image should be 16:9 on desktop and 4:3 on mobile" — the rendering context is lost.

## What Changes

- **New `image_styles` section in `data-model.yml`** — defines named image styles with aspect ratios and responsive breakpoints (independent from CSS breakpoints), each breakpoint with a fixed width and optional aspect ratio override.
- **New configurable image provider** — replaces hardcoded Picsum URLs. Provider is set in designbook config (default: picsum). Provider contract: generate a URL for a given width × height.
- **New `imageStyleBuilder`** — a `SceneNodeBuilder` that handles `type: "image"` scene nodes, resolves the image style definition, queries the provider, and outputs a `designbook:image` `ComponentNode`.
- **New built-in component system** — `designbook:*` prefixed components are resolved as inline JS render functions (not external imports). Ships `designbook:placeholder` (fixing the current no-op stub) and `designbook:image` (renders `<picture>` or `<img>` with CSS aspect-ratio).
- **Sample data no longer contains `<img>` tags** — image fields store only `alt` (required) and optionally `src` (path to a custom image). No `src` means the provider generates the image. **BREAKING**: existing `data.yml` files with `<img>` tag strings in image fields must be regenerated.
- **Image style assignment happens in entity mappings** — `.jsonata` files output `{ type: "image", image_style: "hero", src: field_media.src, alt: field_media.alt }` instead of passing raw HTML through.

## Capabilities

### New Capabilities
- `image-styles`: Image style definitions in data-model.yml with aspect ratios and responsive breakpoints
- `image-provider`: Configurable image provider system for generating placeholder image URLs
- `image-style-builder`: SceneNodeBuilder that resolves `type: "image"` nodes using image styles and providers
- `built-in-components`: Built-in component system for `designbook:*` prefixed components (inline JS render functions)

### Modified Capabilities
- `sample-data-field-templates`: Image sample template must generate `{ alt, src? }` objects instead of `<img>` HTML strings
- `scene-runtime`: Runtime must support built-in components in the `__imports` map without requiring external import paths

## Impact

- **storybook-addon-designbook** (Part 2): New builder, built-in component system in csf-prep, new `designbook:image` component
- **designbook-drupal** (Part 3): Updated `image` sample data rule — no more `<img>` tags
- **designbook core** (Part 1): `data-model.yml` schema extended with `image_styles` section
- **designbook-configuration** spec: Provider config added to designbook config
- **Existing projects**: `data.yml` files with image fields need regeneration (breaking)
