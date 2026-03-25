### Requirement: YAML parsing uses js-yaml
The system SHALL use `js-yaml` as the sole YAML parsing and serialization library in `storybook-addon-designbook`, replacing the `yaml` package. All call sites SHALL use `load()` for parsing and `dump()` for serialization.

#### Scenario: YAML file is parsed with js-yaml load()
- **WHEN** any source file in `storybook-addon-designbook` reads a YAML file
- **THEN** it SHALL call `load()` from `js-yaml` (not `parse()` from `yaml`)

#### Scenario: YAML data is serialized with js-yaml dump()
- **WHEN** any source file in `storybook-addon-designbook` serializes data to YAML
- **THEN** it SHALL call `dump()` from `js-yaml` (not `stringify()` from `yaml`)

#### Scenario: yaml package is absent from dependencies
- **WHEN** `packages/storybook-addon-designbook/package.json` is inspected
- **THEN** `yaml` SHALL NOT appear in `dependencies` or `devDependencies`
- **THEN** `js-yaml` SHALL appear in `dependencies`
- **THEN** `front-matter` SHALL appear in `dependencies`

### Requirement: Frontmatter parsing uses front-matter package
The system SHALL use the `front-matter` npm package to extract and parse YAML frontmatter from markdown files in `parseFrontmatter()`, replacing the hand-rolled regex and manual `yaml` call.

#### Scenario: Markdown file with valid frontmatter
- **WHEN** `parseFrontmatter()` is called with a markdown file containing `---` delimited frontmatter
- **THEN** it SHALL return the parsed frontmatter as `Record<string, unknown>`

#### Scenario: Markdown file without frontmatter
- **WHEN** `parseFrontmatter()` is called with a markdown file that has no `---` frontmatter block
- **THEN** it SHALL return `null`
