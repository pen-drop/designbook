---
when:
  steps: [design-component:intake]
files: []
---

# Intake: Design Component

Help the user design a new UI component by gathering requirements. The result feeds the `create-component` stage.

## Step 1: Resolve Design Reference

> ⛔ **MANDATORY**: Execute this step before any component definition.

Follow the process in [resolve-design-reference.md](partials/resolve-design-reference.md).

If a reference was loaded, use it to **derive the component structure** (slots, props, variants) from the design rather than asking the user to describe them from scratch.

## Step 2: Choose Input Mode

**If a design reference is available**, skip this step — go directly to Step 3 (Quick Description) and use the reference to auto-generate the component definition. Present the derived definition for confirmation.

**If no design reference:**

> "Let's create a new UI component!
>
> **How would you like to define it?**
>
> 1. **Quick description** — Describe what you want in natural language
> 2. **Step-by-step** — I'll ask detailed questions about each aspect
>
> Which do you prefer? (1/2)"

Wait for response.

**If "1":** Go to Step 3 (Quick).
**If "2":** Go to Step 4 (Step-by-step).

---

## Step 3: Quick Description Mode

**If a design reference is available**, analyze the reference HTML/screenshot and extract the component structure. Present the derived definition directly:

> "Based on the design reference, I've identified this component:
>
> **Component: [name]**
> **Slots:** [slot list]
> **Variants:** [list or 'default only']
> **Props:** [list or 'none']
>
> Does this match? (y / adjust)"

**If no design reference:**

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

Wait for response. Iterate until confirmed, then go to Step 5.

---

## Step 4: Step-by-Step Mode

Ask these questions in order, waiting for each response:

**4.1 — Name:**

> "What is the component name? (e.g. `Button`, `Card`, `Hero`)"

Normalize to kebab-case for files.

**4.2 — Description:**

> "Brief description of the component? (1-2 sentences)"

**4.3 — Status:**

> "Development status? (`stable` / `experimental` / `deprecated`)
> Default: `experimental`"

**4.4 — Variants:**

> "Does this component have visual variants? (y/n)
> _Examples: default/outline/ghost, info/warning/error_"

If yes, ask for variant names and details.

**4.5 — Props:**

> "Does it need configurable properties (props)? (y/n)
> _Examples: variant, size, disabled, href_"

If yes, ask for each prop: name, type, title, enum values, default, required.

**4.6 — Slots:**

> "Does it have content slots? (y/n)
> _Examples: title, body, footer, icon_"

If yes, ask for each slot: name, title, description.

Go to Step 5.

---

## Step 5: Confirm Summary

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

Once confirmed, the `create-component` stage runs automatically.

**Guardrails**

- Component names must be unique (check existing components first)
- If component already exists, ask: overwrite or rename?
- Use kebab-case for files, PascalCase for display names
- Be conversational and helpful — suggest examples when user is unsure
- Component skills are loaded by convention: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT`
