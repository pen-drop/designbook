# Design: Refactor Design Tokens

## Context

The current `debo-design-tokens` workflow manually prompts users for colors and fonts and saves them in a custom markdown format. The `designbook-figma-tokens` skill exists but is not fully utilized or aligned with the workflow. The goal is to move to a W3C Design Tokens standard, fetched from Figma, and validated/transformed by a unified skill.

## Goals / Non-Goals

**Goals:**
- **Pipeline Architecture**:
    - **Source 1: Figma**: `designbook-figma-tokens` generates raw W3C JSON (in temp/staging).
    - **Source 2: Interview**: `debo-design-tokens` workflow interviews user.
- **Central Authority**: `designbook-tokens` (new skill) is the ONLY place that commits the final `designbook/design-tokens.json`.
    - It accepts input from *either* source.
    - It validates W3C compliance.
    - It saves to the final location.

**Non-Goals:**
- Creating a GUI editor for tokens (editing happens via Figma or Chat).

## Decisions

### Component Roles
- **`debo-design-tokens.md` (Workflow)**:
    - Interviews user.
    - Calls `designbook-tokens` with the interview data.
- **`designbook-figma-tokens/SKILL.md` (Existing Skill)**:
    - Fetches from Figma.
    - Generates W3C JSON (but maybe to a temp path).
    - Calls `designbook-tokens` (or is called by a coordinator) to finalize.
- **`designbook-tokens/SKILL.md` (New Skill)**:
    - **Input**: W3C JSON object (from Interview or Figma import).
    - **Action**: Validate -> Save to `designbook/design-tokens.json`.

### Data Flow
1. **Interview**: User -> Workflow -> Data -> `designbook-tokens` -> Disk.
3. **Display**: Storybook Addon reads `designbook/design-tokens.json` -> Parsed recursively -> Displayed.

### W3C Group Support
- The addon must parse `$` prefixed keys as metadata/values and everything else as Groups.
- Groups must be collapsible in the UI.

## Risks / Trade-offs

- **Risk**: Users without Figma cannot use the new flow easily if it *only* relies on Figma.
- **Mitigation**: The workflow/skill could offer a manual entry mode that generates W3C JSON, but for now we focus on the Figma extraction unification as implied by the skill reference.

## Migration Plan

1. Implement `designbook-design-tokens` skill to handle W3C JSON generation/validation.
2. Refactor `debo-design-tokens.md` to:
    - Allow "Figma Import" mode (calls skill).
    - Allow "Interactive Mode" (prompts user, then generates W3C JSON).
3. Update Storybook Addon to consume `designbook/design-tokens.json`.
