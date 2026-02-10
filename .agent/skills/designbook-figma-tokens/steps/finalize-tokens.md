---
name: Finalize Tokens
description: Passes generated W3C tokens to the central designbook-tokens skill for storage.
---

# Finalize Tokens

This step takes the verified output from the transformation step and sends it to the central `designbook-tokens` skill.

## Prerequisites
- Step 4: Verify Output (must be completed successfully)
- `designbook-tokens` skill must be available.

## Process

1. **Read Output File**
   - Source: `.pendrop/output/pendrop.theme.tokens.json`

2. **Call Central Skill**
   - Skill: `designbook-tokens`
   - Action: `process-tokens`
   - Argument: `--tokens-file .pendrop/output/pendrop.theme.tokens.json`

## Execution

```bash
#!/bin/bash

INPUT_FILE=".pendrop/output/pendrop.theme.tokens.json"

if [ ! -f "$INPUT_FILE" ]; then
  echo "Error: Token output file not found at $INPUT_FILE"
  exit 1
fi

echo "Passing tokens to central authority..."
# Assuming the skill structure allows calling via this path. 
# Adjust if skills are invoked differently in this environment.
# Since we are in .agent/skills/designbook-figma-tokens/steps/
# The other skill is in .agent/skills/designbook-tokens/
# We call its process-tokens step directly via its script wrapper users usually use.
# Or better, we call the script directly if we know it.

# Let's call the script directly for now to be robust:
node ../../../designbook-tokens/scripts/validate-and-save.cjs --tokens-file "$INPUT_FILE"
```
