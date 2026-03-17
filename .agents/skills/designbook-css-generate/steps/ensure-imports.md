---
name: Ensure CSS Imports
description: Ensures all generated CSS files are imported in app.src.css
---

# Ensure CSS Imports

This step ensures that each generated `.src.css` file is imported in `$DESIGNBOOK_DRUPAL_THEME/css/app.src.css`.

## Prerequisites
- Step 4: Execute Transformations (completed)
- Generated CSS files exist in `$DESIGNBOOK_DRUPAL_THEME/css/tokens/` and `$DESIGNBOOK_DRUPAL_THEME/css/themes/`

## Process

1. **Read `app.src.css`**
   - Path: `$DESIGNBOOK_DRUPAL_THEME/css/app.src.css`
   - If file does not exist, create it

2. **Scan generated CSS files**
   - List all `.src.css` files in `$DESIGNBOOK_DRUPAL_THEME/css/tokens/`
   - List all `.src.css` files in `$DESIGNBOOK_DRUPAL_THEME/css/themes/`

3. **Add missing `@import` lines**
   - For each generated `.src.css` file, check if an `@import` line already exists
   - Add missing `@import` lines in the correct section:
     - **Token files** (`tokens/*.src.css`) → under the `/* Include design tokens */` comment block
     - **Theme files** (`themes/*.src.css`) → under the `/* Include themes */` comment block

4. **Example structure in `app.src.css`:**
   ```css
   /**
    * Include design tokens
    */
   @import "./tokens/color.src.css";
   @import "./tokens/font.src.css";
   @import "./tokens/spacing.src.css";

   /**
    * Include themes
    */
   @import "./themes/dark.src.css";
   ```

## Rules
- Only add imports that don't already exist (check by filename)
- Preserve existing import order
- Append new token imports after the last `@import "./tokens/...";` line
- Append new theme imports after the last `@import "./themes/...";` line
- If no token/theme section exists yet, create it

## Error Handling
- `app.src.css` missing: Create it with the generated imports
- Write permission issues: Show permissions error
