## ADDED Requirements

### Requirement: Screenshot CLI outputs structured metadata alongside PNG

The `_debo screenshot` command SHALL output a `metadata` field in its JSON result containing scene definition details, design token summary, and component list extracted from the scene file and project config.

#### Scenario: Screenshot with full metadata
- **WHEN** `_debo screenshot --scene design-system:shell` runs
- **THEN** the JSON output includes:
  ```json
  {
    "scene": "shell",
    "storyId": "...",
    "screenshotPath": "/path/to/shell.png",
    "metadata": {
      "sceneDefinition": {
        "components": ["provider:page", "provider:header", "provider:footer"],
        "entities": [],
        "shellRef": null
      },
      "designTokens": {
        "colors": { "primary": "#2563eb", "secondary": "..." },
        "fonts": { "heading": "Inter", "body": "Inter" },
        "spacing": { "base": "1rem" }
      }
    }
  }
  ```

#### Scenario: Screenshot without design tokens
- **WHEN** `design-tokens.yml` does not exist
- **THEN** the `metadata.designTokens` field is `null`
- **AND** the screenshot still succeeds

### Requirement: Scene definition extracted from scene file

The metadata SHALL include the list of components used (by component ID), entity references, and shell scene reference extracted from the scene's `items` array.

#### Scenario: Scene with components and entities
- **WHEN** a scene contains `items: [{ component: "sdc:card" }, { entity: "node.article" }]`
- **THEN** `metadata.sceneDefinition.components` includes `"sdc:card"`
- **AND** `metadata.sceneDefinition.entities` includes `"node.article"`

#### Scenario: Scene with shell reference
- **WHEN** a scene contains `items: [{ scene: "design-system:shell", with: { content: [...] } }]`
- **THEN** `metadata.sceneDefinition.shellRef` is `"design-system:shell"`

### Requirement: Design tokens summary extracted from design-tokens.yml

The metadata SHALL include a summary of key design token values read from `$DESIGNBOOK_DATA/design-system/design-tokens.yml`. Only top-level token groups and their primary values are included — not the full token tree.

#### Scenario: Tokens file with color and typography groups
- **WHEN** `design-tokens.yml` contains `color: { primary: { value: "#2563eb" } }` and `typography: { heading: { font_family: "Inter" } }`
- **THEN** `metadata.designTokens.colors.primary` is `"#2563eb"`
- **AND** `metadata.designTokens.fonts.heading` is `"Inter"`

#### Scenario: Tokens file with spacing group
- **WHEN** `design-tokens.yml` contains `spacing: { base: { value: "1rem" } }`
- **THEN** `metadata.designTokens.spacing.base` is `"1rem"`

### Requirement: guidelines.yml visual_diff section

The `guidelines.yml` schema SHALL support an optional `visual_diff` section with viewport and default configuration for future use.

#### Scenario: guidelines.yml with visual_diff config
- **WHEN** `guidelines.yml` contains:
  ```yaml
  visual_diff:
    viewports: ["2560x1600"]
  ```
- **THEN** the visual-diff task reads these viewports for screenshot configuration

#### Scenario: guidelines.yml without visual_diff section
- **WHEN** `guidelines.yml` does not contain a `visual_diff` key
- **THEN** the default viewport `2560x1600` is used (current behavior)
