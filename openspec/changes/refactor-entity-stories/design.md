## Goals

-   Automate the creation of explicit Storybook stories for every entity record in the test data.
-   Eliminate the dependency on `designbook.entity` metadata for runtime context resolution.
-   Ensure generated stories use `type: ref` with explicit `path` properties (e.g., `path: node.article.0.title`).

## Architecture

### Data Source
-   The skill will scan `$DESIGNBOOK_DIST/sections/*/data.json`.
-   It will parse these files to identify all available entity records (Node, Block, Media, etc.).
-   Each record is identified by: `section`, `entity_type`, `bundle`, `index`.

### Generation Logic (Script)
1.  **Identify Templates**:
    -   Scan the component directory for base stories: `entity-[type]-[bundle].[viewmode].story.yml`.
    -   Ignore files matching the generated pattern (`*.section-*.story.yml`).

2.  **Iterate Test Data**:
    -   For each `section` directory:
        -   Load `data.json`.
        -   Loop through `entity_type` -> `bundle` -> `records`.
        -   For each record at `index` `i`:
            -   **Iterate Viewmodes**:
                -   For each *template* `[viewmode]` found in Step 1:
                    -   Construct target filename: `entity-[type]-[bundle].content-[section]-[viewmode]-[i].story.yml`.
                    -   **Transform Content**:
                        -   Load the template content.
                        -   Traverse the object tree.
                        -   **Resolve Refs (Inline Values)**:
                            -   If a node matches `{ type: 'ref', field: 'XYZ' }` OR `{ type: 'ref', path: '...' }`:
                                -   Resolve the actual value from the loaded `data.json` (e.g., `data['node']['article'][i]['XYZ']`).
                                -   Replace the node with this value.
                        -   **Remove Metadata**:
                            -   Remove `designbook.entity` block.
                        -   Set story name to `content-[section]-[viewmode]-[i]`.
                    -   Write the fully resolved, standalone story file.

3.  **Output**:
    -   Write the transformed YAML to the component directory.

### Component Metadata
-   Update `entity-[type]-[bundle].component.yml`:
    -   Remove `designbook.entity` block if it is no longer used by the addon or other tools.
    -   *Verification*: Check if `designbook.entity` is used for **discovery** (e.g., "This is an entity component"). If so, we might need to keep a minimal version or use a tag. But the user said "designbook.entity kann entfernt werden in dem skill". We will assume it's safe to remove from the *generated output* of this specific story generation process. If it refers to `component.yml`, we will remove it there too.

## Technical Implementation

-   **Skill Script**: `designbook-entity` skill will be updated (likely a Node.js script or shell script with jq/yq).
-   **Dependency**: Requires `yaml` manipulation (yq or node script).

## User Review Required
-   **Breaking Change**: Existing story files that relied on `designbook.entity` metadata and were *not* generated might stop working if the addon support is removed.
-   **Overwrite**: This process will generate many new files in the component directories.

## Verify
-   Run the skill.
-   Check generated files for `path:` refs.
-   Run Storybook and verify stories load data correctly.
