# Pendrop CSS - Sub-Skills

This folder contains the individual sub-skills that make up the CSS generation pipeline. Each skill represents a specific step in the process.

## Execution Order

The sub-skills must be executed in the following order:

1. **verify-input.md** - Checks that W3C Design Tokens file exists
2. **check-regeneration.md** - Determines if regeneration is needed
3. **generate-css.md** - Executes Node.js CSS generation script
4. **verify-output.md** - Verifies all CSS files were created

## Pipeline Stages

### Stage 1: Prerequisites (Steps 1-2)
- Verify token file exists
- Check if regeneration is needed (optimization)

### Stage 2: Execution (Step 3)
- Generate all CSS token files

### Stage 3: Verification (Step 4)
- Verify output files and validate structure

## Dependencies

Each step depends on all previous steps being completed successfully. If any step fails, the pipeline should stop and report the error.

## Data Flow

```
W3C Design Tokens (input)
  → Verify Input
  → Check Regeneration (optimization)
  → Generate CSS
  → Verify Output
  → CSS Token Files (output)
```

## Error Handling

Each sub-skill includes its own error handling logic. Errors should:
- Be clearly reported to the user
- Stop the pipeline (don't continue to next step)
- Provide actionable guidance for resolution

## Optimization

This pipeline includes an optimization step (Check Regeneration) that:
- Compares file timestamps
- Skips regeneration if CSS files are up-to-date
- Saves processing time for large token sets
- Can be overridden by user if forced regeneration is needed

## Simplified Structure

This workflow has a simplified 4-step structure:
1. Verify Input
2. Check Regeneration (optional optimization)
3. Generate CSS
4. Verify Output

Simpler than Components/Stories because:
- No component filtering needed (processes all tokens)
- No backup/restore needed (input is not modified)
- No manifest splitting needed (generates multiple files directly)

## Generated Output

The pipeline generates 6 CSS files:
- 5 token files in `css/tokens/`
- 1 theme file in `css/themes/`

All files use Tailwind-compatible CSS custom properties format.
