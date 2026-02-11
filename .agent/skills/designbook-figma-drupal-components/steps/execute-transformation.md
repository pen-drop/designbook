---
name: Execute Transformation
description: Runs the JSONata transformation to generate component manifest
---

# Execute Transformation

This skill executes the JSONata transformation on the filtered component data.

## Purpose
Transforms Figma data into a component manifest using JSONata.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Verify Input (completed)
- Step 3: Backup Data (completed)
- Step 4: Filter Component (completed)
- Step 5: Verify Transformation Logic (completed)
- Step 6: Ensure Output Directory (completed)

## Input
- Transformation logic: `.pendrop/component.pendrop.jsonata`
- Filtered data: `.pendrop/input/pendrop.data.components.json`

## Process

1. **Execute JSONata transformation**
   - Command: `npx jsonata-w transform .pendrop/component.pendrop.jsonata`
   - Reads input from path specified in `@config` block
   - Writes output to path specified in `@config` block
   - Expected output: `.pendrop/output/pendrop.components.manifest.json`

2. **Monitor transformation execution**
   - Display progress indicator
   - Show any warnings or info messages from jsonata-w

3. **Verify transformation completed**
   - Check exit code of jsonata-w command
   - Confirm output file was created

4. **Validate output structure**
   - Check that manifest file contains JSON
   - Verify manifest contains component data
   - Confirm manifest structure matches expected format

## Output
- Component manifest: `.pendrop/output/pendrop.components.manifest.json`
- Contains only the specified component (due to filtering in Step 4)

## Error Handling
- Transformation fails: Show JSONata error message
- Invalid output: Show structure error
- Missing output file: Show file creation error
- JSONata syntax error: Show error location and message

## Success Criteria
- Transformation completes without errors
- Output file `.pendrop/output/pendrop.components.manifest.json` exists
- Output file contains valid JSON
- Manifest contains component data with variants, props, and slots

## Expected Output Format
```json
{
  "components": {
    "key": "button",
    "filename": "button.component.yml",
    "folder": "button",
    "data": {
      "$schema": "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json",
      "name": "Button",
      "status": "stable",
      "description": "Button component",
      "provider": "daisy_cms_daisyui",
      "variants": { ... },
      "props": { ... },
      "slots": { ... }
    }
  }
}
```
