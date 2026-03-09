---
name: Split Manifest
description: Converts the component manifest into an individual YAML file
---

# Split Manifest

This skill converts the JSON component manifest into a Drupal SDC YAML file in the appropriate folder.

## Purpose
Generates the final component YAML file from the manifest.

## Prerequisites
- Step 1: Validate Parameters (completed)
- Step 2: Verify Input (completed)
- Step 3: Backup Data (completed)
- Step 4: Filter Component (completed)
- Step 5: Verify Transformation Logic (completed)
- Step 6: Ensure Output Directory (completed)
- Step 7: Execute Transformation (completed)
- Step 8: Restore Data (completed)

## Input
- Component manifest: `.pendrop/output/pendrop.components.manifest.json`
- Tool script: `.pendrop/tools/split-components.js`

## Process

1. **Execute split script**
   - Command: `node .pendrop/tools/split-components.js`
   - Reads manifest from `.pendrop/output/pendrop.components.manifest.json`
   - Generates YAML file(s) in component-specific folders

2. **Monitor split execution**
   - Display progress: "Processing component: [ComponentName]"
   - Show which component is being generated

3. **Verify file generation**
   - Check that component folder was created
   - Confirm YAML file exists in folder
   - Example: `web/themes/custom/daisy_cms_daisyui/components/button/button.component.yml`

4. **Optional: Display output path**
   - Show generated file path
   - Display message: "Component YAML generated successfully"

## Output
- Component folder: `web/themes/custom/daisy_cms_daisyui/components/[component-name]/`
- Component YAML: `[component-name].component.yml`

## Error Handling
- Split script fails: Show script error message
- Cannot create folder: Show permissions error
- Cannot write file: Show write error
- Invalid manifest format: Show parsing error

## Success Criteria
- Component folder exists: `web/themes/custom/daisy_cms_daisyui/components/[component-name]/`
- YAML file exists: `[component-name].component.yml`
- YAML file is valid (proper syntax)
- YAML file contains component metadata, variants, props, and slots

## Expected YAML Format
```yaml
$schema: https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json
name: Button
status: stable
description: Button component
provider: daisy_cms_daisyui

variants:
  default:
    title: Default
    description: Default variant
  outline:
    title: Outline
    description: Outline variant

props:
  type: object
  properties:
    state:
      type: string
      description: Button state
      enum:
        - enabled
        - disabled

slots:
  label:
    title: Label
    description: Button label text
```
