---
name: Verify Input
description: Verifies that the W3C Design Tokens file exists
---

# Verify Input

This skill checks that the W3C Design Tokens file exists before CSS generation.

## Purpose
Ensures the required token input file is present before generation begins.

## Prerequisites
- None (first step in the pipeline)

## Input
- Expected file: `.pendrop/output/pendrop.theme.tokens.json`

## Process

1. **Check if token file exists**
   - Command: `test -f .pendrop/output/pendrop.theme.tokens.json`
   - Check file existence in the workspace

2. **Handle missing file**
   - If file is missing:
     - Display message: "✗ Token file missing at `.pendrop/output/pendrop.theme.tokens.json`"
     - Suggest: "Run Pendrop Tokens skill first to generate the token file"
     - Exit with error

3. **Verify file is not empty**
   - Check file size is greater than 0 bytes
   - Verify file contains valid JSON structure

4. **Confirm input is ready**
   - Display message: "✓ Token file found"
   - Show file path

## Output
- Confirmation that token file exists and is valid

## Error Handling
- File missing: Show error and suggest running Pendrop Tokens skill
- File empty: Show error and suggest regenerating tokens
- File corrupted: Show JSON parsing error

## Success Criteria
- `.pendrop/output/pendrop.theme.tokens.json` exists
- File is not empty
- File contains valid JSON
