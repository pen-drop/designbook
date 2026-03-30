## ADDED Requirements

### Requirement: Test stage with four steps in design workflows

The design-shell, design-screen, and design-component workflows SHALL declare a `test` stage with `steps: [screenshot, resolve-reference, visual-compare, polish]`.

#### Scenario: design-shell with test stage
- **WHEN** the design-shell workflow is loaded
- **THEN** its frontmatter contains `stages: { execute: { steps: [...] }, test: { steps: [screenshot, resolve-reference, visual-compare, polish] } }`

#### Scenario: design-screen with test stage
- **WHEN** the design-screen workflow is loaded
- **THEN** its frontmatter contains a test stage with the same four steps

#### Scenario: design-component with test stage
- **WHEN** the design-component workflow is loaded
- **THEN** its frontmatter contains a test stage with the same four steps

### Requirement: Core intake asks for references when design source is configured

The intake step in design-shell, design-screen, and design-component workflows SHALL check `guidelines.yml` for a `design_reference` or `references` entry. If present, the intake asks the user to provide a reference for each scene or component.

#### Scenario: Design source configured — intake asks for reference
- **WHEN** `guidelines.yml` contains a `design_reference` or `references` entry
- **THEN** the intake asks: "Which design reference for this scene/component?" with the reference type defaulting to the configured source type
- **AND** optionally asks for per-breakpoint `screens` mapping

#### Scenario: No design source — intake skips reference question
- **WHEN** `guidelines.yml` has no `design_reference` or `references` entry
- **THEN** the intake does not ask for references

#### Scenario: User skips reference during intake
- **WHEN** the user declines to provide a reference
- **THEN** the scene/component is created without a `reference` block

### Requirement: screenshot task captures Storybook at all breakpoints

The `designbook/design/tasks/screenshot.md` task SHALL read breakpoints from `design-tokens.yml`, resolve the Storybook URL via `_debo resolve-url`, and capture one Playwright screenshot per breakpoint plus a desktop default.

#### Scenario: Breakpoints defined in tokens
- **WHEN** `design-tokens.yml` contains `breakpoints: { sm: 640px, md: 768px, lg: 1024px }`
- **THEN** the task captures screenshots at viewports 640xAUTO, 768xAUTO, 1024xAUTO, and 2560x1600 (desktop default)
- **AND** saves them to `designbook/screenshots/{storyId}/storybook/{breakpoint}.png`

#### Scenario: No breakpoints in tokens
- **WHEN** `design-tokens.yml` does not contain a `breakpoints` group
- **THEN** the task captures only the default viewport (2560x1600) and saves to `designbook/screenshots/{storyId}/storybook/default.png`

#### Scenario: Filtered breakpoints in guidelines
- **WHEN** `guidelines.yml` contains `visual_diff.breakpoints: [sm, xl]`
- **THEN** only `sm` and `xl` breakpoints are screenshotted (plus desktop default)

### Requirement: resolve-reference task delegates to matched rules

The `designbook/design/tasks/resolve-reference.md` task SHALL read the scene's `reference` block, then read all matched rules for this step. Rules provide instructions for resolving specific reference types. The task follows the matched rule instructions.

#### Scenario: URL reference with website — rule provides screenshot instructions
- **WHEN** the scene has `reference: { type: url, url: "https://example.com" }`
- **AND** the url-reference rule matches
- **THEN** the task follows the rule: screenshot the URL at each breakpoint via Playwright and saves to `designbook/screenshots/{storyId}/reference/{breakpoint}.png`

#### Scenario: URL reference with image — rule provides fetch instructions
- **WHEN** the scene has `reference: { type: image, url: "https://example.com/mockup.png" }`
- **AND** the image-reference rule matches
- **THEN** the task follows the rule: fetch the image directly via WebFetch/Read and saves to `designbook/screenshots/{storyId}/reference/default.png`

#### Scenario: Stitch reference — extension rule provides MCP instructions
- **WHEN** the scene has `reference: { type: stitch, ... }`
- **AND** the stitch-reference rule from designbook-stitch matches
- **THEN** the task follows the rule: use mcp__stitch__get_screen

#### Scenario: No reference block
- **WHEN** the scene has no `reference` block
- **THEN** the task skips with message "No reference — skipping"

#### Scenario: Unknown reference type with no matching rule
- **WHEN** `reference.type` has no matching rule
- **THEN** the task reports a warning and skips

### Requirement: Per-breakpoint references in scene schema

The `reference` block in scenes.yml SHALL support a `screens` object mapping breakpoint keys to reference URLs for per-breakpoint comparison.

#### Scenario: Per-breakpoint stitch references
- **WHEN** a scene has:
  ```yaml
  reference:
    type: stitch
    screens:
      xl: stitch://project/screen-123
      sm: stitch://project/screen-456
  ```
- **THEN** the resolve-reference task resolves each screen separately per breakpoint

#### Scenario: Single URL fallback
- **WHEN** a scene has `reference: { type: url, url: "https://..." }` without `screens`
- **THEN** the URL is used for all breakpoints

