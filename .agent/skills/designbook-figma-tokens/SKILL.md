---
name: Pendrop Tokens
description: Generates W3C Design Tokens from Figma variables through orchestrated sub-skills.
---

# Pendrop Tokens

This skill orchestrates the generation of W3C-compliant Design Tokens from Figma variable data by executing a series of specialized sub-skills in sequence.

## Capability

### Generate Tokens
**Trigger**: When asked to "generate tokens", "update tokens", "sync tokens", or "transform tokens" from Figma.

**Action**: Execute the following sub-skills in order:

1. **Verify Input** (`./steps/verify-input.md`)
   - Checks that `.pendrop/input/pendrop.tokens.json` exists
   - Validates JSON structure

2. **Verify Transformation Logic** (`./steps/verify-transformation-logic.md`)
   - Ensures `.pendrop/token.pendrop.jsonata` exists
   - Applies self-healing if missing

3. **Execute Transformation** (`./steps/execute-transformation.md`)
   - Runs JSONata transformation
   - Generates W3C Design Tokens

4. **Verify Output** (`./steps/verify-output.md`)
   - Confirms output file exists
   - Validates W3C token structure
   - Reports token statistics

5. **Finalize Tokens** (`./steps/finalize-tokens.md`)
   - Passes generated tokens to `designbook-tokens` skill
   - Ensures consistent storage location

## Parameters
- None required (processes all tokens from input file)

## Context
- **Input**: `.pendrop/input/pendrop.tokens.json` (Figma variables)
- **Logic**: `.pendrop/token.pendrop.jsonata` (Transformation)
- **Output**: `.pendrop/output/pendrop.theme.tokens.json` (W3C Design Tokens)

## Data Sources (Figma Structure)
- **Figma Variables** → W3C Design Tokens
  - Color variables → color tokens
  - Number variables → spacing, opacity tokens
  - String variables → typography tokens

## Error Handling
Each sub-skill handles its own errors and provides clear feedback:
- Missing input file: Shows file path and suggests fetching from Figma
- Transformation errors: Shows JSONata error details
- Invalid output: Shows validation errors

## Usage Examples

```bash
# Generate tokens from Figma data
Execute this skill (no parameters needed)
```

## Output Structure
Generates W3C-compliant Design Tokens file:
```
.pendrop/output/pendrop.theme.tokens.json
```

## Simplified Pipeline

This workflow uses a simplified 4-step pipeline (compared to 10 steps for Components/Stories):
- Step 1: Verify Input
- Step 2: Verify Transformation Logic  
- Step 3: Execute Transformation
- Step 4: Verify Output

The simpler structure is possible because:
- No component filtering needed (processes all tokens)
- No backup/restore needed (input is not modified)
- No manifest splitting needed (single output file)

## Troubleshooting
- **Missing Input**: Ensure Figma data has been fetched using `/pendrop-fetch-figma` first.
- **Transformation Error**: Check JSONata syntax in `.pendrop/token.pendrop.jsonata`.
- **Validation Error**: Verify output matches W3C token format in `.pendrop/validate/tokens/w3c.json`.

## Next Steps
After generating tokens:
- Generate CSS files from tokens using Pendrop CSS skill
- Review generated tokens in `.pendrop/output/pendrop.theme.tokens.json`
- Update design system documentation
