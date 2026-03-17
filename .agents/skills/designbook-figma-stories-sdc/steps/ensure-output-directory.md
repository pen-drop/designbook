---
name: Ensure Output Directory
description: Creates the output directory structure for story files
---

# Ensure Output Directory

This skill ensures the component output directory exists before file generation.

## Purpose
Prepares the file system structure for story YAML output.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Verify Input (completed)
- Step 3: Backup Data (completed)
- Step 4: Filter Component (completed)
- Step 5: Verify Transformation Logic (completed)

## Input
- Base output path: `web/themes/custom/test_integration_drupal/components`

## Process

1. **Create components directory**
   - Command: `mkdir -p web/themes/custom/test_integration_drupal/components`
   - Creates directory if it doesn't exist
   - `-p` flag creates parent directories as needed

2. **Verify directory creation**
   - Check that directory exists
   - Verify directory is writable

3. **Optional: Log directory creation**
   - Display message: "Output directory ready"
   - Show directory path

## Output
- Created directory: `web/themes/custom/test_integration_drupal/components`

## Error Handling
- Permission denied: Show permissions error
- Disk full: Show space error
- Invalid path: Show path error

## Success Criteria
- Directory `web/themes/custom/test_integration_drupal/components` exists
- Directory is writable
- Directory can contain subdirectories for individual components

## Notes
Individual component folders (e.g., `button/`, `card/`) will be created by the split-manifest step (Step 9).
