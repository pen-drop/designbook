---
name: /debo-design-screen
id: debo-design-screen
category: Designbook
description: Create screen design components for a section
---

Help the user create screen design components for one of their roadmap sections. Each section gets a single `{section}.scenes.yml` file containing all scenes (pages/views) for that section.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured summary showing what WOULD be created — file paths, component names, view modes, and scene definitions. This enables testing without side effects.

**Steps**

## Step 1: Load Configuration & Check Prerequisites

Load configuration using the `@designbook-configuration` skill to resolve environment variables (`$DESIGNBOOK_FRAMEWORK_COMPONENT`, `$DESIGNBOOK_FRAMEWORK_CSS`, `$DESIGNBOOK_DIST`, `$DESIGNBOOK_DRUPAL_THEME`).

Check if the following files exist for the target section:

- `$DESIGNBOOK_DIST/sections/[section-id]/*.section.scenes.yml` — section scenes file (required)
- `$DESIGNBOOK_DIST/sections/[section-id]/data.yml` — sample data (required)
- `$DESIGNBOOK_DIST/data-model.yml` — data model (required)
- `$DESIGNBOOK_DIST/shell/spec.shell.scenes.yml` — application shell (required)
- Page, header, footer components in `$DESIGNBOOK_DRUPAL_THEME/components/` (required)
- `$DESIGNBOOK_DIST/design-system/design-tokens.yml` — design tokens (optional)

**If shell or shell components are missing**, tell the user:

> "Before creating screen designs, you need the application shell. Please run `/debo-design-shell` first."

Stop here.

**If section spec or data are missing**, tell the user:

> "Before creating screen designs for this section, you need:
>
> 1. `/debo-shape-section` — Define the section specification
> 2. `/debo-sample-data` — Create sample data
>
> Please run these commands first."

Stop here.

Read all available prerequisite files to understand the full context.

## Step 2: Select Section

Parse the sections directory and identify sections that have both spec and data. Present them:

> "Sections ready for screen design:
>
> 1. **[Section 1]** — ✓ Spec, ✓ Data [, ✓ Scenes already exist]
> 2. **[Section 2]** — ✓ Spec, ✓ Data
>
> Which section would you like to design?"

Wait for their response.

## Step 3: Execute

Based on the section spec, sample data, data model, and shell, execute the following sub-steps in order. Each sub-step loads its skill just-in-time.

> **If `--spec` mode:** Instead of executing, output a summary of what WOULD be created for each sub-step (file paths, component names, view mode mappings, scene definitions). Then stop.

### 3.1 — Generate UI Components

> ⛔ **Read skill now:** `@designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT/SKILL.md` and its resources.

**3.1.1 — Analyze & Propose:**

Review the section spec, data model, and sample data. Identify UI components needed beyond entities and shell (filter bars, cards, badges, stat displays, empty states, pagination, etc.). Check `$DESIGNBOOK_DRUPAL_THEME/components/` for existing components that can be reused.

Present proposals to the user:

> "For **[Section Title]**, I suggest these UI components:
>
> | #   | Component         | Slots                        | Purpose                         |
> | --- | ----------------- | ---------------------------- | ------------------------------- |
> | 1   | **search-filter** | query, filters               | Search bar with filter controls |
> | 2   | **pet-card**      | image, title, badges, action | Pet listing card                |
> | ✓   | ~~heading~~       | _(exists)_                   | Reuse existing                  |
>
> Want to adjust, add, or remove any? Or proceed with these?"

Wait for user response. Adjust the list based on feedback.

**3.1.2 — Confirm Each Component:**

For each new component, present component-specific details for user confirmation:

> "**Component: [name]**
>
> **Slots:** [slot list with descriptions]
> **Variants:** [variant list or 'default only']
> **Props:** [prop list or 'none']
>
> Look good? (y / adjust)"

Wait for confirmation. Allow the user to refine slots, add variants, or adjust props.

The following fields are **auto-set from context** (do NOT ask the user):

- `status` → `experimental`
- `provider` → from `$DESIGNBOOK_DRUPAL_THEME` name or designbook.config.yml
- `description` → auto-generated from section context

**3.1.3 — Create Components:**

After user confirms all components, create each one using the component skill. Follow the skill's execution steps for file generation and validation.

If no new UI components are needed, skip this sub-step.

### 3.2 — Generate View Modes

> ⛔ **Read skill now:** `@designbook-view-modes/SKILL.md`

Check `$DESIGNBOOK_DIST/view-modes/` for existing view mode files. For each entity type/bundle/view mode combination needed by the section's scenes:

- If the `.jsonata` file already exists, reuse it
- If not, create it following the view-modes skill

### 3.3 — Generate Scenes File

> ⛔ **Read skill now:** `@designbook-scenes/SKILL.md`

Create a single `{section}.scenes.yml` file at `$DESIGNBOOK_DIST/sections/{section}/{section}.scenes.yml` with all scenes for the section.

The file uses layout inheritance from the shell and contains all scenes as entries in the `scenes[]` array:

```yaml
name: "Designbook/Sections/{Section Title}"
layout: "shell"

scenes:
  - name: listing
    layout:
      content:
        - entity: node.article
          view_mode: teaser
          records: [0, 1, 2]

  - name: detail
    layout:
      content:
        - entity: node.article
          view_mode: full
```

### 3.4 — Validate Stories

Render the section's stories headlessly to verify they produce valid HTML:

```bash
node packages/storybook-addon-designbook/dist/cli.js validate story {section-id}
```

If errors are found, fix them before proceeding. Common issues:
- Twig syntax errors in templates
- Missing component references
- Broken slot composition

### 3.5 — Run CSS Generation

Delegate to the `//debo-css-generate` workflow to generate CSS tokens for all new components.

Mark tasks complete as each sub-step finishes. Report progress to the user.

## Step 4: Confirm Completion

> "✅ **Screen design generated for [Section Title]!**
>
> | Layer         | Item                                | Location                               |
> | ------------- | ----------------------------------- | -------------------------------------- |
> | UI Components | [list or "none needed"]             | `$DESIGNBOOK_DRUPAL_THEME/components/` |
> | View Modes    | [list of .jsonata files]            | `$DESIGNBOOK_DIST/view-modes/`         |
> | Scenes        | `{section}.scenes.yml`              | `$DESIGNBOOK_DIST/sections/{section}/` |
> | CSS           | Generated via `//debo-css-generate` | `$DESIGNBOOK_DRUPAL_THEME/css/`        |
>
> Open Storybook to see the full page compositions under **Designbook/Sections/** in the sidebar.
>
> You can run `/debo-screenshot-design` to capture screenshots for documentation."

**Guardrails**

- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell for navigation context
- Each scene should address specific user flows from the section spec
- Consider responsive behavior for all scenes
- The 3 generation sub-steps must run in order: UI components → view modes → scenes (each depends on the previous)
- **One `.scenes.yml` file per section** — all scenes for a section live in one file
- The `name` field in `.scenes.yml` is the full Storybook sidebar path (e.g. `Designbook/Sections/Blog`)
- Component skills are loaded by convention: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT` — never hardcode a specific framework
- CSS generation is delegated to `//debo-css-generate` — never load CSS skills directly in this workflow
