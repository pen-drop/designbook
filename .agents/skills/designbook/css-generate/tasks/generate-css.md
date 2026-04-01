---
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    workflow: tokens
---

# Generate CSS — Execute JSONata

Runs all `.jsonata` expression files produced by the `generate-jsonata` step. Each file is self-contained — its embedded `@config` block specifies input and output paths.

```bash
for f in $DESIGNBOOK_DATA/designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/generate-*.jsonata; do
  npx jsonata-w transform "$f"
done
```

If no `.jsonata` files are found, report that no expressions were generated and stop.

Report any transformation errors with the specific failing file.

After execution, read each output file (extract path from `@config` → `output`) and count `--` custom property declarations. Report per file:

```
✅ color.src.css — 5 custom properties
✅ layout-width.src.css — 4 custom properties
❌ radius.src.css — empty or missing
```

If any output file is empty or missing, report as error.
