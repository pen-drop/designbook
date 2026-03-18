---
name: Verify Input
description: Verifies that the required token input file exists
---

# Verify Input

This skill checks that the token input file exists before transformation.

## Purpose
Ensures the required input file is present before transformation begins.

## Prerequisites
- None (first step in the pipeline)

## Input
- Expected file: `.pendrop/input/pendrop.tokens.json`

## Process

1. **Check if input file exists**
   - Command: `test -f .pendrop/input/pendrop.tokens.json`
   - Check file existence in the workspace

2. **Handle missing file**
   - If file is missing:
     - Display message: "Input file not found at `.pendrop/input/pendrop.tokens.json`"
     - Suggest: "Please ensure the token file exists or fetch from Figma"

3. **Verify file is not empty**
   - Check file size is greater than 0 bytes
   - Verify file contains valid JSON structure

## Output
- Confirmation that input file exists and is valid

## Error Handling
- File missing: Show error with path
- File empty: Show error and suggest regenerating
- File corrupted: Show JSON parsing error

## Success Criteria
- `.pendrop/input/pendrop.tokens.json` exists
- File is not empty
- File contains valid JSON
