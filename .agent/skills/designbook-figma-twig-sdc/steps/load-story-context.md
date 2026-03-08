---
name: Load Story Context
description: Loads story YAML file and extracts props and slots
---

# Load Story Context

This skill loads the story YAML file to understand component structure.

## Purpose
Extracts component props and slots from story YAML for Twig generation.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Lookup Figma Node (completed)
- Step 3: Capture Screenshot (completed)

## Input
- Component name from Step 1: `componentName`
- Story name: `validatedStoryName`

## Process

1. **Determine story file path**
   - Extract variant from story name
   - Construct path: `web/themes/custom/daisy_cms_daisyui/components/{component}/{component}.{variant}.story.yml`
   - Example: For "Button [Story] state=enabled" → `button/button.enabled.story.yml`

2. **Load story YAML**
   - Read story YAML file
   - Parse YAML structure

3. **Extract story data**
   - Parse `props`: Component properties (e.g., `state: enabled`)
   - Parse `slots`: Component content slots (e.g., `label: "Button Text"`)
   - Parse `variant`: Component variant if specified

4. **Load component definition**
   - Read component YAML: `{component}/{component}.component.yml`
   - Extract component schema (prop types, slot definitions)
   - Understand component structure

5. **Prepare context object**
   - Combine story data with component schema
   - Create complete context for Twig generation
   - Include:
     - All props with values
     - All slots with content
     - Component variant
     - Component name

## Output
- Story context object with props, slots, and variant
- Component schema information

## Error Handling
- Story file not found: Show path and suggest running story generation
- Invalid YAML: Show parsing error
- Component file not found: Show error and suggest component generation
- Missing required fields: Show validation errors

## Success Criteria
- Story YAML loaded successfully
- Props and slots extracted
- Component schema loaded
- Context object prepared for generation

## Notes
This context will be used in the next step to generate accurate Twig templates that match the story structure.
