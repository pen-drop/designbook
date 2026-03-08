---
name: /debo-design-screen
id: debo-design-screen
category: Designbook
description: Create screen design components for a section
---

Help the user create screen design components for one of their roadmap sections. Screen designs are stored as the `screen` key in `designbook/sections/[section-id]/spec.section.yml`.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries. This enables testing without side effects.
**Steps**

## Step 1: Check Prerequisites

Check if the following files exist for the target section:
- `designbook/sections/[section-id]/spec.section.yml` — section spec (required)
- `designbook/sections/[section-id]/data.yml` — sample data (required)
- `designbook/design-system/design-tokens.md` — design tokens (optional)
- `designbook/shell/shell.screen.yml` — application shell (optional)

**If spec or data are missing**, tell the user:

> "Before creating screen designs, you need:
> 1. `/debo-shape-section` — Define the section specification
> 2. `/debo-sample-data` — Create sample data
>
> Please run these commands first."

Stop here.

Read all available files to understand the full context.

## Step 2: Select Section

Parse the roadmap and identify sections that have both spec and data. Present them:

> "Sections ready for screen design:
>
> 1. **[Section 1]** — ✓ Spec, ✓ Data [, ✓ Screen Designs already exist]
> 2. **[Section 2]** — ✓ Spec, ✓ Data
>
> Which section would you like to design?"

Wait for their response.

## Step 3: Read All Design Skills & Resources

> ⛔ **MANDATORY**: Before generating a plan, you **MUST** read **every** skill and resource file listed below. This ensures the plan accounts for all component conventions, CSS rules, and layout patterns.

**Component Skills (`designbook-$DESIGNBOOK_FRAMEWORK_COMPONENT-components-*`):**

1. `.agent/skills/designbook-components-sdc/SKILL.md` **and ALL resources:**
   - `resources/component-yml.md`
   - `resources/layout-reference.md` ← **critical for layout decisions**
   - `resources/rules.md`
   - `resources/shell-generation.md`
   - `resources/story-yml.md`
   - `resources/twig.md`
2. `.agent/skills/designbook-components-entity-sdc/SKILL.md` **and:**
   - `generate-stories.js`
3. `.agent/skills/designbook-screen/SKILL.md`

**CSS Skills (`designbook-css-*`):**

4. `.agent/skills/designbook-css-daisyui/SKILL.md` **and:**
   - `resources/daisyui-llms.txt`
5. `.agent/skills/designbook-css-generate/SKILL.md` **and ALL steps:**
   - `steps/verify-input.md`
   - `steps/delegate-framework.md`
   - `steps/execute-transforms.md`
   - `steps/ensure-imports.md`
   - `steps/check-regeneration.md`
   - `steps/verify-output.md`

**Web Reference Skill (conditional — read if the user wants to replicate an existing website):**

6. `.agent/skills/designbook-web-reference/SKILL.md` **and ALL resources:**
   - `resources/html-extraction.md`
   - `resources/screenshot-capture.md`
   - `resources/token-extension.md`

> [!IMPORTANT]
> The **layout-reference.md** is especially critical — it defines which layout components exist (e.g., `layout-columns`). **Never create domain-specific layout components** when a generic layout component already exists.

## Step 4: Generate Plan

Based on **everything read so far** (section spec, sample data, design tokens, shell spec, skills, and resources), generate a comprehensive plan. The plan MUST include:

### 4.1 — Screen Design Analysis

- Which screen designs (views/pages) are needed based on the section spec
- Layout patterns for each screen (grid, list, cards, split view)
- Data entities displayed on each screen
- User interactions and flows
- Responsive behavior

### 4.2 — Component Inventory

- **Existing components** that can be reused (check `$DESIGNBOOK_DRUPAL_THEME/components/`)
- **New UI components** that need to be created
- **Entity components** needed (based on data model)
- **Screen components** that compose everything together
- **Shell components** (header/footer) — note if they already exist or need creation

