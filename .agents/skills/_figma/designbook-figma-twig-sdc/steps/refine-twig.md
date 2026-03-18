---
name: Refine Twig
description: Iteratively refines Twig template to fix validation issues
---

# Refine Twig

This skill refines the Twig template based on validation feedback (Iterations 2-3).

## Purpose
Fixes identified issues to bring the template into compliance with all validation criteria.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Lookup Figma Node (completed)
- Step 3: Capture Screenshot (completed)
- Step 4: Load Story Context (completed)
- Step 5: Generate Twig (completed)
- Step 6: Validate Twig (completed - with failures)

## Input
- Validation report from Step 6
- Current Twig file
- Original context (screenshot, story, Figma data)

## Process

1. **Analyze validation failures**
   - Review validation report
   - Identify specific issues:
     - Missing props or slots
     - Incorrect HTML structure
     - Wrong or missing classes
     - DaisyUI classes present
     - Missing Figma token references
     - **Typography mismatches** (font-weight, font-family, font-size)
     - Syntax errors

2. **Prioritize fixes**
   - Critical: Syntax errors
   - High: Token validation failures (typography)
   - High: DaisyUI class replacements
   - Medium: Structural issues
   - Low: Visual refinements

3. **Apply fixes**
   
   **For typography mismatches**:
   - Load exact textStyle definition from Figma
   - Replace assumed font-weight with Figma value
   - Replace assumed font-size with Figma value
   - **DO NOT** use heavier fonts for "enabled" states
   - **ONLY** use values from textStyle

   **For DaisyUI classes**:
   - Replace `btn` with custom `button` class
   - Replace `btn-primary` with `button-primary`
   - Replace `card` with custom component class
   - Use Tailwind utilities for styling

   **For missing props/slots**:
   - Add missing prop conditionals
   - Add missing slot blocks
   - Ensure proper Twig syntax

   **For token references**:
   - Replace hard-coded colors with token utilities
   - Use `bg-primary`, `text-base-content`, etc.
   - Use spacing tokens: `px-[var(--spacing-4)]`

4. **Regenerate Twig**
   - Apply all fixes
   - Maintain valid Twig syntax
   - Preserve working parts
   - Save updated template

5. **Re-validate**
   - Run Step 6 (Validate Twig) again
   - Check if all issues resolved

6. **Iterate if needed**
   - If validation passes → go to Step 7 (Report Completion)
   - If validation fails and iteration < 3 → repeat refinement
   - If validation fails and iteration = 3 → go to Step 7 (best effort)

## Output
- Refined Twig template
- Iteration count
- Status: resolved or needs manual review

## Error Handling
- Cannot apply fix: Document issue for manual review
- Syntax error introduced: Revert and try alternative
- Max iterations reached: Accept best effort

## Success Criteria
- All validation issues resolved
- Template passes all checks
- Or: Max iterations reached with best effort

## Iteration Limits
- Maximum 3 iterations total (including initial generation)
- Iteration 1: Initial generation
- Iteration 2: First refinement
- Iteration 3: Final refinement
- After iteration 3: Accept best result, flag for manual review

## Notes
Most templates should pass validation within 2 iterations. Complex components may need all 3 iterations or manual refinement.
