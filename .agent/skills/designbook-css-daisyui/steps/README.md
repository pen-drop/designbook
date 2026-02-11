# Designbook CSS DaisyUI - Steps

This folder contains the individual steps that make up the CSS generation pipeline.

## Execution Order

1. **verify-input.md** - Checks that W3C Design Tokens file exists
2. **check-regeneration.md** - Determines if regeneration is needed
3. **generate-css.md** - Executes Node.js CSS generation script
4. **verify-output.md** - Verifies all CSS files were created

## Data Flow

```
$DESIGNBOOK_DIST/design-tokens.json (input)
  → Verify Input
  → Check Regeneration (optimization)
  → Generate CSS
  → Verify Output
  → $DESIGNBOOK_DRUPAL_THEME/css/tokens/*.src.css (output)
```

## Environment Variables

All steps require these variables (loaded via `designbook-configuration` skill):
- `DESIGNBOOK_DIST` — Path to designbook dist directory
- `DESIGNBOOK_DRUPAL_THEME` — Path to the Drupal theme
- `DESIGNBOOK_CSS_FRAMEWORK` — Must be `daisyui`

## Error Handling

Each step includes its own error handling. Errors should:
- Be clearly reported to the user
- Stop the pipeline (don't continue to next step)
- Provide actionable guidance for resolution
