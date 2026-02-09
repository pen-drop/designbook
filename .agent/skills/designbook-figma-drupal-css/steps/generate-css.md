---
name: Generate CSS
description: Executes the Node.js script to generate CSS token files
---

# Generate CSS

This skill executes the CSS generation script to create token CSS files.

## Purpose
Transforms W3C Design Tokens into Tailwind-compatible CSS custom properties.

## Prerequisites
- Step 1: Verify Input (completed)
- Step 2: Check Regeneration (completed - regeneration needed)

## Input
- Token file: `.pendrop/output/pendrop.theme.tokens.json`
- Generation script: `.pendrop/tools/generate-css-tokens.js`

## Process

1. **Ensure output directory exists**
   - Command: `mkdir -p web/themes/custom/daisy_cms_daisyui/css/tokens`
   - Command: `mkdir -p web/themes/custom/daisy_cms_daisyui/css/themes`
   - Creates directories if they don't exist

2. **Execute generation script**
   - Command: `node .pendrop/tools/generate-css-tokens.js`
   - Script reads W3C tokens and generates CSS files
   - Displays progress messages

3. **Monitor generation**
   - Show script output
   - Display which files are being generated

4. **Verify script completion**
   - Check exit code
   - Confirm script ran without errors

## Output
Generates 6 CSS files:

### Token Files (in `css/tokens/`)
1. `color.src.css` - Color tokens (primitives + light theme)
2. `spacing.src.css` - Spacing tokens with responsive media queries
3. `font.src.css` - Font families, sizes, weights, line heights
4. `radius.src.css` - Border radius tokens
5. `opacity.src.css` - Opacity tokens

### Theme Files (in `css/themes/`)
6. `dark.src.css` - Dark theme (DaisyUI plugin format)

## Error Handling
- Script fails: Show Node.js error message
- Permission denied: Show permissions error
- Directory creation fails: Show filesystem error

## Success Criteria
- Script completes without errors
- All 6 CSS files are created
- Files contain valid CSS syntax

## Generated File Structure
```
web/themes/custom/daisy_cms_daisyui/css/
├── tokens/
│   ├── color.src.css
│   ├── spacing.src.css
│   ├── font.src.css
│   ├── radius.src.css
│   └── opacity.src.css
└── themes/
    └── dark.src.css
```

## Technical Notes
- Color tokens combine primitives and light theme in a single file
- Dark theme uses DaisyUI's `@plugin "daisyui/theme"` format
- Spacing tokens use standard CSS media queries for responsive behavior
- Breakpoint values sourced from `semantics.responsive.breakpoints.viewport` tokens
