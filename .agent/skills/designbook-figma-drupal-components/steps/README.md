# Pendrop Components - Sub-Skills

This folder contains the individual sub-skills that make up the component generation pipeline. Each skill represents a specific step in the process.

## Execution Order

The sub-skills must be executed in the following order:

1. **validate-parameters.md** - Validates and normalizes component name
2. **verify-input.md** - Checks that Figma data exists
3. **backup-data.md** - Creates safety backup of Figma data
4. **filter-component.md** - Filters data for specified component
5. **verify-transformation-logic.md** - Ensures transformation file exists
6. **ensure-output-directory.md** - Creates output directory structure
7. **execute-transformation.md** - Runs JSONata transformation
8. **restore-data.md** - Restores original Figma data
9. **split-manifest.md** - Converts manifest to YAML file
10. **verify-output.md** - Verifies successful generation

## Pipeline Stages

### Stage 1: Prerequisites (Steps 1-2)
- Validate input parameters
- Verify required data files exist

### Stage 2: Data Preparation (Steps 3-4)
- Create data backup for safety
- Filter data to target component

### Stage 3: Transformation Setup (Steps 5-6)
- Verify transformation logic exists
- Prepare output directory structure

### Stage 4: Execution (Step 7)
- Run JSONata transformation

### Stage 5: Post-Processing (Steps 8-10)
- Restore original data
- Generate YAML files
- Verify output

## Dependencies

Each step depends on all previous steps being completed successfully. If any step fails, the pipeline should stop and report the error.

## Data Flow

```
Figma Data (input) 
  → Validate Parameters
  → Verify Input
  → Backup
  → Filter
  → Transform
  → Restore
  → Split to YAML
  → Verify
  → Component YAML (output)
```

## Error Handling

Each sub-skill includes its own error handling logic. Errors should:
- Be clearly reported to the user
- Stop the pipeline (don't continue to next step)
- Provide actionable guidance for resolution
- Clean up temporary files when possible

## Self-Healing

The pipeline includes self-healing capabilities in Step 5 (verify-transformation-logic.md), which can automatically generate missing transformation logic by analyzing the input data structure and target output format.
