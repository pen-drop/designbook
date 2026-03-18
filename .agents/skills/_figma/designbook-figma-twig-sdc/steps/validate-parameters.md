---
name: Validate Parameters
description: Validates story name parameter and extracts component information
---

# Validate Parameters

This skill validates the story name parameter and extracts component details.

## Purpose
Ensures a valid story name is provided and extracts component information.

## Prerequisites
- None (first step in the pipeline)

## Input
- `storyName`: Story name parameter (e.g., "Button [Story] state=enabled")

## Process

1. **Check if story name is provided**
   - If missing or empty, prompt the user
   - Ask: "Please provide the Figma story name (e.g., 'Button [Story] state=enabled')"

2. **Validate format**
   - Check for `[Story]` marker in name
   - Ensure format matches Figma naming convention
   - Example patterns:
     - "Button [Story] state=enabled"
     - "Card [Story] variant=primary"

3. **Extract component name**
   - Parse component name from story name
   - Example: "Button [Story] state=enabled" → component: "button"
   - Convert to lowercase for filesystem compatibility

4. **Store parameters**
   - Store validated story name
   - Store extracted component name
   - Store variant information if present

## Output
- `validatedStoryName`: Validated story name
- `componentName`: Extracted component name (lowercase)
- `variantInfo`: Extracted variant details

## Error Handling
- No story name: Display usage examples and exit
- Invalid format: Show expected format with examples
- Cannot extract component: Show parsing error

## Success Criteria
- Story name is valid
- Component name extracted successfully
- Parameters ready for next steps
