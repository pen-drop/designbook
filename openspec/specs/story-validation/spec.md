## ADDED Requirements

### Requirement: Headless story rendering via Vitest

The addon SHALL provide a Vitest integration that renders stories to HTML without a running Storybook server. The integration MUST reuse the same Vite plugin pipeline as Storybook (including `storybook-addon-sdc`, `vite-plugin-twing-drupal`, and the designbook Vite plugin).

#### Scenario: Render a component story to HTML

- **WHEN** Vitest runs against a `.story.yml` file
- **THEN** the story module is loaded through the Storybook Vite pipeline and the `render()` function produces an HTML string without errors

#### Scenario: Render a scene story to HTML

- **WHEN** Vitest runs against a `.scenes.yml` file
- **THEN** all scenes in the file are rendered through the Storybook Vite pipeline and each produces an HTML string without errors

#### Scenario: Catch rendering errors

- **WHEN** a story references a component with a broken Twig template (e.g., undefined variable, missing include)
- **THEN** the Vitest test fails with an error message identifying the broken component and the Twig error

### Requirement: CLI validate story command

The addon CLI SHALL provide a `validate story <name>` command that renders a single story headlessly and reports success or failure. The command MUST use Vitest's programmatic API internally.

#### Scenario: Validate a specific component story

- **WHEN** user runs `storybook-addon-designbook validate story <component-name>`
- **THEN** the CLI finds all `.story.yml` files for that component, renders each story, and reports success or lists rendering errors

#### Scenario: Validate all stories

- **WHEN** user runs `storybook-addon-designbook validate story` without arguments
- **THEN** the CLI renders all discoverable stories (both `.story.yml` and `.scenes.yml`) and reports a summary of successes and failures

#### Scenario: Non-zero exit code on failure

- **WHEN** any story fails to render
- **THEN** the CLI exits with a non-zero exit code for CI integration

### Requirement: Integration project Vitest configuration

Integration projects SHALL be able to run story validation by adding a Vitest workspace entry that references their Storybook configuration directory.

#### Scenario: Vitest workspace setup

- **WHEN** an integration project creates a `vitest.workspace.ts` with a Storybook project entry pointing to `.storybook/`
- **THEN** running `vitest --project=storybook` discovers and validates all stories in the project

### Requirement: Addon dependency management

The addon SHALL declare `@storybook/addon-vitest` and `vitest` as optional peer dependencies so that story validation is opt-in.

#### Scenario: Addon works without vitest installed

- **WHEN** an integration project does not install `vitest` or `@storybook/addon-vitest`
- **THEN** the addon functions normally — only the `validate story` CLI command is unavailable and reports a helpful error message
