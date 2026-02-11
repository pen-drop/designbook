## ADDED Requirements

### Requirement: JSON Data Indexing
The addon SHALL index content from `designbook/sections.json` to enable dynamic story generation.

#### Scenario: Indexing sections data
- **WHEN** the Storybook addon initializes
- **THEN** it reads the `designbook/sections.json` file
- **AND** parses the JSON content for story generation

### Requirement: Dynamic Story Generation
The addon SHALL dynamically generate one MDX story for each section defined in `designbook/sections.json` under the "Sections" title.

#### Scenario: Generating stories from JSON
- **WHEN** the `sections.json` file contains a list of sections
- **THEN** the addon generates a separate MDX story file (virtually or physically) for each section
- **AND** the story title corresponds to the section name

#### Scenario: Updating stories
- **WHEN** the `sections.json` file is updated
- **THEN** the addon reflects the changes in the generated stories without requiring a full restart if possible (HMR)

## MODIFIED Requirements

### Requirement: Indexer Logic
**FROM**: The indexer scans for `.mdx` files in `designbook/sections/` and registers them as stories.
**TO**: The indexer reads `designbook/sections.json` and generates stories programmatically.

#### Scenario: Legacy MDX handling
- **WHEN** existing `.mdx` files are present
- **THEN** typical MDX file handling remains for other documentation
- **BUT** section-specific MDX files are replaced by the JSON-driven generation
