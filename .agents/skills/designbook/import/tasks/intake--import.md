---
when:
  steps: [import:intake]
domain: [design.intake]
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    workflow: vision
result:
  workflow:
    type: array
    items:
      $ref: ../schemas.yml#/ImportWorkflow
---

# Intake: Import Design System

Orchestrates importing a full design system from a design reference. Resolves the reference, lets the user select screens, and builds a sub-workflow list with pre-filled params.

## Step 1: Resolve design reference

Read `vision.md`. Check for the `## Design Reference` section.

- If a design reference is present, announce the reference type and continue.
- If no design reference is found, ask the user:

> "No design reference configured. Please provide a design reference URL or describe your design source."

Wait for response. Store the reference info for later steps.

## Step 2: List available screens

Check loaded rules for this step. Extension rules may provide automated screen listing from the design reference (e.g. fetching screens via an API). If such a rule is loaded, follow its instructions to retrieve the screen list.

If no extension rule provides screen listing, ask the user:

> "Which screens/pages do you want to import? Please list them by name."

Wait for response.

Present the screen list to the user for confirmation:

> "Screens to import:
>
> 1. [screen-name-1]
> 2. [screen-name-2]
> ...
>
> Which screens do you want to import? (all / comma-separated numbers / names)"

Wait for response. Build the selected screens list.

## Step 3: Gather product info

If `vision.md` exists, read the product name and description from it.

If `vision.md` does not exist, ask:

> "What is the product name and a short description (1-2 sentences)?"

Wait for response.

## Step 4: Build sub-workflow list

Build the `workflow` iterable. The order is fixed and matches the dependency chain:

1. **vision** — `{ "workflow": "vision", "params": { "product_name": "<name>", "description": "<desc>", "design_reference": { "type": "<type>", "url": "<url>" } } }`
2. **tokens** — `{ "workflow": "tokens", "params": {} }`
4. **css-generate** — `{ "workflow": "css-generate", "params": {} }`
5. **design-shell** — `{ "workflow": "design-shell", "params": { "reference": "<first selected screen reference>" } }`
6. **design-screen** (one per selected screen) — `{ "workflow": "design-screen", "params": { "section": "<screen-name>", "reference": "<screen reference>" } }`

If `vision.md` already exists with a design reference, skip the vision entry.

## Step 5: Present summary for confirmation

> "Here is the import plan:
>
> **Reference:** [type] — [url]
> **Screens:** [list of selected screen names]
>
> **Workflows to execute (in order):**
> 1. Vision — define product name, description, and design reference
> 2. Tokens — import design tokens (colors, typography, spacing)
> 3. CSS Generate — generate CSS from tokens
> 4. Design Shell — build application shell
> 5. Design Screen: [screen-1] — build screen components
> 6. Design Screen: [screen-2] — build screen components
> ...
>
> Shall I proceed?"

Wait for confirmation before completing intake.

## Constraints

- Never skip user confirmation (Step 5)
- The workflow order in Step 4 is fixed — do not reorder
- Each sub-workflow entry must include all params needed for that workflow's intake to pre-fill defaults
- Never reference specific extensions by name — extension rules are loaded automatically by the CLI based on the project's `designbook.config.yml`
- If loaded rules provide automated capabilities (screen listing, reference resolution), use them instead of asking the user manually
