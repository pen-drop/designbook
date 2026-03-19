---
name: /debo-design-guideline
id: debo-design-guideline
category: Designbook
description: Create design guidelines for design-system workflows
workflow:
  title: Design Guidelines
  stages: [dialog, create-guidelines]
reads:
  - path: ${DESIGNBOOK_DIST}/design-system/guidelines.yml
  - path: ${DESIGNBOOK_DIST}/design-system/design-tokens.yml
    optional: true
---

Help the user define their design guidelines. The result is saved to `$DESIGNBOOK_DIST/design-system/guidelines.yml` and is automatically loaded by all design-system workflows.

**Steps**

## Step 0: Load Workflow Tracking

Load the `designbook-workflow` skill via the Skill tool.

## Step 1: Introduce

> "Let's set up your design guidelines. These will be loaded automatically by all design-system workflows — so you only define this once. I'll ask a few questions, starting with inspiration and moving to technical details."

## Step 2: Dialog (non-technical → technical)

Ask the following questions conversationally, in this order. All output is always in English.

### 2.1 References (non-technical)

> "Are there existing design systems, websites, or visual styles you're drawing inspiration from? (optional — share URLs, names, or descriptions)"

Accept multiple entries. Each becomes a `references` entry with `type: url` and the given URL/label.

### 2.2 Design File

> "Do you have a design file — Figma, Sketch, XD, or similar? If so, share the URL and a short label."

Accept one entry. Captures `type` (figma/sketch/xd/other), `url`, `label`.

### 2.3 Principles

> "Which design principles should always apply across your product? Examples: 'accessible by default', 'mobile-first', 'no decorative animations'. (optional, free text — one per line)"

Accept multiple strings.

### 2.4 Component Patterns

> "Are there component composition rules that should always be followed? Examples: 'always use the container component as layout wrapper', 'cards always use card-header + card-body'. (optional, free text — one per line)"

Accept multiple strings.

### 2.5 Naming Convention (semi-technical)

> "What naming convention should components follow? Default is kebab-case. Share 2–3 example names so I understand your style (e.g. `hero-section`, `card-teaser`, `nav-primary`)."

Capture `convention` (kebab-case / PascalCase / snake_case) and `examples` array.

### 2.6 MCP Server (technical)

> "Is there an MCP server for design tool access (e.g. Figma MCP)? If so, share the server name and URL. (optional)"

Capture `server` and `url`.

### 2.7 Design Skills (technical)

> "Which design skills should auto-load when design-system workflows run? Known skills:
> - `frontend-design` — distinctive, production-grade UI
> - `web-design-guidelines` — accessibility and UX best practices
>
> List the ones you want, or press enter to skip."

Accept skill names as an array.

## Step 3: Present Summary and Confirm

> "Here's your design guideline configuration:
>
> **References:** [list or 'none']
> **Design file:** [label + URL or 'none']
> **Principles:** [list or 'none']
> **Component patterns:** [list or 'none']
> **Naming:** [convention] (examples: [examples])
> **MCP:** [server + URL or 'none']
> **Auto-load skills:** [list or 'none']
>
> Ready to save?"

Iterate until approved. Once confirmed, the `create-guidelines` stage runs automatically.

**Dialog Constraints**
- All content always in English — no language question
- Optional fields: if the user skips, omit the key entirely from guidelines.yml (no empty arrays)
- Be conversational, offer examples where helpful
- The `naming.convention` field is required — if the user skips naming, default to `kebab-case`
