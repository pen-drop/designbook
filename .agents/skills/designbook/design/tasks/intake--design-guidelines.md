---
when:
  steps: [design-guidelines:intake]
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Intake: Design Guidelines

Help the user define their design guidelines. The result is saved to `$DESIGNBOOK_DATA/design-system/guidelines.yml` and is automatically loaded by all design-system workflows.

## Step 1: Ask Everything at Once

Send a single message asking for all information together:

> "Let's set up your design guidelines — answer what applies, skip the rest:
>
> 1. **References** — Any design systems, websites, or visual styles you're drawing inspiration from? (URLs or names)
> 2. **Design reference** — Primary design source: website URL, image, or integration-specific (e.g. a design tool)? (URL + short label)
> 3. **Principles** — Design principles that always apply? (e.g. 'accessible by default', 'mobile-first')
> 4. **Component patterns** — Composition rules to always follow? (e.g. 'cards always use card-header + card-body')
> 5. **Naming** — Component naming convention? Default: kebab-case. Share 2–3 examples (e.g. `hero-section`, `card-teaser`)
> 6. **MCP server** — Design tool MCP server name + URL? (optional)
> 7. **Visual diff** — Limit visual diff testing to specific breakpoints? (e.g. `sm, xl` — default: all from design-tokens.yml)
> 8. **Skills** — Auto-load skills: `frontend-design` (production-grade UI) and/or `web-design-guidelines` (accessibility)?"

Wait for the user's single response, then parse all answers from it.

## Step 2: Present Summary and Confirm

> "Here's your design guideline configuration:
>
> **References:** [list or 'none']
> **Design reference:** [label + URL or 'none']
> **Principles:** [list or 'none']
> **Component patterns:** [list or 'none']
> **Naming:** [convention] (examples: [examples])
> **MCP:** [server + URL or 'none']
> **Visual diff breakpoints:** [list or 'all']
> **Auto-load skills:** [list or 'none']
>
> Ready to save?"

Iterate until approved. Once confirmed, the `create-guidelines` stage runs automatically.

**Dialog Constraints**
- All content always in English — no language question
- Optional fields: if the user skips, omit the key entirely from guidelines.yml (no empty arrays)
- Be conversational, offer examples where helpful
- The `naming.convention` field is required — if the user skips naming, default to `kebab-case`
