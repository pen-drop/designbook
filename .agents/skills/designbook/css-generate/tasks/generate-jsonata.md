---
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

After generating the default token group expressions, scan `$DESIGNBOOK_DATA/design-system/themes/*.yml` for theme override files. For each theme file found:

1. Read the theme file to get the token structure (always `semantic.color` only)
2. Generate a `.jsonata` expression that outputs a **theme CSS file** instead of a `@theme` block
3. The output file is named `color.theme-<name>.src.css` (where `<name>` is the theme filename without extension)
4. The expression input is the theme YAML file (not `design-tokens.yml`)

### Theme CSS Wrapper

Use the `jsonata-template` blueprint's theme format instead of the default `@theme` wrapper:

- **Standard themes**: `@layer theme { [data-theme="<name>"] { --color-*: values } }`
- **Dark mode themes**: If the theme file has `$extensions.darkMode: true`, additionally output `@layer theme { @media (prefers-color-scheme: dark) { :root { --color-*: values } } }`

See the `jsonata-template` blueprint for the exact expression format.
