---
params:
  references: []
  design_reference: ~
  principles: []
  component_patterns: []
  naming:
    convention: kebab-case
    examples: []
  mcp: {}
  visual_diff: {}
  skills: []
files:
  - file: $DESIGNBOOK_DATA/design-system/guidelines.yml
    key: guidelines
    validators: []
---

# Create Design Guidelines

Write the approved design guidelines via stdin to the CLI:
```
_debo write-file $WORKFLOW_NAME $TASK_ID --key guidelines
```

## Rules

- All content is in English
- Only write keys that have values — omit optional keys entirely when not provided (no empty arrays, no null values)
- `naming.convention` is required; default to `kebab-case` if not specified
- `naming.examples` is optional — omit if empty

## Output Format

```yaml
references:
  - type: url            # url | ... (integration skills can add types)
    url: https://...
    label: Brand Guidelines

design_reference:
  type: url              # url | image | ... (integration skills can add types)
  url: https://...
  label: Main Design Reference

principles:
  - "Accessible by default"
  - "Mobile-first"

component_patterns:
  - "Always use the container component as layout wrapper"

naming:
  convention: kebab-case
  examples:
    - hero-section
    - card-teaser

mcp:
  server: my-design-tool
  url: http://localhost:3333

visual_diff:
  breakpoints: [sm, xl]   # optional — filter which breakpoints to screenshot (default: all from design-tokens.yml)

skills:
  - frontend-design
  - web-design-guidelines
```

## Minimal Example (only required field)

```yaml
naming:
  convention: kebab-case
```

## Notes

- If `design-tokens.yml` was read as context, do NOT copy token values into guidelines — it is for reference only
- Key order: references → design_reference → principles → component_patterns → naming → mcp → visual_diff → skills
