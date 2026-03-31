---
files: []
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
  - path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
  - path: $DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml
    workflow: debo-shape-section
---

# Intake: Design Screen

Gather all information needed to design screens for a section. The result feeds `create-component`, `create-sample-data`, `map-entity`, and `create-scene` stages.

## Step 1: Confirm Section

If the user provided a section name or id, use it directly.

If no section was provided, ask:

> "Which section would you like to design screens for?"

Wait for their response before continuing.

## Step 2: Resolve Design Reference

> ⛔ **MANDATORY**: Execute this step before any screen determination or component planning.

Follow the process in [resolve-design-reference.md](partials/resolve-design-reference.md).

If a reference was loaded, use it as the primary input for all subsequent steps. When planning screens and components, **derive them from the reference** rather than asking the user speculative questions.

## Step 3: Determine Screens

Read `data-model.yml` to understand the entities and structure of the selected section.

Based on the section name, data model, and **loaded design reference** (if available), determine which screens make sense:

- **Homepage / landing section** → suggest a single **landing page** only
- **All other sections** → suggest an **overview page** and a **detail page**

If a design reference was loaded, use the reference structure to inform the screen suggestion (e.g. if the reference shows a landing page with embedded lists, suggest that pattern).

### Overview page type (non-homepage sections only)

Before presenting the screen suggestion, determine the overview page type:

1. Check `data-model.yml` for the section's entities — look for any bundle whose `view_modes.full.template` is `layout-builder`
2. Ask the user:

> "For the **[section]** overview page, should this be:
>
> - **List page** — shows a filterable/sortable list of [entities] (e.g. blog index, product catalog)
> - **Landing page** — a curated, editorial layout (e.g. section homepage, campaign page)
>
> [If a layout-builder bundle exists: "Your data model includes a layout-builder page type (`[bundle]`) — that's typically used for landing pages."]
>
> Which fits better?"

Wait for the user's answer before continuing.

**If the user chooses landing page**, ask whether entity lists should be embedded:

> "Should the landing page include any embedded lists (e.g. a teaser list of recent [entities], featured items)?
>
> If yes — which entities, and how many items?"

This determines whether list-related components and entity mappings (e.g. teaser view modes) need to be planned alongside the landing page.

Wait for the user's answer before continuing.

Present the full screen suggestion and ask the user to confirm or adjust:

> "For the **[section]** section I suggest building these screens:
>
> 1. **Overview page** ([list page / landing page]) — [one-line description based on chosen type]
> 2. **Detail page** — full view of a single [entity]
>
> Does that work, or do you want to add/remove/rename screens?"

Wait for confirmation before continuing.

## Step 4: Plan Entities

Based on the confirmed screens and the section spec scenes, build the authoritative entity mapping work list:

1. Collect every `entity:` node across all planned screens and the section spec scenes
2. Deduplicate — same `entity.view_mode` pair may appear in multiple screens
3. Traverse `type: reference` fields in `data-model.yml` recursively — add referenced entities with their implied view_mode
4. For landing pages with embedded lists: include teaser view modes for the embedded entities
5. Verify each template has a matching rule file (`skills/*/rules/*.md` with `when: template: {name}`) — stop and report if any is missing
6. Order leaf entities first (no outgoing refs), then parents

Present the entity work list:

| Entity | View Mode | Template | Output |
| ------ | --------- | -------- | ------ |
| `[entity_type].[bundle]` | `full`   | `field-map` | `entity-mapping/[entity_type].[bundle].full.jsonata`   |
| `[entity_type].[bundle]` | `teaser` | `field-map` | `entity-mapping/[entity_type].[bundle].teaser.jsonata` |

Ask the user to confirm. Wait for confirmation.

## Step 5: Plan Components

Based on the confirmed screens, entities, section spec, data model, guidelines, and **loaded design reference** (if available):

1. Read `guidelines.yml` for component patterns and naming conventions
2. Scan existing components (location provided by framework rules)
3. Identify which UI components are needed for the planned screens beyond entities and shell (cards, filter bars, badges, stat displays, empty states, pagination, etc.)

