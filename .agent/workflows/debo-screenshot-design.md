---
name: /screenshot-design
id: screenshot-design
category: Designbook
description: Capture screenshots of screen designs for documentation
---

Help the user capture and document screenshots for a section's screen designs. Screenshots are documented in `designbook/sections/[section-id]/screenshots.md`.

**Steps**

## Step 1: Check Prerequisites

Check if the following files exist for the target section:
- `designbook/sections/[section-id]/*.section.scenes.yml` — section spec (required)
- `designbook/sections/[section-id]/overview.section.yml` — overview with screen designs (required)

**If screen designs are missing**, tell the user:

> "Before capturing screenshots, you need screen designs defined. Please run `/design-screen` first."

Stop here.

## Step 2: Select Section and Screen Design

Parse the roadmap and identify sections that have screen designs. Present them:

> "Sections with screen designs:
>
> 1. **[Section 1]** — [N] screen designs
>    - [ViewName1]
>    - [ViewName2]
>
> Which section and view would you like to screenshot?"

Wait for their response.

## Step 3: Capture Screenshot

If you have access to the Playwright MCP tool or browser automation:
1. Navigate to the relevant Storybook page
2. Capture a full-page screenshot
3. Save the screenshot to `designbook/sections/[section-id]/[filename].png`

If browser automation is not available, instruct the user:

> "To capture a screenshot manually:
> 1. Open Storybook and navigate to the section page
> 2. Take a screenshot of the screen design
> 3. Save it as `designbook/sections/[section-id]/[view-name].png`
> 4. I'll update the screenshots manifest."

## Step 4: Update Screenshots Manifest

Create or update `designbook/sections/[section-id]/screenshots.md`:

```markdown
# Screenshots

- ![ViewName](view-name.png)
- ![ViewName - Mobile](view-name-mobile.png)
```

## Step 5: Confirm Completion

> "I've documented the screenshot in `designbook/sections/[section-id]/screenshots.md`.
>
> Open Storybook to see the screenshot on the section page. You can run `/screenshot-design` again to capture more."

**Guardrails**
- Screenshots should be captured at desktop viewport (1280px width)
- Use PNG format for all screenshots
- Name files descriptively: `[view-name]-[variant].png`
- Include both desktop and mobile variants when relevant
- Screenshots document the current state of the design

## Workflow Tracking

Load `@designbook-workflow/steps/create.md`:
- `--workflow screenshot-design` / `--title "Capture Screenshots"` / `--task "capture-screenshots:Capture design screenshots:validation"`

If `--spec`: output the plan and stop here.

For task `capture-screenshots`:
1. Load `@designbook-workflow/steps/update.md` → mark **in-progress**
2. Do the work
3. Load `@designbook-workflow/steps/update.md` → mark **done**
