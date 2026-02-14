## Why

Currently, entity stories for specific test data scenarios (like `section-contact-0`) must be manually created or contain a `designbook.entity` metadata block that requires runtime processing. This is inefficient and prone to errors. We need to automate the generation of these specific story files directly from the test data and base stories, ensuring that the file system reflects the actual available stories and eliminating the need for complex runtime metadata parsing for this purpose.

## What Changes

-   **Refactor `designbook-entity` skill**:
    -   Implement logic to iterate over available test data (sections, rows).
    -   For each data item, identify the corresponding base entity story (e.g., `entity-node-article.full.story.yml`).
    -   Generate a specific story file (e.g., `entity-node-article.section-contact-0-full.story.yml`) for each dataset.
    -   **Transform Refs**: Convert `type: ref, field: <name>` references into `type: ref, path: <explicit_path>` references based on the data context (e.g., `field: title` -> `path: node.article.0.title`).
-   **Remove `designbook.entity` metadata**:
    -   The generated files will NOT contain the `designbook.entity` metadata block.
    -   The reliance on this metadata for runtime context resolution is removed in favor of explicit path references.
-   **Data Loading**:
    -   The skill preserves the `type: ref` structure. The **Designbook Addon** remains responsible for loading the actual data values from the specified paths at runtime.

## Capabilities

### New Capabilities
-   `entity-story-generation`: Automates creation of data-specific story files with resolved path references.

### Modified Capabilities
-   `designbook-entity`: Refactor to implement the generation loop and removal of metadata-based context logic.

## Impact

-   **`designbook-entity` Skill**: Significant logic changes to `SKILL.md` (or its scripts).
-   **Generated Story Files**: New story files will be created automatically. existing ones with `designbook.entity` blocks will be overwritten/replaced by fully resolved story definitions.
-   **Storybook**: Will see these new files as standard stories, requiring no special runtime adapter for the metadata block (simplifying the build/runtime).
