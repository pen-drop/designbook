# Pendrop Tokens - Sub-Skills

This folder contains the individual sub-skills that make up the token generation pipeline. Each skill represents a specific step in the process.

## Execution Order

The sub-skills must be executed in the following order:

1. **verify-input.md** - Checks that token input file exists
2. **verify-transformation-logic.md** - Ensures transformation file exists
3. **execute-transformation.md** - Runs JSONata transformation
4. **verify-output.md** - Verifies successful generation

## Pipeline Stages

### Stage 1: Prerequisites (Steps 1-2)
- Verify input file exists
- Verify transformation logic exists

### Stage 2: Execution (Step 3)
- Run JSONata transformation

### Stage 3: Verification (Step 4)
- Verify output and validate structure

## Dependencies

Each step depends on all previous steps being completed successfully. If any step fails, the pipeline should stop and report the error.

## Data Flow

```
Token Data (input) 
  → Verify Input
  → Verify Transformation Logic
  → Execute Transformation
  → Verify Output
  → W3C Design Tokens (output)
```

## Error Handling

Each sub-skill includes its own error handling logic. Errors should:
- Be clearly reported to the user
- Stop the pipeline (don't continue to next step)
- Provide actionable guidance for resolution

## Self-Healing

The pipeline includes self-healing capabilities in Step 2 (verify-transformation-logic.md), which can automatically generate missing transformation logic by analyzing the input data structure and target W3C Design Tokens format.

## Simplified Structure

Note: This workflow has a simpler structure than Components/Stories workflows because:
- No component filtering needed (processes all tokens)
- No backup/restore needed (input is not modified)
- No manifest splitting needed (single output file)

This results in just 4 steps instead of 10, making it more efficient while maintaining the same architectural benefits.
