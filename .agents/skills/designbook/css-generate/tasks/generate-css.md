---
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    workflow: tokens
---

# Generate CSS — Execute JSONata

Runs all `.jsonata` expression files produced by the `generate-jsonata` step. Each file is self-contained — its embedded `@config` block specifies input and output paths.

If no `.jsonata` files are found, report that no expressions were generated and stop.

Report per output file: filename and count of `--` custom property declarations. Flag any empty or missing output as error.
