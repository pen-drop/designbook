---
name: Pendrop Stories
description: Generates Drupal SDC story YAML files from Figma story definitions through orchestrated sub-skills.
---

# Pendrop Stories

This skill orchestrates the generation of Drupal Single Directory Component (SDC) story YAML files from Figma story data by executing a series of specialized sub-skills in sequence.

## Capability

### Generate Stories
**Trigger**: When asked to "generate stories", "sync stories", "generate stories for [component]", or "update stories" from Figma.

**Action**: Execute the following sub-skills in order:

1. **Validate Parameters** (`./steps/validate-parameters.md`)
   - Ensures component name is provided
   - Normalizes component name for case-insensitive matching

2. **Verify Input** (`./steps/verify-input.md`)
   - Checks that `.pendrop/input/pendrop.data.components.json` exists
   - Prompts to run `/pendrop-fetch-figma` if missing

3. **Backup Data** (`./steps/backup-data.md`)
   - Creates safety backup of original Figma data
   - Enables restoration after transformation

4. **Filter Component** (`./steps/filter-component.md`)
   - Filters Figma data for specified component only
   - Lists available components if not found

5. **Verify Transformation Logic** (`./steps/verify-transformation-logic.md`)
   - Ensures `.pendrop/story.pendrop.jsonata` exists
   - Applies self-healing if missing

6. **Ensure Output Directory** (`./steps/ensure-output-directory.md`)
   - Creates component output directory structure
   - Prepares for file generation

7. **Execute Transformation** (`./steps/execute-transformation.md`)
   - Runs JSONata transformation on filtered data
   - Generates story manifest

8. **Restore Data** (`./steps/restore-data.md`)
   - Restores original Figma data from backup
   - Cleans up temporary filtered data

9. **Split Manifest** (`./steps/split-manifest.md`)
   - Converts manifest to individual YAML files
   - Places files in component folder

10. **Verify Output** (`./steps/verify-output.md`)
    - Confirms story files exist
    - Validates output structure

## Parameters
- `componentName`: The name of the component to generate stories for (required)
  - Examples: "Button", "Card", "Hero"
  - Note: For batch processing, use `/pendrop-orchestrate-full-component "--all"`

## Context
- **Input**: `.pendrop/input/pendrop.data.components.json` (Figma component data with `[Story]` nodes)
- **Logic**: `.pendrop/story.pendrop.jsonata` (Transformation)
- **Output**: `web/themes/custom/daisy_cms_daisyui/components/[component-name]/[component-name].[variant].story.yml`

## Data Sources (Figma Structure)
- **`[Story]` elements** → Story definitions with variants
  - Extracts: Story name, slots, and props for each variant
  - Each child variant becomes a separate story YAML file

## Error Handling
Each sub-skill handles its own errors and provides clear feedback:
- Component not found: Lists available components
- Missing Figma data: Prompts to run `/pendrop-fetch-figma`
- Invalid component name: Shows usage examples

## Usage Examples

```bash
# Generate stories for Button component
Execute this skill with componentName="Button"

# Generate stories for Card component
Execute this skill with componentName="Card"
```

## Output Structure
Generates Drupal SDC-compliant story YAML files:
```
web/themes/custom/daisy_cms_daisyui/components/button/
├── button.enabled.story.yml
└── button.disabled.story.yml
```

## Troubleshooting
- **Missing Input**: Ensure Figma data has been fetched using `/pendrop-fetch-figma` first.
- **Missing Components**: Stories are generated after components. Generate components first.
- **Transformation Error**: Check JSONata syntax in `.pendrop/story.pendrop.jsonata`.
- **Validation Error**: Verify output matches story YAML format in `.pendrop/validate/stories/`.
