---
name: /debo-design-component
id: debo-design-component
category: Designbook
description: Create a new Drupal component by gathering requirements interactively
---

Help the user design and create a new Drupal Single Directory Component (SDC). This workflow gathers all necessary information through conversational questions and then creates the component files using the `designbook-drupal-components` skill.

**Steps**

## Step 1: Choose Input Mode

> "Let's create a new Drupal component!
>
> **How would you like to define it?**
>
> 1. **Quick description** — Describe what you want in natural language
>    _Example: "A card with an image, title, text, and a button"_
>
> 2. **Step-by-step** — I'll ask detailed questions about each aspect
>
> Which do you prefer? (1/2)"

Wait for response.

**If "1" (Quick description):** Go to Step 1A.
**If "2" (Step-by-step):** Go to Step 1B.

---

## Step 1A: Parse Natural Language Description

> "**Describe your component:**
>
> Tell me what it should include. Be as specific or vague as you like!
>
> Examples:
> - _'A card with an image on top, a headline, body text, and a CTA button'_
> - _'A hero section with background image, main heading, subheading, and two buttons'_
> - _'An alert box that can be info, warning, or error, with an icon and message'_"

Wait for response. Store as `naturalDescription`.

### 1A.1: Analyze Description

Analyze the natural language description and extract:

**Component Name:**
- Look for component type keywords: card, button, hero, alert, modal, accordion, etc.
- If not explicitly mentioned, infer from structure (e.g., "box with title and text" → "Content Box")
- Store as `componentName`

**Slots (Content Areas):**
- Look for content elements: image, title, headline, text, description, body, button, icon, etc.
- Common patterns:
  - "image" → `image` slot
  - "title", "headline", "heading" → `title` slot
  - "preheadline", "kicker", "eyebrow" → `preheadline` slot
  - "text", "body", "description" → `body` slot
  - "button", "CTA", "action" → `action` slot
  - "icon" → `icon` slot
  - "footer" → `footer` slot
- Store as `slots` array

**Variants:**
- Look for style keywords: default, outlined, filled, elevated, bordered, etc.
- Look for type keywords: info, warning, error, success
- Look for size keywords: small, medium, large
- If mentioned "can be X or Y", these are likely variants
- Store as `variants` array

**Props:**
- Derive from variants (e.g., "can be info or warning" → `variant` prop with enum)
- Look for behavioral keywords: disabled, loading, expanded, collapsible
- Look for size mentions: "small, medium, large" → `size` prop
- Character limits mentioned: "150 character text" → Note in description, but don't create prop
- Store as `props` array

**Example Analysis:**

Input: _"A card with an image on top, preheadline and headline, after the headline comes a 150 character text and below that a button"_

Extract:
```
componentName: "Card"
slots: [
  {name: "image", title: "Image", description: "Visual at the top of the card"},
  {name: "preheadline", title: "Preheadline", description: "Small text above the headline"},
  {name: "headline", title: "Headline", description: "Main title"},
  {name: "body", title: "Body Text", description: "Descriptive text (recommended ~150 characters)"},
  {name: "action", title: "Action Button", description: "Call-to-action button"}
]
variants: [
  {id: "default", title: "Default", description: "Standard card style"}
]
props: []
```

### 1A.2: Present Interpretation

> "Based on your description, here's what I understand:
>
> **Component: [componentName]**
>
> **Structure:**
> [For each slot in order:]
> - **[slot.title]**: [slot.description]
>
> **Variants:** [list or "None specified - will use default"]
> **Props:** [list or "None - content only"]
>
> Does this match what you had in mind? (y/n)
> 
> If anything is missing or wrong, just tell me what to adjust!"

Wait for response.

**If "n" or adjustments needed:**
- Listen to corrections
- Ask clarifying questions:
  - "Should there be different visual styles? (variants)"
  - "Any configurable options? (props)"
  - "Did I miss any content areas?"
- Update the extracted data
- Re-present until confirmed

**If "y":** Go to Step 2 (Description).

---

## Step 1B: Component Name (Step-by-step mode)

> "**What is the component name?**
> 
> Examples: `Button`, `Card`, `Hero`, `Accordion`, `Modal`
>
> (Use PascalCase for multi-word names)"

Wait for response. Validate:
- Name must be alphanumeric (with hyphens/underscores allowed)
- Name should not conflict with existing components
- Normalize to lowercase-kebab-case for files (e.g., "HeroSection" → "hero-section")

Store as `componentName`.

## Step 2: Description

