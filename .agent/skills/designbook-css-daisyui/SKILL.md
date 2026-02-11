---
name: designbook-css-daisyui
description: Generates DaisyUI-compatible CSS token files from W3C Design Tokens. Use when DESIGNBOOK_CSS_FRAMEWORK is daisyui.
---

# Designbook CSS DaisyUI

This skill generates DaisyUI-compatible CSS token files from W3C Design Tokens by executing a series of steps in sequence.

## DaisyUI Reference

The complete DaisyUI 5 documentation for components, colors, themes, and config is bundled with this skill:

- **Local**: `./resources/daisyui-llms.txt`
- **Upstream**: [daisyui.com/llms.txt](https://daisyui.com/llms.txt)

Read this file when you need to understand DaisyUI class names, theme format (`@plugin "daisyui/theme"`), color naming conventions, or component syntax.

## Prerequisites

1. `DESIGNBOOK_CSS_FRAMEWORK` must be `daisyui` (via `css.framework` in `designbook.config.yml`)
2. `DESIGNBOOK_DRUPAL_THEME` must be set (via `drupal.theme` in `designbook.config.yml`)
3. Load configuration:
   ```bash
   source .agent/skills/designbook-configuration/scripts/set-env.sh
   ```
4. Verify framework:
   ```bash
   if [ "$DESIGNBOOK_CSS_FRAMEWORK" != "daisyui" ]; then
     echo "❌ This skill requires css.framework: daisyui in designbook.config.yml"
     exit 1
   fi
   ```

## Capability

### Generate CSS
**Trigger**: When asked to "generate CSS", "create CSS files", "update CSS", "regenerate CSS", or "export CSS from tokens".

**Action**: Execute the following steps in order:

1. **Verify Input** (`./steps/verify-input.md`)
   - Checks that `$DESIGNBOOK_DIST/design-tokens.json` exists
   - Validates W3C token file

2. **Check Regeneration** (`./steps/check-regeneration.md`)
   - Determines if regeneration is needed
   - Compares file timestamps (optimization)
   - Allows force regeneration

3. **Generate CSS** (`./steps/generate-css.md`)
   - Executes Node.js generation script
   - Creates all CSS token files
   - Generates dark theme

4. **Verify Output** (`./steps/verify-output.md`)
   - Confirms all CSS files exist
   - Validates CSS syntax
   - Reports generation statistics

## Parameters
- None required (processes all tokens from W3C file)
- Optional: `force` flag to skip regeneration check

## Context
- **Input**: `$DESIGNBOOK_DIST/design-tokens.json` (W3C Design Tokens)
- **Expressions**: `$DESIGNBOOK_DIST/designbook-css-daisyui/*.jsonata` (JSONata transformations)
- **Output**: `$DESIGNBOOK_DRUPAL_THEME/css/tokens/*.src.css` (CSS files)

## Generated Files

### Token Files (`$DESIGNBOOK_DRUPAL_THEME/css/tokens/`)
1. `color.src.css` - Color tokens (primitives + light theme)
2. `spacing.src.css` - Spacing tokens with responsive media queries
3. `font.src.css` - Font families, sizes, weights, line heights
4. `radius.src.css` - Border radius tokens
5. `opacity.src.css` - Opacity tokens

### Theme Files (`$DESIGNBOOK_DRUPAL_THEME/css/themes/`)
6. `dark.src.css` - Dark theme (DaisyUI plugin format)

## Output Structure
```
$DESIGNBOOK_DRUPAL_THEME/css/
├── tokens/
│   ├── color.src.css
│   ├── spacing.src.css
│   ├── font.src.css
│   ├── radius.src.css
│   └── opacity.src.css
└── themes/
    └── dark.src.css
```

## Error Handling
Each step handles its own errors and provides clear feedback:
- Missing token file: Prompts to run Designbook Tokens skill first
- Script errors: Shows Node.js error details
- Invalid output: Shows validation errors

## Optimization

This workflow includes optimization via timestamp checking:
- Skips regeneration if CSS files are up-to-date
- Saves processing time
- Can be overridden with force flag

## Integration

Generated CSS files should be imported in `$DESIGNBOOK_DRUPAL_THEME/css/app.src.css`:
```css
/* Design tokens */
@import "./tokens/color.src.css";
@import "./tokens/spacing.src.css";
@import "./tokens/font.src.css";
@import "./tokens/radius.src.css";
@import "./tokens/opacity.src.css";

/* DaisyUI themes */
@import "./themes/daisycms.src.css";
@import "./themes/dark.src.css";
```

## Technical Notes
- Color tokens combine primitives and light theme in a single file
- Dark theme uses DaisyUI's `@plugin "daisyui/theme"` format
- Spacing tokens use standard CSS media queries for responsive behavior
- Breakpoint values sourced from `semantics.responsive.breakpoints.viewport` tokens

## Next Steps
After generating CSS:
- Review generated CSS files in `css/tokens/` and `css/themes/`
- Test CSS tokens in components
- Compile CSS with Tailwind
- Update design system documentation
