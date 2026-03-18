# Pendrop Twig from Story - Sub-Skills

This folder contains the individual sub-skills that make up the Twig template generation pipeline. Each skill represents a specific step in the AI-assisted generation process.

## Execution Order

The sub-skills must be executed in the following order:

1. **validate-parameters.md** - Validates story name and extracts component info
2. **lookup-figma-node.md** - Finds Figma node for the story
3. **capture-screenshot.md** - Captures screenshot from Figma
4. **load-story-context.md** - Loads story YAML and component schema
5. **generate-twig.md** - Generates initial Twig template (Iteration 1)
6. **validate-twig.md** - Validates generated template
7. **refine-twig.md** - Refines template based on validation (Iterations 2-3)
8. **report-completion.md** - Reports results and cleans up

## Pipeline Stages

### Stage 1: Setup (Steps 1-4)
- Validate parameters and extract component name
- Locate story in Figma data
- Capture visual screenshot
- Load component context

### Stage 2: Generation (Step 5)
- Analyze screenshot with AI
- Review story structure
- Extract Figma textStyle specifications
- Generate initial Twig template

### Stage 3: Validation (Step 6)
- Structural validation (props, slots)
- Syntax validation (Twig)
- Class validation (custom vs. framework)
- Token validation (typography matches Figma)
- Visual validation (layout matches screenshot)

### Stage 4: Refinement (Step 7)
- Identify validation failures
- Apply targeted fixes
- Re-validate
- Iterate up to 3 times

### Stage 5: Completion (Step 8)
- Report final status
- Show validation results
- Provide next steps
- Clean up temporary files

## Dependencies

Each step depends on all previous steps being completed successfully. The refinement step (7) is optional and only runs if validation fails.

## Data Flow

```
Story Name (input)
  → Validate Parameters
  → Lookup Figma Node
  → Capture Screenshot
  → Load Story Context
  → Generate Twig (AI-assisted)
  → Validate Twig
  ↓
  Validation Pass? 
    YES → Report Completion
    NO → Refine Twig
      → Validate Again
      → Iterate (max 3 times)
      → Report Completion
  ↓
  Twig Template (output)
```

## Iterative Refinement

This pipeline uses iterative refinement:
- **Iteration 1**: Initial AI-assisted generation
- **Iteration 2**: First refinement based on validation
- **Iteration 3**: Final refinement if still needed
- **Result**: Success or best-effort with manual review suggestions

## Critical Validation: Typography

The pipeline includes critical validation for typography:
- **NO assumptions** about font-weight or font-size
- **MUST match** Figma textStyle definitions exactly
- Cross-references generated CSS with Figma data
- Flags any mismatches for correction

Example:
- ✗ Assuming "enabled" state should be bold
- ✓ Using exact `fontWeight: 400` from Figma textStyle

## Error Handling

Each sub-skill includes its own error handling logic. Errors should:
- Be clearly reported to the user
- Stop the pipeline at the appropriate point
- Provide actionable guidance for resolution
- Clean up resources when safe

## Cleanup

The pipeline cleans up temporary files:
- Screenshots in `.pendrop/temp/screenshots/`
- Removed after successful completion

## Complex Workflow

This is the most complex Pendrop workflow because it:
- Uses AI-assisted visual analysis
- Captures screenshots via Figma MCP
- Performs multi-criteria validation
- Includes iterative refinement
- Enforces strict Figma specification adherence

## Success Rate

- Simple components: Usually succeed in 1-2 iterations
- Complex components: May need all 3 iterations
- Very complex components: May need manual review after 3 iterations

The pipeline provides a high-quality starting point even when manual refinement is needed.
