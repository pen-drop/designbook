---
name: designbook-component-validate
description: Validates newly created components by rendering them in Storybook and comparing against visual/markup references.
---

# Designbook Component Validation

Validates a UI component by opening its stories in Storybook, capturing screenshots and markup, and comparing them against reference files if they exist.

## Prerequisites

- **Storybook** must be running on `http://localhost:6009` (default for this project).
- **Browser Agent** capability.
- **ImageMagick** (`magick`) for visual comparison.

## Input Parameters

```json
{
  "component_name": "button",
  "group": "Action",
  "component_path": "/absolute/path/to/components/button",
  "stories": ["default", "outline"]
}
```

- `component_name`: The kebab-case name of the component (e.g., `button`).
- `group`: The component group (e.g., `Action`).
- `component_path`: Absolute path to the component directory.
- `stories`: List of story names (e.g., `["default"]`).

## Execution Steps

### Step 1: Verify Storybook Accessibility

Check if Storybook is reachable:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:6009
```

If status is not 200, warn the user:
> "⚠️ Storybook is not running on port 6009. Validation skipped."

### Step 2: Validate Each Story

For each story in `stories`:

1.  **Construct URL**:
    `http://localhost:6009/iframe.html?id=[group]-[component_name]--[story]&viewMode=story`
    *Note: Group usually needs to be lowercase for IDs.*

2.  **Launch Browser Agent**:
    Task:
    ```
    Navigate to [URL].
    Wait for the component to render (look for #root or .component).
    Capture a screenshot and save to [component_path]/[component_name].[story].actual.png.
    Extract the inner HTML of the component and save to [component_path]/[component_name].[story].actual.html.
    ```

3.  **Compare Visuals**:
    Check if `[component_path]/[component_name].[story].reference.png` exists.
    If yes, run:
    ```bash
    magick compare -metric AE -fuzz 5% [reference_path] [actual_path] [diff_path]
    ```
    (Note: `magick compare` exits with 1 on difference, so handle exit code).

4.  **Compare Markup**:
    Check if `[component_path]/[component_name].[story].reference.html` exists.
    If yes, run `diff` or similar (normalize whitespace first).

### Step 3: Report Results

- **Pass**: Visuals and markup match references (or no references existed).
- **Fail**: Significant visual difference or markup mismatch.
- **Info**: "Reference not found, saved actual for review."

## Output

- `[component_name].[story].actual.png`
- `[component_name].[story].actual.html`
- `[component_name].[story].diff.png` (if visual mismatch)

---
