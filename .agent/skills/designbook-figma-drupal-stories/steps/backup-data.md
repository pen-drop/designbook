---
name: Backup Data
description: Creates a safety backup of the original Figma data
---

# Backup Data

This skill creates a backup of the Figma input data before filtering, enabling restoration after transformation.

## Purpose
Preserves the complete Figma data for future use and enables rollback if needed.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Verify Input (completed)

## Input
- Source file: `.pendrop/input/pendrop.data.components.json`

## Process

1. **Create backup copy**
   - Command: `cp .pendrop/input/pendrop.data.components.json .pendrop/input/pendrop.data.components.json.backup`
   - Creates a backup with `.backup` extension

2. **Verify backup creation**
   - Check that backup file exists
   - Verify backup file size matches original

3. **Optional: Log backup creation**
   - Display message: "Created backup of Figma data"
   - Show backup file path

## Output
- Backup file: `.pendrop/input/pendrop.data.components.json.backup`

## Error Handling
- Backup creation fails: Show error and stop processing
- Insufficient disk space: Show clear error message
- Permission denied: Show permissions error

## Success Criteria
- Backup file `.pendrop/input/pendrop.data.components.json.backup` exists
- Backup file is identical to original
- Backup can be read successfully

## Cleanup
This backup will be restored in Step 8 (Restore Data) and can then be removed.
