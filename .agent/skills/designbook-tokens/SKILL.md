---
name: designbook-tokens
description: Validates and stores design tokens in W3C format.
---

# Designbook Tokens Skill

This skill is the central authority for validating and saving design tokens to the project. It accepts a W3C-formatted JSON object (passed as a string or file path), validation schema (optional), and persists it to `designbook/design-tokens.json`.

## Usage

```bash
# From another skill or workflow
/skill/designbook-tokens/steps/process-tokens --tokens-json='{ ... }'
# Or directly via script
node .agent/skills/designbook-tokens/scripts/validate-and-save.cjs ...
```

## Steps

- [process-tokens](./steps/process-tokens.md): Validates and saves tokens.
