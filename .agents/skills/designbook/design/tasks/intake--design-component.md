---
trigger:
  steps: [design-component:intake]
domain: [components]
params:
  type: object
  properties:
    reference_dir: { type: string, default: "" }
result:
  type: object
  required: [component]
  properties:
    component:
      type: array
      items:
        $ref: ../schemas.yml#/Component
---

# Intake: Design Component

Help the user design a new UI component by gathering requirements. The `extract-reference` stage runs after intake — design reference data is not available during intake.

## Step 1: Choose Input Mode

**If `$reference_dir` is non-empty and `$reference_dir/extract.json` exists**, skip this step — go directly to Step 2 (Quick Description) and use the reference to auto-generate the component definition. Present the derived definition for confirmation.

**If no design reference:**

> "Let's create a new UI component!
>
> **How would you like to define it?**
>
> 1. **Quick description** -- Describe what you want in natural language
> 2. **Step-by-step** -- I'll ask detailed questions about each aspect
>
> Which do you prefer? (1/2)"

Wait for response.

**If "1":** Go to Step 2 (Quick).
**If "2":** Go to Step 3 (Step-by-step).

---

## Step 2: Quick Description Mode

**If `$reference_dir` is non-empty and `$reference_dir/extract.json` exists**, read `$reference_dir/extract.json`, analyze the reference and extract the component structure. Present the derived definition directly:

> "Based on the design reference, I've identified this component:
>
> **Component: [name]**
> **Slots:** [slot list]
> **Variants:** [list or 'default only']
> **Props:** [list or 'none']
>
> Does this match? (y / adjust)"

**If no design reference:**

> "Describe your component -- be as specific or vague as you like!
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

**3.1 -- Name:**

> "What is the component name? (e.g. `Button`, `Card`, `Hero`)"

Normalize to kebab-case for files.

**3.2 -- Description:**

> "Brief description of the component? (1-2 sentences)"

**3.3 -- Variants:**

> "Does this component have visual variants? (y/n)
> _Examples: default/outline/ghost, info/warning/error_"

If yes, ask for variant names and details.

**3.4 -- Props:**

> "Does it need configurable properties (props)? (y/n)
> _Examples: variant, size, disabled, href_"

If yes, ask for each prop: name, type, title, enum values, default, required.

**3.5 -- Slots:**

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
>
> **Variants:** [count] -- [list]
> **Props:** [count] -- [list]
> **Slots:** [count] -- [list]
>
> Ready to create? (y/n)"

Wait for response. If no, go back to relevant step.

## Step 5: Complete Intake

Store the `component` iterable as task result.

- **`component`**: one entry with `component` (name), `slots` (array), and `group` (set to component name as default group).
- When a design reference was extracted, also include `design_hint` (structured data from `$reference_dir/extract.json`) and `reference_screenshot` (absolute path to `$reference_dir/reference-full.png`) on the component item.

**Auto-set fields** (do NOT ask the user):
- `status` -> `experimental`
- `provider` -> from `$DESIGNBOOK_COMPONENT_NAMESPACE` or `designbook.config.yml`

**Guardrails**

- Component names must be unique (check existing components first)
- If component already exists, ask: overwrite or rename?
- Use kebab-case for files, PascalCase for display names
- Component skills are loaded by convention: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT`
