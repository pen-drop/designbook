---
name: Execute Transformation
description: Runs the JSONata transformation to generate W3C Design Tokens
---

# Execute Transformation

This skill executes the JSONata transformation on the token data.

## Purpose
Transforms Figma token data into W3C Design Tokens using JSONata.

## Prerequisites
- Step 1: Verify Input (completed)
- Step 2: Verify Transformation Logic (completed)

## Input
- Transformation logic: `.pendrop/token.pendrop.jsonata`
- Token data: `.pendrop/input/pendrop.tokens.json`

## Process

1. **Execute JSONata transformation**
   - Command: `npx jsonata-w transform .pendrop/token.pendrop.jsonata`
   - Reads input from path specified in `@config` block
   - Writes output to path specified in `@config` block
   - Expected output: `.pendrop/output/pendrop.theme.tokens.json`

2. **Monitor transformation execution**
   - Display progress indicator
   - Show any warnings or info messages from jsonata-w

3. **Verify transformation completed**
   - Check exit code of jsonata-w command
   - Confirm output file was created

4. **Validate output structure**
   - Check that output file contains JSON
   - Verify output contains token data
   - Confirm output structure matches W3C Design Tokens format

## Output
- W3C Design Tokens file: `.pendrop/output/pendrop.theme.tokens.json`

## Error Handling
- Transformation fails: Show JSONata error message
- Invalid output: Show structure error
- Missing output file: Show file creation error
- JSONata syntax error: Show error location and message

## Success Criteria
- Transformation completes without errors
- Output file `.pendrop/output/pendrop.theme.tokens.json` exists
- Output file contains valid JSON
- Output conforms to W3C Design Tokens format

## Expected Output Format
```json
{
  "color": {
    "blue": {
      "500": {
        "$value": "#3b82f6",
        "$type": "color"
      }
    }
  },
  "spacing": {
    "4": {
      "$value": "1rem",
      "$type": "dimension"
    }
  }
}
```
