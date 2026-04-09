## ADDED Requirements

### Requirement: imageStyleBuilder handles type "image" scene nodes

A new `SceneNodeBuilder` SHALL be registered that handles scene nodes with `type: "image"`. The node MUST declare `image_style` (string) and `alt` (string). The node MAY declare `src` (string).

```json
{
  "type": "image",
  "image_style": "hero",
  "alt": "Modern building",
  "src": "/images/custom.jpg"
}
```

#### Scenario: Builder matches image nodes
- **WHEN** a scene node has `type: "image"`
- **THEN** `imageStyleBuilder.appliesTo()` returns true

#### Scenario: Builder ignores non-image nodes
- **WHEN** a scene node has `type: "entity"` or `type: "component"`
- **THEN** `imageStyleBuilder.appliesTo()` returns false

### Requirement: Provider mode — no src

When an image node has no `src`, the builder SHALL use the configured image provider to generate URLs for each breakpoint. The output SHALL be a `designbook:image` ComponentNode with a `sources` array (for `<picture>` element) and a `fallback` object.

#### Scenario: Provider generates sources for responsive image style
- **WHEN** an image node has `image_style: "hero"`, no `src`, and `alt: "Building"`
- **AND** the `hero` style has `aspect_ratio: "21:9"` with breakpoints `xl: { width: 1200 }`, `md: { width: 768, aspect_ratio: "16:9" }`
- **THEN** the builder outputs a ComponentNode with `component: "designbook:image"` and props containing:
  - `sources[0]`: `{ media: "(min-width: 1200px)", src: "<picsum-url>/1200/514" }`
  - `sources[1]`: `{ media: "(min-width: 768px)", src: "<picsum-url>/768/432" }`
  - `fallback`: `{ src: "<picsum-url>/<smallest-width>/<height>", alt: "Building" }`

#### Scenario: Provider mode with no breakpoints
- **WHEN** an image node has `image_style: "avatar"` with `aspect_ratio: "1:1"` and no breakpoints
- **THEN** the builder outputs a ComponentNode with empty `sources` array and a `fallback` with a single provider URL at a reasonable default width

### Requirement: CSS mode — with src

When an image node has a `src`, the builder SHALL NOT use the provider. Instead, it SHALL output a `designbook:image` ComponentNode with CSS `aspect-ratio` and `object-fit: cover` styling.

#### Scenario: Custom image uses CSS aspect ratio
- **WHEN** an image node has `src: "/images/hero.jpg"`, `image_style: "hero"`, `alt: "Hero"`
- **AND** the `hero` style has `aspect_ratio: "21:9"`
- **THEN** the builder outputs a ComponentNode with `component: "designbook:image"` and props containing:
  - `src: "/images/hero.jpg"`
  - `alt: "Hero"`
  - `style: { aspectRatio: "21/9", objectFit: "cover" }`

#### Scenario: CSS mode with responsive breakpoints
- **WHEN** an image node has `src` and a style with responsive breakpoints
- **THEN** the builder includes responsive style information in the props for the built-in component to render as CSS

### Requirement: Image style resolution from data model

The builder SHALL read `image_styles` from `ctx.dataModel.image_styles`. If the referenced `image_style` name does not exist in the data model, the builder SHALL return a `designbook:placeholder` with an error message.

#### Scenario: Unknown image style
- **WHEN** an image node references `image_style: "nonexistent"`
- **AND** no style named `nonexistent` exists in `data-model.yml`
- **THEN** the builder returns a `designbook:placeholder` ComponentNode with a message indicating the missing style

### Requirement: BuildContext extended with config

`BuildContext` SHALL include a `config` field containing the loaded designbook configuration, so builders can access settings like `image_provider`.

#### Scenario: Config available in build context
- **WHEN** the `imageStyleBuilder.build()` method is called
- **THEN** `ctx.config.image_provider` is accessible and contains the provider configuration
