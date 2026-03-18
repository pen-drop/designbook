---
name: Verify Prerequisites
description: Verifies that Figma MCP server is active and configured
---

# Verify Prerequisites

This skill checks that all prerequisites are met before fetching data from Figma.

## Purpose
Ensures the MCP server and Figma configuration are ready before attempting to fetch data.

## Prerequisites
- None (first step in the pipeline)

## Process

1. **Check MCP server status**
   - Verify `mcp-server-figma` (Framelink) is active
   - Check if `figma_framelink` tool is available
   - Display connection status

2. **Verify Figma file key**
   - Check that Figma file key is configured
   - Read from `openspec/project.md` if available
   - Default file key: `yvvsqtdRS0TQRlbvU9TYJV` (from project configuration)

3. **Check output directory**
   - Ensure `.pendrop/input/` directory exists
   - Create directory if missing: `mkdir -p .pendrop/input`

4. **Confirm readiness**
   - Display message: "✓ Prerequisites verified"
   - Show Figma file key
   - Show MCP server status

## Output
- Confirmation that prerequisites are met
- Figma file key to use
- Output directory path

## Error Handling
- MCP server not active: Show error "Figma MCP server (Framelink) is not active"
- Missing file key: Show error "Figma file key not configured"
- Directory creation fails: Show filesystem error

## Success Criteria
- MCP server is active and responding
- Figma file key is available
- Output directory exists

## Notes
The Figma file key can be found in `openspec/project.md` or specified as a parameter.
