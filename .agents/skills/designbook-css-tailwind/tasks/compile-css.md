---
name: designbook-css:compile-css
title: "Compile CSS"
trigger:
  steps: [compile-css]
filter:
  frameworks.css: tailwind
result:
  type: object
  required: [compiled-css]
  properties:
    compiled-css:
      path: "$DESIGNBOOK_CSS_DIR/app.css"
      $ref: ../../designbook/css-generate/schemas.yml#/CompiledCss
---

# Compile CSS

Compile the app stylesheet to a real file so token `@theme` variables are
emitted to `:root` (the source uses Tailwind at-rules a browser cannot resolve).

Run:

```bash
npx @tailwindcss/cli -i "$DESIGNBOOK_CSS_APP" -o "$DESIGNBOOK_CSS_DIR/app.css" --minify
```

The output is the input both for the `guard-css` probe and for any
consumer that needs a compiled stylesheet on disk.
