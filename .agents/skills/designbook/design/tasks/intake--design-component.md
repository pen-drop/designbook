---
files: []
---

# Intake: Design Component

Help the user design a new UI component by gathering requirements. The result feeds the `create-component` stage.

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

Analyze the description to extract: `componentName`, `slots`, `variants`, `props`.

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

## Step 5: Design Reference (optional)

Check `guidelines.yml` for a `design_reference` entry. If a design source is configured:

1. Ask the user for a design reference for this component:

> "Your guidelines have a design reference configured. Do you have a specific design reference for this component?
>
> - Enter a reference URL (Figma, Stitch, website, image)
> - Or skip (no reference)"

2. Optionally ask for per-breakpoint references if relevant.

3. Delegate storage to the framework skill's component-reference rule (the storage location is framework-specific, e.g. `.component.yml` for Drupal).

If no `design_reference` is configured, skip this step silently.

Once confirmed, the `create-component` stage runs automatically.

**Guardrails**

- Component names must be unique (check existing components first)
- If component already exists, ask: overwrite or rename?
- Use kebab-case for files, PascalCase for display names
- Be conversational and helpful — suggest examples when user is unsure
- Component skills are loaded by convention: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT`
