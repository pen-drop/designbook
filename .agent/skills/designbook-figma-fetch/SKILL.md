---
name: Pendrop Figma Fetch
description: Fetches design data from Figma using MCP Framelink through orchestrated sub-skills.
---

# Pendrop Figma Fetch

This skill orchestrates the extraction of design data from Figma by executing a series of specialized sub-skills in sequence.

## Capability

### Fetch Data from Figma
**Trigger**: When asked to "fetch figma", "download designs", "update input data", "sync from figma", or "get figma data".

**Action**: Execute the following sub-skills in order:

1. **Verify Prerequisites** (`./steps/verify-prerequisites.md`)
   - Checks MCP server (Framelink) is active
   - Verifies Figma file key configuration
   - Ensures output directory exists

2. **Fetch from Figma** (`./steps/fetch-from-figma.md`)
   - Executes MCP `figma_framelink` tool
   - Downloads component data
   - Downloads design token data

3. **Verify Output** (`./steps/verify-output.md`)
   - Confirms output files exist
   - Validates JSON structure
   - Reports fetched data statistics

## Parameters
- None required (uses Figma file key from configuration)
- Optional: Custom Figma file key can be provided

## Context
- **MCP Tool**: `figma_framelink` (from Framelink MCP server)
- **MCP Server**: `mcp-server-figma` (must be active)
- **Output Files**:
  - `.pendrop/input/pendrop.data.components.json` - Component data
  - `.pendrop/input/pendrop.tokens.json` - Design tokens

## What Gets Fetched

### Component Data
- Component definitions and structure
- Component variants and properties
- Story nodes (components marked with `[Story]`)
- Component relationships and hierarchy

### Design Tokens
- Color variables (primitives and semantics)
- Spacing variables
- Typography variables (fonts, sizes, weights)
- Border radius variables
- Opacity variables

## Error Handling
Each sub-skill handles its own errors:
- MCP server not active: Shows connection error
- Authentication fails: Shows authentication error
- Invalid file key: Shows configuration error
- Network issues: Shows network error
- Empty response: Shows data error

## Usage Examples

```bash
# Fetch all data from Figma
Execute this skill (no parameters needed)

# Fetch with custom file key
Execute this skill with fileKey="your-figma-file-key"
```

## Output Structure
Generates 2 JSON files in `.pendrop/input/`:
```
.pendrop/input/
├── pendrop.data.components.json  (Component data)
└── pendrop.tokens.json           (Design tokens)
```

## Simplified Pipeline

This workflow uses the simplest 3-step pipeline:
- Step 1: Verify Prerequisites
- Step 2: Fetch from Figma
- Step 3: Verify Output

Simplest because:
- No data transformation
- No filtering or processing
- Direct MCP tool call
- Straightforward verification

## Prerequisites
- **MCP Server**: `mcp-server-figma` (Framelink) must be active
- **Figma Access**: Valid Figma access token configured in MCP settings
- **File Key**: Figma file key configured (default: `yvvsqtdRS0TQRlbvU9TYJV`)

## Workflow Order
This skill is typically the **first step** in the Pendrop pipeline:

1. **Fetch Figma** ← This skill
2. Generate Tokens (Pendrop Tokens)
3. Generate Components (Pendrop Components)
4. Generate Stories (Pendrop Stories)
5. Generate CSS (Pendrop CSS)
6. Generate Twig (Pendrop Twig from Story) - optional

All other workflows depend on the data fetched by this skill.

## Troubleshooting
- **Connection Error**: Check Figma MCP server status, ensure Framelink is running
- **Authentication Error**: Verify Figma access token in MCP configuration
- **Missing File Key**: Check `openspec/project.md` for Figma file key
- **Empty Output**: Verify Figma file contains properly named components and `[Story]` nodes
- **MCP Not Found**: Install and configure `mcp-server-figma` (Framelink)

## Next Steps
After fetching Figma data:
- Generate tokens using Pendrop Tokens skill
- Generate components using Pendrop Components skill
- Generate stories using Pendrop Stories skill
- Or run full orchestration with Pendrop Orchestrator
