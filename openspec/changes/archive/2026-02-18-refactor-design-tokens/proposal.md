# Proposal: Refactor Design Tokens

## Why

The current token ecosystem is fragmented. `designbook-figma-tokens` does one thing (Figma) and `debo-design-tokens` does another (Prompt Interview). We verify this fragmentation and propose a unified W3C Standard approach.

## What Changes

- **Core Authority**: Create `designbook-tokens` (Skill). This skill defines **Standardization**. It handles:
    - Validation (W3C Standard)
    - Storage (`designbook/design-tokens.json`)
    - Is the *single source of truth* for token logic.

- **Import Sources**: All other methods become "Inputs" to the Core Authority:
    1. **Figma**: `designbook-figma-tokens` (Fetches -> Converts -> Sends to `designbook-tokens`)
    2. **Interview**: `debo-design-tokens` (Interviews -> Converts -> Sends to `designbook-tokens`)

- **Addon**: Update Storybook Addon to:
    - Read `designbook/design-tokens.json`.
    - Recursively display W3C Groups and Tokens.

## Capabilities

### New Capabilities
- `designbook-tokens`: The central validation/storage skill.

### Modified Capabilities
- `designbook-figma-tokens`: Modified to output to `designbook-tokens` instead of file.
- `debo-design-tokens`: Updated to interview user and output to `designbook-tokens`.
- `storybook-addon-designbook`: Recursive W3C display support.

## Impact

- `agents/skills/designbook-tokens/` (NEW Codebase for token logic)
- `agents/skills/designbook-figma-tokens/` (Modified to be a fetcher only)
- `agents/workflows/debo-design-tokens.md` (Updated to use new skill)
- `packages/storybook-addon-designbook/` (Major update to rendering logic)
