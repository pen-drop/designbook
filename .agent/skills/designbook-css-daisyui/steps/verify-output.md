---
name: Verify Output
description: Verifies that all CSS token files were created successfully
---

# Verify Output

This step performs final verification that CSS generation was successful.

## Prerequisites
- Step 1–3 completed
- `DESIGNBOOK_DRUPAL_THEME` environment variable is set

## Input
- Expected output directory: `$DESIGNBOOK_DRUPAL_THEME/css/tokens/`
- Expected theme directory: `$DESIGNBOOK_DRUPAL_THEME/css/themes/`

## Process

1. **Check all token files exist**
   - Verify: `color.src.css`
   - Verify: `spacing.src.css`
   - Verify: `font.src.css`
   - Verify: `radius.src.css`
   - Verify: `opacity.src.css`
   - Command: `ls -lh $DESIGNBOOK_DRUPAL_THEME/css/tokens/*.src.css`

2. **Check theme file exists**
   - Verify: `$DESIGNBOOK_DRUPAL_THEME/css/themes/dark.src.css`

3. **Validate CSS syntax**
   - Quick check that files contain CSS syntax
   - Look for `:root {`, `--` (custom properties), etc.
   - Ensure files are not empty

4. **Count generated tokens**
   - Count color custom properties in `color.src.css`
   - Count spacing tokens in `spacing.src.css`
   - Count other token types

5. **Display success summary**
   - List all generated files with sizes
   - Show token counts by type
   - Display: "✅ CSS token files generated successfully"

## Error Handling
- Missing files: List which files are missing
- Empty files: Show which files are empty
- Invalid CSS: Show syntax validation errors

## Integration Instructions
Remind user to import generated CSS files in `$DESIGNBOOK_DRUPAL_THEME/css/app.src.css`:
```css
/* Design tokens */
@import "./tokens/color.src.css";
@import "./tokens/spacing.src.css";
@import "./tokens/font.src.css";
@import "./tokens/radius.src.css";
@import "./tokens/opacity.src.css";

/* DaisyUI themes */
@import "./themes/daisycms.src.css";
@import "./themes/dark.src.css";
```

## Next Steps
Suggest to the user:
- Review generated CSS files
- Test CSS tokens in components
- Compile CSS with Tailwind
- Update design system documentation
