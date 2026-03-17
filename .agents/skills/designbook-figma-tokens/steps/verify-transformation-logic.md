---
name: Verify Transformation Logic
description: Ensures the JSONata token transformation file exists and is valid
---

# Verify Transformation Logic

This skill verifies that the JSONata transformation logic exists and applies self-healing if necessary.

## Purpose
Ensures the transformation logic file is present before executing the transformation.

## Prerequisites
- Step 1: Verify Input (completed)

## Input
- Expected file: `.pendrop/token.pendrop.jsonata`

## Process

1. **Check if transformation file exists**
   - Command: `test -f .pendrop/token.pendrop.jsonata`
   - Check file presence in workspace

2. **Apply self-healing if missing**
   - If file is missing, generate it dynamically by:
     a. **Analyze Input**: Run `npx jsonata-w inspect .pendrop/input/pendrop.tokens.json --summary`
     b. **Get Configuration**: Read `.agent/workflows/pendrop-generate-tokens.md` for Input/Output paths
     c. **Analyze Goal**: Read target Schema (`.pendrop/validate/tokens/w3c.json`) for W3C token format
     d. **Synthesize**: Create a valid JSONata transformation that converts to W3C Design Tokens format
     e. **Configure**: Add `@config` block at the top:
        ```jsonata
        /** @config {
          "input": "../input/pendrop.tokens.json",
          "output": "../output/pendrop.theme.tokens.json"
        } */
        ```

3. **Verify transformation syntax**
   - Attempt to parse the JSONata file
   - Check for common syntax errors
   - Verify `@config` block is present

4. **Confirm transformation logic**
   - Display message: "Transformation logic verified"
   - Show transformation file path

## Output
- Valid transformation file: `.pendrop/token.pendrop.jsonata`

## Error Handling
- File missing: Apply self-healing (auto-generate)
- Syntax errors: Show parsing errors and location
- Invalid config: Show config requirements

## Success Criteria
- `.pendrop/token.pendrop.jsonata` exists
- File contains valid JSONata syntax
- File has proper `@config` block with input/output paths
- Transformation logic converts tokens to W3C Design Tokens format

## Self-Healing Guidance
When generating the transformation:
- Transform Figma tokens to W3C Design Tokens format
- Extract color, spacing, typography, radius, opacity tokens
- Map Figma token structure to W3C `$value` and `$type` properties
- Output in W3C Design Tokens format compatible with schema
