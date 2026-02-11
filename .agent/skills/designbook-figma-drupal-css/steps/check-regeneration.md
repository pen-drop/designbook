---
name: Check Regeneration
description: Checks if CSS regeneration is needed based on file timestamps
---

# Check Regeneration

This skill determines if CSS files need to be regenerated or if they're already up-to-date.

## Purpose
Optimizes workflow by skipping regeneration when CSS files are current.

## Prerequisites
- Step 1: Verify Input (completed)

## Input
- Token file: `.pendrop/output/pendrop.theme.tokens.json`
- CSS output directory: `web/themes/custom/daisy_cms_daisyui/css/tokens/`

## Process

1. **Check if CSS files exist**
   - Check for key CSS file: `web/themes/custom/daisy_cms_daisyui/css/tokens/color.src.css`
   - If missing, regeneration is needed

2. **Compare timestamps**
   - Check if token file is newer than CSS files
   - Command: `test .pendrop/output/pendrop.theme.tokens.json -nt web/themes/custom/daisy_cms_daisyui/css/tokens/color.src.css`
   - If token file is newer, regeneration is needed

3. **Report status**
   - If regeneration needed:
     - Display: "Regeneration needed: CSS files missing or outdated"
     - Reason: Either files don't exist or tokens have been updated
   - If up-to-date:
     - Display: "CSS files are up to date"
     - Option: Ask user if they want to force regeneration

## Output
- Decision: regenerate or skip
- Reason for the decision

## Error Handling
- Permission issues checking files: Show permissions error
- Directory missing: Create directory and mark for regeneration

## Success Criteria
- Decision is made whether to regenerate
- User is informed of the status

## Notes
This step provides optimization by skipping unnecessary work, but users can always force regeneration if needed.
