---
name: Restore Data
description: Restores the original Figma data from backup
---

# Restore Data

This skill restores the complete Figma data from the backup created in Step 3.

## Purpose
Restores the full Figma data for future use, removing the filtered temporary data.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Verify Input (completed)
- Step 3: Backup Data (completed)
- Step 4: Filter Component (completed)
- Step 5: Verify Transformation Logic (completed)
- Step 6: Ensure Output Directory (completed)
- Step 7: Execute Transformation (completed)

## Input
- Backup file: `.pendrop/input/pendrop.data.components.json.backup`
- Current (filtered) file: `.pendrop/input/pendrop.data.components.json`

## Process

1. **Restore original data**
   - Command: `mv .pendrop/input/pendrop.data.components.json.backup .pendrop/input/pendrop.data.components.json`
   - Replaces filtered data with original backup
   - Uses `mv` (move) which also removes the backup file

2. **Verify restoration**
   - Check that original file is restored
   - Verify file is larger than filtered version (contains all components)
   - Confirm backup file no longer exists

3. **Optional: Log restoration**
   - Display message: "Original Figma data restored"
   - Show restored file path

## Output
- Restored file: `.pendrop/input/pendrop.data.components.json` (contains all components)
- Backup file removed: `.pendrop/input/pendrop.data.components.json.backup` (no longer exists)

## Error Handling
- Backup missing: Show critical error (transformation completed but cannot restore)
- Restore fails: Show error and keep both files
- Permission denied: Show permissions error

## Success Criteria
- `.pendrop/input/pendrop.data.components.json` contains full original data
- `.pendrop/input/pendrop.data.components.json.backup` no longer exists
- File contains valid JSON with all components

## Notes
This restoration ensures that subsequent workflow runs have access to the complete Figma data, not just the filtered component from this run.
