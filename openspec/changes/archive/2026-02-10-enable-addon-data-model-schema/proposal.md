## Why

To improve the robustness and utility of the data model, we are moving from a static Markdown file to a structured JSON file validated by a schema. This allows for programmatic management and rich visualization. The architecture separates concerns into three distinct parts: the **Workflow** (Interview), the **Skill** (Result Handler), and the **Addon** (Viewer).

## What Changes

- **Workflow (The Interview)**:
    - Update `.agent/workflows/debo-data-model.md` to focus solely on the guided conversation with the user.
    - Instead of saving the file directly, it will pass the structured result of the interview to the `designbook-data-model` skill.
- **Skill (The Handler)**:
    - Create a new `designbook-data-model` skill.
    - This skill accepts the interview output, validates it against `schema/data-model.json`, and persists it to `designbook/data-model.json`.
- **Addon (The Viewer)**:
    - Update `storybook-addon-designbook` to read `designbook/data-model.json` (resolved against the project root).
    - Create a `DeboDataModelCard` to display the structured data, acting as a viewer for the model.

## Capabilities

### New Capabilities

- `data-model-viewer`: The Storybook addon capability to visualize the `designbook/data-model.json` file.
- `data-model-handler`: The skill capability to process interview results and manage the JSON file.

### Modified Capabilities

- `data-model-interview`: The workflow capability, refined to focus on gathering requirements and delegating persistence.
