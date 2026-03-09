---
name: Report Completion
description: Reports final results and cleans up temporary files
---

# Report Completion

This skill reports the final results of Twig generation and performs cleanup.

## Purpose
Provides completion status and cleans up temporary resources.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Lookup Figma Node (completed)
- Step 3: Capture Screenshot (completed)
- Step 4: Load Story Context (completed)
- Step 5: Generate Twig (completed)
- Step 6: Validate Twig (completed)
- Step 7: Refine Twig (completed if needed)

## Input
- Final Twig file path
- Validation report (final)
- Iteration count
- Success status

## Process

1. **Determine result type**
   - **Success**: All validation checks passed
   - **Best Effort**: Max iterations reached with some issues
   - **Partial Success**: Some checks passed

2. **Compile completion report**

   **For Success:**
   - Report: "✓ Twig template generated successfully"
   - Show iteration count (e.g., "Converged in 2 iterations")
   - List all passed validation checks
   - Show Twig file location

   **For Best Effort:**
   - Report: "⚠ Twig template generated (best effort)"
   - Show iteration count: "Max iterations reached (3)"
   - List passed checks
   - List remaining issues
   - Suggest manual review

3. **Show file location**
   - Display full path: `web/themes/custom/daisy_cms_daisyui/components/{component}/{component}.twig`
   - Show file size

4. **List validation results**
   - Show final validation report
   - Indicate passed checks (✓)
   - Indicate failed checks (✗) if any

5. **Provide next steps**
   - Suggest reviewing generated file
   - Suggest testing in Storybook
   - If issues remain: Suggest manual refinement
   - Point to reference examples

6. **Clean up temporary files**
   - Remove screenshot: `.pendrop/temp/screenshots/{story_name}.png`
   - Command: `rm .pendrop/temp/screenshots/{story_name}.png`
   - Verify cleanup completed

## Output
- Completion report
- File location
- Validation summary
- Next steps guidance

## Completion Report Examples

### Success Case
```
✓ Twig Template Generated Successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component: Button
Story: Button [Story] state=enabled
Iterations: 2
Status: All validation checks passed

Generated File:
  web/themes/custom/daisy_cms_daisyui/components/button/button.twig

Validation Results:
  ✓ Structural: All props referenced
  ✓ Structural: All slots included
  ✓ Syntax: Valid Twig syntax
  ✓ Classes: Custom component classes
  ✓ Token: Typography matches Figma
  ✓ Visual: Structure matches layout

Next Steps:
  - Review generated Twig file
  - Test component in Storybook
  - Adjust styling if needed
```

### Best Effort Case
```
⚠ Twig Template Generated (Best Effort)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component: Card
Story: Card [Story] variant=primary
Iterations: 3 (max reached)
Status: Manual review recommended

Generated File:
  web/themes/custom/daisy_cms_daisyui/components/card/card.twig

Validation Results:
  ✓ Structural: All props referenced
  ✓ Structural: All slots included
  ✓ Syntax: Valid Twig syntax
  ✓ Classes: Custom component classes
  ✗ Token: Minor typography adjustment needed
  ✓ Visual: Structure matches layout

Remaining Issues:
  - Font-size slight mismatch (generated: text-base, Figma: 15px)

Next Steps:
  - Review generated Twig file
  - Manually adjust font-size if needed
  - Reference: .pendrop/validate/components/button/button.twig
  - Test component in Storybook
```

## Error Handling
- Cleanup fails: Show warning but don't fail overall
- Cannot read final file: Show error

## Success Criteria
- Report generated
- Status communicated clearly
- Next steps provided
- Temporary files cleaned up

## Notes
Even if validation has minor issues, the generated template provides a solid starting point for manual refinement.
