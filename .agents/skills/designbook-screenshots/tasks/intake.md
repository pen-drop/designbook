---
files: []
---

# Intake: Screenshot Design

Help the user select which section and screen design to screenshot. The result feeds the `capture-screenshots` stage.

## Step 1: Check Prerequisites and Select

Parse sections that have screen designs. Present them:

> "Sections with screen designs:
>
> 1. **[Section 1]** — [N] screen designs
>    - [ViewName1]
>    - [ViewName2]
>
> Which section and view would you like to screenshot?"

If screen designs are missing for any section, indicate:

> "Before capturing screenshots for **[Section]**, screen designs are needed. Run `/debo-design-screen` first."

Wait for their response. Once the section and view are selected, the `capture-screenshots` stage runs automatically.

**Guardrails**
- Screenshots should be captured at desktop viewport (1280px width)
- Use PNG format
- Name files descriptively: `[view-name]-[variant].png`
- Include both desktop and mobile variants when relevant
