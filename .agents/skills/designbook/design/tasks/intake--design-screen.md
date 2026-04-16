---
when:
  steps: [design-screen:intake]
domain: [components, components.layout]
params:
  type: object
  properties:
    reference_dir: { type: string, default: "" }
result:
  type: object
  required: [component, output_path, entity_mappings, section_id, section_title]
  properties:
    component:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    output_path:
      type: string
    entity_mappings:
      type: array
      items:
        $ref: ../schemas.yml#/EntityMapping
    section_id:
      type: string
    section_title:
      type: string
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
  - path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
  - path: $DESIGNBOOK_DATA/vision.md
  - path: $DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml
    workflow: debo-shape-section
---

# Intake: Design Screen

Gather all information needed to design one screen for a section. This workflow builds one scene per run. The `extract-reference` stage runs after intake — design reference data is not available during intake.

## Step 1: Confirm Section

If the user provided a section name or id, use it directly.

If no section was provided, ask:

> "Which section would you like to design a screen for?"

Wait for their response before continuing.

## Step 2: Determine Screen

Read `data-model.yml` to understand the entities and structure of the selected section.

Based on the section name, data model, and **loaded design reference** (if available), determine which screen to build in this run:

> "Which screen would you like to build for the **[section]** section?
>
> - **Landing page** -- a curated, editorial layout (e.g. section homepage, campaign page)
> - **Overview page** -- shows a filterable/sortable list of [entities] (e.g. blog index, product catalog)
> - **Detail page** -- full view of a single [entity]
>
> [If a layout-builder bundle exists: "Your data model includes a layout-builder page type (`[bundle]`) -- that's typically used for landing pages."]"

Wait for the user's answer before continuing.

**If the user chooses landing page**, ask whether entity lists should be embedded:

> "Should the landing page include any embedded lists (e.g. a teaser list of recent [entities], featured items)?
>
> If yes -- which entities, and how many items?"

This determines whether list-related components and entity mappings (e.g. teaser view modes) need to be planned alongside the landing page.

Wait for the user's answer before continuing.

## Step 3: Plan Entities

Based on the confirmed screen and the section spec scenes, build the authoritative entity mapping work list:

1. Collect every `entity:` node for the planned screen and the section spec scenes
2. Deduplicate -- same `entity.view_mode` pair may appear in multiple contexts
3. Traverse `type: reference` fields in `data-model.yml` recursively -- add referenced entities with their implied view_mode
4. For landing pages with embedded lists: include teaser view modes for the embedded entities
5. Verify each template has a matching rule file (`skills/*/rules/*.md` with `when: template: {name}`) -- stop and report if any is missing
6. Order leaf entities first (no outgoing refs), then parents

Present the entity work list:

| Entity | View Mode | Template | Output |
| ------ | --------- | -------- | ------ |
| `[entity_type].[bundle]` | `full`   | `field-map` | `entity-mapping/[entity_type].[bundle].full.jsonata`   |
| `[entity_type].[bundle]` | `teaser` | `field-map` | `entity-mapping/[entity_type].[bundle].teaser.jsonata` |

Ask the user to confirm. Wait for confirmation.

## Step 4: Plan Components

Based on the confirmed screen, entities, section spec, data model, and **loaded design reference** (if available):

1. Scan existing components (location provided by framework rules)
3. Identify which UI components are needed for the planned screen beyond entities and shell (cards, filter bars, badges, stat displays, empty states, pagination, etc.)

**If `$reference_dir` is non-empty and `$reference_dir/extract.json` exists**, analyze the landmark structure and interactive patterns to derive the component list rather than asking the user to describe components from scratch.

Present the component plan **grouped per entity** -- list which components are needed to render each entity view mode, then list any screen-level components that are not tied to a specific entity:

**`[entity_type].[bundle]` (full)**
| Category | Component | Slots              | Purpose      |
| -------- | --------- | ------------------ | ------------ |
| Existing | heading   | text               | Reuse        |
| New      | card      | image, title, body | Content card |

**Screen-level (not entity-specific)**
| Category | Component | Slots | Purpose |
| -------- | --------- | ----- | ------- |
| ...      | ...       | ...   | ...     |

Ask the user to confirm or adjust. Wait for confirmation.

The following fields are **auto-set from context** (do NOT ask the user):
- `status` -> `experimental`
- `provider` -> from `$DESIGNBOOK_COMPONENT_NAMESPACE` or `designbook.config.yml`
- `description` -> auto-generated from section context

## Step 5: Summary

Present a complete summary of everything that will be built:

> "Here is what I will build for the **[section]** section (**[screen type]**):
>
> **Entity Mappings** ([n] total)
> - `[entity_type].[bundle].[view_mode]` -- [template]
>
> **New Components** ([n] total, grouped by entity)
> - `[entity_type].[bundle]` (full): `[component-name]` -- [purpose]
> - Screen-level: `[component-name]` -- [purpose]
>
> Ready to proceed?"

Wait for confirmation before proceeding to the structure preview.

## Step 6: Structure Preview

Display a full recursive ASCII tree for the screen so the user can verify the complete component structure before building starts.

Follow the process in [structure-preview.md](partials/structure-preview.md).

**Input for the tree:**
- One tree for the single screen
- Tree starts from `scene: design-system:shell` with `content` injection point
- Show entity mappings and view modes where applicable
- Title: "Screen Structure: [Screen Name]"

**Guardrails**

- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell for navigation context
- Consider responsive behavior

## Step 7: Complete Intake

Store all results as task data:

- **`component`**: one entry per new component from Step 4. Each item needs `component` (name) and `slots` (array). When `$reference_dir` is non-empty and `$reference_dir/extract.json` exists, also include `reference_screenshot` (absolute path to `$reference_dir/reference-full.png`) and `design_hint` on each component item.
- **`output_path`**: `$DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml`
- **`entity_mappings`**: one entry per entity mapping from Step 3. Each item has `entity_type`, `bundle`, `view_mode`.
- **`section_id`**: the confirmed section ID
- **`section_title`**: the confirmed section title
