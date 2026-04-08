# design-guidelines Specification

## Purpose
Defines the `debo-design-guideline` workflow, the `guidelines.yml` file format, and how design-system workflows consume guidelines as constraints.

## Requirements

### Requirement: debo-design-guideline Workflow
A `debo-design-guideline` workflow skill SHALL guide the user through a dialog and save results to `$DESIGNBOOK_DIST/design-system/guidelines.yml`. The task file SHALL declare `design-system/design-tokens.yml` as an optional `reads:` dependency.

Dialog questions (ordered non-technical → technical, all output in English):
1. **References** — Existing design systems/websites/styles (optional, multiple)
2. **Design reference** — URL with type (Figma, Stitch, URL, image) and label (optional)
3. **Principles** — General design principles as free text (optional)
4. **Component patterns** — Component usage rules as free text (optional)
5. **Naming** — Convention (default: `kebab-case`) and 2-3 examples
6. **MCP server** — Name/URL for design tool access (optional)
7. **Skills** — Skills to auto-load; offer: `frontend-design`, `web-design-guidelines` (optional)

- On completion, workflow creates `guidelines.yml`, validates, and archives
- Skipped optional fields are omitted from output (not written as empty arrays)

### Requirement: guidelines.yml File Format
Written to `$DESIGNBOOK_DIST/design-system/guidelines.yml`. All keys except `naming.convention` are optional and omitted when not provided. No `language` key.

```yaml
references:
  - type: figma
    url: https://...
    label: Brand Guidelines
design_reference:
  type: figma
  url: https://...
  label: Main Design Reference
principles:
  - "Accessible by default"
component_patterns:
  - "Always use the container component as layout wrapper"
naming:
  convention: kebab-case
  examples: [hero-section, card-teaser]
mcp:
  server: figma-mcp
  url: http://localhost:3333
visual_diff:
  breakpoints: [sm, xl]
skills:
  - frontend-design
```

- Minimal file: only `naming` when user provides just the convention
- Full file: all keys present when all fields provided
- Skipped fields produce no keys (no empty arrays or null values)

### Requirement: Automatic Skill Loading in Design-System Workflows
All design-system task files (`debo-design-tokens`, `debo-design-component`, `debo-design-screen`, `debo-design-shell`) SHALL declare `reads: design-system/guidelines.yml`. When present, the AI reads `skills:` and loads each via the Skill tool before executing.

- If `guidelines.yml` exists: load listed skills, apply naming convention and principles as constraints
- If `guidelines.yml` missing: stop and inform user "Run /debo-design-guideline first"
