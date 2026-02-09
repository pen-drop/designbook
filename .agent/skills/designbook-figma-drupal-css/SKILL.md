---
name: Pendrop CSS
description: Generates Tailwind-compatible CSS token files from W3C Design Tokens through orchestrated sub-skills.
---

# Pendrop CSS

This skill orchestrates the generation of CSS token files from W3C-compliant Design Tokens by executing a series of specialized sub-skills in sequence.

## Capability

### Generate CSS
**Trigger**: When asked to "generate CSS", "create CSS files", "update CSS", "regenerate CSS", or "export CSS from tokens".

**Action**: Execute the following sub-skills in order:

1. **Verify Input** (`./steps/verify-input.md`)
   - Checks that `.pendrop/output/pendrop.theme.tokens.json` exists
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
- **Input**: `.pendrop/output/pendrop.theme.tokens.json` (W3C Design Tokens)
- **Script**: `.pendrop/tools/generate-css-tokens.js` (Generation logic)
- **Output**: `web/themes/custom/daisy_cms_daisyui/css/tokens/*.src.css` (CSS files)

## Generated Files

### Token Files (`css/tokens/`)
1. `color.src.css` - Color tokens (primitives + light theme)
2. `spacing.src.css` - Spacing tokens with responsive media queries
3. `font.src.css` - Font families, sizes, weights, line heights
4. `radius.src.css` - Border radius tokens
5. `opacity.src.css` - Opacity tokens

### Theme Files (`css/themes/`)
6. `dark.src.css` - Dark theme (DaisyUI plugin format)

## Error Handling
Each sub-skill handles its own errors and provides clear feedback:
- Missing token file: Prompts to run Pendrop Tokens skill first
- Script errors: Shows Node.js error details
- Invalid output: Shows validation errors

## Usage Examples

```bash
# Generate CSS from tokens
Execute this skill (no parameters needed)

# Force regeneration (skip timestamp check)
Execute this skill with force=true
```

## Output Structure
Generates 6 CSS files in two directories:
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

## Optimization

This workflow includes optimization via timestamp checking:
- Skips regeneration if CSS files are up-to-date
- Saves processing time
- Can be overridden with force flag

## Simplified Pipeline

This workflow uses a simplified 4-step pipeline:
- Step 1: Verify Input
- Step 2: Check Regeneration (optimization)
- Step 3: Generate CSS
- Step 4: Verify Output

## Integration

Generated CSS files should be imported in `css/app.src.css`:
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

## Troubleshooting
- **Missing Tokens**: Ensure tokens have been generated using Pendrop Tokens skill first.
- **Script Error**: Check Node.js script at `.pendrop/tools/generate-css-tokens.js`.
- **Missing CSS Files**: The workflow auto-detects and regenerates missing files.
- **Dark Mode Issues**: Verify color token structure includes mode variations.

## Next Steps
After generating CSS:
- Review generated CSS files in `css/tokens/` and `css/themes/`
- Test CSS tokens in components
- Compile CSS with Tailwind
- Update design system documentation