**If coming from Step 1A (natural language mode):**
- Auto-generate description from `naturalDescription`
- Example: "A card with an image on top..." → "Card component with image, preheadline, headline, body text, and action button"
- Store as `description`
- Skip user prompt (already have description from natural language)

**If coming from Step 1B (step-by-step mode):**
> "**Brief description of the component:**
>
> What does this component do? (1-2 sentences)"

Wait for response. Store as `description`.

## Step 3: Development Status

> "**What is the development status?**
>
> - `stable` — Production-ready, fully tested
> - `experimental` — In development, may change
> - `deprecated` — Legacy, not recommended
>
> If unsure, choose `experimental` for new components."

Wait for response. Default to `experimental` if not specified. Store as `status`.

## Step 4: Variants

**If coming from Step 1A (natural language mode) and variants were extracted:**
- Skip to Step 5 (variants already in `variants` array)

**If coming from Step 1B (step-by-step mode) OR no variants extracted:**

> "**Does this component have visual variants?** (y/n)
>
> Examples:
> - Button: `default`, `outline`, `ghost`, `link`
> - Card: `elevated`, `flat`, `bordered`
> - Alert: `info`, `success`, `warning`, `error`
>
> Variants are different visual styles of the same component."

Wait for response.

**If yes:**
> "**List the variant names** (comma-separated):
>
> Example: `default, outline, ghost`"

Wait for response. For each variant, ask:
> "**Variant: [variant-name]**
> - Title: (Display name, e.g., 'Default Button')
> - Description: (Brief explanation)"

Store as `variants` array:
```json
[
  {"id": "default", "title": "Default", "description": "..."},
  {"id": "outline", "title": "Outline", "description": "..."}
]
```

**If no:** Store `variants` as empty array.

## Step 5: Props

**If coming from Step 1A (natural language mode) and props were extracted:**
- Ask for confirmation only:
  > "I detected these configurable properties:
  > [list props]
  >
  > Do you want to add or modify any? (y/n)"
  
  **If "n":** Continue to Step 6
  **If "y":** Follow the detailed prop questions below

**If coming from Step 1B (step-by-step mode) OR no props extracted:**

> "**Does this component need configurable properties (props)?** (y/n)
>
> Props are parameters that control the component's behavior or appearance.
>
> Examples:
> - `variant` (string) — Choose visual style
> - `size` (string) — sm, md, lg
> - `disabled` (boolean) — Disable interaction
> - `href` (string) — Link URL"

Wait for response.

**If yes:**
> "**How many props does it have?**"

Wait for response. For each prop, ask:

> "**Property [n] of [total]:**
>
> 1. **Name:** (e.g., `variant`, `size`, `disabled`)
> 2. **Type:** `string`, `boolean`, `number`, `array`, `object`
> 3. **Title:** (Display name for UI)
> 4. **Description:** (Brief explanation)
> 5. **Enum values** (optional, comma-separated for dropdown):
>    Example for variant: `default, outline, ghost`
> 6. **Default value** (optional):
>    What value if none is provided?
> 7. **Required?** (y/n)"

Store as `props` array:
```json
[
  {
    "name": "variant",
    "type": "string",
    "title": "Visual Variant",
    "description": "Choose button style",
    "enum": ["default", "outline", "ghost"],
    "default": "default",
    "required": false
  }
]
```

**If no:** Store `props` as empty array.

## Step 6: Slots

**If coming from Step 1A (natural language mode) and slots were extracted:**
- Slots are already in `slots` array from natural language parsing
- Ask for confirmation only:
  > "I identified these content areas:
  > [list slots with descriptions]
  >
  > Does this structure look correct? Want to add or change anything? (y/n)"
  
  **If "n":** Continue to Step 7
  **If "y":** Allow modifications - ask which to add/remove/modify

**If coming from Step 1B (step-by-step mode) OR no slots extracted:**

> "**Does this component have content slots?** (y/n)
>
> Slots are placeholders for dynamic content.
>
> Examples:
> - Button: `text` (button label)
> - Card: `title`, `body`, `footer`
> - Modal: `header`, `content`, `actions`"

Wait for response.

**If yes:**
> "**List the slot names** (comma-separated):
>
> Example: `title, body, footer`"

Wait for response. For each slot, ask:
> "**Slot: [slot-name]**
> - Title: (Display name)
> - Description: (Brief explanation)"

Store as `slots` array:
```json
[
  {"name": "text", "title": "Button Text", "description": "The clickable label"},
  {"name": "icon", "title": "Icon", "description": "Optional icon"}
]
```

