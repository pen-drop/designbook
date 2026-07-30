---
title: "Create Data Model"
trigger:
  steps: [create-data-model]
domain: [data-model, vision]
params:
  type: object
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      workflow: vision
      type: object
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
result:
  type: object
  required: [data-model]
  properties:
    data-model:
      path: $DESIGNBOOK_DATA/data-model.yml
      $ref: ../schemas.yml#/DataModel
---

# Data Model

Define content and config entities through dialog.
If an existing data model is provided, extend it.

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
      form_modes:
        {form_mode}:    # e.g. default, register — the edit half of the bundle
          template: ~   # required: template name from entity_mapping.templates in config
          label: ~      # optional: human-readable name for a non-default form mode
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

## `view_modes` and `form_modes`

A bundle has two display halves: **reading** and **editing**. `view_modes` is the reading half (how the
entity is shown); `form_modes` is the editing half (how the entity is edited) — the same concept one step
over. Both are declared with the identical shape: each mode carries a required `template`, an optional
`label`, and optional `settings`.

`default` is the mode every bundle always has — the plain read display and the plain edit form. Declare
additional named modes only when the bundle is shown or edited through more than one variant (e.g. a
`register` form mode alongside the `default` edit form).

Examples:

```yaml
content:
  node:
    article:
      view_modes: { teaser: { template: card }, full: { template: article } }
      form_modes: { default: { template: form } }
  user:
    user:
      form_modes:
        default: { template: form }
        register: { template: form, label: Register }
```
