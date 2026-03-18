---
name: Execute Transformation
description: Runs the JSONata transformation to generate story manifest
---

# Execute Transformation

This skill executes the JSONata transformation on the filtered component data.

## Purpose
Transforms Figma story data into a story manifest using JSONata.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Verify Input (completed)
- Step 3: Backup Data (completed)
- Step 4: Filter Component (completed)
- Step 5: Verify Transformation Logic (completed)
- Step 6: Ensure Output Directory (completed)

## Input
- Transformation logic: `.pendrop/story.pendrop.jsonata`
- Filtered data: `.pendrop/input/pendrop.data.components.json`

## Process

1. **Execute JSONata transformation**
   - Command: `npx jsonata-w transform .pendrop/story.pendrop.jsonata`
   - Reads input from path specified in `@config` block
   - Writes output to path specified in `@config` block
   - Expected output: `.pendrop/output/pendrop.theme.story.json`

2. **Monitor transformation execution**
   - Display progress indicator
   - Show any warnings or info messages from jsonata-w

3. **Verify transformation completed**
   - Check exit code of jsonata-w command
   - Confirm output file was created

4. **Validate output structure**
   - Check that manifest file contains JSON
   - Verify manifest contains story data
   - Confirm manifest structure matches expected format

## Output
- Story manifest: `.pendrop/output/pendrop.theme.story.json`
- Contains only stories for the specified component (due to filtering in Step 4)

## Error Handling
- Transformation fails: Show JSONata error message
- Invalid output: Show structure error
- Missing output file: Show file creation error
- JSONata syntax error: Show error location and message

## Success Criteria
- Transformation completes without errors
- Output file `.pendrop/output/pendrop.theme.story.json` exists
- Output file contains valid JSON
- Manifest contains story data with variants, props, and slots

## Expected Output Format
```json
{
  "stories": {
    "button_enabled": {
      "name": "Button enabled",
      "componentId": "daisycms:button",
      "variant": "default",
      "slots": { ... },
      "props": { ... }
    }
  }
}
```