**If no:** Store `slots` as empty array.

## Step 7: Present Summary

> "Here's your component definition:
>
> **Component:** [componentName]
> **Description:** [description]
> **Status:** [status]
>
> **Variants:** [count] — [list variant ids]
> **Props:** [count] — [list prop names]
> **Slots:** [count] — [list slot names]
>
> Does this look correct? (y/n)"

Wait for response.

**If no:** Ask what to change and go back to relevant step.

**If yes:** Proceed to Step 8.

## Step 8: Create Component

Execute the `designbook-drupal-components` skill with the collected data:

```
Read and execute: .agent/skills/designbook-drupal-components/SKILL.md

Pass parameters as JSON:
{
  "name": "[componentName]",
  "description": "[description]",
  "status": "[status]",
  "provider": "daisy_cms_daisyui",
  "variants": [...],
  "props": [...],
  "slots": [...]
}
```

## Step 9: Confirm Completion

> "✅ **Component created successfully!**
>
> **Files generated:**
> - `components/[component-name]/[component-name].component.yml`
> - `components/[component-name]/[component-name].twig`
>
> **Next steps:**
> 1. Edit the `.twig` template to add your HTML structure
> 2. Add CSS classes (use `debo:` prefixed Tailwind classes)
> 3. Create a `.story.yml` file to preview in Storybook
>
> Open the component folder to get started!"

**Guardrails**

- Component names must be unique (check existing components first)
- Always validate user input (types, required fields)
- Use lowercase-kebab-case for file/folder names
- Use PascalCase for display names
- If user is unsure, provide examples and suggestions
- Be conversational and helpful
- If component already exists, ask: "A component named '[name]' already exists. Would you like to update it or choose a different name?"

## Natural Language Parsing Examples

To help understand various description styles:

### Example 1: Simple Card
**Input:** _"A card with an image on top, preheadline and headline, after the headline comes a 150 character text and below that a button"_

**Extract:**
- **Component:** Card
- **Slots:** image, preheadline, headline, body (note: ~150 chars), action
- **Variants:** default
- **Props:** none

### Example 2: Alert with Variants
**Input:** _"An alert box that can be info, warning, or error, with an icon on the left and a message"_

**Extract:**
- **Component:** Alert
- **Slots:** icon, message
- **Variants:** info, warning, error
- **Props:** variant (string, enum: [info, warning, error], default: info)

### Example 3: Hero Section
**Input:** _"A hero section with a full-width background image, large heading, subheading below it, and two buttons side by side"_

**Extract:**
- **Component:** Hero
- **Slots:** background_image, heading, subheading, primary_action, secondary_action
- **Variants:** default
- **Props:** none

### Example 4: Button with States
**Input:** _"A button that can be default, outline, or ghost style. It should support disabled and loading states"_

**Extract:**
- **Component:** Button
- **Slots:** text
- **Variants:** default, outline, ghost
- **Props:** 
  - variant (string, enum: [default, outline, ghost], default: default)
  - disabled (boolean, default: false)
  - loading (boolean, default: false)

### Example 5: Accordion
**Input:** _"An accordion item with a clickable header and collapsible content panel"_

**Extract:**
- **Component:** Accordion
- **Slots:** header, content
- **Variants:** default
- **Props:**
  - expanded (boolean, default: false)
  - collapsible (boolean, default: true)

## Parsing Heuristics

**Component Name Detection:**
- Look for explicit component types: button, card, hero, modal, accordion, alert, badge, etc.
- If not found, derive from context or ask for clarification

**Slot Detection Keywords:**
- Image/Visual: "image", "picture", "photo", "graphic", "icon", "avatar"
- Text: "title", "headline", "heading", "preheadline", "kicker", "eyebrow", "subheading", "subtitle"
- Body: "text", "body", "description", "content", "message", "copy"
- Actions: "button", "CTA", "action", "link"
- Structure: "header", "footer", "sidebar"

**Variant Detection:**
- Style modifiers: "can be X or Y", "X, Y, or Z style", "types: X, Y"
- Common patterns: default/outline/ghost, info/warning/error/success, small/medium/large

**Prop Detection:**
- Behavioral: "disabled", "loading", "expanded", "collapsed", "active"
- Interactive: "clickable", "toggleable", "collapsible"
- Size/Scale: "small", "medium", "large", "compact", "full-width"
- State: "enabled/disabled", "open/closed", "visible/hidden"

**Ordering:**
- Slots should be listed in visual/reading order: top to bottom, left to right
- Match the sequence described by the user
