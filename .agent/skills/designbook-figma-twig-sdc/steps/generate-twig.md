---
name: Generate Twig
description: Generates initial Twig template using AI-assisted visual analysis
---

# Generate Twig

This skill generates the initial Twig template by analyzing the screenshot and story context.

## Purpose
Creates a Twig template that matches the visual design and component structure.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Lookup Figma Node (completed)
- Step 3: Capture Screenshot (completed)
- Step 4: Load Story Context (completed)

## Input
- Screenshot from Step 3
- Story context from Step 4
- Figma design system data:
  - `.pendrop/output/pendrop.theme.component.json` - Component structure
  - `.pendrop/output/pendrop.theme.tokens.json` - Design tokens
  - `.pendrop/input/pendrop.data.components.json` - Raw Figma data with textStyle definitions
- Reference examples:
  - `.pendrop/validate/components/button/button.twig` - Twig patterns
  - Available tokens in `css/tokens/*.src.css`

## Process

1. **Analyze screenshot**
   - Load screenshot image
   - Identify visual elements (buttons, text, images, etc.)
   - Understand layout structure
   - Note spacing, colors, typography

2. **Review story context**
   - Understand props and their values
   - Identify slots and their content
   - Note component variant

3. **Extract Figma textStyle specifications**
   - **CRITICAL**: Load raw Figma data
   - Locate component text elements
   - Find `textStyle` property references
   - Look up textStyle definitions in styles section
   - Extract `fontWeight`, `fontFamily`, `fontSize` values
   - **DO NOT assume** typography based on visual hierarchy
   - **ONLY use** values explicitly defined in Figma

4. **Generate Twig template**
   - Follow Drupal SDC patterns
   - Use Twig syntax for variables and control structures
   - Apply custom component classes (e.g., `button`, `card`)
   - **NOT** framework classes (e.g., `btn`, `btn-primary`)
   - Use Tailwind utilities with Figma tokens:
     - Colors: `bg-primary`, `text-base-content`
     - Spacing: `px-[var(--spacing-4)]`
     - Typography: **From Figma textStyle only**
     - Border radius: `rounded-[var(--radius-default)]`
   - Handle props with conditional logic
   - Create slot blocks for content areas
   - Add helpful comments

5. **Save Twig file**
   - Path: `web/themes/custom/test_integration_drupal/components/{component}/{component}.twig`
   - Create component directory if needed
   - Overwrite existing file with warning

## Output
- Generated Twig template file
- File path for verification

## Error Handling
- Screenshot analysis fails: Show error details
- Cannot generate template: Show generation error
- File write fails: Show permissions error

## Success Criteria
- Twig template generated
- File saved successfully
- Template includes all props and slots
- Template uses Figma tokens
- Typography matches Figma textStyle definitions

## Template Requirements

### Must Include:
1. All props from story (with conditional logic)
2. All slots from story (with blocks)
3. Custom component classes
4. Figma token references
5. Typography from Figma textStyle (not assumed)

### Must NOT Include:
1. DaisyUI framework classes (`btn`, `btn-*`, `card-*`)
2. Assumed typography not in Figma
3. Hard-coded colors or spacing
4. Invalid Twig syntax

## Example Template Structure
```twig
{# Component: Button #}
{% set classes = [
  'button',
  variant == 'primary' ? 'button-primary' : 'button-default',
  state == 'disabled' ? 'button-disabled' : ''
] %}

<button class="{{ classes|join(' ') }} bg-primary text-primary-content font-normal">
  {{ label }}
</button>
```

Note: `font-normal` in example comes from Figma textStyle, not assumption.
