---
name: Lookup Figma Node
description: Finds the Figma node for the specified story
---

# Lookup Figma Node

This skill searches for the story node in Figma data and extracts its node ID.

## Purpose
Locates the story node to enable screenshot capture.

## Prerequisites
- Step 1: Validate Parameters (completed)

## Input
- Story name from Step 1: `validatedStoryName`
- Figma data: `.pendrop/input/pendrop.data.components.json`

## Process

1. **Load Figma data**
   - Read file: `.pendrop/input/pendrop.data.components.json`
   - Parse JSON structure

2. **Search for story node**
   - Search for node with matching name
   - Look for exact match: `validatedStoryName`
   - Navigate through document structure

3. **Extract node ID**
   - Get node `id` property
   - This ID will be used for screenshot capture
   - Example: `"id": "1234:5678"`

4. **Handle not found**
   - If story not found:
     - List all available `[Story]` nodes from Figma data
     - Display: "Story '[StoryName]' not found. Available stories:"
     - Show story names with their components
     - Exit with error

## Output
- `figmaNodeId`: Node ID for screenshot capture
- Node metadata for context

## Error Handling
- File not found: Prompt to run `/pendrop-fetch-figma`
- Invalid JSON: Show parsing error
- Story not found: List available stories
- Multiple matches: Use first match with warning

## Success Criteria
- Story node found in Figma data
- Node ID extracted successfully
- Node ID is valid format

## Notes
The node ID is required for the screenshot capture step using Figma MCP.