**If a design reference is available**, analyze its structure to derive the component list. Extract components from the HTML structure rather than asking the user to describe them from scratch.

Present the component plan **grouped per entity** — list which components are needed to render each entity view mode, then list any screen-level components that are not tied to a specific entity:

**`[entity_type].[bundle]` (full)**
| Category | Component | Slots              | Purpose      |
| -------- | --------- | ------------------ | ------------ |
| Existing | heading   | text               | Reuse        |
| New      | card      | image, title, body | Content card |

**`[entity_type].[bundle]` (teaser)**
| Category | Component | Slots | Purpose |
| -------- | --------- | ----- | ------- |
| ...      | ...       | ...   | ...     |

**Screen-level (not entity-specific)**
| Category | Component | Slots | Purpose |
| -------- | --------- | ----- | ------- |
| ...      | ...       | ...   | ...     |

Ask the user to confirm or adjust. Wait for confirmation.

The following fields are **auto-set from context** (do NOT ask the user):
- `status` → `experimental`
- `provider` → from `$COMPONENT_NAMESPACE` or `designbook.config.yml`
- `description` → auto-generated from section context

## Step 6: Summary

Present a complete summary of everything that will be built before any files are written:

> "Here is what I will build for the **[section]** section:
>
> **Screens**
> - [screen 1 name] — [brief description]
> - [screen 2 name] — [brief description]
>
> **Entity Mappings** ([n] total)
> - `[entity_type].[bundle].[view_mode]` — [template]
>
> **New Components** ([n] total, grouped by entity)
> - `[entity_type].[bundle]` (full): `[component-name]` — [purpose]
> - Screen-level: `[component-name]` — [purpose]
>
> Ready to proceed?"

Wait for confirmation before proceeding to the structure preview.

## Step 7: Structure Preview

Display a full recursive ASCII tree for every screen so the user can verify the complete component structure before building starts.

**How to build the tree:**

1. Create one tree per screen
2. Start each tree from the scene inheritance (e.g. `scene: design-system:shell`) and show the `content` injection point
3. For each component in the screen, show its slots as branches
4. If a slot contains a component reference, show the component name after `←` (e.g. `← button[variant=primary]`)
5. Recursively expand every referenced component — show its own slots and nested components, all the way down to leaf nodes
6. For repeated items, use `× n` notation (e.g. `article-card × n`)
7. Show props as `(prop)` and slots as `(slot)` to distinguish them
8. Check which components already exist in `$DESIGNBOOK_HOME/components/` — mark each component as `[existing]` or `[new]`
9. Where a variant is selected, show it in bracket notation (e.g. `button[variant=outline]`)
10. Show entity mappings and their view modes where applicable

**Present each screen tree using this format:**

```
Screen Structure: Blog Overview
═══════════════════════════════

scene: design-system:shell
└── content
    ├── hero-banner (slot)
    │   ├── heading (prop)
    │   └── cta (slot) ← button[variant=primary]  [existing]
    ├── filter-bar (slot)                           [new]
    │   └── tag-filter × n
    └── article-list
        └── article-card × n                        [new]
            ├── image (slot) ← image
            ├── title (prop)
            ├── excerpt (prop)
            └── cta (slot) ← button[variant=outline] [existing]

Screen Structure: Blog Detail
═════════════════════════════

scene: design-system:shell
└── content
    └── article-detail                              [new]
        ├── hero-image (slot) ← image
        ├── title (prop)
        ├── body (slot) ← rich-text
        └── related (slot)
            └── article-card × 3                    [existing]

Components: 3 new (filter-bar, article-card, article-detail), 2 existing (button, rich-text)
Entity Mappings: article.blog.teaser, article.blog.full
Scenes: 2 (overview, detail)
```

**After all screen trees**, present a combined summary at the bottom:
- Total new components (with names)
- Total existing components (with names)
- Entity mappings (entity.bundle.view_mode format)
- Total scenes

Wait for the user to confirm the structure before handing off to the next stage.

**Guardrails**

- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell for navigation context
- Each screen should address specific user flows from the section spec
- Consider responsive behavior for all screens
