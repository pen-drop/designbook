---
name: Fetch from Figma
description: Fetches component and token data from Figma using MCP
---

# Fetch from Figma

This skill executes the data fetch from Figma using the MCP Framelink tool.

## Purpose
Downloads component definitions, design variables, and story nodes from Figma.

## Prerequisites
- Step 1: Verify Prerequisites (completed)

## Input
- Figma file key from Step 1
- MCP tool: `figma_framelink`

## Process

1. **Fetch component data**
   - Call MCP tool: `figma_framelink`
   - Target: `.pendrop/input/pendrop.data.components.json`
   - Downloads:
     - Component definitions and structure
     - Component variants and properties
     - Story nodes (components with `[Story]` suffix)
     - Component relationships

2. **Fetch design tokens/variables**
   - Call MCP tool: `figma_framelink` (if separate endpoint)
   - Target: `.pendrop/input/pendrop.tokens.json`
   - Downloads:
     - Color variables
     - Spacing variables
     - Typography variables
     - Border radius variables
     - Opacity variables

3. **Monitor fetch progress**
   - Display progress messages
   - Show data being downloaded
   - Report any warnings from MCP

4. **Handle fetch completion**
   - Check MCP tool exit status
   - Confirm data was downloaded
   - Display success message

## Output
- Component data file: `.pendrop/input/pendrop.data.components.json`
- Token data file: `.pendrop/input/pendrop.tokens.json`

## Error Handling
- MCP connection fails: Show "Cannot connect to Figma MCP server"
- Authentication fails: Show "Figma authentication error - check access token"
- File key invalid: Show "Invalid Figma file key"
- Network error: Show "Network error while fetching from Figma"
- Empty response: Show "No data returned from Figma"

## Success Criteria
- MCP tool executes without errors
- Component data file created
- Token data file created (if applicable)
- Files contain valid JSON

## What Gets Fetched

### Component Data
- Component nodes with definitions
- Variant definitions
- Props extracted from variants
- Story nodes (marked with `[Story]`)
- Component hierarchy

### Design Tokens
- Color primitives and semantics
- Spacing scales
- Typography definitions (font families, sizes, weights)
- Border radius values
- Opacity values

## Notes
The MCP Framelink server handles the Figma API communication, authentication, and data transformation.
