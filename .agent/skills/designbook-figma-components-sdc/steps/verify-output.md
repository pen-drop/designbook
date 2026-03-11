---
name: Verify Output
description: Verifies that the component YAML file was created successfully
---

# Verify Output

This skill performs final verification that the component generation was successful.

## Purpose
Confirms the generated component file exists and has the correct structure.

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
- Expected output path: `web/themes/custom/test_integration_drupal/components/[component-name]/`

## Process

1. **Check component folder exists**
   - Verify directory: `web/themes/custom/test_integration_drupal/components/[component-name]/`
   - Example: For "Button", check `web/themes/custom/test_integration_drupal/components/button/`

2. **Check component YAML file exists**
   - Verify file: `[component-name].component.yml`
   - Example: `button.component.yml`

3. **Validate YAML structure**
   - Parse YAML to ensure valid syntax
   - Check for required Drupal SDC fields:
     - `$schema`: Schema URL
     - `name`: Component name
     - `status`: Component status
     - `provider`: Theme provider
   - Check for data from Figma:
     - `variants`: From `[Component]` elements (if any)
     - `props`: From `[Story]` elements (if any)
     - `slots`: From `slot{name}` instances (if any)

4. **Display success summary**
   - Show component name
   - Show output file path
   - List generated sections (variants, props, slots)
   - Display message: "✓ Component generated successfully"

## Output
- Confirmation message with details about generated component
- File path to generated YAML file

## Error Handling
- Folder missing: Show error "Component folder not created"
- YAML file missing: Show error "Component YAML file not generated"
- Invalid YAML: Show parsing error and line number
- Missing required fields: List missing fields

## Success Criteria
- Component folder exists
- Component YAML file exists
- YAML file has valid syntax
- YAML file contains required Drupal SDC fields
- YAML file contains data extracted from Figma:
  - Variants (from `[Component]`)
  - Props and slots (from `[Story]`)

## Final Output Example
```
✓ Component generated successfully

Component: Button
File: web/themes/custom/test_integration_drupal/components/button/button.component.yml

Generated sections:
  - Schema validation
  - 2 variants (default, outline)
  - 1 prop (state)
  - 1 slot (label)
```

## Next Steps
Suggest to the user:
- Review the generated YAML file
- Create corresponding Twig template (use `/pendrop-generate-twig-from-story`)
- Generate stories (use `/pendrop-generate-stories`)
- Test component in Storybook
