---
name: Validate Twig
description: Validates generated Twig against multiple criteria
---

# Validate Twig

This skill validates the generated Twig template against structural, syntax, class, token, and visual criteria.

## Purpose
Ensures the generated Twig meets quality standards and matches Figma specifications.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Lookup Figma Node (completed)
- Step 3: Capture Screenshot (completed)
- Step 4: Load Story Context (completed)
- Step 5: Generate Twig (completed)

## Input
- Generated Twig file path
- Story context from Step 4
- Screenshot from Step 3
- Figma data: `.pendrop/input/pendrop.data.components.json`

## Validation Checks

### 1. Structural Validation
**Check**: All props from story YAML are referenced
- Load story YAML props
- Search Twig for each prop reference
- Report missing props

**Check**: All slots from story YAML are included
- Load story YAML slots
- Search Twig for slot blocks
- Report missing slots

### 2. Syntax Validation
**Check**: Valid Twig syntax
- Parse Twig template
- Check for unclosed tags
- Verify proper nesting
- Check variable syntax

### 3. Class Validation
**Check**: Uses custom component classes
- Extract all CSS classes from template
- Verify custom classes (e.g., `button`, `card`)
- **Flag errors**: Framework classes (e.g., `btn`, `btn-*`)
- **NO DaisyUI classes allowed**

**Check**: Uses Figma tokens through Tailwind
- Extract utility classes
- Verify token references (e.g., `bg-primary`, `text-base-content`)
- Check for hard-coded values

### 4. Token Validation (Typography)
**CRITICAL CHECK**: Typography matches Figma textStyle

**Step 1**: Extract font utilities from Twig
- Find: `font-normal`, `font-medium`, `font-semibold`, `font-bold`
- Find: `text-base`, `text-lg`, `text-xl`, etc.

**Step 2**: Load Figma component definition
- Read: `.pendrop/input/pendrop.data.components.json`
- Find component node

**Step 3**: Locate text elements
- Find text elements in component
- Extract `textStyle` references

**Step 4**: Cross-reference textStyle properties
- Look up style in styles/textStyles section
- Extract: `fontWeight`, `fontFamily`, `fontSize`
- Convert to Tailwind:
  - 400 → `font-normal`
  - 500 → `font-medium`
  - 600 → `font-semibold`
  - 700 → `font-bold`

**Step 5**: Flag mismatches
- Compare generated vs. Figma values
- Report errors for any mismatches
- Example: "Font-weight mismatch - Figma specifies 400 (font-normal), generated uses 500 (font-medium)"

### 5. Visual Validation
**Check**: Structure matches screenshot
- Compare HTML structure to visual layout
- Verify element hierarchy
- Check conditional states (enabled/disabled)

## Process

1. **Run all validation checks**
   - Execute each check in sequence
   - Collect all errors and warnings

2. **Compile validation report**
   - List passed checks (✓)
   - List failed checks (✗)
   - Provide specific error messages
   - Suggest fixes for each issue

3. **Determine result**
   - All checks pass → Success (go to Step 7: Report Completion)
   - Any checks fail → Needs refinement (go to Step 6: Refine Twig)

## Output
- Validation report with check results
- List of issues to fix
- Decision: success or refinement needed

## Error Handling
- Cannot read Twig file: Show file error
- Cannot parse Figma data: Show parsing error
- Validation check crashes: Show error and continue

## Success Criteria
- All structural checks pass
- All syntax checks pass
- All class checks pass
- All token checks pass (typography matches Figma)
- Visual structure matches screenshot

## Validation Report Example
```
Twig Validation Report
━━━━━━━━━━━━━━━━━━━━━

✓ Structural: All props referenced
✓ Structural: All slots included
✓ Syntax: Valid Twig syntax
✓ Classes: Custom component classes used
✗ Classes: Found DaisyUI class 'btn' at line 5
✗ Token: Font-weight mismatch - Figma: 400, Generated: 500
✓ Visual: Structure matches screenshot

Result: REFINEMENT NEEDED (2 issues)
```

## Workflow Tracking

> ⛔ **Use `@designbook-workflow/steps/`** for tracking: load `create` → `update` (in-progress) → `add-files` → `validate` → `update` (done).

Produced files for `--files`:
- `../components/<component-name>/<component-name>.html.twig`
- `../components/<component-name>/<component-name>.default.story.yml`
