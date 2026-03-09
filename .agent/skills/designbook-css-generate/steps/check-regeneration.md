---
name: Check Regeneration
description: Checks if CSS regeneration is needed based on file timestamps
---

# Check Regeneration

This step determines if CSS files need to be regenerated or if they're already up-to-date.

## Prerequisites
- Step 1: Verify Input (completed)
- `DESIGNBOOK_DIST` and `DESIGNBOOK_DRUPAL_THEME` environment variables are set

## Input
- Token file: `$DESIGNBOOK_DIST/design-tokens.yml`
- CSS output directory: `$DESIGNBOOK_DRUPAL_THEME/css/tokens/`

## Process

1. **Check if CSS files exist**
   - Look for any `.src.css` files in `$DESIGNBOOK_DRUPAL_THEME/css/tokens/`
   - If none exist, regeneration is needed

2. **Compare timestamps**
   - Find the newest `.src.css` file in the output directories
   - Check if token file is newer than the newest CSS file
   - If token file is newer, regeneration is needed

3. **Report status**
   - If regeneration needed:
     - Display: "🔄 Regeneration needed: CSS files missing or outdated"
   - If up-to-date:
     - Display: "✅ CSS files are up to date"
     - Option: Ask user if they want to force regeneration

## Error Handling
- Permission issues checking files: Show permissions error
- Directory missing: Create directory and mark for regeneration

## Notes
This step provides optimization by skipping unnecessary work, but users can always force regeneration if needed.
