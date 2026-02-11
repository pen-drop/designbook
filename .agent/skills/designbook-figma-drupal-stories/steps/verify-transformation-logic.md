---
name: Verify Transformation Logic
description: Ensures the JSONata story transformation file exists and is valid
---

# Verify Transformation Logic

This skill verifies that the JSONata transformation logic exists and applies self-healing if necessary.

## Purpose
Ensures the transformation logic file is present before executing the transformation.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Verify Input (completed)
- Step 3: Backup Data (completed)
- Step 4: Filter Component (completed)

## Input
- Expected file: `.pendrop/story.pendrop.jsonata`

## Process

1. **Check if transformation file exists**
   - Command: `test -f .pendrop/story.pendrop.jsonata`
   - Check file presence in workspace

2. **Apply self-healing if missing**
   - If file is missing, generate it dynamically by:
     a. **Analyze Input**: Run `npx jsonata-w inspect .pendrop/input/pendrop.data.components.json --summary`
     b. **Get Configuration**: Read `.agent/workflows/pendrop-generate-stories.md` for Input/Output paths
     c. **Analyze Goal**: Read target Schema (`.pendrop/schema/`) and Examples (`.pendrop/validate/stories/`)
     d. **Synthesize**: Create a valid JSONata transformation that extracts:
        - Story nodes from `[Story]` elements
        - Story variants and props
        - Slot data
     e. **Configure**: Add `@config` block at the top:
        ```jsonata
        /** @config {
          "input": "../input/pendrop.data.components.json",
          "output": "../output/pendrop.theme.story.json"
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
- Valid transformation file: `.pendrop/story.pendrop.jsonata`

## Error Handling
- File missing: Apply self-healing (auto-generate)
- Syntax errors: Show parsing errors and location
- Invalid config: Show config requirements

## Success Criteria
- `.pendrop/story.pendrop.jsonata` exists
- File contains valid JSONata syntax
- File has proper `@config` block with input/output paths
- Transformation logic extracts stories, variants, props, and slots

## Self-Healing Guidance
When generating the transformation:
- Extract story data from `[Story]` elements in Figma
- Map Figma story variants to story YAML structure
- Extract props from Story properties
- Extract slots from instances named `slot{slotName}`
- Output in Drupal SDC story format compatible with schema
