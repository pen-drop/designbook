---
name: Verify Output
description: Verifies that the W3C Design Tokens file was created successfully
---

# Verify Output

This skill performs final verification that the token generation was successful.

## Purpose
Confirms the generated W3C Design Tokens file exists and has the correct structure.

## Prerequisites
- Step 1: Verify Input (completed)
- Step 2: Verify Transformation Logic (completed)
- Step 3: Execute Transformation (completed)

## Input
- Expected output path: `.pendrop/output/pendrop.theme.tokens.json`

## Process

1. **Check output file exists**
   - Verify file: `.pendrop/output/pendrop.theme.tokens.json`
   - Check file size is reasonable (not empty, not too large)

2. **Validate W3C token structure**
   - Parse JSON to ensure valid syntax
   - Check for W3C Design Tokens format:
     - Token groups exist (color, spacing, typography, etc.)
     - Tokens have `$value` properties
     - Tokens have `$type` properties
   - Validate against schema: `.pendrop/validate/tokens/w3c.json`

3. **Count extracted tokens**
   - Count color tokens
   - Count spacing tokens
   - Count typography tokens
   - Count other token types

4. **Display success summary**
   - Show output file path
   - Show token counts by type
   - Display message: "✓ W3C Design Tokens generated successfully"

## Output
- Confirmation message with token statistics

## Error Handling
- File missing: Show error "Output file not created"
- Invalid JSON: Show parsing error and line number
- Missing W3C structure: Show structure validation error
- Schema validation fails: Show validation errors

## Success Criteria
- Output file exists
- Output file has valid JSON syntax
- Output conforms to W3C Design Tokens format
- Output contains token data extracted from input

## Final Output Example
```
✓ W3C Design Tokens generated successfully

Output: .pendrop/output/pendrop.theme.tokens.json

Token Statistics:
  - Color tokens: 45
  - Spacing tokens: 12
  - Typography tokens: 18
  - Radius tokens: 8
  - Opacity tokens: 5
  
Total: 88 tokens
```

## Next Steps
Suggest to the user:
- Generate CSS files from tokens (use `pendrop-generate-css`)
- Review generated tokens file
- Update design system documentation
