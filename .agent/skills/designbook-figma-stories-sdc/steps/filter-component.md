---
name: Filter Component
description: Filters the Figma data to include only the specified component's stories
---

# Filter Component

This skill filters the complete Figma data to include only the specified component, reducing processing overhead.

## Purpose
Extracts only the relevant component data from the full Figma export.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Verify Input (completed)
- Step 3: Backup Data (completed)

## Input
- Full Figma data: `.pendrop/input/pendrop.data.components.json`
- Component name from Step 1: `validatedComponentName`

## Process

1. **Execute filter script**
   - Command: `node .pendrop/tools/filter-component.js "[ComponentName]"`
   - Redirects output to temporary file: `.pendrop/input/pendrop.data.components.json.filtered`
   - The script matches component canvas nodes (e.g., "component:daisycms:button")

2. **Handle component not found**
   - If filter script returns error (component not found):
     - Parse the available components list from script output
     - Display: "Component '[ComponentName]' not found. Available components:"
     - List all available component names from Figma data
     - Exit with error

3. **Verify filtered data**
   - Check that filtered file was created
   - Verify filtered file contains valid JSON
   - Confirm filtered file is smaller than original

4. **Replace original with filtered data**
   - Command: `mv .pendrop/input/pendrop.data.components.json.filtered .pendrop/input/pendrop.data.components.json`
   - This temporarily replaces the input file with filtered data
   - Original data is safe in the backup (Step 3)

## Output
- Filtered data replaces original at: `.pendrop/input/pendrop.data.components.json`
- Original data preserved in: `.pendrop/input/pendrop.data.components.json.backup`

## Error Handling
- Component not found: List available components and exit
- Filter script error: Show script error message
- Invalid JSON output: Show parsing error

## Success Criteria
- Filtered file contains only specified component data
- Original input file is temporarily replaced
- Backup exists with full original data
- Filtered data is valid JSON

## Notes
The filtering uses the Node.js script at `.pendrop/tools/filter-component.js` which understands the Figma data structure and can match components by name.
