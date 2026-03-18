# Pendrop Figma Fetch - Sub-Skills

This folder contains the individual sub-skills that make up the Figma data fetch pipeline. Each skill represents a specific step in the process.

## Execution Order

The sub-skills must be executed in the following order:

1. **verify-prerequisites.md** - Checks MCP server status and configuration
2. **fetch-from-figma.md** - Executes data fetch using MCP tool
3. **verify-output.md** - Verifies downloaded data files

## Pipeline Stages

### Stage 1: Setup (Step 1)
- Verify MCP server is active
- Check Figma file key configuration
- Ensure output directory exists

### Stage 2: Execution (Step 2)
- Fetch component data from Figma
- Fetch design token data from Figma
- Use MCP Framelink tool

### Stage 3: Verification (Step 3)
- Verify output files exist
- Validate JSON structure
- Count and report fetched data

## Dependencies

Each step depends on all previous steps being completed successfully. If any step fails, the pipeline should stop and report the error.

## Data Flow

```
Figma File (cloud)
  → Verify Prerequisites
  → Fetch from Figma (MCP)
  → Verify Output
  → Local Data Files (output)
```

## Error Handling

Each sub-skill includes its own error handling logic. Errors should:
- Be clearly reported to the user
- Stop the pipeline (don't continue to next step)
- Provide actionable guidance for resolution

## Simplified Structure

This is the simplest Pendrop workflow with only 3 steps:
1. Verify Prerequisites
2. Fetch from Figma
3. Verify Output

Simple because:
- No transformation logic needed
- No filtering or processing
- Direct MCP tool call
- Straightforward verification

## MCP Integration

This workflow relies on the Figma MCP server (Framelink):
- **Tool**: `figma_framelink`
- **Server**: `mcp-server-figma`
- **Purpose**: Downloads design data from Figma

## Success Criteria

- MCP server is active and responding
- Data successfully fetched from Figma
- Output files created and validated
- Component and story nodes present in data

## First in Pipeline

This skill is typically the **first step** in the Pendrop pipeline:
1. **Fetch Figma** ← You are here
2. Generate Tokens
3. Generate Components
4. Generate Stories
5. Generate CSS
6. Generate Twig (optional)

All other workflows depend on the data fetched by this skill.
