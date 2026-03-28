---
params:
  framework: ~
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    workflow: debo-design-tokens
---

# Generate CSS — Execute & Finalize

Runs all `.jsonata` expression files produced by the framework CSS skill, and ensures the project's `app.css` imports the generated files.

Each `.jsonata` file is self-contained — its embedded `@config` block specifies input and output paths. Requires `jsonata-w@1.0.1+`.

## Step 1: Execute all transformations

```bash
for f in $DESIGNBOOK_DATA/designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/generate-*.jsonata; do
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

## Step 5: Download Google Fonts locally

If a `google-fonts.src.css` was generated (i.e. it appears in the list from Step 2), download the font files and convert the CSS to use local paths.

### 5a: Extract the Google Fonts URL

Read `google-fonts.src.css` and extract the URL from the `@import url(...)` line.

### 5b: Fetch the font CSS

Use curl with a modern User-Agent so Google Fonts returns `woff2` format:

```bash
FONTS_URL="<extracted url>"
FONTS_DIR="$(dirname $DESIGNBOOK_CSS_APP)/fonts"
mkdir -p "$FONTS_DIR"
curl -s -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" "$FONTS_URL" -o /tmp/gfonts.css
```

If the curl request fails (non-zero exit or empty output), skip font download and leave the remote `@import` in place. Report: `⚠️  Google Fonts download skipped (no network access) — remote @import kept.`

### 5c: Download each font file

Parse `/tmp/gfonts.css` for all `url(...)` references ending in `.woff2`. For each:

```bash
# example: https://fonts.gstatic.com/s/inter/v21/abc123.woff2
curl -s "<woff2_url>" -o "$FONTS_DIR/<filename>.woff2"
```

Derive the local filename from the URL path's last segment (e.g. `inter-v21-latin-regular.woff2`). If multiple files share the same name, append a counter suffix.

### 5d: Rewrite google-fonts.src.css

Replace the `@import url(...)` with the full `@font-face` block from `/tmp/gfonts.css`, updating each `url(https://fonts.gstatic.com/...)` to the relative local path (e.g. `url("./fonts/<filename>.woff2")`).

The relative path must be from the CSS file's location (`css/tokens/`) to the fonts directory (`css/fonts/`), so: `../fonts/<filename>.woff2`.

Report: `✅ Google Fonts downloaded locally — X font files saved to css/fonts/`

## Error Handling

- Transformation failure: Show `jsonata-w` error and the failing file path
- Empty output file: Flag as error — likely a token group is missing or empty
- `app.css` missing: Create it with the generated imports
