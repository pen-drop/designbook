---
name: designbook-tokens
description: Validates and stores design tokens in W3C YAML format.
---

# Designbook Tokens Skill

This skill is the central authority for validating and saving design tokens to the project. It accepts a W3C-formatted YAML or JSON input (passed as a string or file path), validates basic structure, and persists it to `${DESIGNBOOK_DIST}/design-system/design-tokens.yml`.

## Usage

The agent writes design tokens directly to `${DESIGNBOOK_DIST}/design-system/design-tokens.yml` in W3C YAML format. The script can be used for validation:

```bash
# Validate and save from a YAML/JSON file
node .agent/skills/designbook-tokens/scripts/validate-and-save.cjs tokens.yml

# Validate and save from a JSON string
node .agent/skills/designbook-tokens/scripts/validate-and-save.cjs '{ "color": { ... } }'
```

## Token Format

Tokens are stored as W3C Design Tokens in YAML format:

```yaml
color:
  primary:
    $value: "#4F46E5"
    $type: color
    description: Main brand color
  primary-content:
    $value: "#FFFFFF"
    $type: color
    description: Text on primary

typography:
  heading:
    $value: Space Grotesk
    $type: fontFamily
    description: Headings font
```

## Steps

- [process-tokens](./steps/process-tokens.md): Validates and saves tokens.
