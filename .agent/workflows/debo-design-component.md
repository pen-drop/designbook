---
name: /debo-design-component
id: debo-design-component
category: Designbook
description: Create a new Drupal component by gathering requirements interactively
---

Help the user design and create a new UI component. This workflow gathers requirements through conversational questions, then delegates file creation to the framework-specific component skill (`@designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT`).

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries.

**Steps**

## Step 0: Load Configuration

Load configuration using the `@designbook-configuration` skill to resolve:

- `$DESIGNBOOK_FRAMEWORK_COMPONENT` — component framework (e.g. `sdc`)
- `$DESIGNBOOK_FRAMEWORK_CSS` — CSS framework (e.g. `daisyui`)
- `$DESIGNBOOK_DRUPAL_THEME` — theme directory for component output

## Step 1: Choose Input Mode

> "Let's create a new UI component!
>
> **How would you like to define it?**
>
> 1. **Quick description** — Describe what you want in natural language
> 2. **Step-by-step** — I'll ask detailed questions about each aspect
>
> Which do you prefer? (1/2)"

Wait for response.

**If "1":** Go to Step 2 (Quick).
**If "2":** Go to Step 3 (Step-by-step).

---

## Step 2: Quick Description Mode

> "Describe your component — be as specific or vague as you like!
>
> _Example: 'A card with an image on top, a headline, body text, and a CTA button'_"

Wait for response.

> ⛔ **Read resource now:** `@designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT/resources/component-patterns.md`

Analyze the description using the parsing heuristics from the resource to extract: `componentName`, `slots`, `variants`, `props`.

Present the interpretation:

> "Based on your description:
>
> **Component: [name]**
> **Slots:** [slot list]
> **Variants:** [list or 'default only']
> **Props:** [list or 'none']
>
> Does this match? (y / adjust)"

Wait for response. Iterate until confirmed, then go to Step 4.

---

## Step 3: Step-by-Step Mode

Ask these questions in order, waiting for each response:

**3.1 — Name:**

> "What is the component name? (e.g. `Button`, `Card`, `Hero`)"

Normalize to kebab-case for files.

**3.2 — Description:**

> "Brief description of the component? (1-2 sentences)"

**3.3 — Status:**

> "Development status? (`stable` / `experimental` / `deprecated`)
> Default: `experimental`"

**3.4 — Variants:**

> "Does this component have visual variants? (y/n)
> _Examples: default/outline/ghost, info/warning/error_"

If yes, ask for variant names and details.

**3.5 — Props:**

> "Does it need configurable properties (props)? (y/n)
> _Examples: variant, size, disabled, href_"

If yes, ask for each prop: name, type, title, enum values, default, required.

**3.6 — Slots:**

> "Does it have content slots? (y/n)
> _Examples: title, body, footer, icon_"

If yes, ask for each slot: name, title, description.

Go to Step 4.

---

## Step 4: Confirm Summary

> "Here's your component definition:
>
> **Component:** [name]
> **Description:** [description]
> **Status:** [status]
>
> **Variants:** [count] — [list]
> **Props:** [count] — [list]
> **Slots:** [count] — [list]
>
> Ready to create? (y/n)"

Wait for response. If no, go back to relevant step.

## Step 5: Create Component

> ⛔ **Read skill now:** `@designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT/SKILL.md` and its resources.
>
> For SDC framework (`$DESIGNBOOK_FRAMEWORK_COMPONENT=sdc`), this resolves to `@designbook-components-sdc/SKILL.md`.

Execute the skill with the collected data as JSON input (name, description, status, provider, variants, props, slots). The `provider` value comes from `$DESIGNBOOK_DRUPAL_THEME` or `designbook.config.yml`.

## Step 6: Confirm Completion

> "✅ **Component created!**
>
> **Files:**
>
> - `components/[name]/[name].component.yml`
> - `components/[name]/[name].twig`
>
> **Next steps:**
>
> 1. Edit `.twig` to add HTML structure
> 2. Create a `.story.yml` to preview in Storybook
>
> Open the component folder to get started!"

**Guardrails**

- Component names must be unique (check existing components first)
- If component already exists, ask: overwrite or rename?
- Use kebab-case for files, PascalCase for display names
- Be conversational and helpful — suggest examples when user is unsure
- Component skills are loaded by convention: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT`
- For parsing heuristics, defer to `resources/component-patterns.md`
