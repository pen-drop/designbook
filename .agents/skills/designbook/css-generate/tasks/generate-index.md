---
when:
  steps: [generate-index]
files:
  - file: $DESIGNBOOK_DIRS_CSS_TOKENS/index.src.css
    key: index-css
    validators: []
---

# Generate CSS Token Index

Generates a barrel file that imports all generated token CSS files from the token directory.

List all `*.src.css` files (excluding `index.src.css` itself), sorted alphabetically. Write one `@import` per file.

Theme override files (`color.theme-*.src.css`) are included automatically — alphabetical sorting ensures they appear after `color.src.css`, which is the correct cascade order for CSS custom property overrides.
