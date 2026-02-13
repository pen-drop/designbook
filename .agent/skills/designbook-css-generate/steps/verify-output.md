---
name: Verify Output
description: Verifies that CSS token files were created successfully
---

# Verify Output

This step performs final verification that CSS generation was successful.

## Prerequisites
- Steps 1–5 completed
- `DESIGNBOOK_DRUPAL_THEME` environment variable is set

## Input
- Expected output directory: `$DESIGNBOOK_DRUPAL_THEME/css/tokens/`
- Expected theme directory: `$DESIGNBOOK_DRUPAL_THEME/css/themes/`

## Process

1. **List all generated CSS files**
   - Scan `$DESIGNBOOK_DRUPAL_THEME/css/tokens/*.src.css`
   - Scan `$DESIGNBOOK_DRUPAL_THEME/css/themes/*.src.css`
   - Command: `ls -lh $DESIGNBOOK_DRUPAL_THEME/css/tokens/*.src.css $DESIGNBOOK_DRUPAL_THEME/css/themes/*.src.css 2>/dev/null`

2. **Check files are non-empty**
   - Ensure each `.src.css` file has size > 0 bytes
   - Report any empty files

3. **Validate CSS syntax**
   - Quick check that files contain CSS syntax
   - Look for `:root {`, `--` (custom properties), `@plugin`, etc.
   - Ensure files are not empty

4. **Count generated tokens**
   - Count custom properties (`--`) in each file
   - Report totals by file

5. **Display success summary**
   - List all generated files with sizes
   - Show token counts by type
   - Display: "✅ CSS token files generated successfully"

## Error Handling
- Missing files: List which files are missing
- Empty files: Show which files are empty
- Invalid CSS: Show syntax validation errors
