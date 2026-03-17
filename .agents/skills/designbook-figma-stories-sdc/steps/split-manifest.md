---
name: Split Manifest
description: Converts the story manifest into individual YAML files
---

# Split Manifest

This skill converts the JSON story manifest into individual Drupal SDC story YAML files in the appropriate folder.

## Purpose
Generates the final story YAML files from the manifest.

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
- Story manifest: `.pendrop/output/pendrop.theme.story.json`
- Tool script: `.pendrop/tools/split-stories.js`

## Process

1. **Execute split script**
   - Command: `node .pendrop/tools/split-stories.js`
   - Reads manifest from `.pendrop/output/pendrop.theme.story.json`
   - Generates YAML file(s) in component-specific folders

2. **Monitor split execution**
   - Display progress: "Processing stories for: [ComponentName]"
   - Show which stories are being generated

3. **Verify file generation**
   - Check that component folder exists
   - Confirm YAML files exist in folder
   - Example: `web/themes/custom/test_integration_drupal/components/button/button.enabled.story.yml`

4. **Optional: Display output paths**
   - Show generated file paths
   - Display message: "Story YAMLs generated successfully"

## Output
- Component folder: `web/themes/custom/test_integration_drupal/components/[component-name]/`
- Story YAML files: `[component-name].[variant].story.yml`

## Error Handling
- Split script fails: Show script error message
- Cannot create folder: Show permissions error
- Cannot write file: Show write error
- Invalid manifest format: Show parsing error

## Success Criteria
- Component folder exists: `web/themes/custom/test_integration_drupal/components/[component-name]/`
- YAML files exist for each story variant
- YAML files are valid (proper syntax)
- YAML files contain story metadata, variant, props, and slots

## Expected YAML Format
```yaml
name: Button enabled
variant: default
props:
  state: enabled
slots:
  label: Button Label
```
