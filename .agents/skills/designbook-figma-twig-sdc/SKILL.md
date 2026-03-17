---
name: Pendrop Twig from Story
description: "Internal skill — generates Twig templates from Figma story screenshots using AI-assisted visual analysis. Invoked by debo-figma-drupal-twig workflow only."
---

# Pendrop Twig from Story

This skill orchestrates the generation of Twig templates from Figma story screenshots by executing a series of specialized sub-skills with iterative refinement.

> **Internal skill** — Do not invoke directly. Use the `debo-figma-drupal-twig` workflow instead.

## Capability

### Generate Twig from Story

**Action**: Execute the following sub-skills in order:

1. **Validate Parameters** (`./steps/validate-parameters.md`)
   - Validates story name format
   - Extracts component name and variant

2. **Lookup Figma Node** (`./steps/lookup-figma-node.md`)
   - Finds story node in Figma data
   - Extracts node ID for screenshot

3. **Capture Screenshot** (`./steps/capture-screenshot.md`)
   - Captures story screenshot from Figma using MCP
   - Saves to temporary directory

4. **Load Story Context** (`./steps/load-story-context.md`)
   - Loads story YAML file
   - Extracts props and slots
   - Loads component schema

5. **Generate Twig** (`./steps/generate-twig.md`)
   - Analyzes screenshot with AI
   - Reviews story structure and Figma textStyle specifications
   - Generates initial Twig template (Iteration 1)

6. **Validate Twig** (`./steps/validate-twig.md`)
   - Structural validation (props, slots)
   - Syntax validation (Twig)
   - Class validation (custom vs. framework)
   - Token validation (typography matches Figma)
   - Visual validation (matches screenshot)

7. **Refine Twig** (`./steps/refine-twig.md`) - *if validation fails*
   - Identifies validation issues
   - Applies targeted fixes
   - Re-validates
   - Iterates up to 3 times total

8. **Report Completion** (`./steps/report-completion.md`)
   - Reports success or best-effort result
   - Shows validation summary
   - Provides next steps
   - Cleans up temporary files

## Parameters
- `storyName`: The Figma story name (required)
  - Format: "Component [Story] prop=value"
  - Examples: "Button [Story] state=enabled", "Card [Story] variant=primary"

## Context
- **Input**: 
  - `.pendrop/input/pendrop.data.components.json` - Figma data
  - Story YAML files in component directories
  - Screenshots captured from Figma
- **Output**: `web/themes/custom/test_integration_drupal/components/{component}/{component}.twig`

## Critical Requirements

### Figma Specification Adherence
- **ALWAYS** prefer Figma textStyle specifications over typical UI patterns
- **DO NOT** assume visual hierarchy (e.g., heavier font-weight for "enabled" state)
- **ONLY** use typography values explicitly defined in Figma
- Extract font-weight, font-family, font-size from textStyle definitions

### Class Requirements
- Use custom component classes (e.g., `button`, `card`)
- **NO** framework classes (e.g., `btn`, `btn-primary`)
- **NO** DaisyUI classes
- Use Figma tokens through Tailwind utilities

### Token Usage
- Colors: `bg-primary`, `text-base-content`
- Spacing: `px-[var(--spacing-4)]`
- Typography: **From Figma textStyle only**
- Border radius: `rounded-[var(--radius-default)]`

## Iterative Refinement

The pipeline uses up to 3 iterations:
- **Iteration 1**: AI-assisted initial generation
- **Iteration 2**: First refinement (if validation fails)
- **Iteration 3**: Final refinement (if still needed)

Most templates succeed in 1-2 iterations. Complex components may need manual review after 3 iterations.

## Error Handling
Each sub-skill handles its own errors:
- Story not found: Lists available stories
- Figma MCP unavailable: Shows MCP connection error
- Screenshot capture fails: Shows Figma API error
- Validation failures: Provides specific fix guidance

## Usage Examples

```bash
# Generate Twig for Button enabled state
Execute this skill with storyName="Button [Story] state=enabled"

# Generate Twig for Card primary variant
Execute this skill with storyName="Card [Story] variant=primary"
```

## Output Example

```
✓ Twig Template Generated Successfully

Component: Button
Story: Button [Story] state=enabled
Iterations: 2
Status: All validation checks passed

Generated File:
  web/themes/custom/test_integration_drupal/components/button/button.twig

Validation Results:
  ✓ Structural: All props referenced
  ✓ Structural: All slots included
  ✓ Syntax: Valid Twig syntax
  ✓ Classes: Custom component classes
  ✓ Token: Typography matches Figma
  ✓ Visual: Structure matches layout
```

## Complex Workflow

This is the most complex Pendrop skill because it:
- Uses AI-assisted visual analysis
- Captures screenshots via Figma MCP
- Performs multi-criteria validation
- Includes iterative refinement
- Enforces strict Figma specification adherence

## Prerequisites
- Figma MCP server (Framelink) must be active
- Story YAML files must exist (generate with Pendrop Stories skill)
- Component YAML must exist (generate with Pendrop Components skill)

## Troubleshooting
- **Story not found**: Check story name format, list available stories
- **MCP unavailable**: Check Figma MCP server connection
- **Screenshot fails**: Verify Figma file key and node ID
- **Validation fails**: Review validation report, apply suggested fixes
- **Typography mismatch**: Check Figma textStyle definitions in raw data

## Next Steps
After generating Twig:
- Review generated template
- Test component in Storybook
- Manually refine if needed (especially for complex components)
- Reference validation examples in `.pendrop/validate/components/`
