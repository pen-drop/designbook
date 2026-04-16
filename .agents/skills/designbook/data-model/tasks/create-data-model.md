---
when:
  steps: [create-data-model]
domain: [data-model, vision]
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
    optional: true
result:
  type: object
  required: [data-model]
  properties:
    data-model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
      required: [content]
      properties:
        content: { type: object, title: Content Entities }
        config: { type: object, title: Config Entities, default: {} }
---

# Data Model

Define content and config entities through dialog.
Read vision.md for product context. If data-model.yml exists, extend it.

## Gathering

### Step 1: Propose and Discuss

Analyze the product vision. Propose entity types, bundles, and fields:

> "Based on your product vision, I suggest the following data model:
>
> **[Entity Type]**
> - `[bundle]` — [description]
>   - `[field]` ([type]): [purpose]
>
> Does this match what you need? Anything to add, change, or remove?"

Iterate until the user approves. Keep the conversation focused — avoid technical schema details unless the user asks.

**Purpose assignment:** For each bundle, infer its semantic purpose from the name and description. Assign a `purpose` value when the bundle has a clear role. Known purposes from active extension rules:

- `landing-page` — a page assembled via Layout Builder or Canvas (suggest when bundle name implies a landing/home/campaign page)

When assigning purpose, check active extension rules for their purpose-conditional logic and set the appropriate `view_modes.full.template` accordingly. If no extension is active or the purpose doesn't match any rule, default view_modes to `template: field-map`.

### Step 2: Check for referenced entities

Calculate referenced entity types like media and provide them also to the user.

### Step 3: Present Final Model

Show the complete approved structure once more before saving:

> "Here's the final data model:
> [summary table or YAML preview]
>
> Ready to save?"

Once confirmed, the result is saved automatically.

## Format

```yaml
config:                   # optional — configuration entities (views, singletons)
  image_style:            # special structure — see image-style-config rule
    {style_name}:
      aspect_ratio: "W:H"
      breakpoints:        # optional
        {name}: { width: {int}, aspect_ratio: "W:H" }

  {entity_type}:          # e.g. view, block_content
    {bundle}:             # e.g. recent_articles, sidebar
      view_modes:
        {view_mode}:      # e.g. default, full
          template: ~     # required: template name from entity_mapping.templates in config
          settings: {}    # optional: template-specific settings
      fields:

content:
  {entity_type}:        # e.g. node, media, taxonomy_term
    {bundle}:           # e.g. article, landing_page
      title: ~
      description: ~
      view_modes:
        {view_mode}:    # e.g. teaser, full, card
          template: ~   # required: template name from entity_mapping.templates in config
          settings: {}  # optional: template-specific settings
      fields:
        {field_name}:
          type: ~        # required: string, text, integer, boolean, reference, ...
          title: ~
          description: ~
          required: false
          multiple: false
```

## `view_modes` and `template`

Each view mode declares a `template` that determines how the entity is mapped to components. Read available templates from `entity_mapping.templates` in `designbook.config.yml` — each has a `description` to explain its purpose.

Common templates:
- `field-map` — structured field mapping, entity fields drive component selection

During the dialog, present available templates with descriptions and ask the author which template applies to each view mode.
