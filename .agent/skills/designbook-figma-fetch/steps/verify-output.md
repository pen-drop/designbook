---
name: Verify Output
description: Verifies that Figma data was successfully downloaded
---

# Verify Output

This skill performs final verification that the Figma fetch was successful.

## Purpose
Confirms the downloaded data files exist and contain valid content.

## Prerequisites
- Step 1: Verify Prerequisites (completed)
- Step 2: Fetch from Figma (completed)

## Input
- Expected files:
  - `.pendrop/input/pendrop.data.components.json`
  - `.pendrop/input/pendrop.tokens.json`

## Process

1. **Check component data file**
   - Verify file exists: `.pendrop/input/pendrop.data.components.json`
   - Check file is not empty
   - Verify valid JSON structure
   - Check file size is reasonable

2. **Check token data file**
   - Verify file exists: `.pendrop/input/pendrop.tokens.json`
   - Check file is not empty
   - Verify valid JSON structure
   - Optional: may not exist for all projects

3. **Count fetched data**
   - Count component nodes
   - Count story nodes (nodes with `[Story]`)
   - Count design token variables
   - Show statistics

4. **Display success summary**
   - Show file paths
   - Show data counts
   - Display message: "✓ Figma data fetched successfully"

## Output
- Confirmation message with statistics

## Error Handling
- Component file missing: Show "Failed to fetch component data"
- Token file missing: Show warning (not always an error)
- Empty files: Show "Fetched data is empty"
- Invalid JSON: Show "Fetched data is corrupted"
- File size too small: Show "Fetched data appears incomplete"

## Success Criteria
- Component data file exists
- Component file contains valid JSON
- Component file is not empty
- File contains component/story nodes

## Final Output Example
```
✓ Figma Data Fetched Successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component Data:
  File: .pendrop/input/pendrop.data.components.json
  Size: 245 KB
  Components: 24
  Story Nodes: 18

Token Data:
  File: .pendrop/input/pendrop.tokens.json
  Size: 12 KB
  Color Variables: 45
  Spacing Variables: 12
  Typography Variables: 18
  
Total: 97 design elements fetched
```

## Next Steps
Inform user that data is ready for transformation:
- Generate tokens using Pendrop Tokens skill
- Generate components using Pendrop Components skill
- Generate stories using Pendrop Stories skill
- Or run full orchestration with Pendrop Orchestrator
