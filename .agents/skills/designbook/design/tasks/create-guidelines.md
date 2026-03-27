---
params:
  references: []
  design_file: ~
  principles: []
  component_patterns: []
  naming:
    convention: kebab-case
    examples: []
  mcp: ~
  skills: []
reads:
  - path: $DESIGNBOOK_OUTPUTS_CONFIG/design-system/design-tokens.yml
    optional: true
files:
  - $DESIGNBOOK_OUTPUTS_CONFIG/design-system/guidelines.yml
---

# Create Design Guidelines

Writes the approved design guidelines to `$DESIGNBOOK_OUTPUTS_CONFIG/design-system/guidelines.yml`.

## Rules

- All content is in English
- Only write keys that have values — omit optional keys entirely when not provided (no empty arrays, no null values)
- `naming.convention` is required; default to `kebab-case` if not specified
- `naming.examples` is optional — omit if empty

## Output Format

```yaml
references:
  - type: figma          # figma | url
    url: https://...
    label: Brand Guidelines

design_file:
  type: figma            # figma | sketch | xd | other
  url: https://...
  label: Main Design File

principles:
  - "Accessible by default"
  - "Mobile-first"

component_patterns:
  - "Always use the container component as layout wrapper"
  - "Cards always use card-header + card-body slots"

naming:
  convention: kebab-case
  examples:
    - hero-section
    - card-teaser

mcp:
  server: figma-mcp
  url: http://localhost:3333

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
- Key order: references → design_file → principles → component_patterns → naming → mcp → skills
