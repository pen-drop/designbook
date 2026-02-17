---
name: Verify Input
description: Verifies that the W3C Design Tokens file exists and is valid
---

# Verify Input

This step checks that the W3C Design Tokens file exists before CSS generation.

## Prerequisites
- `DESIGNBOOK_DIST` environment variable is set

## Input
- Expected file: `$DESIGNBOOK_DIST/design-tokens.json`

## Process

1. **Check if token file exists**
   - Command: `test -f $DESIGNBOOK_DIST/design-tokens.json`

2. **Handle missing file**
   - If file is missing:
     - Display: "❌ Token file missing at `$DESIGNBOOK_DIST/design-tokens.json`"
     - Suggest: "Run Designbook Tokens skill first to generate the token file"
     - Exit with error

3. **Verify file is not empty**
   - Check file size is greater than 0 bytes
   - Verify file contains valid JSON structure

4. **Confirm input is ready**
   - Display: "✅ Token file found"
   - Show file path

## Error Handling
- File missing: Show error and suggest running Designbook Tokens skill
- File empty: Show error and suggest regenerating tokens
- File corrupted: Show JSON parsing error
