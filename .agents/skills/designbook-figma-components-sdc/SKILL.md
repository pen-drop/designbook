---
name: Pendrop Components
description: "Internal skill — generates Drupal SDC component YAML files from Figma data. Invoked by debo-figma-drupal-components workflow only."
---

# Pendrop Components

This skill orchestrates the generation of Drupal Single Directory Component (SDC) YAML files from Figma component data by executing a series of specialized sub-skills in sequence.

> **Internal skill** — Do not invoke directly. Use the `debo-figma-drupal-components` workflow instead.

## Capability

### Generate Components

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
   - Ensures `.pendrop/component.pendrop.jsonata` exists
   - Applies self-healing if missing

6. **Ensure Output Directory** (`./steps/ensure-output-directory.md`)
   - Creates component output directory structure
   - Prepares for file generation

7. **Execute Transformation** (`./steps/execute-transformation.md`)
   - Runs JSONata transformation on filtered data
   - Generates component manifest

8. **Restore Data** (`./steps/restore-data.md`)
   - Restores original Figma data from backup
   - Cleans up temporary filtered data

9. **Split Manifest** (`./steps/split-manifest.md`)
   - Converts manifest to individual YAML file
   - Places file in component folder

10. **Verify Output** (`./steps/verify-output.md`)
    - Confirms component folder and YAML file exist
    - Validates output structure

## Parameters
- `componentName`: The name of the component to generate (required)
  - Examples: "Button", "Card", "Hero"
  - Note: For batch processing, use `/pendrop-orchestrate-full-component "--all"`

## Context
- **Input**: `.pendrop/input/pendrop.data.components.json` (Figma component data)
- **Logic**: `.pendrop/component.pendrop.jsonata` (Transformation)
- **Output**: `web/themes/custom/test_integration_drupal/components/[component-name]/[component-name].component.yml`

## Data Sources (Figma Structure)
- **`[Component]` elements** → Variants information
- **`[Story]` elements** → Props and Slots information

## Error Handling
Each sub-skill handles its own errors and provides clear feedback:
- Component not found: Lists available components
- Missing Figma data: Prompts to run `/pendrop-fetch-figma`
- Invalid component name: Shows usage examples

## Usage Examples

```bash
# Generate component YAML for Button
Execute this skill with componentName="Button"

# Generate component YAML for Card
Execute this skill with componentName="Card"
```

## Output Structure
Generates Drupal SDC-compliant YAML files:
```
web/themes/custom/test_integration_drupal/components/button/
└── button.component.yml
```

## Workflow Tracking

> ⛔ **Use `@designbook-workflow/steps/`** for tracking: load `create` → `update` (in-progress) → `add-files` → `validate` → `update` (done).

Produced file for `--files`: `../components/<component-name>/<component-name>.component.yml`
