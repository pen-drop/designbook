---
name: Verify Output
description: Verifies that the story YAML files were created successfully
---

# Verify Output

This skill performs final verification that the story generation was successful.

## Purpose
Confirms the generated story files exist and have the correct structure.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Verify Input (completed)
- Step 3: Backup Data (completed)
- Step 4: Filter Component (completed)
- Step 5: Verify Transformation Logic (completed)
- Step 6: Ensure Output Directory (completed)
- Step 7: Execute Transformation (completed)
- Step 8: Restore Data (completed)
- Step 9: Split Manifest (completed)

## Input
- Component name from Step 1: `validatedComponentName`
- Expected output path: `web/themes/custom/daisy_cms_daisyui/components/[component-name]/`

## Process

1. **Check component folder exists**
   - Verify directory: `web/themes/custom/daisy_cms_daisyui/components/[component-name]/`
   - Example: For "Button", check `web/themes/custom/daisy_cms_daisyui/components/button/`

2. **Check story YAML files exist**
   - List all `.story.yml` files in the component folder
   - Example: `button.enabled.story.yml`, `button.disabled.story.yml`

3. **Validate YAML structure**
   - Parse each YAML file to ensure valid syntax
   - Check for required Drupal SDC story fields:
     - `name`: Story name
     - `variant`: Component variant (optional)
     - `props`: Story props (optional)
     - `slots`: Story slots (optional)

4. **Display success summary**
   - Show component name
   - Show output file paths
   - List generated story files
   - Display message: "✓ Stories generated successfully"

## Output
- Confirmation message with details about generated stories
- File paths to generated YAML files

## Error Handling
- Folder missing: Show error "Component folder not created"
- No story files: Show error "No story YAML files generated"
- Invalid YAML: Show parsing error and line number
- Missing required fields: List missing fields

## Success Criteria
- Component folder exists
- At least one story YAML file exists
- YAML files have valid syntax
- YAML files contain required fields
- YAML files contain data extracted from Figma `[Story]` elements

## Final Output Example
```
✓ Stories generated successfully

Component: Button
Folder: web/themes/custom/daisy_cms_daisyui/components/button/

Generated stories:
  - button.enabled.story.yml (variant: default, state: enabled)
  - button.disabled.story.yml (variant: default, state: disabled)
```

## Next Steps
Suggest to the user:
- Review the generated story YAML files
- Generate Twig templates (use `/pendrop-generate-twig-from-story`)
- Test stories in Storybook
