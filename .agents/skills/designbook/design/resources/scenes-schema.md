# Scenes YAML Schema

JSON Schema defining the `*.scenes.yml` file format.

```yaml
type: object
required: [scenes]
properties:
  group:
    type: string
    description: Storybook story group (e.g. "Designbook/Design System"). Falls back to name.
  id:
    type: string
    description: Section/shell identifier for Designbook overview pages.
  title:
    type: string
    description: Human-readable title for overview page.
  description:
    type: string
    description: Section description for overview page.
  status:
    type: string
    enum: [planned, in-progress, done]
  order:
    type: integer
    description: Display order in Storybook sidebar.
  scenes:
    type: array
    items:
      $ref: "#/$defs/SceneDef"

$defs:
  SceneDef:
    type: object
    required: [name, items]
    properties:
      name:
        type: string
        description: Display name in Storybook sidebar.
      items:
        type: array
        items:
          $ref: "#/$defs/SceneNode"
      section:
        type: string
        description: Section ID for data loading.
      docs:
        type: string
      reference:
        type: array
        description: Design references for visual diff testing. Each entry represents one breakpoint with its own source type, URL, and optional diff threshold.
        items:
          type: object
          required: [type, url, breakpoint]
          properties:
            type:
              type: string
              type: string
              description: Built-in types are "url" and "image". Integration skills can register additional types (e.g. stitch, figma).
            url:
              type: string
            breakpoint:
              type: string
              description: Breakpoint name from design-tokens.yml (e.g. sm, md, lg, xl). Only breakpoints with a reference entry get screenshotted.
            threshold:
              type: number
              default: 3
              description: Diff threshold in percent. Differences below this value are considered a PASS. Default 3%.
            title:
              type: string

  SceneNode:
    description: >
      Duck-typed by its identifying key. Exactly one of: component, entity, scene.
    oneOf:
      - $ref: "#/$defs/ComponentNode"
      - $ref: "#/$defs/EntityNode"
      - $ref: "#/$defs/SceneRefNode"

  ComponentNode:
    type: object
    required: [component]
    description: Render a UI component directly.
    properties:
      component:
        type: string
        description: "provider:component-name format (e.g. $COMPONENT_NAMESPACE:card)"
      props:
        type: object
        description: Data/configuration values passed to the component.
      slots:
        type: object
        description: >
          Named content slots. Values can be: string, SceneNode, or array of SceneNode.
        additionalProperties:
          oneOf:
            - type: string
            - $ref: "#/$defs/SceneNode"
            - type: array
              items:
                $ref: "#/$defs/SceneNode"
      story:
        type: string
        description: Load args from an existing story variant.

  EntityNode:
    type: object
    required: [entity]
    description: >
      Render an entity from sample data via JSONata mapping.
      Entity format: "entity_type.bundle" (e.g. [entity_type].[bundle]) or "[listing_type].[bundle]" for listings.
    properties:
      entity:
        type: string
        description: "entity_type.bundle (e.g. [entity_type].[bundle])"
      view_mode:
        type: string
        description: Which view mode to use for entity mapping.
      record:
        type: integer
        default: 0
        description: Sample data record index.
      records:
        type: array
        items:
          type: integer
        description: >
          Demo-only shorthand. Expands to separate entries per index.
          Do NOT use for listing pages — use view.* entities instead.

  SceneRefNode:
    type: object
    required: [scene]
    description: Embed another scene and fill its $variable placeholders.
    properties:
      scene:
        type: string
        description: "source:sceneName format (e.g. design-system:shell)"
      with:
        type: object
        description: >
          Fills $variable placeholders in the referenced scene.
          Keys are variable names (without $), values are SceneNode arrays or strings.
        additionalProperties:
          oneOf:
            - type: string
            - type: array
              items:
                $ref: "#/$defs/SceneNode"
```

## ComponentNode Output

All SceneNodes resolve to `ComponentNode[]` at build time. This is also the output format for JSONata entity-mapping expressions:

```yaml
type: object
required: [component]
properties:
  component:
    type: string
    description: "provider:component-name (e.g. $COMPONENT_NAMESPACE:heading)"
  props:
    type: object
  slots:
    type: object
    additionalProperties:
      oneOf:
        - type: string
        - $ref: "#/$defs/ComponentNode"
        - type: array
          items:
            $ref: "#/$defs/ComponentNode"
```
