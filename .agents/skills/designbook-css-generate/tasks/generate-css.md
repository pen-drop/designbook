---
params:
  framework: ~
reads:
  - path: $DESIGNBOOK_DIST/design-system/design-tokens.yml
    workflow: debo-design-tokens
---

# Generate CSS — Execute & Finalize

Runs all `.jsonata` expression files produced by the framework CSS skill, and ensures the project's `app.css` imports the generated files.

Each `.jsonata` file is self-contained — its embedded `@config` block specifies input and output paths. Requires `jsonata-w@1.0.1+`.

## Step 1: Execute all transformations

```bash
for f in $DESIGNBOOK_DIST/designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/generate-*.jsonata; do
  npx jsonata-w transform "$f"
done
```

If no `.jsonata` files are found, report that the framework skill produced no expressions and stop.

Report any transformation errors with the specific failing file.

## Step 2: Discover generated CSS files

Read each executed `.jsonata` file and extract the output path from its `@config` block. Collect all output paths as the list of generated CSS files.

## Step 3: Ensure imports in `app.css`

Read `$DESIGNBOOK_CSS_APP` (from `designbook.config.yml` → `css.app`). For each generated CSS file, compute its path relative to `$DESIGNBOOK_CSS_APP` and add a missing `@import` if not already present.

Rules:
- Only add imports that don't already exist (check by filename)
- Preserve existing import order
- Append new token imports after the last existing `@import "./tokens/...";` line
- Append new theme imports after the last existing `@import "./themes/...";` line
- If no matching section exists yet, create it with a comment header
- If `app.css` is missing, create it with the generated imports

## Step 4: Verify output

Check each generated file:
- Exists and is non-empty
- Contains valid CSS syntax (`@theme`, `@plugin`, or `--` custom properties)

Count `--` custom properties per file and report totals.

Display: `✅ CSS token files generated successfully` with file list and sizes.

## Error Handling

- Transformation failure: Show `jsonata-w` error and the failing file path
- Empty output file: Flag as error — likely a token group is missing or empty
- `app.css` missing: Create it with the generated imports
