# Design: Refactor Product Sections Workflow

## Context
Currently, the `debo-product-roadmap` workflow creates individual MDX files for each product section. This tightly couples the data to the presentation format and makes it harder to manage section data programmatically or through an addon interface. We prefer a model where data is stored as structured JSON (`designbook/sections.json`) and the presentation (MDX) is generated dynamically by the Storybook addon.

## Goals / Non-Goals
**Goals:**
- Store product section data in a single, structured JSON file.
- Validate section data against a schema.
- Dynamically generate Storybook stories from the JSON data.
- Streamline the `debo-product-sections` workflow (renamed from `debo-product-roadmap`) to populate this JSON.

**Non-Goals:**
- Changing the visual design of the section detail page (it should look the same but be data-driven).
- Supporting complex rich text in JSON descriptions beyond standard strings or Markdown strings.

## Decisions

### 1. JSON Storage Format
We will store all sections in a single file `designbook/sections.json` rather than multiple files. This simplifies reading and writing operations for the addon and the workflow.
The structure will be an array of section objects, each containing:
- `id`: Unique kebab-case identifier.
- `title`: Display title.
- `description`: Text description.
- `status`: e.g., "planned", "in-progress", "done".

### 2. Renaming Workflow
We will rename `.agent/workflows/debo-product-roadmap.md` to `.agent/workflows/debo-product-sections.md` to clearer indicate its function of managing *sections*, not just a roadmap. The CLI command will be `/sections`.

### 3. Storybook Indexer / Loader
Instead of a complex Storybook Indexer API (which is experimental), we will leverage the existing virtual module approach or simply write the MDX files to a temporary directory if needed. However, a cleaner approach for Storybook 7/8 is using the `stories` configuration with a custom `indexer`.
**Choice**: We will implement a lightweight **indexer** in `storybook-addon-designbook/src/indexer.ts` (or similar) that:
1. Matches `designbook/sections.json`.
2. Reads the JSON.
3. Generates a CSF or MDX story for each section.

*Alternative*: Use the `vite-plugin.ts` to expose a virtual module and have a single "container" story that iterates.
*Decision*: Virtual stories via an indexer or a `stories.ts` file that imports the JSON is more robust.
**Refined Decision**: We will use a `vite` plugin to serve the JSON, but for the *stories themselves*, we might need actual files or a virtual story loader. TO start simple: The addon will assume `designbook/sections.json` exists. Configuring `stories: ['../designbook/sections.json']` in `main.js` and having an indexer handle `.json` files is a valid strategy.

### 4. Schema Validation
We will add `schema/sections.json` to the `designbook` project root (or `packages/designbook` equivalent) to define the expected structure. The workflow will use the `designbook-data-model` skill (or a new `designbook-sections` skill logic?) to validate.
*Decision*: We will reuse the `designbook-data-model` skill structure (or similar generic validator) if possible, or just embed the validation in the workflow for now until a specific skill is adapted.

## Risks / Trade-offs
**Risk**: Storybook Indexers can be tricky to debug.
**Mitigation**: Fallback to generating physical MDX files in a `tmp` folder if the indexer approach fails, but aim for the indexer first.

**Risk**: User might manually edit JSON and break syntax.
**Mitigation**: Schema validation and potentially a UI editor in the future (out of scope now).

## Migration Plan
1. Create `schema/sections.json`.
2. Rename workflow file.
3. Update workflow to write to `designbook/sections.json`.
4. Implement `index.js` or `indexer.ts` in addon to handle `sections.json`.
5. Update `main.js` in integration to include `sections.json` in `stories`.
6. Verify locally.
