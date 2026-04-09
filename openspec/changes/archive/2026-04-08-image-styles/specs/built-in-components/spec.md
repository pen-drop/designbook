## ADDED Requirements

### Requirement: Built-in component resolution for designbook: prefix

Components with the `designbook:` prefix SHALL be resolved as built-in components in `csf-prep.ts`. They SHALL NOT go through `resolveImportPath`. Instead, their render functions SHALL be emitted inline in the generated `__imports` map.

#### Scenario: Built-in component does not trigger external import
- **WHEN** a ComponentNode references `component: "designbook:image"`
- **THEN** `csf-prep.ts` does NOT call `resolveImportPath("designbook:image")`
- **AND** the `__imports` map entry contains an inline render function

#### Scenario: Non-designbook components still use resolveImportPath
- **WHEN** a ComponentNode references `component: "provider:card"`
- **THEN** `csf-prep.ts` calls `resolveImportPath("provider:card")` as before

### Requirement: Built-in component registry

A module SHALL export a registry of built-in components keyed by component ID (e.g. `"designbook:placeholder"`, `"designbook:image"`). Each entry implements the `ComponentModule` interface: `{ render: (props, slots) => string }`.

#### Scenario: Registry contains placeholder component
- **WHEN** the built-in registry is queried for `"designbook:placeholder"`
- **THEN** it returns a ComponentModule whose render function returns an HTML string with the `props.message` content

#### Scenario: Registry contains image component
- **WHEN** the built-in registry is queried for `"designbook:image"`
- **THEN** it returns a ComponentModule whose render function returns HTML for image rendering

### Requirement: designbook:placeholder renders visible feedback

The `designbook:placeholder` built-in component SHALL render a visible HTML element showing the `props.message` value, styled as a dashed-border box with muted text.

#### Scenario: Placeholder renders message
- **WHEN** `designbook:placeholder` is rendered with `props: { message: "missing expression" }`
- **THEN** the output is an HTML string containing "missing expression" in a styled container

### Requirement: designbook:image renders picture element in provider mode

When `props.sources` is a non-empty array, `designbook:image` SHALL render a `<picture>` element with `<source>` elements for each entry and an `<img>` fallback.

#### Scenario: Picture element with multiple sources
- **WHEN** `designbook:image` is rendered with `props.sources: [{ media: "(min-width: 1200px)", src: "url1" }, { media: "(min-width: 768px)", src: "url2" }]` and `props.fallback: { src: "url3", alt: "Image" }`
- **THEN** the output contains `<picture>` with two `<source>` elements and an `<img>` with `src="url3"` and `alt="Image"`

### Requirement: designbook:image renders img element in CSS mode

When `props.sources` is empty or absent and `props.src` is set, `designbook:image` SHALL render a single `<img>` element with inline `aspect-ratio` and `object-fit` styles.

#### Scenario: Single img with CSS aspect ratio
- **WHEN** `designbook:image` is rendered with `props: { src: "/img/hero.jpg", alt: "Hero", style: { aspectRatio: "21/9", objectFit: "cover" } }`
- **THEN** the output is `<img src="/img/hero.jpg" alt="Hero" style="aspect-ratio:21/9;object-fit:cover;width:100%">`

### Requirement: designbook:image applies responsive CSS styles

When `props.responsiveStyles` is present (array of `{ media, aspectRatio }`), the component SHALL render a `<style>` block with media queries alongside the `<img>` element.

#### Scenario: Responsive CSS for custom image
- **WHEN** `designbook:image` is rendered with `props.src`, `props.style`, and `props.responsiveStyles: [{ media: "(max-width: 768px)", aspectRatio: "16/9" }]`
- **THEN** the output includes a `<style>` block with a media query overriding `aspect-ratio` at that breakpoint