#### Scenario: Missing breakpoint falls back to largest defined
- **WHEN** `screens` has no entry for breakpoint `lg`
- **BUT** has entries for `xl` and `sm`
- **THEN** the largest defined breakpoint reference (`xl`) is used for `lg`

### Requirement: Component references via framework skill rules

Components don't have `*.scenes.yml` files. The reference schema (type, url, title, screens) is identical, but storage is framework-specific. Core tasks delegate to framework skill rules for reading and writing component references.

#### Scenario: Resolve reference for a component
- **WHEN** the `resolve-reference` task targets a component (not a scene)
- **THEN** it reads matched framework skill rules for `resolve-reference` step
- **AND** the framework rule reads the reference from the component's framework-specific file and returns the normalized reference schema

#### Scenario: Store reference during component intake
- **WHEN** the `design-component:intake` step asks the user for a reference
- **AND** the user selects a reference (with optional per-breakpoint screens)
- **THEN** the intake delegates to the framework skill's component-reference rule to store the reference in the framework-specific component file

#### Scenario: Component has no framework rule for references
- **WHEN** no framework skill rule matches for component reference resolution
- **THEN** the resolve-reference task skips with a warning ("No component-reference rule — skipping")

### Requirement: visual-compare task produces structured report

The `designbook/design/tasks/visual-compare.md` task SHALL read screenshots, references, text context (scene definition, design tokens, guidelines), and any extra context from rules (computed styles, a11y). It performs an AI visual comparison per breakpoint and outputs a structured report.

#### Scenario: Compare with full context
- **WHEN** screenshots, references, and extra context (DevTools) are available
- **THEN** the report includes Layout, Colors, Fonts, Spacing, Accessibility rows per breakpoint

#### Scenario: Compare without reference
- **WHEN** screenshots exist but no reference was resolved
- **THEN** the report focuses on token compliance (do rendered values match design-tokens.yml?)

#### Scenario: Compare without extra context
- **WHEN** no DevTools context is available
- **THEN** the report is based on visual comparison and text context only (tokens, scene definition)

### Requirement: polish task iterates fix loop

The `designbook/design/tasks/polish.md` task SHALL read the visual-compare report. If issues exist, it fixes code, re-screenshots via Playwright, re-compares, and loops until resolved or max iterations reached.

#### Scenario: Issues found — fix and re-compare
- **WHEN** the visual-compare report contains issues
- **THEN** the polish task fixes the code (components, CSS, scenes)
- **AND** re-screenshots using `_debo resolve-url` + Playwright
- **AND** re-compares against references
- **AND** loops until all issues resolved or max iterations

#### Scenario: No issues — skip
- **WHEN** the visual-compare report has no issues
- **THEN** the polish task completes immediately

#### Scenario: Max iterations reached
- **WHEN** the fix loop reaches max iterations with remaining issues
- **THEN** the task reports what was fixed and what remains

### Requirement: _debo resolve-url replaces _debo screenshot

The CLI SHALL provide `_debo resolve-url` and remove `_debo screenshot`.

#### Scenario: Resolve scene reference to URL
- **WHEN** `_debo resolve-url --scene design-system:shell` is called
- **THEN** it outputs the Storybook iframe URL

#### Scenario: Resolve by file path
- **WHEN** `_debo resolve-url --file path/to/scenes.yml --scene product-detail` is called
- **THEN** it outputs the iframe URL for that scene

#### Scenario: _debo screenshot removed
- **WHEN** `_debo screenshot` is called
- **THEN** the command is not recognized

### Requirement: design-test workflow removed

#### Scenario: design-test no longer exists
- **WHEN** a user runs `debo design-test`
- **THEN** the command is not recognized

### Requirement: Scene schema reference block extended with screens and url type

The `reference` definition in `scenes-schema.md` SHALL be extended with a `screens` object and a `url` type to support per-breakpoint references and website references.

#### Scenario: Extended reference schema
- **WHEN** the scenes schema is loaded
- **THEN** the `reference` definition includes:
  ```yaml
  reference:
    type: object
    properties:
      type:
        type: string
        enum: [stitch, image, figma, url]
      url:
        type: string
      title:
        type: string
      screens:
        type: object
        description: Per-breakpoint reference URLs. Keys MUST match breakpoint names from design-tokens.yml (e.g. sm, md, lg, xl).
        additionalProperties:
          type: string
  ```

#### Scenario: screens and url are mutually exclusive
- **WHEN** a reference has both `url` and `screens`
- **THEN** `screens` takes precedence; `url` is ignored

### Requirement: URL and image reference rules in core

The `designbook` skill SHALL provide core rules for `url` and `image` reference types in `designbook/design/rules/`.

#### Scenario: url-reference rule matched
- **WHEN** a scene has `reference.type: url` and the URL is a website
- **THEN** `designbook/design/rules/url-reference.md` matches for the `resolve-reference` step
- **AND** instructs the agent to screenshot the URL at each breakpoint via Playwright

#### Scenario: image-reference rule matched
- **WHEN** a scene has `reference.type: image`
- **THEN** `designbook/design/rules/image-reference.md` matches for the `resolve-reference` step
- **AND** instructs the agent to fetch the image via WebFetch or Read
