---
name: Verify Output
description: Verifies that all CSS token files were created successfully
---

# Verify Output

This skill performs final verification that CSS generation was successful.

## Purpose
Confirms all generated CSS files exist and have valid content.

## Prerequisites
- Step 1: Verify Input (completed)
- Step 2: Check Regeneration (completed)
- Step 3: Generate CSS (completed)

## Input
- Expected output directory: `web/themes/custom/daisy_cms_daisyui/css/tokens/`
- Expected theme directory: `web/themes/custom/daisy_cms_daisyui/css/themes/`

## Process

1. **Check all token files exist**
   - Verify: `color.src.css`
   - Verify: `spacing.src.css`
   - Verify: `font.src.css`
   - Verify: `radius.src.css`
   - Verify: `opacity.src.css`
   - Command: `ls -lh web/themes/custom/daisy_cms_daisyui/css/tokens/*.src.css`

2. **Check theme file exists**
   - Verify: `web/themes/custom/daisy_cms_daisyui/css/themes/dark.src.css`

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
   - Display message: "✓ CSS token files generated successfully"

## Output
- Confirmation message with file details

## Error Handling
- Missing files: List which files are missing
- Empty files: Show which files are empty
- Invalid CSS: Show syntax validation errors

## Success Criteria
- All 6 CSS files exist
- Files contain valid CSS syntax
- Files are not empty
- Token counts match expected ranges

## Final Output Example
```
✓ CSS token files generated successfully

Generated Files:
  Token Files (css/tokens/):
    - color.src.css (2.4 KB, 45 tokens)
    - spacing.src.css (1.2 KB, 12 tokens)
    - font.src.css (1.8 KB, 18 tokens)
    - radius.src.css (0.8 KB, 8 tokens)
    - opacity.src.css (0.5 KB, 5 tokens)
  
  Theme Files (css/themes/):
    - dark.src.css (0.9 KB, DaisyUI plugin)

Total: 88 CSS custom properties generated
```

## Integration Instructions
Remind user to import generated CSS files in `css/app.src.css`:
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
