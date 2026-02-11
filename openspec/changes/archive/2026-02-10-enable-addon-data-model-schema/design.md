## Context

We are transitioning the Designbook data model from a manually edited Markdown file to a structured JSON file validated by a schema. This ensures data integrity and enables programmatic usage. The architecture involves three key components: an interactive workflow (Interview), a backend skill (Handler), and a frontend viewer (Addon).

## Goals / Non-Goals

**Goals:**
- **Structured Data**: Store the data model as validated JSON in `designbook/data-model.json`.
- **Separation of Concerns**: Decouple the user interface (workflow) from the data persistence (skill) and visualization (addon).
- **Analogous Pattern**: Replicate the successful pattern used for Design Tokens (Token/Group renderers, specific skill).
- **Schema Validation**: Ensure all data saved strictly adheres to `schema/data-model.json`.
- **AI-Only Modification**: The data model is strictly managed by the AI assistant. The manual workflow is deprecated/removed.

**Non-Goals:**
- **Editing in Storybook**: The Storybook addon is strictly a *viewer*. Editing happens via the AI command/workflow.
- **Complex Schema Changes**: We are not modifying the *schema* itself, only how the *data* adhering to it is created and consumed.

## Decisions

### Architecture: Interview -> Handler -> Viewer

We will implement a unidirectional data flow:
1.  **Interview (Workflow)**: The user interacts with the `.agent/workflows/debo-data-model.md` command. This workflow is responsible *only* for gathering requirements and constructing the data object. It does not write files directly.
2.  **Handler (Skill)**: The workflow passes the constructed data to a new `designbook-data-model` skill. This skill is the *only* component authorized to write to `designbook/data-model.json`. It performs validation against `schema/data-model.json` before saving.
3.  **Viewer (Addon)**: The `storybook-addon-designbook` reads `designbook/data-model.json` via the existing `useDesignbookData` hook (or similar). It uses a new `DeboDataModelCard` to display the data.

### Component Design: `DeboDataModelCard`

The viewer component will be modeled after `DeboDesignTokensCard` but adapted for the data model schema structure (`content -> entity_type -> bundle`).
- **Visualization Strategy**: It will display a **summary of each bundle grouped by the entity type**.
    - **Group**: Entity Type (e.g., `node`, `taxonomy_term`).
    - **Item**: Bundle (e.g., `article`, `tag`).
    - **Summary**: Show Bundle Title/Description.
- **Read-Only**: The UI will clearly state that changes must be made via the AI assistant.

### Skill Design: `designbook-data-model`

The skill will follow the standard pattern:
- **`SKILL.md`**: Defines the skill interface.
- **`steps/process-data-model.md`**: The implementation logic (using `run_command` or similar to execute a script).
- **`scripts/validate-and-save.cjs`**: A Node.js script to perform the actual JSON validation (using `ajv` or similar) and file writing.

## Risks / Trade-offs

- **Synchronization**: The data model in Storybook is read-only. Users might try to edit it there.
    - *Mitigation*: The UI must clearly indicate "Read Only" and point users to the AI command for edits.
- **Schema Evolution**: If `schema/data-model.json` changes, the skill's validation logic might break existing data.
    - *Mitigation*: The skill should handle schema versioning or migration strategies in the future (out of scope for now).

## Open Questions

- None at this stage.
