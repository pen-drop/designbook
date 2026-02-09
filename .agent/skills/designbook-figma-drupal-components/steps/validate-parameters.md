---
name: Validate Parameters
description: Validates and normalizes the component name parameter
---

# Validate Parameters

This skill ensures that a valid component name is provided and normalizes it for processing.

## Purpose
Validates the component name parameter before processing begins.

## Prerequisites
- None (first step in the pipeline)

## Input
- `componentName`: String parameter (may be missing)

## Process

1. **Check if component name is provided**
   - If `componentName` parameter is missing or empty, prompt the user
   - Ask: "Please provide the component name (e.g., Button, Card, Hero)"

2. **Normalize component name**
   - Accept case-insensitive input (e.g., "Button", "button", "BUTTON")
   - Store the original case for matching against Figma data
   - Examples:
     - "Button" → matches "Button [Component]"
     - "button" → matches "Button [Component]"
     - "BUTTON" → matches "Button [Component]"

3. **Store normalized name**
   - Store the validated component name for use in subsequent steps
   - Format: Original case preserved for display and matching

## Output
- `validatedComponentName`: Normalized component name ready for processing

## Error Handling
- If no component name provided after prompt: Display usage examples and exit
- Invalid characters: Show allowed format (alphanumeric, hyphens, underscores)

## Success Criteria
- Component name is not empty
- Component name is properly formatted
- Component name is stored for next steps