### 4.3 — Task List

Generate a numbered, actionable task list covering the full execution. Group tasks by phase:

```markdown
## Plan: [Section Title] Screen Design

### Phase 1: Screen Designs in spec.section.yml
- [ ] Add `screen` key to `spec.section.yml` with [N] views
- [ ] Document [ViewName1]: [brief description]
- [ ] Document [ViewName2]: [brief description]

### Phase 2: Shell UI Components
- [ ] Generate/verify header component
- [ ] Generate/verify footer component
- [ ] [Any additional shell components]

### Phase 3: UI Components
- [ ] Create [component-name]: [purpose]
- [ ] Create [component-name]: [purpose]
- [ ] Reuse existing: [component-name] (no changes needed)

### Phase 4: Entity Components
- [ ] Generate entity-node-[bundle] with [N] stories
- [ ] [Additional entity components]

### Phase 5: Screen Components
- [ ] Generate screen-[section]-[page1]
- [ ] Generate screen-[section]-[page2]

### Phase 6: CSS Token Generation
- [ ] Run CSS generation pipeline for new components

### Phase 7: Verification
- [ ] Verify all components render in Storybook
- [ ] Capture screenshots if requested
```

### 4.4 — Present plan to the user

**If `--spec` mode:** Present the full plan and ask for approval before proceeding. Wait for user confirmation.

**Otherwise (normal mode):** Show the plan briefly, then proceed to execution immediately without waiting for approval.

> "Here is the plan for **[Section Title]** screen design.
>
> [Plan summary with task list]
>
> **[N] tasks across [M] phases.**"

## Step 5: Execute Plan

Once the user approves, execute the tasks in order:

**5.1 — Save Screen Designs to spec.section.yml**

Add or update the `screen` key in `designbook/sections/[section-id]/spec.section.yml` with the documented views.

**5.2 — Generate Shell UI Components**

Execute the `designbook-components-sdc` skill using the **Shell Components** section. This generates header/footer components.

**5.3 — Generate UI Components**

Create any new UI components identified in the plan using the `designbook-components-sdc` skill.

**5.4 — Generate Entity View modes**

Execute the `designbook-view-modes` skill to check if there are any existing view modes for the entity types in the data model. If not, generate new view modes for the entity types in the data model.

**5.5 — Generate Screen Components**

Execute the `designbook-screen` skill with `section-id` parameter. This reads the `screen` key from `spec.section.yml`, composes shell + entity into full screen views.

**5.6 — Run CSS Generation**

Execute the `designbook-css-generate` skill to generate CSS tokens for all new components.

**5.7 — Mark tasks complete** as each phase finishes. Report progress to the user.

## Step 6: Confirm Completion

> "✅ **Design components generated!**
>
> | Layer | Component | Location |
> |-------|-----------|----------|
> | Shell | `header` | `$DESIGNBOOK_DRUPAL_THEME/components/header/` |
> | Shell | `footer` | `$DESIGNBOOK_DRUPAL_THEME/components/footer/` |
> | Entity | `entity_node_[bundle]` | `$DESIGNBOOK_DIST/components/entity-node-[bundle]/` |
> | Screen | `section_[id]_[page]` | `$DESIGNBOOK_DIST/components/section-[id]-[page]/` |
>
> Open Storybook to see the full page compositions under **Design/** and **Sections/** in the sidebar.
>
> You can run `/debo-screenshot-design` to capture screenshots for documentation."

**Guardrails**
- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell spec for navigation context
- Each view should address specific user flows from the section spec
- Descriptions should be specific enough to guide implementation
- Consider responsive behavior for all views
- Focus on what the user sees and does, not implementation details
- The plan MUST be approved by the user before any execution begins
- The 3 generation steps must run in order: shell (UI) → entity → screen (each depends on the previous)
- Each skill delegates to `designbook-components-sdc` for file creation
