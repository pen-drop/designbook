---
when:
  steps: [generate-jsonata]
params:
  group: ~
files:
  - file: $DESIGNBOOK_DATA/designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/generate-{{ group }}.jsonata
    key: generate-jsonata
    validators:
      - "cmd:npx jsonata-w transform --dry-run {{ file }}"
      - "cmd:npx jsonata-w transform --dry-run {{ file }} | npx stylelint --stdin-filename output.css"
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    workflow: tokens
---

# Generate JSONata Expression

Generates one `.jsonata` expression file per token group. The expression transforms `design-tokens.yml` into a CSS token file.

Read the `css-mapping` blueprint for group configuration (prefix, wrap, path) and the `jsonata-template` blueprint for the expression format.

## Theme Override Files

After generating the default token group expressions, check `design-tokens.yml` for a `themes:` section. For each theme declared there, generate a `.jsonata` expression using the theme expression template from the `jsonata-template` blueprint.
