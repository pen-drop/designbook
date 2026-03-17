---
name: Capture Screenshot
description: Captures a screenshot from Figma using MCP
---

# Capture Screenshot

This skill captures a screenshot of the story from Figma.

## Purpose
Obtains visual reference for Twig template generation.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Lookup Figma Node (completed)
- Figma MCP server (Framelink) must be active

## Input
- Node ID from Step 2: `figmaNodeId`
- Story name: `validatedStoryName`
- File key: `yvvsqtdRS0TQRlbvU9TYJV` (from project.md)

## Process

1. **Create temporary directory**
   - Command: `mkdir -p .pendrop/temp/screenshots/`
   - Ensures directory exists for screenshot storage

2. **Capture screenshot using Figma MCP**
   - Call MCP tool: `download_figma_images`
   - Parameters:
     - `fileKey`: `yvvsqtdRS0TQRlbvU9TYJV`
     - `nodeId`: from Step 2
     - `fileName`: `{story_name}.png`
     - `pngScale`: 2 (high resolution)
     - `localPath`: `.pendrop/temp/screenshots/`

3. **Verify screenshot created**
   - Check file exists: `.pendrop/temp/screenshots/{story_name}.png`
   - Verify file size is reasonable (not 0 bytes)

4. **Store screenshot path**
   - Save path for use in generation step
   - Example: `.pendrop/temp/screenshots/button_story_enabled.png`

## Output
- Screenshot file: `.pendrop/temp/screenshots/{story_name}.png`
- Screenshot path for next steps

## Error Handling
- MCP unavailable: Show MCP connection error
- Screenshot capture fails: Show Figma API error
- File not created: Show file system error
- Invalid node ID: Show node lookup error

## Success Criteria
- Screenshot file exists
- File is not empty
- File is valid PNG image

## Cleanup
Screenshot will be removed in final step (Report Completion) after processing is complete.
